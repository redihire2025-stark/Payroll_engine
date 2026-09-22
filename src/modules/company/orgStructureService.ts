import { supabase } from '@/shared/lib/supabaseClient';

export interface OrgOption {
  id: string;
  name: string;
}

export async function listDepartments(companyId: string): Promise<OrgOption[]> {
  const { data, error } = await supabase.from('departments').select('id, name').eq('company_id', companyId).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listDesignations(companyId: string): Promise<OrgOption[]> {
  const { data, error } = await supabase.from('designations').select('id, title').eq('company_id', companyId).order('title');
  if (error) throw error;
  return (data ?? []).map((d) => ({ id: d.id as string, name: d.title as string }));
}

export async function listBranches(companyId: string): Promise<OrgOption[]> {
  const { data, error } = await supabase.from('branches').select('id, name').eq('company_id', companyId).order('name');
  if (error) throw error;
  return data ?? [];
}

/** Looks up a lookup-table row by name within the company, creating it if it doesn't exist yet. Case-insensitive match. */
async function findOrCreateByName(
  table: 'departments' | 'designations' | 'branches',
  nameColumn: 'name' | 'title',
  companyId: string,
  rawName: string | undefined,
  cache: Map<string, string>
): Promise<string | null> {
  const name = rawName?.trim();
  if (!name) return null;

  const cacheKey = `${table}:${name.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data: existing, error: findErr } = await supabase
    .from(table)
    .select('id')
    .eq('company_id', companyId)
    .ilike(nameColumn, name)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) {
    cache.set(cacheKey, existing.id as string);
    return existing.id as string;
  }

  const { data: created, error: createErr } = await supabase
    .from(table)
    .insert({ company_id: companyId, [nameColumn]: name })
    .select('id')
    .single();
  if (createErr) throw createErr;
  cache.set(cacheKey, created.id as string);
  return created.id as string;
}

/** Shared across a batch of lookups (e.g. a bulk employee import) so repeated names hit the cache instead of racing duplicate inserts. */
export function createOrgLookupCache() {
  return new Map<string, string>();
}

export async function resolveDepartmentId(companyId: string, name: string | undefined, cache: Map<string, string>) {
  return findOrCreateByName('departments', 'name', companyId, name, cache);
}
export async function resolveDesignationId(companyId: string, title: string | undefined, cache: Map<string, string>) {
  return findOrCreateByName('designations', 'title', companyId, title, cache);
}
export async function resolveBranchId(companyId: string, name: string | undefined, cache: Map<string, string>) {
  return findOrCreateByName('branches', 'name', companyId, name, cache);
}
