import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';

export interface LoanRow {
  id: string;
  employeeId: string;
  employeeName: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  disbursedAt: string | null;
  status: string;
  outstanding: number;
}

async function attachOutstanding(loans: Omit<LoanRow, 'outstanding'>[]): Promise<LoanRow[]> {
  if (loans.length === 0) return [];
  const { data, error } = await supabase
    .from('loan_repayments')
    .select('loan_id, amount')
    .in('loan_id', loans.map((l) => l.id))
    .eq('status', 'pending');
  if (error) throw error;
  const outstandingByLoan = new Map<string, number>();
  for (const r of data ?? []) {
    outstandingByLoan.set(r.loan_id as string, (outstandingByLoan.get(r.loan_id as string) ?? 0) + Number(r.amount));
  }
  return loans.map((l) => ({ ...l, outstanding: outstandingByLoan.get(l.id) ?? (l.status === 'approved' ? l.principalAmount : 0) }));
}

export async function listLoans(companyId: string): Promise<LoanRow[]> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  if (employees.length === 0) return [];

  const { data, error } = await supabase
    .from('loans')
    .select('id, employee_id, principal_amount, interest_rate, tenure_months, disbursed_at, status')
    .in('employee_id', employees.map((e) => e.id))
    .order('disbursed_at', { ascending: false, nullsFirst: true });
  if (error) throw error;

  const loans = (data ?? []).map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employeeName: nameById.get(r.employee_id as string) ?? 'Unknown',
    principalAmount: Number(r.principal_amount),
    interestRate: Number(r.interest_rate),
    tenureMonths: r.tenure_months as number,
    disbursedAt: r.disbursed_at as string | null,
    status: r.status as string,
  }));
  return attachOutstanding(loans);
}

export async function listMyLoans(employeeId: string): Promise<LoanRow[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('id, employee_id, principal_amount, interest_rate, tenure_months, disbursed_at, status')
    .eq('employee_id', employeeId)
    .order('disbursed_at', { ascending: false, nullsFirst: true });
  if (error) throw error;
  const loans = (data ?? []).map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employeeName: '',
    principalAmount: Number(r.principal_amount),
    interestRate: Number(r.interest_rate),
    tenureMonths: r.tenure_months as number,
    disbursedAt: r.disbursed_at as string | null,
    status: r.status as string,
  }));
  return attachOutstanding(loans);
}

export interface RequestLoanInput {
  employeeId: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
}

export async function requestLoan(input: RequestLoanInput): Promise<void> {
  const { error } = await supabase.from('loans').insert({
    employee_id: input.employeeId,
    principal_amount: input.principalAmount,
    interest_rate: input.interestRate,
    tenure_months: input.tenureMonths,
    status: 'pending',
  });
  if (error) throw error;
}

/** Approving disburses the loan today (simple internal-loan model — no separate disbursement step) and generates an equal-installment monthly repayment schedule (interest is not compounded into the schedule, a simplification noted for a future pass). */
export async function approveLoan(loanId: string): Promise<void> {
  const { data: loan, error: fetchErr } = await supabase.from('loans').select('principal_amount, tenure_months').eq('id', loanId).single();
  if (fetchErr) throw fetchErr;

  const today = new Date();
  const { error: updateErr } = await supabase
    .from('loans')
    .update({ status: 'approved', disbursed_at: today.toISOString().slice(0, 10) })
    .eq('id', loanId);
  if (updateErr) throw updateErr;

  const tenure = loan.tenure_months as number;
  const principal = Number(loan.principal_amount);
  const baseInstallment = Math.floor(principal / tenure);
  const remainder = principal - baseInstallment * tenure;

  const installments = Array.from({ length: tenure }, (_, i) => {
    const dueDate = new Date(today.getFullYear(), today.getMonth() + i + 1, today.getDate());
    return {
      loan_id: loanId,
      installment_number: i + 1,
      due_date: dueDate.toISOString().slice(0, 10),
      amount: baseInstallment + (i === tenure - 1 ? remainder : 0),
      status: 'pending',
    };
  });

  const { error: repaymentErr } = await supabase.from('loan_repayments').insert(installments);
  if (repaymentErr) throw repaymentErr;
}

export async function rejectLoan(loanId: string): Promise<void> {
  const { error } = await supabase.from('loans').update({ status: 'rejected' }).eq('id', loanId);
  if (error) throw error;
}

export interface LoanRepaymentRow {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
}

export async function listLoanRepayments(loanId: string): Promise<LoanRepaymentRow[]> {
  const { data, error } = await supabase
    .from('loan_repayments')
    .select('id, installment_number, due_date, amount, status')
    .eq('loan_id', loanId)
    .order('installment_number');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    installmentNumber: r.installment_number as number,
    dueDate: r.due_date as string,
    amount: Number(r.amount),
    status: r.status as string,
  }));
}

export async function markInstallmentPaid(repaymentId: string): Promise<void> {
  const { error } = await supabase.from('loan_repayments').update({ status: 'paid' }).eq('id', repaymentId);
  if (error) throw error;
}
