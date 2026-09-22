import { supabase } from '@/shared/lib/supabaseClient';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  isOptional: boolean;
  branchName: string | null;
}

export async function listHolidays(companyId: string): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('id, name, date, is_optional, branches(name)')
    .eq('company_id', companyId)
    .order('date');
  if (error) throw error;
  return (data ?? []).map((h) => {
    const branch = h.branches as unknown as { name: string } | null;
    return {
      id: h.id as string,
      name: h.name as string,
      date: h.date as string,
      isOptional: h.is_optional as boolean,
      branchName: branch?.name ?? null,
    };
  });
}

export interface CreateHolidayInput {
  companyId: string;
  name: string;
  date: string;
  isOptional?: boolean;
}

export async function createHoliday(input: CreateHolidayInput): Promise<void> {
  const { error } = await supabase.from('holidays').insert({
    company_id: input.companyId,
    name: input.name,
    date: input.date,
    is_optional: input.isOptional ?? false,
  });
  if (error) throw error;
}

export async function deleteHoliday(holidayId: string): Promise<void> {
  const { error } = await supabase.from('holidays').delete().eq('id', holidayId);
  if (error) throw error;
}
