import { supabase } from '@/shared/lib/supabaseClient';

export interface EmployeeLite {
  id: string;
  code: string;
  name: string;
}

/** Minimal employee list (id/code/name) — reused by attendance/leave/payroll pages to label rows without repeating this join everywhere. */
export async function listEmployeesLite(companyId: string): Promise<EmployeeLite[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, employee_profiles(first_name, last_name)')
    .eq('company_id', companyId);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const profile = r.employee_profiles as unknown as { first_name: string; last_name: string | null } | null;
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    return { id: r.id as string, code: r.employee_code as string, name: name || (r.employee_code as string) };
  });
}

export async function listDirectReports(companyId: string, managerId: string): Promise<EmployeeLite[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, employee_profiles(first_name, last_name)')
    .eq('company_id', companyId)
    .eq('manager_id', managerId);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const profile = r.employee_profiles as unknown as { first_name: string; last_name: string | null } | null;
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    return { id: r.id as string, code: r.employee_code as string, name: name || (r.employee_code as string) };
  });
}

export interface EmployeeListRow {
  id: string;
  code: string;
  name: string;
  department: string | null;
  designation: string | null;
  branch: string | null;
  status: 'active' | 'on_leave' | 'exited';
  doj: string;
}

export async function listEmployees(companyId: string): Promise<EmployeeListRow[]> {
  const { data, error } = await supabase
    .from('employees')
    .select(
      'id, employee_code, status, date_of_joining, departments(name), designations(title), branches(name), employee_profiles(first_name, last_name)'
    )
    .eq('company_id', companyId)
    .order('date_of_joining', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => {
    const profile = r.employee_profiles as unknown as { first_name: string; last_name: string | null } | null;
    const department = r.departments as unknown as { name: string } | null;
    const designation = r.designations as unknown as { title: string } | null;
    const branch = r.branches as unknown as { name: string } | null;
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
    return {
      id: r.id as string,
      code: r.employee_code as string,
      name: name || '(Profile incomplete)',
      department: department?.name ?? null,
      designation: designation?.title ?? null,
      branch: branch?.name ?? null,
      status: r.status as EmployeeListRow['status'],
      doj: r.date_of_joining as string,
    };
  });
}

export interface EmployeeDetailRecord extends EmployeeListRow {
  personalEmail: string | null;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  managerId: string | null;
}

export async function getEmployee(employeeId: string): Promise<EmployeeDetailRecord | null> {
  const { data, error } = await supabase
    .from('employees')
    .select(
      'id, employee_code, status, date_of_joining, manager_id, departments(name), designations(title), branches(name), employee_profiles(first_name, last_name, personal_email, phone, dob, gender)'
    )
    .eq('id', employeeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const profile = data.employee_profiles as unknown as {
    first_name: string;
    last_name: string | null;
    personal_email: string | null;
    phone: string | null;
    dob: string | null;
    gender: string | null;
  } | null;
  const department = data.departments as unknown as { name: string } | null;
  const designation = data.designations as unknown as { title: string } | null;
  const branch = data.branches as unknown as { name: string } | null;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  return {
    id: data.id as string,
    code: data.employee_code as string,
    name: name || '(Profile incomplete)',
    department: department?.name ?? null,
    designation: designation?.title ?? null,
    branch: branch?.name ?? null,
    status: data.status as EmployeeDetailRecord['status'],
    doj: data.date_of_joining as string,
    managerId: data.manager_id as string | null,
    personalEmail: profile?.personal_email ?? null,
    phone: profile?.phone ?? null,
    dob: profile?.dob ?? null,
    gender: profile?.gender ?? null,
  };
}
