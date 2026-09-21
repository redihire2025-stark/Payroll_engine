import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { leaveRequests, employees } from '@/shared/lib/mockData';

const tabs = ['Pending', 'Approved', 'Rejected', 'All'] as const;
const cols = '1.8fr 1.2fr 1.6fr 0.7fr 2.2fr 1fr 1.3fr';

export default function Leave() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Pending');
  const filtered = leaveRequests.filter((l) => tab === 'All' || l.status === tab.toLowerCase());

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Leave Requests</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Review and act on employee leave applications</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3.5 pb-2.5 text-[13px] font-semibold ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint hover:text-text-muted'
            }`}
          >
            {t} {t === 'Pending' && <span className="ml-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] text-warning">{leaveRequests.filter((l) => l.status === 'pending').length}</span>}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
          {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Applied On', ''].map((h) => (
            <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
          ))}
        </div>
        {filtered.map((l) => {
          const emp = employees.find((e) => e.id === l.employeeId)!;
          return (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: cols }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
              <div className="flex items-center gap-2.5">
                <Avatar name={emp.name} size={28} />
                <span className="truncate font-medium text-text">{emp.name}</span>
              </div>
              <div><Badge tone="info">{l.leaveType}</Badge></div>
              <div className="font-mono-num text-text-muted">{l.startDate} – {l.endDate}</div>
              <div className="font-mono-num text-text-muted">{l.days}</div>
              <div className="truncate text-text-muted">{l.reason}</div>
              <div className="font-mono-num text-text-muted">{l.appliedOn}</div>
              <div className="flex justify-end gap-1.5">
                {l.status === 'pending' ? (
                  <>
                    <Button size="sm" variant="secondary">Reject</Button>
                    <Button size="sm" variant="primary">Approve</Button>
                  </>
                ) : (
                  <Badge tone={l.status === 'approved' ? 'success' : 'danger'}>{l.status}</Badge>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
