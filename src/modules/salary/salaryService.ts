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

export interface SalaryComponentRow {
  name: string;
  type: 'earning' | 'deduction' | 'employer_contribution';
  valueType: 'amount' | 'percentage';
  value: number;
}

export async function getStructureComponents(structureId: string): Promise<SalaryComponentRow[]> {
  const { data, error } = await supabase
    .from('salary_structure_components')
    .select('value_type, value, sequence, salary_components(name, type)')
    .eq('salary_structure_id', structureId)
    .order('sequence');
  if (error) throw error;
  return (data ?? []).map((r) => {
    const component = r.salary_components as unknown as { name: string; type: SalaryComponentRow['type'] } | null;
    return {
      name: component?.name ?? 'Component',
      type: component?.type ?? 'earning',
      valueType: r.value_type as SalaryComponentRow['valueType'],
      value: Number(r.value),
    };
  });
}
