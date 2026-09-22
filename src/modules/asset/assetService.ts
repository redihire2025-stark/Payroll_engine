import { supabase } from '@/shared/lib/supabaseClient';

export interface AssetRow {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  assignedTo: string | null;
}

export async function listAssets(companyId: string): Promise<AssetRow[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('id, name, category, serial_number, status, asset_assignments(employee_id, returned_at, employees(employee_code, employee_profiles(first_name, last_name)))')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((r) => {
    const assignments = (r.asset_assignments as unknown as {
      employee_id: string;
      returned_at: string | null;
      employees: { employee_code: string; employee_profiles: { first_name: string; last_name: string | null } | null } | null;
    }[]) ?? [];
    const active = assignments.find((a) => !a.returned_at);
    const name = active
      ? [active.employees?.employee_profiles?.first_name, active.employees?.employee_profiles?.last_name].filter(Boolean).join(' ') || active.employees?.employee_code
      : null;
    return {
      id: r.id as string,
      name: r.name as string,
      category: r.category as string,
      serialNumber: r.serial_number as string | null,
      status: r.status as AssetRow['status'],
      assignedTo: name ?? null,
    };
  });
}

export async function createAsset(companyId: string, name: string, category: string, serialNumber?: string): Promise<void> {
  const { error } = await supabase.from('assets').insert({ company_id: companyId, name, category, serial_number: serialNumber || null });
  if (error) throw error;
}

export async function issueAsset(assetId: string, employeeId: string, condition?: string): Promise<void> {
  const { error: assignErr } = await supabase.from('asset_assignments').insert({ asset_id: assetId, employee_id: employeeId, condition_on_issue: condition || null });
  if (assignErr) throw assignErr;
  const { error: statusErr } = await supabase.from('assets').update({ status: 'assigned' }).eq('id', assetId);
  if (statusErr) throw statusErr;
}

export async function returnAsset(assetId: string, condition?: string): Promise<void> {
  const { data: active, error: findErr } = await supabase
    .from('asset_assignments')
    .select('id')
    .eq('asset_id', assetId)
    .is('returned_at', null)
    .maybeSingle();
  if (findErr) throw findErr;
  if (active) {
    const { error } = await supabase
      .from('asset_assignments')
      .update({ returned_at: new Date().toISOString().slice(0, 10), condition_on_return: condition || null })
      .eq('id', active.id);
    if (error) throw error;
  }
  const { error: statusErr } = await supabase.from('assets').update({ status: 'available' }).eq('id', assetId);
  if (statusErr) throw statusErr;
}

export interface MyAssetRow {
  name: string;
  category: string;
  issuedAt: string;
}

export async function listMyAssets(employeeId: string): Promise<MyAssetRow[]> {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select('issued_at, assets(name, category)')
    .eq('employee_id', employeeId)
    .is('returned_at', null);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const asset = r.assets as unknown as { name: string; category: string } | null;
    return { name: asset?.name ?? 'Asset', category: asset?.category ?? '', issuedAt: r.issued_at as string };
  });
}
