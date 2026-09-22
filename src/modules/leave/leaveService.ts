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
