import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite, revokePortalAccess } from '@/modules/employee/employeeService';

export interface ExitCaseRow {
  id: string;
  employeeId: string;
  employeeName: string;
  resignationDate: string;
  lastWorkingDay: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'cleared' | 'settled' | 'rejected';
}

export async function listExitCases(companyId: string): Promise<ExitCaseRow[]> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('exit_cases')
    .select('id, employee_id, resignation_date, last_working_day, reason, status')
    .eq('company_id', companyId)
    .order('resignation_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employeeName: nameById.get(r.employee_id as string) ?? 'Unknown',
    resignationDate: r.resignation_date as string,
    lastWorkingDay: r.last_working_day as string | null,
    reason: r.reason as string | null,
    status: r.status as ExitCaseRow['status'],
  }));
}

export async function getMyExitCase(employeeId: string): Promise<ExitCaseRow | null> {
  const { data, error } = await supabase
    .from('exit_cases')
    .select('id, employee_id, resignation_date, last_working_day, reason, status')
    .eq('employee_id', employeeId)
    .order('resignation_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    employeeId: data.employee_id as string,
    employeeName: '',
    resignationDate: data.resignation_date as string,
    lastWorkingDay: data.last_working_day as string | null,
    reason: data.reason as string | null,
    status: data.status as ExitCaseRow['status'],
  };
}

export async function submitResignation(companyId: string, employeeId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('exit_cases').insert({ company_id: companyId, employee_id: employeeId, reason });
  if (error) throw error;
}

export async function approveExit(exitCaseId: string, lastWorkingDay: string): Promise<void> {
  const { error } = await supabase.from('exit_cases').update({ status: 'approved', last_working_day: lastWorkingDay }).eq('id', exitCaseId);
  if (error) throw error;
}

export async function rejectExit(exitCaseId: string): Promise<void> {
  const { error } = await supabase.from('exit_cases').update({ status: 'rejected' }).eq('id', exitCaseId);
  if (error) throw error;
}

export async function markCleared(exitCaseId: string): Promise<void> {
  const { error } = await supabase.from('exit_cases').update({ status: 'cleared' }).eq('id', exitCaseId);
  if (error) throw error;
}

/** Final step: marks the exit case settled, sets the employee record exited, and revokes portal access if they had it. */
export async function settleExit(exitCaseId: string, employeeId: string, lastWorkingDay: string, hasPortalAccess: boolean): Promise<void> {
  const { error: caseErr } = await supabase.from('exit_cases').update({ status: 'settled' }).eq('id', exitCaseId);
  if (caseErr) throw caseErr;

  const { error: empErr } = await supabase.from('employees').update({ status: 'exited', date_of_exit: lastWorkingDay }).eq('id', employeeId);
  if (empErr) throw empErr;

  if (hasPortalAccess) {
    await revokePortalAccess(employeeId);
  }
}
