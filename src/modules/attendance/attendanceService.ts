import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';

export interface CorrectionRow {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  requestedIn: string | null;
  requestedOut: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * attendance_corrections has no company_id column (see supabase/migrations/0002) —
 * it's scoped by employee_id only, so we resolve the company's employee ids
 * first and filter by those, rather than a cross-table PostgREST embed.
 */
export async function listCorrections(companyId: string): Promise<CorrectionRow[]> {
  const employees = await listEmployeesLite(companyId);
  if (employees.length === 0) return [];
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('attendance_corrections')
    .select('id, employee_id, requested_check_in, requested_check_out, reason, status, created_at')
    .in('employee_id', employees.map((e) => e.id))
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employeeName: nameById.get(r.employee_id as string) ?? 'Unknown',
    date: (r.requested_check_in as string | null)?.slice(0, 10) ?? '',
    requestedIn: (r.requested_check_in as string | null)?.slice(11, 16) ?? null,
    requestedOut: (r.requested_check_out as string | null)?.slice(11, 16) ?? null,
    reason: r.reason as string,
    status: r.status as CorrectionRow['status'],
  }));
}

export interface AttendanceDay {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}

export async function listMyAttendance(employeeId: string, monthStart: string, monthEnd: string): Promise<AttendanceDay[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('work_date, check_in_at, check_out_at, status')
    .eq('employee_id', employeeId)
    .gte('work_date', monthStart)
    .lte('work_date', monthEnd)
    .order('work_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    date: r.work_date as string,
    checkIn: (r.check_in_at as string | null)?.slice(11, 16) ?? null,
    checkOut: (r.check_out_at as string | null)?.slice(11, 16) ?? null,
    status: r.status as string,
  }));
}
