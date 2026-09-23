import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';
import { evaluatePunchIn, evaluatePunchOut, type ShiftDef } from './rules';

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

async function getEffectiveShift(employeeId: string, date: string): Promise<ShiftDef | null> {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('shifts(start_time, end_time, grace_minutes)')
    .eq('employee_id', employeeId)
    .lte('effective_from', date)
    .or(`effective_to.is.null,effective_to.gte.${date}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const shift = data?.shifts as unknown as { start_time: string; end_time: string; grace_minutes: number } | null;
  if (!shift) return null;
  return { startTime: shift.start_time, endTime: shift.end_time, graceMinutes: shift.grace_minutes };
}

export async function punchIn(companyId: string, employeeId: string): Promise<void> {
  const { data: existing, error: findErr } = await supabase
    .from('attendance_records')
    .select('id, check_in_at')
    .eq('employee_id', employeeId)
    .eq('work_date', todayDate())
    .maybeSingle();
  if (findErr) throw findErr;

  const now = new Date();
  const shift = await getEffectiveShift(employeeId, todayDate());
  const { status, lateMinutes } = evaluatePunchIn(shift, now);

  if (existing) {
    if (existing.check_in_at) return;
    const { error } = await supabase
      .from('attendance_records')
      .update({ check_in_at: now.toISOString(), check_in_source: 'web', status, late_minutes: lateMinutes })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('attendance_records').insert({
    company_id: companyId,
    employee_id: employeeId,
    work_date: todayDate(),
    check_in_at: now.toISOString(),
    check_in_source: 'web',
    status,
    late_minutes: lateMinutes,
  });
  if (error) throw error;
}

export async function punchOut(employeeId: string): Promise<void> {
  const { data: existing, error: findErr } = await supabase
    .from('attendance_records')
    .select('id, check_in_at, check_out_at, late_minutes')
    .eq('employee_id', employeeId)
    .eq('work_date', todayDate())
    .maybeSingle();
  if (findErr) throw findErr;
  if (!existing || !existing.check_in_at) throw new Error('Punch in before punching out.');
  if (existing.check_out_at) return;

  const now = new Date();
  const shift = await getEffectiveShift(employeeId, todayDate());
  const { status, overtimeMinutes } = evaluatePunchOut(shift, new Date(existing.check_in_at as string), now, Number(existing.late_minutes) > 0);

  const { error } = await supabase
    .from('attendance_records')
    .update({ check_out_at: now.toISOString(), status, overtime_minutes: overtimeMinutes })
    .eq('id', existing.id);
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

export interface ShiftRow {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

export async function listShifts(companyId: string): Promise<ShiftRow[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('id, name, start_time, end_time, grace_minutes')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    startTime: (r.start_time as string).slice(0, 5),
    endTime: (r.end_time as string).slice(0, 5),
    graceMinutes: r.grace_minutes as number,
  }));
}

export async function createShift(companyId: string, name: string, startTime: string, endTime: string, graceMinutes: number): Promise<void> {
  const { error } = await supabase.from('shifts').insert({ company_id: companyId, name, start_time: startTime, end_time: endTime, grace_minutes: graceMinutes });
  if (error) throw error;
}

export interface ShiftAssignmentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  shiftName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export async function listShiftAssignments(companyId: string): Promise<ShiftAssignmentRow[]> {
  const employees = await listEmployeesLite(companyId);
  if (employees.length === 0) return [];
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('shift_assignments')
    .select('id, employee_id, effective_from, effective_to, shifts(id, name)')
    .in('employee_id', employees.map((e) => e.id))
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const shift = r.shifts as unknown as { id: string; name: string } | null;
    return {
      id: r.id as string,
      employeeId: r.employee_id as string,
      employeeName: nameById.get(r.employee_id as string) ?? 'Unknown',
      shiftId: shift?.id ?? '',
      shiftName: shift?.name ?? 'Unknown',
      effectiveFrom: r.effective_from as string,
      effectiveTo: r.effective_to as string | null,
    };
  });
}

/** Closes out any open assignment for the employee before starting the new one — mirrors assignSalaryStructure's pattern. */
export async function assignShift(employeeId: string, shiftId: string, effectiveFrom: string): Promise<void> {
  const { error: closeErr } = await supabase
    .from('shift_assignments')
    .update({ effective_to: effectiveFrom })
    .eq('employee_id', employeeId)
    .is('effective_to', null);
  if (closeErr) throw closeErr;

  const { error } = await supabase.from('shift_assignments').insert({ employee_id: employeeId, shift_id: shiftId, effective_from: effectiveFrom });
  if (error) throw error;
}
