import { supabase } from '@/shared/lib/supabaseClient';
import { callNetlifyFunction } from '@/shared/lib/netlifyFunctions';
import { renderTemplate } from './mergeFields';
import { buildLetterPdf } from './generateLetterPdf';

export type LetterType =
  | 'offer' | 'appointment' | 'confirmation' | 'promotion' | 'increment'
  | 'transfer' | 'salary_certificate' | 'experience' | 'relieving' | 'custom';

export interface LetterTemplateRow {
  id: string;
  name: string;
  letterType: LetterType;
  body: string;
}

export async function listTemplates(companyId: string): Promise<LetterTemplateRow[]> {
  const { data, error } = await supabase
    .from('letter_templates')
    .select('id, name, letter_type, body')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, letterType: r.letter_type as LetterType, body: r.body as string }));
}

export async function createTemplate(companyId: string, name: string, letterType: LetterType, body: string): Promise<void> {
  const { error } = await supabase.from('letter_templates').insert({ company_id: companyId, name, letter_type: letterType, body });
  if (error) throw error;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from('letter_templates').delete().eq('id', templateId);
  if (error) throw error;
}

interface MergeFieldSource {
  employee_code: string;
  date_of_joining: string;
  date_of_exit: string | null;
  departments: { name: string } | null;
  designations: { title: string } | null;
  employee_profiles: { first_name: string; last_name: string | null } | null;
}

async function resolveMergeFields(companyId: string, employeeId: string): Promise<Record<string, string>> {
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select(
      'employee_code, date_of_joining, date_of_exit, departments(name), designations(title), employee_profiles(first_name, last_name), employee_salary_assignments(annual_ctc, effective_from, effective_to)',
    )
    .eq('id', employeeId)
    .single();
  if (empErr) throw empErr;

  const { data: company, error: companyErr } = await supabase.from('companies').select('name').eq('id', companyId).single();
  if (companyErr) throw companyErr;

  const e = employee as unknown as MergeFieldSource & { employee_salary_assignments: { annual_ctc: number; effective_from: string; effective_to: string | null }[] | null };
  const name = [e.employee_profiles?.first_name, e.employee_profiles?.last_name].filter(Boolean).join(' ');
  const today = new Date().toISOString().slice(0, 10);
  const currentCtc = (e.employee_salary_assignments ?? [])
    .filter((a) => a.effective_from <= today && (!a.effective_to || a.effective_to >= today))
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0];

  return {
    employee_name: name || 'Employee',
    employee_code: e.employee_code,
    designation: e.designations?.title ?? '—',
    department: e.departments?.name ?? '—',
    company_name: company.name as string,
    date: today,
    ctc: currentCtc ? currentCtc.annual_ctc.toLocaleString('en-IN') : '—',
    date_of_joining: e.date_of_joining,
    date_of_exit: e.date_of_exit ?? '—',
  };
}

export async function previewLetter(companyId: string, employeeId: string, templateBody: string): Promise<string> {
  const fields = await resolveMergeFields(companyId, employeeId);
  return renderTemplate(templateBody, fields);
}

export async function generateLetter(companyId: string, employeeId: string, templateId: string, templateName: string, templateBody: string): Promise<void> {
  const fields = await resolveMergeFields(companyId, employeeId);
  const renderedBody = renderTemplate(templateBody, fields);

  const { jsPDF } = await import('jspdf');
  const doc = buildLetterPdf(new jsPDF(), {
    companyName: fields.company_name,
    title: templateName,
    date: fields.date,
    body: renderedBody,
  });
  const blob = doc.output('blob');
  const storagePath = `${companyId}/${employeeId}/${templateId}-${Date.now()}.pdf`;
  const { error: uploadErr } = await supabase.storage.from('employee-letters').upload(storagePath, blob, { contentType: 'application/pdf' });
  if (uploadErr) throw uploadErr;

  const { error: insertErr } = await supabase.from('employee_letters').insert({
    company_id: companyId,
    employee_id: employeeId,
    template_id: templateId,
    title: templateName,
    rendered_body: renderedBody,
    storage_path: storagePath,
  });
  if (insertErr) throw insertErr;
}

export interface EmployeeLetterRow {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  generatedAt: string;
}

export async function listCompanyLetters(companyId: string): Promise<EmployeeLetterRow[]> {
  const { data, error } = await supabase
    .from('employee_letters')
    .select('id, employee_id, title, generated_at, employees(employee_code, employee_profiles(first_name, last_name))')
    .eq('company_id', companyId)
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const emp = r.employees as unknown as { employee_code: string; employee_profiles: { first_name: string; last_name: string | null } | null } | null;
    const name = [emp?.employee_profiles?.first_name, emp?.employee_profiles?.last_name].filter(Boolean).join(' ') || emp?.employee_code || 'Unknown';
    return { id: r.id as string, employeeId: r.employee_id as string, employeeName: name, title: r.title as string, generatedAt: r.generated_at as string };
  });
}

export async function listMyLetters(employeeId: string): Promise<EmployeeLetterRow[]> {
  const { data, error } = await supabase
    .from('employee_letters')
    .select('id, employee_id, title, generated_at')
    .eq('employee_id', employeeId)
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id as string, employeeId: r.employee_id as string, employeeName: '', title: r.title as string, generatedAt: r.generated_at as string }));
}

/** Authorization is derived server-side from the caller's own session — see get-letter-url.ts. */
export async function getSignedLetterUrl(letterId: string): Promise<string> {
  const { url } = await callNetlifyFunction<{ url: string }>('get-letter-url', { letterId });
  return url;
}
