import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';

export interface CycleRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'closed';
}

export async function listCycles(companyId: string): Promise<CycleRow[]> {
  const { data, error } = await supabase
    .from('performance_cycles')
    .select('id, name, start_date, end_date, status')
    .eq('company_id', companyId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    status: r.status as CycleRow['status'],
  }));
}

export async function getActiveCycle(companyId: string): Promise<CycleRow | null> {
  const { data, error } = await supabase
    .from('performance_cycles')
    .select('id, name, start_date, end_date, status')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id as string, name: data.name as string, startDate: data.start_date as string, endDate: data.end_date as string, status: data.status as CycleRow['status'] };
}

export async function createCycle(companyId: string, name: string, startDate: string, endDate: string): Promise<void> {
  const { error } = await supabase.from('performance_cycles').insert({ company_id: companyId, name, start_date: startDate, end_date: endDate });
  if (error) throw error;
}

export async function updateCycleStatus(cycleId: string, status: CycleRow['status']): Promise<void> {
  const { error } = await supabase.from('performance_cycles').update({ status }).eq('id', cycleId);
  if (error) throw error;
}

export interface GoalRow {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}

export async function listGoalsForCycle(companyId: string, cycleId: string): Promise<GoalRow[]> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('goals')
    .select('id, cycle_id, employee_id, title, description, status')
    .eq('cycle_id', cycleId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    cycleId: r.cycle_id as string,
    employeeId: r.employee_id as string,
    employeeName: nameById.get(r.employee_id as string) ?? 'Unknown',
    title: r.title as string,
    description: r.description as string | null,
    status: r.status as GoalRow['status'],
  }));
}

export async function listMyGoals(cycleId: string, employeeId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, cycle_id, employee_id, title, description, status')
    .eq('cycle_id', cycleId)
    .eq('employee_id', employeeId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    cycleId: r.cycle_id as string,
    employeeId: r.employee_id as string,
    employeeName: '',
    title: r.title as string,
    description: r.description as string | null,
    status: r.status as GoalRow['status'],
  }));
}

export async function addGoal(cycleId: string, employeeId: string, title: string, description: string): Promise<void> {
  const { error } = await supabase.from('goals').insert({ cycle_id: cycleId, employee_id: employeeId, title, description: description || null });
  if (error) throw error;
}

export async function updateGoalStatus(goalId: string, status: GoalRow['status']): Promise<void> {
  const { error } = await supabase.from('goals').update({ status }).eq('id', goalId);
  if (error) throw error;
}

export interface ReviewRow {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  selfRating: number | null;
  selfComments: string | null;
  managerRating: number | null;
  managerComments: string | null;
  status: 'pending' | 'self_submitted' | 'manager_submitted';
}

function mapReview(r: Record<string, unknown>, employeeName = ''): ReviewRow {
  return {
    id: r.id as string,
    cycleId: r.cycle_id as string,
    employeeId: r.employee_id as string,
    employeeName,
    selfRating: r.self_rating as number | null,
    selfComments: r.self_comments as string | null,
    managerRating: r.manager_rating as number | null,
    managerComments: r.manager_comments as string | null,
    status: r.status as ReviewRow['status'],
  };
}

export async function listReviewsForCycle(companyId: string, cycleId: string): Promise<ReviewRow[]> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('reviews')
    .select('id, cycle_id, employee_id, self_rating, self_comments, manager_rating, manager_comments, status')
    .eq('cycle_id', cycleId);
  if (error) throw error;
  return (data ?? []).map((r) => mapReview(r, nameById.get(r.employee_id as string) ?? 'Unknown'));
}

export async function getMyReview(cycleId: string, employeeId: string): Promise<ReviewRow | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, cycle_id, employee_id, self_rating, self_comments, manager_rating, manager_comments, status')
    .eq('cycle_id', cycleId)
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapReview(data) : null;
}

export async function submitSelfReview(cycleId: string, employeeId: string, rating: number, comments: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .upsert(
      { cycle_id: cycleId, employee_id: employeeId, self_rating: rating, self_comments: comments, status: 'self_submitted', updated_at: new Date().toISOString() },
      { onConflict: 'cycle_id,employee_id' },
    );
  if (error) throw error;
}

export async function submitManagerReview(cycleId: string, employeeId: string, rating: number, comments: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .upsert(
      { cycle_id: cycleId, employee_id: employeeId, manager_rating: rating, manager_comments: comments, status: 'manager_submitted', updated_at: new Date().toISOString() },
      { onConflict: 'cycle_id,employee_id' },
    );
  if (error) throw error;
}
