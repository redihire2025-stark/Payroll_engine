import { supabase } from '@/shared/lib/supabaseClient';
import { uploadDocument } from '@/modules/document/documentService';
import { listEmployeesLite } from '@/modules/employee/employeeService';
import { callNetlifyFunction } from '@/shared/lib/netlifyFunctions';
import { financialYearRange } from './financialYear';
import { buildForm16Pdf } from './generateForm16Pdf';

export const TAX_SECTIONS = ['80C', '80D', '80CCD(1B)', 'HRA', 'LTA', 'other'] as const;
export type TaxSection = (typeof TAX_SECTIONS)[number];

export interface TaxDeclarationItemRow {
  id: string;
  section: string;
  description: string | null;
  declaredAmount: number;
  documentId: string | null;
  status: 'declared' | 'proof_uploaded' | 'verified' | 'rejected';
}

export interface TaxDeclarationRow {
  id: string;
  employeeId: string;
  financialYear: string;
  regime: 'old' | 'new';
  items: TaxDeclarationItemRow[];
}

function mapItem(r: Record<string, unknown>): TaxDeclarationItemRow {
  return {
    id: r.id as string,
    section: r.section as string,
    description: r.description as string | null,
    declaredAmount: Number(r.declared_amount),
    documentId: r.document_id as string | null,
    status: r.status as TaxDeclarationItemRow['status'],
  };
}

export async function getMyDeclaration(employeeId: string, financialYear: string): Promise<TaxDeclarationRow | null> {
  const { data, error } = await supabase
    .from('tax_declarations')
    .select('id, employee_id, financial_year, regime, tax_declaration_items(id, section, description, declared_amount, document_id, status)')
    .eq('employee_id', employeeId)
    .eq('financial_year', financialYear)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    employeeId: data.employee_id as string,
    financialYear: data.financial_year as string,
    regime: data.regime as 'old' | 'new',
    items: (data.tax_declaration_items as Record<string, unknown>[]).map(mapItem),
  };
}

async function getOrCreateDeclaration(companyId: string, employeeId: string, financialYear: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from('tax_declarations')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('financial_year', financialYear)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing.id as string;

  const { data: created, error: insertErr } = await supabase
    .from('tax_declarations')
    .insert({ company_id: companyId, employee_id: employeeId, financial_year: financialYear })
    .select('id')
    .single();
  if (insertErr) throw insertErr;
  return created.id as string;
}

export async function addDeclarationItem(
  companyId: string,
  employeeId: string,
  financialYear: string,
  section: string,
  description: string,
  declaredAmount: number,
): Promise<void> {
  const declarationId = await getOrCreateDeclaration(companyId, employeeId, financialYear);
  const { error } = await supabase
    .from('tax_declaration_items')
    .insert({ declaration_id: declarationId, section, description: description || null, declared_amount: declaredAmount });
  if (error) throw error;
}

export async function uploadProofForItem(itemId: string, companyId: string, employeeId: string, file: File, uploadedBy: string): Promise<void> {
  const documentId = await uploadDocument({ companyId, employeeId, documentType: 'Tax Proof', file, uploadedBy });
  const { error } = await supabase.from('tax_declaration_items').update({ document_id: documentId, status: 'proof_uploaded' }).eq('id', itemId);
  if (error) throw error;
}

export async function deleteDeclarationItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('tax_declaration_items').delete().eq('id', itemId);
  if (error) throw error;
}

export interface CompanyDeclarationRow extends TaxDeclarationRow {
  employeeName: string;
}

export async function listCompanyDeclarations(companyId: string, financialYear: string): Promise<CompanyDeclarationRow[]> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('tax_declarations')
    .select('id, employee_id, financial_year, regime, tax_declaration_items(id, section, description, declared_amount, document_id, status)')
    .eq('company_id', companyId)
    .eq('financial_year', financialYear);
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id as string,
    employeeId: d.employee_id as string,
    employeeName: nameById.get(d.employee_id as string) ?? 'Unknown',
    financialYear: d.financial_year as string,
    regime: d.regime as 'old' | 'new',
    items: (d.tax_declaration_items as Record<string, unknown>[]).map(mapItem),
  }));
}

export async function setItemStatus(itemId: string, status: 'verified' | 'rejected'): Promise<void> {
  const { error } = await supabase.from('tax_declaration_items').update({ status }).eq('id', itemId);
  if (error) throw error;
}

/** Sum of verified exemptions — the only amounts that should reduce taxable income in the TDS calculation. */
export async function getVerifiedExemptionsTotal(employeeId: string, financialYear: string): Promise<number> {
  const declaration = await getMyDeclaration(employeeId, financialYear);
  if (!declaration) return 0;
  return declaration.items.filter((i) => i.status === 'verified').reduce((sum, i) => sum + i.declaredAmount, 0);
}

async function getStandardDeduction(companyId: string): Promise<number> {
  const { data } = await supabase
    .from('payroll_rule_sets')
    .select('config')
    .eq('company_id', companyId)
    .eq('rule_key', 'tds')
    .is('effective_to', null)
    .maybeSingle();
  const config = data?.config as { standardDeduction?: number } | undefined;
  return config?.standardDeduction ?? 75000;
}

/** Generates a Form 16-style annual tax summary PDF from the financial year's locked/paid payroll runs, and stores it as an employee_letters row (reusing that table/bucket rather than a second document pipeline). */
export async function generateForm16(companyId: string, employeeId: string, financialYear: string): Promise<void> {
  const [rangeStart, rangeEnd] = financialYearRange(financialYear);

  const { data: runs, error: runsErr } = await supabase
    .from('payroll_runs')
    .select('id')
    .eq('company_id', companyId)
    .in('status', ['locked', 'paid'])
    .gte('period_start', rangeStart)
    .lte('period_end', rangeEnd);
  if (runsErr) throw runsErr;
  const runIds = (runs ?? []).map((r) => r.id as string);
  if (runIds.length === 0) throw new Error('No locked/paid payroll runs found for this financial year yet.');

  const { data: items, error: itemsErr } = await supabase
    .from('payroll_items')
    .select('id, gross_earnings')
    .eq('employee_id', employeeId)
    .in('payroll_run_id', runIds);
  if (itemsErr) throw itemsErr;
  const itemIds = (items ?? []).map((i) => i.id as string);
  const grossSalary = (items ?? []).reduce((sum, i) => sum + Number(i.gross_earnings), 0);

  let taxDeducted = 0;
  if (itemIds.length > 0) {
    const { data: deductions, error: dedErr } = await supabase
      .from('payroll_deductions')
      .select('amount')
      .eq('component_code', 'tds')
      .in('payroll_item_id', itemIds);
    if (dedErr) throw dedErr;
    taxDeducted = (deductions ?? []).reduce((sum, d) => sum + Number(d.amount), 0);
  }

  const [company, employee, exemptionsClaimed, standardDeduction] = await Promise.all([
    supabase.from('companies').select('name, reg_office').eq('id', companyId).single().then((r) => r.data),
    supabase.from('employees').select('employee_code, employee_profiles(first_name, last_name)').eq('id', employeeId).single().then((r) => r.data),
    getVerifiedExemptionsTotal(employeeId, financialYear),
    getStandardDeduction(companyId),
  ]);
  if (!company || !employee) throw new Error('Could not load company/employee details.');

  const profile = employee.employee_profiles as unknown as { first_name: string; last_name: string | null } | null;
  const employeeName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || (employee.employee_code as string);
  const taxableIncome = Math.max(0, grossSalary - standardDeduction - exemptionsClaimed);

  const { jsPDF } = await import('jspdf');
  const doc = buildForm16Pdf(new jsPDF(), {
    companyName: company.name as string,
    companyRegOffice: company.reg_office as string | null,
    employeeName,
    employeeCode: employee.employee_code as string,
    financialYear,
    grossSalary,
    standardDeduction,
    exemptionsClaimed,
    taxableIncome,
    taxDeducted,
  });
  const blob = doc.output('blob');
  const storagePath = `${companyId}/${employeeId}/form16-${financialYear}-${Date.now()}.pdf`;
  const { error: uploadErr } = await supabase.storage.from('employee-letters').upload(storagePath, blob, { contentType: 'application/pdf' });
  if (uploadErr) throw uploadErr;

  const { error: insertErr } = await supabase.from('employee_letters').insert({
    company_id: companyId,
    employee_id: employeeId,
    template_id: null,
    title: `Form 16 — FY ${financialYear}`,
    rendered_body: `Gross salary: ${grossSalary}, Standard deduction: ${standardDeduction}, Exemptions: ${exemptionsClaimed}, Taxable income: ${taxableIncome}, TDS deposited: ${taxDeducted}`,
    storage_path: storagePath,
  });
  if (insertErr) throw insertErr;
}

export interface Form16Row {
  id: string;
  title: string;
  generatedAt: string;
}

export async function listMyForm16s(employeeId: string): Promise<Form16Row[]> {
  const { data, error } = await supabase
    .from('employee_letters')
    .select('id, title, generated_at')
    .eq('employee_id', employeeId)
    .is('template_id', null)
    .ilike('title', 'Form 16%')
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id as string, title: r.title as string, generatedAt: r.generated_at as string }));
}

export async function getSignedForm16Url(letterId: string): Promise<string> {
  const { url } = await callNetlifyFunction<{ url: string }>('get-letter-url', { letterId });
  return url;
}
