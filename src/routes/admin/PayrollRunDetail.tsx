import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { StatTile } from '@/shared/ui/StatTile';
import { Stepper } from '@/shared/ui/Stepper';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { formatINR } from '@/shared/lib/format';
import { getPayrollRun, listPayrollItems } from '@/modules/payroll/payrollService';
import { advancePayrollRun, sendBackToDraft } from '@/modules/payroll/runPayroll';
import { generatePayslipsForRun } from '@/modules/payslip/payslipService';
import { useSession } from '@/shared/lib/session';

const STEPS = ['Draft', 'Calculating', 'Calculated', 'Under Review', 'Approved', 'Locked', 'Paid'];
const STATUS_INDEX: Record<string, number> = { draft: 0, calculating: 1, calculated: 2, under_review: 3, approved: 4, locked: 5, paid: 6, cancelled: 0 };
const cols = '1.8fr 1fr 1fr 0.6fr';

export default function PayrollRunDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const runQuery = useQuery({ queryKey: ['payroll-run', id], queryFn: () => getPayrollRun(id!), enabled: Boolean(id) });
  const itemsQuery = useQuery({ queryKey: ['payroll-items', id], queryFn: () => listPayrollItems(id!), enabled: Boolean(id) });

  const advanceMutation = useMutation({
    mutationFn: () => advancePayrollRun(id!, run!.status, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-run', id] }),
  });
  const sendBackMutation = useMutation({
    mutationFn: () => sendBackToDraft(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-run', id] }),
  });
  const payslipsMutation = useMutation({
    mutationFn: () => generatePayslipsForRun(id!, user!.companyId),
  });

  const run = runQuery.data;
  const items = itemsQuery.data ?? [];
  const gross = items.reduce((s, i) => s + i.grossEarnings, 0);
  const deductions = items.reduce((s, i) => s + i.totalDeductions, 0);
  const net = items.reduce((s, i) => s + i.netPay, 0);

  if (runQuery.error) return <ErrorState message={(runQuery.error as Error).message} />;
  if (runQuery.isLoading) return <div className="text-[13px] text-text-faint">Loading…</div>;
  if (!run) return <EmptyState title="Payroll run not found" description="This run doesn't exist or hasn't been calculated yet." />;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[12.5px] text-text-faint">
        <Link to="/admin/payroll" className="text-accent">Payroll</Link> / {run.periodStart} – {run.periodEnd}
      </div>

      <Card>
        <div className="flex items-center justify-between px-6 py-5">
          <Stepper steps={STEPS} currentIndex={STATUS_INDEX[run.status] ?? 0} />
          <div className="flex gap-2.5">
            {run.status === 'under_review' && (
              <Button variant="secondary" size="sm" disabled={sendBackMutation.isPending} onClick={() => sendBackMutation.mutate()}>
                {sendBackMutation.isPending ? 'Sending…' : 'Send Back'}
              </Button>
            )}
            {['calculated', 'under_review', 'approved', 'locked'].includes(run.status) && (
              <Button variant="primary" size="sm" disabled={advanceMutation.isPending} onClick={() => advanceMutation.mutate()}>
                {advanceMutation.isPending
                  ? 'Working…'
                  : run.status === 'calculated'
                    ? 'Send for Review'
                    : run.status === 'under_review'
                      ? 'Approve Run'
                      : run.status === 'approved'
                        ? 'Lock Payroll'
                        : 'Mark Paid'}
              </Button>
            )}
            {['locked', 'paid'].includes(run.status) && (
              <Button variant="secondary" size="sm" disabled={payslipsMutation.isPending} onClick={() => payslipsMutation.mutate()}>
                {payslipsMutation.isPending ? 'Generating…' : 'Generate Payslips'}
              </Button>
            )}
          </div>
        </div>
        {payslipsMutation.isSuccess && (
          <div className="border-t border-border-soft px-6 py-3 text-[12.5px] text-success">
            Generated {payslipsMutation.data.generated} payslip(s){payslipsMutation.data.alreadyExisted > 0 ? `, ${payslipsMutation.data.alreadyExisted} already existed` : ''}.
          </div>
        )}
        {payslipsMutation.isError && (
          <div className="border-t border-border-soft px-6 py-3 text-[12.5px] text-danger">
            {(payslipsMutation.error as Error).message}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Gross Earnings" value={formatINR(gross)} />
        <StatTile label="Deductions" value={formatINR(deductions)} />
        <StatTile label="Net Payable" value={formatINR(net)} />
        <StatTile label="Employees" value={String(items.length)} />
      </div>

      <Card>
        <CardHeader title="Payroll Items" />
        {itemsQuery.isLoading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState title="No items calculated for this run" description="Payroll items appear here once this run has been calculated." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 560 }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Employee', 'Gross', 'Net Pay', ''].map((h) => (
                <div key={h} className="text-right text-[11px] font-bold uppercase tracking-wide text-text-faint first:text-left">{h}</div>
              ))}
            </div>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 560 }} className="items-center gap-3 border-b border-border-soft px-5 py-3 text-[12.5px] last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <Avatar name={item.employeeName} size={26} />
                  <span className="truncate font-medium text-text">{item.employeeName}</span>
                  {item.lopDays > 0 && <Badge tone="warning">{item.lopDays}d LOP</Badge>}
                </div>
                <div className="text-right font-mono-num text-text-muted">{formatINR(item.grossEarnings)}</div>
                <div className="text-right font-mono-num font-semibold text-text">{formatINR(item.netPay)}</div>
                <div className="text-right">
                  <Link to={`/admin/payroll/${run.id}/payslip/${item.employeeId}`} className="text-accent">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
