import { Link } from 'react-router-dom';
import { Card, CardHeader } from '@/shared/ui/Card';
import { StatTile } from '@/shared/ui/StatTile';
import { Badge } from '@/shared/ui/Badge';
import { Stepper } from '@/shared/ui/Stepper';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { formatINR } from '@/shared/lib/format';
import { payrollRuns, leaveRequests, attendanceCorrections, employees } from '@/shared/lib/mockData';

const STEPS = ['Draft', 'Calculating', 'Calculated', 'Under Review', 'Approved', 'Locked', 'Paid'];
const statusIndex: Record<string, number> = { draft: 0, calculating: 1, calculated: 2, under_review: 3, approved: 4, locked: 5, paid: 6 };
const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral', calculating: 'info', calculated: 'info', under_review: 'warning', approved: 'success', locked: 'neutral', paid: 'success', cancelled: 'danger',
};

export default function Dashboard() {
  const currentRun = payrollRuns[0];
  const pendingLeave = leaveRequests.filter((l) => l.status === 'pending');
  const pendingCorrections = attendanceCorrections.filter((a) => a.status === 'pending');
  const activeEmployees = employees.filter((e) => e.status === 'active').length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-text">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Meridian Textiles Pvt Ltd · September 2026</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Active Employees" value={String(activeEmployees)} trend="+3 this month" />
        <StatTile label="Upcoming Payroll" value="Sep 30, 2026" trend="8 days away" trendTone="warning" />
        <StatTile label="Pending Approvals" value={String(pendingLeave.length + pendingCorrections.length)} trend="Needs attention" trendTone="warning" />
        <StatTile label="This Month Payroll Cost" value={formatINR(currentRun.gross)} trend="+1.5% vs Aug" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader
              title="Payroll Status"
              subtitle={`${currentRun.period} · ${currentRun.employeeCount} employees`}
              action={
                <Link to={`/admin/payroll/${currentRun.id}`}>
                  <Button variant="secondary" size="sm">View Run</Button>
                </Link>
              }
            />
            <div className="px-5 py-6">
              <Stepper steps={STEPS} currentIndex={statusIndex[currentRun.status]} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent Payroll Runs" subtitle="Last 5 processed cycles" action={<Link to="/admin/payroll" className="text-[12.5px] font-semibold text-accent">View all</Link>} />
            <div className="flex flex-col">
              {payrollRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                  <div className="font-medium text-text">{run.period}</div>
                  <div className="font-mono-num text-text-muted">{formatINR(run.net)}</div>
                  <Badge tone={statusTone[run.status]}>{run.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Pending Approvals" subtitle={`${pendingLeave.length + pendingCorrections.length} items need your review`} />
            <div className="flex flex-col divide-y divide-border-soft">
              {pendingLeave.slice(0, 2).map((l) => {
                const emp = employees.find((e) => e.id === l.employeeId)!;
                return (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={emp.name} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-text">{emp.name}</div>
                      <div className="text-[11.5px] text-text-faint">{l.leaveType} · {l.days}d</div>
                    </div>
                    <Badge tone="warning">Leave</Badge>
                  </div>
                );
              })}
              {pendingCorrections.slice(0, 2).map((c) => {
                const emp = employees.find((e) => e.id === c.employeeId)!;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={emp.name} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-text">{emp.name}</div>
                      <div className="text-[11.5px] text-text-faint">Attendance correction</div>
                    </div>
                    <Badge tone="info">Attendance</Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Attendance Today" />
            <div className="grid grid-cols-3 gap-3 px-5 py-4 text-center">
              <div>
                <div className="font-mono-num text-lg font-bold text-success">128</div>
                <div className="text-[11px] text-text-faint">Present</div>
              </div>
              <div>
                <div className="font-mono-num text-lg font-bold text-warning">9</div>
                <div className="text-[11px] text-text-faint">On Leave</div>
              </div>
              <div>
                <div className="font-mono-num text-lg font-bold text-danger">5</div>
                <div className="text-[11px] text-text-faint">Absent</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Announcements" />
            <div className="px-5 py-4 text-[12.5px] text-text-muted">
              <p className="font-semibold text-text">Gandhi Jayanti holiday — Oct 2</p>
              <p className="mt-1">Office closed company-wide. Applies to all branches.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
