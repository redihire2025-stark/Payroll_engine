import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
}

export async function payrollSummaryReport(runId: string): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('payroll_items')
    .select('gross_earnings, total_deductions, net_pay, lop_days, employees(employee_code, employee_profiles(first_name, last_name))')
    .eq('payroll_run_id', runId);
  if (error) throw error;
  const rows = (data ?? []).map((r) => {
    const e = r.employees as unknown as { employee_code: string; employee_profiles: { first_name: string; last_name: string | null } | null } | null;
    const name = [e?.employee_profiles?.first_name, e?.employee_profiles?.last_name].filter(Boolean).join(' ') || e?.employee_code || 'Unknown';
    return {
      employee: name,
      code: e?.employee_code ?? '',
      gross: Number(r.gross_earnings),
      deductions: Number(r.total_deductions),
      net: Number(r.net_pay),
      lopDays: Number(r.lop_days),
    };
  });
  return {
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'code', label: 'Code' },
      { key: 'gross', label: 'Gross' },
      { key: 'deductions', label: 'Deductions' },
      { key: 'net', label: 'Net Pay' },
      { key: 'lopDays', label: 'LOP Days' },
    ],
    rows,
  };
}

export async function attendanceReport(companyId: string, periodStart: string, periodEnd: string): Promise<ReportResult> {
  const employees = await listEmployeesLite(companyId);
  const { data, error } = await supabase
    .from('attendance_records')
    .select('employee_id, status')
    .eq('company_id', companyId)
    .gte('work_date', periodStart)
    .lte('work_date', periodEnd);
  if (error) throw error;

  const counts = new Map<string, { present: number; absent: number }>();
  for (const r of data ?? []) {
    const key = r.employee_id as string;
    const c = counts.get(key) ?? { present: 0, absent: 0 };
    if (r.status === 'absent') c.absent += 1;
    else c.present += 1;
    counts.set(key, c);
  }

  const rows = employees.map((e) => {
    const c = counts.get(e.id) ?? { present: 0, absent: 0 };
    return { employee: e.name, code: e.code, present: c.present, absent: c.absent };
  });
  return {
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'code', label: 'Code' },
      { key: 'present', label: 'Present Days' },
      { key: 'absent', label: 'Absent (LOP) Days' },
    ],
    rows,
  };
}

export async function leaveReport(companyId: string, year: number): Promise<ReportResult> {
  const employees = await listEmployeesLite(companyId);
  if (employees.length === 0) return { columns: [], rows: [] };

  const { data, error } = await supabase
    .from('leave_balances')
    .select('employee_id, used, closing_balance, leave_types(name)')
    .in('employee_id', employees.map((e) => e.id))
    .eq('year', year);
  if (error) throw error;

  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  const codeById = new Map(employees.map((e) => [e.id, e.code]));
  const rows = (data ?? []).map((r) => {
    const leaveType = r.leave_types as unknown as { name: string } | null;
    return {
      employee: nameById.get(r.employee_id as string) ?? 'Unknown',
      code: codeById.get(r.employee_id as string) ?? '',
      leaveType: leaveType?.name ?? 'Leave',
      used: Number(r.used),
      balance: Number(r.closing_balance),
    };
  });
  return {
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'code', label: 'Code' },
      { key: 'leaveType', label: 'Leave Type' },
      { key: 'used', label: 'Used' },
      { key: 'balance', label: 'Balance' },
    ],
    rows,
  };
}

export async function statutoryReport(runId: string): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('payroll_deductions')
    .select('component_code, amount, payroll_items!inner(payroll_run_id, employees(employee_code, employee_profiles(first_name, last_name)))')
    .eq('payroll_items.payroll_run_id', runId);
  if (error) throw error;

  const rows = (data ?? [])
    .map((r) => {
      const item = r.payroll_items as unknown as { employees: { employee_code: string; employee_profiles: { first_name: string; last_name: string | null } | null } | null } | null;
      const e = item?.employees;
      if (!e) return null;
      const name = [e.employee_profiles?.first_name, e.employee_profiles?.last_name].filter(Boolean).join(' ') || e.employee_code;
      return { employee: name, code: e.employee_code, component: (r.component_code as string).toUpperCase(), amount: Number(r.amount) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return {
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'code', label: 'Code' },
      { key: 'component', label: 'Statutory Component' },
      { key: 'amount', label: 'Amount' },
    ],
    rows,
  };
}

export async function departmentPayrollCostReport(runId: string): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('payroll_items')
    .select('gross_earnings, net_pay, employees(departments(name))')
    .eq('payroll_run_id', runId);
  if (error) throw error;

  const byDept = new Map<string, { gross: number; net: number; count: number }>();
  for (const r of data ?? []) {
    const e = r.employees as unknown as { departments: { name: string } | null } | null;
    const dept = e?.departments?.name ?? 'Unassigned';
    const cur = byDept.get(dept) ?? { gross: 0, net: 0, count: 0 };
    cur.gross += Number(r.gross_earnings);
    cur.net += Number(r.net_pay);
    cur.count += 1;
    byDept.set(dept, cur);
  }

  const rows = Array.from(byDept.entries()).map(([department, v]) => ({ department, employees: v.count, gross: v.gross, net: v.net }));
  return {
    columns: [
      { key: 'department', label: 'Department' },
      { key: 'employees', label: 'Employees' },
      { key: 'gross', label: 'Gross Cost' },
      { key: 'net', label: 'Net Cost' },
    ],
    rows,
  };
}

export async function payrollVarianceReport(runIdA: string, runIdB: string): Promise<ReportResult> {
  async function totals(runId: string) {
    const { data, error } = await supabase.from('payroll_items').select('gross_earnings, net_pay').eq('payroll_run_id', runId);
    if (error) throw error;
    return (data ?? []).reduce((acc, r) => ({ gross: acc.gross + Number(r.gross_earnings), net: acc.net + Number(r.net_pay) }), { gross: 0, net: 0 });
  }
  const [a, b] = await Promise.all([totals(runIdA), totals(runIdB)]);
  return {
    columns: [
      { key: 'metric', label: 'Metric' },
      { key: 'periodA', label: 'Earlier Run' },
      { key: 'periodB', label: 'Later Run' },
      { key: 'change', label: 'Change' },
    ],
    rows: [
      { metric: 'Gross Payroll', periodA: a.gross, periodB: b.gross, change: b.gross - a.gross },
      { metric: 'Net Payroll', periodA: a.net, periodB: b.net, change: b.net - a.net },
    ],
  };
}

export async function reimbursementReport(companyId: string): Promise<ReportResult> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  if (employees.length === 0) return { columns: [], rows: [] };

  const { data, error } = await supabase
    .from('reimbursements')
    .select('employee_id, total_amount, status, created_at')
    .in('employee_id', employees.map((e) => e.id))
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []).map((r) => ({
    employee: nameById.get(r.employee_id as string) ?? 'Unknown',
    amount: Number(r.total_amount),
    status: r.status as string,
    date: (r.created_at as string).slice(0, 10),
  }));
  return {
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Submitted' },
    ],
    rows,
  };
}

export function exportToCsv(filename: string, result: ReportResult): void {
  const header = result.columns.map((c) => `"${c.label}"`).join(',');
  const lines = result.rows.map((row) =>
    result.columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
