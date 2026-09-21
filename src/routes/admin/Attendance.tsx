import { Card, CardHeader } from '@/shared/ui/Card';
import { StatTile } from '@/shared/ui/StatTile';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/ui/icons';
import { attendanceCorrections, employees } from '@/shared/lib/mockData';

const cols = '1.8fr 1fr 1fr 1fr 2fr 1fr 1.2fr';

export default function Attendance() {
  const pending = attendanceCorrections.filter((c) => c.status === 'pending');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Attendance</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">Correction requests and monthly overview</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5">
          <ChevronLeftIcon width={15} height={15} className="text-text-faint" />
          <span className="text-[13px] font-semibold text-text">September 2026</span>
          <ChevronRightIcon width={15} height={15} className="text-text-faint" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Present Rate" value="94.2%" trend="+0.8% vs Aug" />
        <StatTile label="Late Arrivals" value="18" trend="This month" trendTone="warning" />
        <StatTile label="LOP Days Logged" value="6" trend="Across 4 employees" trendTone="danger" />
        <StatTile label="Pending Corrections" value={String(pending.length)} trend="Needs review" trendTone="warning" />
      </div>

      <Card>
        <CardHeader title="Correction Requests" subtitle={`${pending.length} pending approval`} />
        <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
          {['Employee', 'Date', 'Requested In', 'Requested Out', 'Reason', 'Status', ''].map((h) => (
            <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
          ))}
        </div>
        {attendanceCorrections.map((c) => {
          const emp = employees.find((e) => e.id === c.employeeId)!;
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: cols }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
              <div className="flex items-center gap-2.5">
                <Avatar name={emp.name} size={28} />
                <span className="truncate font-medium text-text">{emp.name}</span>
              </div>
              <div className="font-mono-num text-text-muted">{c.date}</div>
              <div className="font-mono-num text-text-muted">{c.requestedIn}</div>
              <div className="font-mono-num text-text-muted">{c.requestedOut}</div>
              <div className="truncate text-text-muted">{c.reason}</div>
              <div>
                <Badge tone={c.status === 'pending' ? 'warning' : c.status === 'approved' ? 'success' : 'danger'}>
                  {c.status}
                </Badge>
              </div>
              <div className="flex justify-end gap-1.5">
                {c.status === 'pending' && (
                  <>
                    <Button size="sm" variant="secondary">Reject</Button>
                    <Button size="sm" variant="primary">Approve</Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
