import { supabase } from '@/shared/lib/supabaseClient';

export interface PayrollRunRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  runType: 'regular' | 'off_cycle' | 'fnf';
  status: 'draft' | 'calculating' | 'calculated' | 'under_review' | 'approved' | 'locked' | 'paid' | 'cancelled';
  createdAt: string;
}

export async function listPayrollRuns(companyId: string): Promise<PayrollRunRow[]> {
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end, run_type, status, created_at')
    .eq('company_id', companyId)
    .order('period_start', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    periodStart: r.period_start as string,
    periodEnd: r.period_end as string,
    runType: r.run_type as PayrollRunRow['runType'],
    status: r.status as PayrollRunRow['status'],
    createdAt: r.created_at as string,
  }));
}

export async function getPayrollRun(runId: string): Promise<PayrollRunRow | null> {
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end, run_type, status, created_at')
    .eq('id', runId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    runType: data.run_type,
    status: data.status,
    createdAt: data.created_at,
  };
}

export interface PayrollItemRow {
  id: string;
  employeeId: string;
  employeeName: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  lopDays: number;
}

export async function listPayrollItems(runId: string): Promise<PayrollItemRow[]> {
  const { data, error } = await supabase
    .from('payroll_items')
    .select('id, employee_id, gross_earnings, total_deductions, net_pay, lop_days, employees(employee_code, employee_profiles(first_name, last_name))')
    .eq('payroll_run_id', runId);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const employee = r.employees as unknown as {
      employee_code: string;
      employee_profiles: { first_name: string; last_name: string | null } | null;
    } | null;
    const name = [employee?.employee_profiles?.first_name, employee?.employee_profiles?.last_name].filter(Boolean).join(' ');
    return {
      id: r.id as string,
      employeeId: r.employee_id as string,
      employeeName: name || employee?.employee_code || 'Unknown',
      grossEarnings: Number(r.gross_earnings),
      totalDeductions: Number(r.total_deductions),
      netPay: Number(r.net_pay),
      lopDays: Number(r.lop_days),
    };
  });
}

export interface MyPayslipRow {
  runId: string;
  periodStart: string;
  periodEnd: string;
  netPay: number;
  runStatus: string;
}

export async function listMyPayslips(employeeId: string): Promise<MyPayslipRow[]> {
  const { data, error } = await supabase
    .from('payroll_items')
    .select('net_pay, payroll_runs(id, period_start, period_end, status)')
    .eq('employee_id', employeeId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => {
      const run = r.payroll_runs as unknown as { id: string; period_start: string; period_end: string; status: string } | null;
      if (!run) return null;
      return { runId: run.id, periodStart: run.period_start, periodEnd: run.period_end, netPay: Number(r.net_pay), runStatus: run.status };
    })
    .filter((r): r is MyPayslipRow => r !== null)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
}

export interface PayrollItemDetail extends PayrollItemRow {
  earnings: { code: string; amount: number }[];
  deductions: { code: string; amount: number }[];
}

export async function getPayrollItemForEmployee(runId: string, employeeId: string): Promise<PayrollItemDetail | null> {
  const { data: item, error } = await supabase
    .from('payroll_items')
    .select('id, employee_id, gross_earnings, total_deductions, net_pay, lop_days')
    .eq('payroll_run_id', runId)
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw error;
  if (!item) return null;

  const [{ data: earnings }, { data: deductions }] = await Promise.all([
    supabase.from('payroll_earnings').select('component_code, amount').eq('payroll_item_id', item.id),
    supabase.from('payroll_deductions').select('component_code, amount').eq('payroll_item_id', item.id),
  ]);

  return {
    id: item.id,
    employeeId: item.employee_id,
    employeeName: '',
    grossEarnings: Number(item.gross_earnings),
    totalDeductions: Number(item.total_deductions),
    netPay: Number(item.net_pay),
    lopDays: Number(item.lop_days),
    earnings: (earnings ?? []).map((e) => ({ code: e.component_code as string, amount: Number(e.amount) })),
    deductions: (deductions ?? []).map((d) => ({ code: d.component_code as string, amount: Number(d.amount) })),
  };
}
