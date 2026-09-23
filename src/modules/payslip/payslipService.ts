import { supabase } from '@/shared/lib/supabaseClient';
import { callNetlifyFunction } from '@/shared/lib/netlifyFunctions';
import { buildPayslipPdf } from './generatePayslipPdf';
import { sendPayslipReadyEmail } from '@/modules/notifications/notificationService';
import { runAsJob } from '@/modules/jobs/jobService';

export interface GeneratePayslipsResult {
  generated: number;
  alreadyExisted: number;
}

/** Idempotent — skips any payroll_item that already has a payslips row rather than overwriting it. Tracked as a background_jobs row. */
export async function generatePayslipsForRun(runId: string, companyId: string): Promise<GeneratePayslipsResult> {
  return runAsJob(companyId, 'payslip_generation', { runId }, () => generatePayslipsForRunInner(runId, companyId));
}

async function generatePayslipsForRunInner(runId: string, companyId: string): Promise<GeneratePayslipsResult> {
  const { data: run, error: runErr } = await supabase.from('payroll_runs').select('period_start, period_end, status').eq('id', runId).single();
  if (runErr) throw runErr;
  if (!['locked', 'paid'].includes(run.status)) {
    throw new Error('Payroll must be locked before payslips can be generated.');
  }

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('name, legal_name, reg_office, cin, phone, website, email, state, brand_accent_color, name_accent_prefix_length')
    .eq('id', companyId)
    .single();
  if (companyErr) throw companyErr;

  const { data: items, error: itemsErr } = await supabase
    .from('payroll_items')
    .select(
      'id, employee_id, gross_earnings, total_deductions, net_pay, lop_days, employees(employee_code, date_of_joining, departments(name), designations(title), employee_profiles(first_name, last_name))'
    )
    .eq('payroll_run_id', runId);
  if (itemsErr) throw itemsErr;

  const workingDays = Math.round((new Date(run.period_end as string).getTime() - new Date(run.period_start as string).getTime()) / 86400000) + 1;

  const { jsPDF } = await import('jspdf');

  let generated = 0;
  let alreadyExisted = 0;

  for (const item of items ?? []) {
    const { data: existing, error: existingErr } = await supabase.from('payslips').select('id').eq('payroll_item_id', item.id).maybeSingle();
    if (existingErr) throw existingErr;
    if (existing) {
      alreadyExisted += 1;
      continue;
    }

    const [{ data: earnings, error: earnErr }, { data: deductions, error: dedErr }, { data: contributions, error: contribErr }] = await Promise.all([
      supabase.from('payroll_earnings').select('component_code, amount').eq('payroll_item_id', item.id),
      supabase.from('payroll_deductions').select('component_code, amount').eq('payroll_item_id', item.id),
      supabase.from('payroll_contributions').select('component_code, amount').eq('payroll_item_id', item.id),
    ]);
    if (earnErr) throw earnErr;
    if (dedErr) throw dedErr;
    if (contribErr) throw contribErr;

    const employee = item.employees as unknown as {
      employee_code: string;
      date_of_joining: string | null;
      departments: { name: string } | null;
      designations: { title: string } | null;
      employee_profiles: { first_name: string; last_name: string | null } | null;
    } | null;
    const employeeName = [employee?.employee_profiles?.first_name, employee?.employee_profiles?.last_name].filter(Boolean).join(' ') || employee?.employee_code || 'Employee';

    const doc = await buildPayslipPdf(new jsPDF(), {
      companyName: company.name,
      companyLegalName: company.legal_name,
      companyRegOffice: company.reg_office,
      companyCin: company.cin,
      companyPhone: company.phone,
      companyWebsite: company.website,
      companyEmail: company.email,
      companyState: company.state,
      brandAccentColor: company.brand_accent_color,
      nameAccentPrefixLength: company.name_accent_prefix_length,
      employeeName,
      employeeCode: employee?.employee_code ?? '',
      department: employee?.departments?.name ?? null,
      designation: employee?.designations?.title ?? null,
      dateOfJoining: employee?.date_of_joining ?? null,
      workingDays,
      periodStart: run.period_start as string,
      periodEnd: run.period_end as string,
      earnings: (earnings ?? []).map((e) => ({ code: e.component_code as string, amount: Number(e.amount) })),
      deductions: (deductions ?? []).map((d) => ({ code: d.component_code as string, amount: Number(d.amount) })),
      contributions: (contributions ?? []).map((c) => ({ code: c.component_code as string, amount: Number(c.amount) })),
      grossEarnings: Number(item.gross_earnings),
      totalDeductions: Number(item.total_deductions),
      netPay: Number(item.net_pay),
      lopDays: Number(item.lop_days),
    });

    const blob = doc.output('blob');
    const storagePath = `${companyId}/${runId}/${item.employee_id}.pdf`;
    const { error: uploadErr } = await supabase.storage.from('payslips').upload(storagePath, blob, { contentType: 'application/pdf', upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: inserted, error: insertErr } = await supabase
      .from('payslips')
      .insert({ payroll_item_id: item.id, storage_path: storagePath })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    sendPayslipReadyEmail(inserted.id as string).catch(() => {});

    generated += 1;
  }

  return { generated, alreadyExisted };
}

export async function getPayslipIdForItem(payrollItemId: string): Promise<string | null> {
  const { data, error } = await supabase.from('payslips').select('id').eq('payroll_item_id', payrollItemId).maybeSingle();
  if (error) throw error;
  return (data?.id as string) ?? null;
}

/** Authorization is derived server-side from the caller's own session, never a client-supplied id (see get-payslip-url.ts). */
export async function getSignedPayslipUrl(payslipId: string): Promise<string> {
  const { url } = await callNetlifyFunction<{ url: string }>('get-payslip-url', { payslipId });
  return url;
}
