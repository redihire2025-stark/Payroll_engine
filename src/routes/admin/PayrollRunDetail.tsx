import { Link, useParams } from 'react-router-dom';
import { Card, CardHeader } from '@/shared/ui/Card';
import { StatTile } from '@/shared/ui/StatTile';
import { Stepper } from '@/shared/ui/Stepper';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Avatar } from '@/shared/ui/Avatar';
import { formatINR } from '@/shared/lib/format';
import { currentRunItems, employees, payrollRuns } from '@/shared/lib/mockData';

const STEPS = ['Draft', 'Calculating', 'Calculated', 'Under Review', 'Approved', 'Locked', 'Paid'];
const cols = '1.8fr 0.9fr 0.8fr 0.8fr 0.7fr 0.8fr 1fr 1fr 0.6fr';

export default function PayrollRunDetail() {
  const { id } = useParams();
  const run = payrollRuns.find((r) => r.id === id) ?? payrollRuns[0];
  const gross = currentRunItems.reduce((s, i) => s + i.gross, 0);
  const deductions = currentRunItems.reduce((s, i) => s + i.pf + i.esi + i.pt + i.tds + i.otherDeductions, 0);
  const net = gross - deductions;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[12.5px] text-text-faint">
        <Link to="/admin/payroll" className="text-accent">Payroll</Link> / {run.period}
      </div>

      <Card>
        <div className="flex items-center justify-between px-6 py-5">
          <Stepper steps={STEPS} currentIndex={3} />
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm">Send Back</Button>
            <Button variant="primary" size="sm">Approve Run</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <StatTile label="Gross Earnings" value={formatINR(gross)} />
        <StatTile label="Statutory Deductions" value={formatINR(deductions)} trendTone="warning" />
        <StatTile label="Net Payable" value={formatINR(net)} />
        <StatTile label="Employees" value={String(currentRunItems.length)} />
      </div>

      <Card>
        <CardHeader title="Payroll Items" subtitle={`${run.period} · Rule set: India Payroll v2026.1`} />
        <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
          {['Employee', 'Gross', 'PF', 'ESI', 'PT', 'TDS', 'Other Ded.', 'Net Pay', ''].map((h) => (
            <div key={h} className="text-right text-[11px] font-bold uppercase tracking-wide text-text-faint first:text-left">{h}</div>
          ))}
        </div>
        {currentRunItems.map((item) => {
          const emp = employees.find((e) => e.id === item.employeeId)!;
          return (
            <div key={item.employeeId} style={{ display: 'grid', gridTemplateColumns: cols }} className="items-center gap-3 border-b border-border-soft px-5 py-3 text-[12.5px] last:border-b-0">
              <div className="flex items-center gap-2.5">
                <Avatar name={emp.name} size={26} />
                <span className="truncate font-medium text-text">{emp.name}</span>
                {item.lopDays > 0 && <Badge tone="warning">{item.lopDays}d LOP</Badge>}
              </div>
              <div className="text-right font-mono-num text-text-muted">{formatINR(item.gross)}</div>
              <div className="text-right font-mono-num text-text-muted">{formatINR(item.pf)}</div>
              <div className="text-right font-mono-num text-text-muted">{item.esi ? formatINR(item.esi) : '—'}</div>
              <div className="text-right font-mono-num text-text-muted">{formatINR(item.pt)}</div>
              <div className="text-right font-mono-num text-text-muted">{item.tds ? formatINR(item.tds) : '—'}</div>
              <div className="text-right font-mono-num text-text-muted">{item.otherDeductions ? formatINR(item.otherDeductions) : '—'}</div>
              <div className="text-right font-mono-num font-semibold text-text">{formatINR(item.net)}</div>
              <div className="text-right">
                <Link to={`/admin/payroll/${run.id}/payslip/${item.employeeId}`} className="text-accent">View</Link>
              </div>
            </div>
          );
        })}
        <div className="px-5 py-3 text-[11.5px] text-text-faint">
          Calculated 21 Sep 2026, 10:42 AM by Rohan Mehta · Rule set: India Payroll v2026.1
        </div>
      </Card>
    </div>
  );
}
