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

export async function decideCorrection(correctionId: string, decision: 'approved' | 'rejected', companyId: string): Promise<void> {
  const { data: correction, error: fetchErr } = await supabase
    .from('attendance_corrections')
    .select('id, employee_id, requested_check_in, requested_check_out')
    .eq('id', correctionId)
    .single();
  if (fetchErr) throw fetchErr;

  const { error: statusErr } = await supabase.from('attendance_corrections').update({ status: decision }).eq('id', correctionId);
  if (statusErr) throw statusErr;

  if (decision !== 'approved' || !correction.requested_check_in) return;

  const workDate = (correction.requested_check_in as string).slice(0, 10);
  const { data: existing, error: findErr } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('employee_id', correction.employee_id)
    .eq('work_date', workDate)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    const { error } = await supabase
      .from('attendance_records')
      .update({
        check_in_at: correction.requested_check_in,
        check_out_at: correction.requested_check_out,
        is_manual_entry: true,
        status: 'present',
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('attendance_records').insert({
      company_id: companyId,
      employee_id: correction.employee_id,
      work_date: workDate,
      check_in_at: correction.requested_check_in,
      check_out_at: correction.requested_check_out,
      is_manual_entry: true,
      status: 'present',
    });
    if (error) throw error;
  }
}

export interface TodayAttendance {
  id: string | null;
  checkIn: string | null;
  checkOut: string | null;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayAttendance(employeeId: string): Promise<TodayAttendance> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, check_in_at, check_out_at')
    .eq('employee_id', employeeId)
    .eq('work_date', todayDate())
    .maybeSingle();
  if (error) throw error;
  return { id: (data?.id as string) ?? null, checkIn: (data?.check_in_at as string) ?? null, checkOut: (data?.check_out_at as string) ?? null };
}

export async function punchIn(companyId: string, employeeId: string): Promise<void> {
  const { data: existing, error: findErr } = await supabase
    .from('attendance_records')
    .select('id, check_in_at')
    .eq('employee_id', employeeId)
    .eq('work_date', todayDate())
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    if (existing.check_in_at) return;
    const { error } = await supabase.from('attendance_records').update({ check_in_at: new Date().toISOString(), check_in_source: 'web' }).eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('attendance_records').insert({
    company_id: companyId,
    employee_id: employeeId,
    work_date: todayDate(),
    check_in_at: new Date().toISOString(),
    check_in_source: 'web',
    status: 'present',
  });
  if (error) throw error;
}

export async function punchOut(employeeId: string): Promise<void> {
  const { data: existing, error: findErr } = await supabase
    .from('attendance_records')
    .select('id, check_out_at')
    .eq('employee_id', employeeId)
    .eq('work_date', todayDate())
    .maybeSingle();
  if (findErr) throw findErr;
  if (!existing) throw new Error('Punch in before punching out.');
  if (existing.check_out_at) return;

  const { error } = await supabase.from('attendance_records').update({ check_out_at: new Date().toISOString() }).eq('id', existing.id);
  if (error) throw error;
}

export interface CreateCorrectionInput {
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
}

export async function createCorrection(input: CreateCorrectionInput): Promise<void> {
  const { error } = await supabase.from('attendance_corrections').insert({
    employee_id: input.employeeId,
    requested_check_in: `${input.date}T${input.checkInTime}:00`,
    requested_check_out: `${input.date}T${input.checkOutTime}:00`,
    reason: input.reason,
  });
  if (error) throw error;
}

export interface MyCorrectionRow {
  id: string;
  date: string;
  requestedIn: string | null;
  requestedOut: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export async function listMyCorrections(employeeId: string): Promise<MyCorrectionRow[]> {
  const { data, error } = await supabase
    .from('attendance_corrections')
    .select('id, requested_check_in, requested_check_out, reason, status, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    date: (r.requested_check_in as string | null)?.slice(0, 10) ?? '',
    requestedIn: (r.requested_check_in as string | null)?.slice(11, 16) ?? null,
    requestedOut: (r.requested_check_out as string | null)?.slice(11, 16) ?? null,
    reason: r.reason as string,
    status: r.status as MyCorrectionRow['status'],
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
