import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Select, SearchInput } from '@/shared/ui/Input';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ShieldIcon, FilterIcon, XIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listAuditLogs } from '@/modules/audit/auditService';

const actionTone: Record<string, BadgeTone> = {
  CREATED: 'info', CALCULATED: 'info', UPDATED: 'warning', APPROVED: 'success', LOCKED: 'neutral', PAID: 'success', GENERATED: 'neutral',
};

const cols = '1.4fr 1.2fr 1fr 2.4fr 1fr';

type DateRange = '7d' | '30d' | '90d' | 'all';

export default function AuditLog() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const { data, isLoading, error } = useQuery({ queryKey: ['audit-logs', companyId], queryFn: () => listAuditLogs(companyId) });
  const entries = data ?? [];

  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const modules = [...new Set(entries.map((a) => a.entityType))].sort();

  const searchLower = search.trim().toLowerCase();
  const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : null;
  const cutoff = rangeDays !== null ? Date.now() - rangeDays * 86400000 : null;

  const filtered = entries.filter((a) => {
    if (searchLower && !a.entityType.toLowerCase().includes(searchLower) && !(a.actorId ?? '').toLowerCase().includes(searchLower)) return false;
    if (moduleFilter !== 'all' && a.entityType !== moduleFilter) return false;
    if (cutoff !== null && new Date(a.createdAt).getTime() < cutoff) return false;
    return true;
  });
  const activeFilterCount = [Boolean(searchLower), moduleFilter !== 'all', dateRange !== '30d'].filter(Boolean).length;
  const filtersActive = activeFilterCount > 0;

  function clearFilters() {
    setSearch('');
    setModuleFilter('all');
    setDateRange('30d');
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Audit Log</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Every sensitive action, who performed it, and when</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-text-muted">
          <FilterIcon width={14} height={14} />
          Filters
          {filtersActive && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="h-5 w-px bg-border" />
        <SearchInput placeholder="Search entity or actor…" value={search} onChange={setSearch} />
        <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="all">All Modules</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </Select>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-text-faint transition-colors hover:bg-bg hover:text-danger"
          >
            <XIcon width={13} height={13} />
            Clear
          </button>
        )}
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : entries.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<ShieldIcon width={20} height={20} />} title="No audit activity yet" description="Sensitive actions — payroll changes, approvals, permission changes — are logged here as they happen." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<ShieldIcon width={20} height={20} />} title="No activity matches these filters" description="Try a different search term, module or date range." action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 700 }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Timestamp', 'Actor', 'Action', 'Entity', 'IP Address'].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {filtered.map((a) => (
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
