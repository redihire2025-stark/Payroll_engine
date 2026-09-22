import { supabase } from '@/shared/lib/supabaseClient';

export interface SalaryStructureRow {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
}

export async function listSalaryStructures(companyId: string): Promise<SalaryStructureRow[]> {
  const { data, error } = await supabase
    .from('salary_structures')
    .select('id, name, status')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as SalaryStructureRow[];
}

export async function createSalaryStructure(companyId: string, name: string): Promise<string> {
  const { data, error } = await supabase.from('salary_structures').insert({ company_id: companyId, name, status: 'active' }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export interface SalaryComponentRow {
  id: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction' | 'employer_contribution';
}

export async function listSalaryComponents(companyId: string): Promise<SalaryComponentRow[]> {
  const { data, error } = await supabase.from('salary_components').select('id, name, code, type').eq('company_id', companyId).order('name');
  if (error) throw error;
  return (data ?? []) as SalaryComponentRow[];
}

export interface StructureComponentRow {
  id: string;
  salaryComponentId: string;
  code: string;
  name: string;
  type: SalaryComponentRow['type'];
  isTaxable: boolean;
  isStatutory: boolean;
  valueType: 'amount' | 'percentage';
  value: number;
  percentageOfComponentId: string | null;
}

export async function getStructureComponents(structureId: string): Promise<StructureComponentRow[]> {
  const { data, error } = await supabase
    .from('salary_structure_components')
    .select('id, value_type, value, sequence, percentage_of_component_id, salary_components(id, name, code, type, is_taxable, is_statutory)')
    .eq('salary_structure_id', structureId)
    .order('sequence');
  if (error) throw error;
  return (data ?? []).map((r) => {
    const c = r.salary_components as unknown as {
      id: string; name: string; code: string; type: SalaryComponentRow['type']; is_taxable: boolean; is_statutory: boolean;
    } | null;
    return {
      id: r.id as string,
      salaryComponentId: c?.id ?? '',
      code: c?.code ?? '',
      name: c?.name ?? 'Component',
      type: c?.type ?? 'earning',
      isTaxable: c?.is_taxable ?? true,
      isStatutory: c?.is_statutory ?? false,
      valueType: r.value_type as StructureComponentRow['valueType'],
      value: Number(r.value),
      percentageOfComponentId: (r.percentage_of_component_id as string | null) ?? null,
    };
  });
}

export interface AddStructureComponentInput {
  companyId: string;
  structureId: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  valueType: 'amount' | 'percentage';
  value: number;
  percentageOfComponentId?: string;
  sequence: number;
}

/** Creates the reusable salary_component (company-scoped) and links it into this structure in one step. */
export async function addStructureComponent(input: AddStructureComponentInput): Promise<void> {
  const { data: component, error: componentErr } = await supabase
    .from('salary_components')
    .insert({
      company_id: input.companyId,
      name: input.name,
      code: input.code.toUpperCase(),
      type: input.type,
      calculation_type: input.valueType === 'percentage' ? 'percentage_of' : 'fixed',
      is_taxable: input.type === 'earning',
      is_statutory: false,
    })
    .select('id')
    .single();
  if (componentErr) throw componentErr;

  const { error: linkErr } = await supabase.from('salary_structure_components').insert({
    salary_structure_id: input.structureId,
    salary_component_id: component.id,
    value_type: input.valueType,
    value: input.value,
    percentage_of_component_id: input.percentageOfComponentId || null,
    sequence: input.sequence,
  });
  if (linkErr) throw linkErr;
}

export interface SalaryAssignmentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  annualCtc: number;
  effectiveFrom: string;
}

export async function listStructureAssignments(structureId: string): Promise<SalaryAssignmentRow[]> {
  const { data, error } = await supabase
    .from('employee_salary_assignments')
    .select('id, employee_id, annual_ctc, effective_from, employees(employee_code, employee_profiles(first_name, last_name))')
    .eq('salary_structure_id', structureId)
    .is('effective_to', null)
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const employee = r.employees as unknown as { employee_code: string; employee_profiles: { first_name: string; last_name: string | null } | null } | null;
    const name = [employee?.employee_profiles?.first_name, employee?.employee_profiles?.last_name].filter(Boolean).join(' ');
    return {
      id: r.id as string,
      employeeId: r.employee_id as string,
      employeeName: name || employee?.employee_code || 'Unknown',
      annualCtc: Number(r.annual_ctc),
      effectiveFrom: r.effective_from as string,
    };
  });
}

export interface AssignSalaryStructureInput {
  employeeId: string;
  salaryStructureId: string;
  annualCtc: number;
  effectiveFrom: string;
}

/** Closes out any prior open assignment for this employee (effective_to = day before) before opening the new one, so getCurrentSalaryAssignment never sees two open rows. */
export async function assignSalaryStructure(input: AssignSalaryStructureInput): Promise<void> {
  const { data: priorOpen, error: findErr } = await supabase
    .from('employee_salary_assignments')
    .select('id')
    .eq('employee_id', input.employeeId)
    .is('effective_to', null);
  if (findErr) throw findErr;

  if (priorOpen && priorOpen.length > 0) {
    const dayBefore = new Date(input.effectiveFrom);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const closeDate = dayBefore.toISOString().slice(0, 10);
    for (const row of priorOpen) {
      const { error } = await supabase.from('employee_salary_assignments').update({ effective_to: closeDate }).eq('id', row.id);
      if (error) throw error;
    }
  }

  const { error } = await supabase.from('employee_salary_assignments').insert({
    employee_id: input.employeeId,
    salary_structure_id: input.salaryStructureId,
    annual_ctc: input.annualCtc,
    effective_from: input.effectiveFrom,
  });
  if (error) throw error;
}

export interface CurrentAssignment {
  salaryStructureId: string;
  annualCtc: number;
}

export async function getCurrentSalaryAssignment(employeeId: string, asOfDate: string): Promise<CurrentAssignment | null> {
  const { data, error } = await supabase
    .from('employee_salary_assignments')
    .select('salary_structure_id, annual_ctc')
    .eq('employee_id', employeeId)
    .lte('effective_from', asOfDate)
    .or(`effective_to.is.null,effective_to.gte.${asOfDate}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { salaryStructureId: data.salary_structure_id as string, annualCtc: Number(data.annual_ctc) };
}
