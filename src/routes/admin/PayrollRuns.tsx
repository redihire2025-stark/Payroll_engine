import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { PlusIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { payrollRuns } from '@/shared/lib/mockData';

const statusTone: Record<string, BadgeTone> = {
  draft: 'neutral', calculating: 'info', calculated: 'info', under_review: 'warning', approved: 'success', locked: 'neutral', paid: 'success', cancelled: 'danger',
};

const cols = '1.6fr 1fr 0.9fr 1.2fr 1.2fr 1.3fr 1.2fr 0.6fr';

export default function PayrollRuns() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Payroll</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">All payroll runs, regular and off-cycle</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />}>New Payroll Run</Button>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
          {['Period', 'Run Type', 'Employees', 'Gross', 'Net Payable', 'Status', 'Created By', ''].map((h) => (
            <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
          ))}
        </div>
        {payrollRuns.map((run) => (
          <Link
            to={`/admin/payroll/${run.id}`}
            key={run.id}
            style={{ display: 'grid', gridTemplateColumns: cols }}
            className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0 hover:bg-bg/70"
          >
            <div className="font-semibold text-text">{run.period}</div>
            <div className="capitalize text-text-muted">{run.runType.replace('_', '-')}</div>
            <div className="font-mono-num text-text-muted">{run.employeeCount}</div>
            <div className="font-mono-num text-text-muted">{formatINR(run.gross)}</div>
            <div className="font-mono-num font-semibold text-text">{formatINR(run.net)}</div>
            <div><Badge tone={statusTone[run.status]}>{run.status.replace('_', ' ')}</Badge></div>
            <div className="truncate text-text-muted">{run.createdBy}</div>
            <div className="text-right text-text-faint">···</div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
