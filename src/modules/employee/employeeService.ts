import { supabase } from '@/shared/lib/supabaseClient';
import { createOrgLookupCache, resolveBranchId, resolveDepartmentId, resolveDesignationId } from '@/modules/company/orgStructureService';
import { callNetlifyFunction } from '@/shared/lib/netlifyFunctions';

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
  hasPortalAccess: boolean;
}

export async function getEmployee(employeeId: string): Promise<EmployeeDetailRecord | null> {
  const { data, error } = await supabase
    .from('employees')
    .select(
      'id, employee_code, status, date_of_joining, manager_id, auth_user_id, departments(name), designations(title), branches(name), employee_profiles(first_name, last_name, personal_email, phone, dob, gender)'
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
    hasPortalAccess: Boolean(data.auth_user_id),
  };
}

export interface EmployeePayslipSidebar {
  bankName: string | null;
  bankIfsc: string | null;
  bankAccountOnFile: boolean;
  pfNumber: string | null;
  uan: string | null;
  panOnFile: boolean;
}

/**
 * The extra letterhead-style fields a payslip conventionally shows
 * (bank, PF/UAN, PAN) beyond the core employee record. Bank account number
 * and PAN are stored pgp-encrypted at the application layer (see
 * employee_bank_accounts / employee_tax_profiles in
 * 0001_core_schema.sql) and there's no decrypt pathway wired up yet, so
 * this only reports whether one is on file rather than the actual value —
 * everything else here (bank name, IFSC, PF number, UAN) is plaintext.
 */
export async function getEmployeePayslipSidebar(employeeId: string): Promise<EmployeePayslipSidebar> {
  const [{ data: bank }, { data: statutory }, { data: tax }] = await Promise.all([
    supabase.from('employee_bank_accounts').select('bank_name, ifsc').eq('employee_id', employeeId).order('is_primary', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('employee_statutory_profiles').select('pf_number, uan').eq('employee_id', employeeId).maybeSingle(),
    supabase.from('employee_tax_profiles').select('pan_encrypted').eq('employee_id', employeeId).maybeSingle(),
  ]);
  return {
    bankName: (bank?.bank_name as string) ?? null,
    bankIfsc: (bank?.ifsc as string) ?? null,
    bankAccountOnFile: Boolean(bank),
    pfNumber: (statutory?.pf_number as string) ?? null,
    uan: (statutory?.uan as string) ?? null,
    panOnFile: Boolean(tax?.pan_encrypted),
  };
}

export interface AdminBankDetails {
  bankName: string | null;
  ifsc: string | null;
  accountLast4: string | null;
  panLast4: string | null;
  pfNumber: string | null;
  uan: string | null;
}

/** Masked read (last 4 digits only) — see netlify/functions/employee-bank-details.ts. */
export async function getEmployeeBankDetails(employeeId: string): Promise<AdminBankDetails> {
  return callNetlifyFunction('employee-bank-details', { action: 'get', employeeId });
}

export interface SaveBankDetailsInput {
  employeeId: string;
  bankName?: string;
  ifsc?: string;
  accountNumber?: string;
  panNumber?: string;
  pfNumber?: string;
  uan?: string;
}

/** Encrypts account number + PAN server-side before storing — see netlify/functions/employee-bank-details.ts. */
export async function saveEmployeeBankDetails(input: SaveBankDetailsInput): Promise<void> {
  await callNetlifyFunction('employee-bank-details', { action: 'save', ...input });
}

export interface CreateEmployeeInput {
  companyId: string;
  employeeCode: string;
  firstName: string;
  lastName?: string;
  personalEmail?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  dateOfJoining: string;
  employmentType?: string;
  departmentName?: string;
  designationTitle?: string;
  branchName?: string;
}

/** Optional shared cache so a bulk import doesn't re-lookup/re-create the same department/designation/branch name per row. */
type OrgLookupCache = Map<string, string>;

export async function createEmployee(input: CreateEmployeeInput, cache: OrgLookupCache = createOrgLookupCache()): Promise<string> {
  const [departmentId, designationId, branchId] = await Promise.all([
    resolveDepartmentId(input.companyId, input.departmentName, cache),
    resolveDesignationId(input.companyId, input.designationTitle, cache),
    resolveBranchId(input.companyId, input.branchName, cache),
  ]);

  const { data: employee, error } = await supabase
    .from('employees')
    .insert({
      company_id: input.companyId,
      employee_code: input.employeeCode,
      department_id: departmentId,
      designation_id: designationId,
      branch_id: branchId,
      date_of_joining: input.dateOfJoining,
      employment_type: input.employmentType || 'full_time',
    })
    .select('id')
    .single();
  if (error) throw error;

  const { error: profileErr } = await supabase.from('employee_profiles').insert({
    employee_id: employee.id,
    first_name: input.firstName,
    last_name: input.lastName || null,
    personal_email: input.personalEmail || null,
    phone: input.phone || null,
    dob: input.dob || null,
    gender: input.gender || null,
  });
  if (profileErr) throw profileErr;

  return employee.id as string;
}

export interface UpdateEmployeeInput {
  employeeId: string;
  companyId: string;
  firstName: string;
  lastName?: string;
  personalEmail?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  dateOfJoining: string;
  dateOfExit?: string;
  status: 'active' | 'on_leave' | 'exited';
  employmentType?: string;
  managerId?: string;
  departmentName?: string;
  designationTitle?: string;
  branchName?: string;
}

/** Full-replace update: the edit form is always pre-filled from getEmployee(), so every field is sent explicitly rather than merged. */
export async function updateEmployee(input: UpdateEmployeeInput): Promise<void> {
  const cache = createOrgLookupCache();
  const [departmentId, designationId, branchId] = await Promise.all([
    resolveDepartmentId(input.companyId, input.departmentName, cache),
    resolveDesignationId(input.companyId, input.designationTitle, cache),
    resolveBranchId(input.companyId, input.branchName, cache),
  ]);

  const { error: employeeErr } = await supabase
    .from('employees')
    .update({
      department_id: departmentId,
      designation_id: designationId,
      branch_id: branchId,
      manager_id: input.managerId || null,
      date_of_joining: input.dateOfJoining,
      date_of_exit: input.dateOfExit || null,
      status: input.status,
      employment_type: input.employmentType || 'full_time',
    })
    .eq('id', input.employeeId);
  if (employeeErr) throw employeeErr;

  const { error: profileErr } = await supabase
    .from('employee_profiles')
    .update({
      first_name: input.firstName,
      last_name: input.lastName || null,
      personal_email: input.personalEmail || null,
      phone: input.phone || null,
      dob: input.dob || null,
      gender: input.gender || null,
    })
    .eq('employee_id', input.employeeId);
  if (profileErr) throw profileErr;
}

/** Authorization is derived server-side from the caller's own session, never a client-supplied id (see portal-access.ts). */
export async function grantPortalAccess(employeeId: string, email: string, role = 'employee'): Promise<void> {
  await callNetlifyFunction('portal-access', { action: 'grant', employeeId, email, role });
}

export async function revokePortalAccess(employeeId: string): Promise<void> {
  await callNetlifyFunction('portal-access', { action: 'revoke', employeeId });
}

export async function deactivateEmployee(employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ status: 'exited', date_of_exit: new Date().toISOString().slice(0, 10) })
    .eq('id', employeeId);
  if (error) throw error;
}

export interface BulkCreateResult {
  successCount: number;
  errors: { row: number; message: string }[];
}

/** Runs sequentially (not in parallel) so department/designation/branch name lookups can share one cache without racing duplicate creates. */
export async function bulkCreateEmployees(companyId: string, rows: Omit<CreateEmployeeInput, 'companyId'>[]): Promise<BulkCreateResult> {
  const cache = createOrgLookupCache();
  const errors: BulkCreateResult['errors'] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    try {
      await createEmployee({ ...rows[i], companyId }, cache);
      successCount += 1;
    } catch (err) {
      errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return { successCount, errors };
}
