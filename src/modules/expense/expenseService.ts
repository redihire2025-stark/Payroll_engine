import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';

export interface ReimbursementRow {
  id: string;
  employeeId: string;
  employeeName: string;
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
}

export async function listReimbursements(companyId: string): Promise<ReimbursementRow[]> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('reimbursements')
    .select('id, employee_id, total_amount, status, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employeeName: nameById.get(r.employee_id as string) ?? 'Unknown',
    totalAmount: Number(r.total_amount),
    status: r.status as ReimbursementRow['status'],
    createdAt: r.created_at as string,
  }));
}

export async function listMyReimbursements(employeeId: string): Promise<ReimbursementRow[]> {
  const { data, error } = await supabase
    .from('reimbursements')
    .select('id, employee_id, total_amount, status, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employeeName: '',
    totalAmount: Number(r.total_amount),
    status: r.status as ReimbursementRow['status'],
    createdAt: r.created_at as string,
  }));
}

export interface ReimbursementItemRow {
  category: string;
  amount: number;
  expenseDate: string;
}

export async function getReimbursementItems(reimbursementId: string): Promise<ReimbursementItemRow[]> {
  const { data, error } = await supabase
    .from('reimbursement_items')
    .select('category, amount, expense_date')
    .eq('reimbursement_id', reimbursementId)
    .order('expense_date');
  if (error) throw error;
  return (data ?? []).map((r) => ({ category: r.category as string, amount: Number(r.amount), expenseDate: r.expense_date as string }));
}

export interface CreateExpenseClaimInput {
  companyId: string;
  employeeId: string;
  items: { category: string; amount: number; expenseDate: string }[];
}

export async function createExpenseClaim(input: CreateExpenseClaimInput): Promise<void> {
  const totalAmount = input.items.reduce((sum, i) => sum + i.amount, 0);
  const { data: claim, error: claimErr } = await supabase
    .from('reimbursements')
    .insert({ company_id: input.companyId, employee_id: input.employeeId, total_amount: totalAmount, status: 'pending' })
    .select('id')
    .single();
  if (claimErr) throw claimErr;

  const { error: itemsErr } = await supabase.from('reimbursement_items').insert(
    input.items.map((i) => ({ reimbursement_id: claim.id, category: i.category, amount: i.amount, expense_date: i.expenseDate }))
  );
  if (itemsErr) throw itemsErr;
}

export async function decideReimbursement(id: string, status: 'approved' | 'rejected' | 'paid'): Promise<void> {
  const { error } = await supabase.from('reimbursements').update({ status }).eq('id', id);
  if (error) throw error;
}
