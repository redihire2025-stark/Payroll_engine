import { supabase } from '@/shared/lib/supabaseClient';

export interface AuditLogRow {
  id: string;
  createdAt: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
}

export async function listAuditLogs(companyId: string): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, created_at, actor_id, action, entity_type, entity_id, ip_address')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    createdAt: r.created_at as string,
    actorId: r.actor_id as string | null,
    action: r.action as string,
    entityType: r.entity_type as string,
    entityId: r.entity_id as string | null,
    ipAddress: r.ip_address as string | null,
  }));
}
