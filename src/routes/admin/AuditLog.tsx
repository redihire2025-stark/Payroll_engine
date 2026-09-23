import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Select, SearchInput } from '@/shared/ui/Input';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ShieldIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listAuditLogs } from '@/modules/audit/auditService';

const actionTone: Record<string, BadgeTone> = {
  CREATED: 'info', CALCULATED: 'info', UPDATED: 'warning', APPROVED: 'success', LOCKED: 'neutral', PAID: 'success', GENERATED: 'neutral',
};

const cols = '1.4fr 1.2fr 1fr 2.4fr 1fr';

export default function AuditLog() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const { data, isLoading, error } = useQuery({ queryKey: ['audit-logs', companyId], queryFn: () => listAuditLogs(companyId) });
  const entries = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Audit Log</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Every sensitive action, who performed it, and when</p>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput placeholder="Search entity or actor…" />
        <Select defaultValue="all"><option value="all">All Modules</option></Select>
        <Select defaultValue="30d"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option></Select>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : entries.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<ShieldIcon width={20} height={20} />} title="No audit activity yet" description="Sensitive actions — payroll changes, approvals, permission changes — are logged here as they happen." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 700 }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Timestamp', 'Actor', 'Action', 'Entity', 'IP Address'].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {entries.map((a) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 700 }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                <div className="font-mono-num text-text-muted">{new Date(a.createdAt).toLocaleString()}</div>
                <div className="font-medium text-text">{a.actorId ?? 'System'}</div>
                <div><Badge tone={actionTone[a.action] ?? 'neutral'}>{a.action}</Badge></div>
                <div className="truncate text-accent">{a.entityType}{a.entityId ? ` · ${a.entityId.slice(0, 8)}` : ''}</div>
                <div className="font-mono-num text-text-faint">{a.ipAddress ?? '—'}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
