import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { PlusIcon, BanknoteIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listPayrollRuns } from '@/modules/payroll/payrollService';

const statusTone: Record<string, BadgeTone> = {
  draft: 'neutral', calculating: 'info', calculated: 'info', under_review: 'warning', approved: 'success', locked: 'neutral', paid: 'success', cancelled: 'danger',
};

const cols = '1.6fr 1fr 1.3fr 0.6fr';

export default function PayrollRuns() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const { data, isLoading, error } = useQuery({ queryKey: ['payroll-runs', companyId], queryFn: () => listPayrollRuns(companyId) });
  const runs = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Payroll</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">All payroll runs, regular and off-cycle</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />}>New Payroll Run</Button>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      {isLoading ? (
        <Card><LoadingRows /></Card>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={<BanknoteIcon width={22} height={22} />}
          title="No payroll runs yet"
          description="Once you create and calculate a payroll run, it will appear here with its status through the approval workflow."
          action={<Button variant="primary" icon={<PlusIcon width={15} height={15} />}>New Payroll Run</Button>}
        />
      ) : (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
            {['Period', 'Run Type', 'Status', ''].map((h) => (
              <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
            ))}
          </div>
          {runs.map((run) => (
            <Link
              to={`/admin/payroll/${run.id}`}
              key={run.id}
              style={{ display: 'grid', gridTemplateColumns: cols }}
              className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0 hover:bg-bg/70"
            >
              <div className="font-semibold text-text">{run.periodStart} – {run.periodEnd}</div>
              <div className="capitalize text-text-muted">{run.runType.replace('_', '-')}</div>
              <div><Badge tone={statusTone[run.status]}>{run.status.replace('_', ' ')}</Badge></div>
              <div className="text-right text-text-faint">···</div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
