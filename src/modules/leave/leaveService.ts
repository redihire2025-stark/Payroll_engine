import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';

export interface LeaveRequestRow {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

export async function listLeaveRequests(companyId: string): Promise<LeaveRequestRow[]> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, employee_id, start_date, end_date, days, reason, status, created_at, leave_types(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => {
    const leaveType = r.leave_types as unknown as { name: string } | null;
    return {
      id: r.id as string,
      employeeId: r.employee_id as string,
      employeeName: nameById.get(r.employee_id as string) ?? 'Unknown',
      leaveType: leaveType?.name ?? 'Leave',
      startDate: r.start_date as string,
      endDate: r.end_date as string,
      days: Number(r.days),
      reason: r.reason as string | null,
      status: r.status as LeaveRequestRow['status'],
      createdAt: r.created_at as string,
    };
  });
}

async function consumeLeaveBalance(employeeId: string, leaveTypeId: string, days: number, year: number): Promise<void> {
  const { data: existing, error: findErr } = await supabase
    .from('leave_balances')
    .select('id, used, opening_balance, accrued, carried_forward')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', year)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    const used = Number(existing.used) + days;
    const closing = Number(existing.opening_balance) + Number(existing.accrued) + Number(existing.carried_forward) - used;
    const { error } = await supabase.from('leave_balances').update({ used, closing_balance: closing }).eq('id', existing.id);
    if (error) throw error;
  } else {
    // No balance row yet for this employee/type/year — vivify one at zero
    // entitlement rather than blocking the approval; it goes negative,
    // visibly flagging that no policy/grant has funded this leave type yet.
    const { error } = await supabase.from('leave_balances').insert({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      year,
      opening_balance: 0,
      accrued: 0,
      used: days,
      carried_forward: 0,
      closing_balance: -days,
    });
    if (error) throw error;
  }
}

export async function updateLeaveRequestStatus(leaveRequestId: string, status: 'approved' | 'rejected'): Promise<void> {
  const { data: request, error: fetchErr } = await supabase
    .from('leave_requests')
    .select('employee_id, leave_type_id, days, start_date')
    .eq('id', leaveRequestId)
    .single();
  if (fetchErr) throw fetchErr;

  const { error } = await supabase.from('leave_requests').update({ status }).eq('id', leaveRequestId);
  if (error) throw error;

  if (status === 'approved') {
    const year = new Date(request.start_date as string).getFullYear();
    await consumeLeaveBalance(request.employee_id as string, request.leave_type_id as string, Number(request.days), year);
  }
}

export interface LeavePolicyRow {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  annualQuota: number;
  carryForwardMax: number;
  encashable: boolean;
  effectiveFrom: string;
}

export async function listLeavePolicies(companyId: string): Promise<LeavePolicyRow[]> {
  const { data, error } = await supabase
    .from('leave_policies')
    .select('id, leave_type_id, annual_quota, carry_forward_max, encashable, effective_from, leave_types(name)')
    .eq('company_id', companyId)
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const leaveType = r.leave_types as unknown as { name: string } | null;
    return {
      id: r.id as string,
      leaveTypeId: r.leave_type_id as string,
      leaveTypeName: leaveType?.name ?? 'Leave',
      annualQuota: Number(r.annual_quota),
      carryForwardMax: Number(r.carry_forward_max),
      encashable: r.encashable as boolean,
      effectiveFrom: r.effective_from as string,
    };
  });
}

export interface CreateLeavePolicyInput {
  companyId: string;
  leaveTypeId: string;
  annualQuota: number;
  carryForwardMax?: number;
  encashable?: boolean;
  effectiveFrom: string;
}

export async function createLeavePolicy(input: CreateLeavePolicyInput): Promise<void> {
  const { error } = await supabase.from('leave_policies').insert({
    company_id: input.companyId,
    leave_type_id: input.leaveTypeId,
    annual_quota: input.annualQuota,
    carry_forward_max: input.carryForwardMax ?? 0,
    encashable: input.encashable ?? false,
    effective_from: input.effectiveFrom,
  });
  if (error) throw error;
}

export interface GrantAnnualLeaveResult {
  granted: number;
  skipped: number;
}

/** Idempotent per employee/type/year — only creates a balance row where none exists yet, never overwrites usage already recorded. */
export async function grantAnnualLeave(companyId: string, leaveTypeId: string, annualQuota: number, year: number): Promise<GrantAnnualLeaveResult> {
  const employees = await listEmployeesLite(companyId);
  let granted = 0;
  let skipped = 0;

  for (const emp of employees) {
    const { data: existing, error: findErr } = await supabase
      .from('leave_balances')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', year)
      .maybeSingle();
    if (findErr) throw findErr;
    if (existing) {
      skipped += 1;
      continue;
    }
    const { error } = await supabase.from('leave_balances').insert({
      employee_id: emp.id,
      leave_type_id: leaveTypeId,
      year,
      opening_balance: 0,
      accrued: annualQuota,
      used: 0,
      carried_forward: 0,
      closing_balance: annualQuota,
    });
    if (error) throw error;
    granted += 1;
  }

  return { granted, skipped };
}

export interface LeaveTypeOption {
  id: string;
  name: string;
  code: string;
  isPaid: boolean;
}

export async function listLeaveTypes(companyId: string): Promise<LeaveTypeOption[]> {
  const { data, error } = await supabase
    .from('leave_types')
    .select('id, name, code, is_paid')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((t) => ({ id: t.id as string, name: t.name as string, code: t.code as string, isPaid: t.is_paid as boolean }));
}

export interface CreateLeaveTypeInput {
  companyId: string;
  name: string;
  code: string;
  isPaid: boolean;
}

export async function createLeaveType(input: CreateLeaveTypeInput): Promise<void> {
  const { error } = await supabase.from('leave_types').insert({
    company_id: input.companyId,
    name: input.name,
    code: input.code,
    is_paid: input.isPaid,
  });
  if (error) throw error;
}

function countInclusiveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

export interface CreateLeaveRequestInput {
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export async function createLeaveRequest(input: CreateLeaveRequestInput): Promise<void> {
  const { error } = await supabase.from('leave_requests').insert({
    company_id: input.companyId,
    employee_id: input.employeeId,
    leave_type_id: input.leaveTypeId,
    start_date: input.startDate,
    end_date: input.endDate,
    days: countInclusiveDays(input.startDate, input.endDate),
    reason: input.reason || null,
  });
  if (error) throw error;
}

export interface LeaveBalanceRow {
  leaveTypeId: string;
  name: string;
  opening: number;
  accrued: number;
  used: number;
  closing: number;
}

export async function listMyLeaveBalances(employeeId: string, year: number): Promise<LeaveBalanceRow[]> {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('leave_type_id, opening_balance, accrued, used, closing_balance, leave_types(name)')
    .eq('employee_id', employeeId)
    .eq('year', year);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const leaveType = r.leave_types as unknown as { name: string } | null;
    return {
      leaveTypeId: r.leave_type_id as string,
      name: leaveType?.name ?? 'Leave',
      opening: Number(r.opening_balance),
      accrued: Number(r.accrued),
      used: Number(r.used),
      closing: Number(r.closing_balance),
    };
  });
}

export async function listMyLeaveRequests(employeeId: string): Promise<LeaveRequestRow[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, employee_id, start_date, end_date, days, reason, status, created_at, leave_types(name)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const leaveType = r.leave_types as unknown as { name: string } | null;
    return {
      id: r.id as string,
      employeeId: r.employee_id as string,
      employeeName: '',
      leaveType: leaveType?.name ?? 'Leave',
      startDate: r.start_date as string,
      endDate: r.end_date as string,
      days: Number(r.days),
      reason: r.reason as string | null,
      status: r.status as LeaveRequestRow['status'],
      createdAt: r.created_at as string,
    };
  });
}
