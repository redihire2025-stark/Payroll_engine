import { Card } from '@/shared/ui/Card';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Select, SearchInput } from '@/shared/ui/Input';
import { auditLogEntries } from '@/shared/lib/mockData';

const actionTone: Record<string, BadgeTone> = {
  CREATED: 'info', CALCULATED: 'info', UPDATED: 'warning', APPROVED: 'success', LOCKED: 'neutral', PAID: 'success', GENERATED: 'neutral',
};

const cols = '1.4fr 1.2fr 1fr 2.4fr 1fr';

export default function AuditLog() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Audit Log</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Every sensitive action, who performed it, and when</p>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput placeholder="Search entity or actor…" />
        <Select defaultValue="all"><option value="all">All Modules</option><option>Payroll</option><option>Leave</option><option>Employee</option></Select>
        <Select defaultValue="7d"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option></Select>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
          {['Timestamp', 'Actor', 'Action', 'Entity', 'IP Address'].map((h) => (
            <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
          ))}
        </div>
        {auditLogEntries.map((a) => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: cols }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
            <div className="font-mono-num text-text-muted">{a.time}</div>
            <div className="font-medium text-text">{a.actor}</div>
            <div><Badge tone={actionTone[a.action] ?? 'neutral'}>{a.action}</Badge></div>
            <div className="truncate text-accent">{a.entity}</div>
            <div className="font-mono-num text-text-faint">{a.ip}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
