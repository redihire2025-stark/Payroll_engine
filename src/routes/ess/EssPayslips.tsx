import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DownloadIcon, FileTextIcon } from '@/shared/ui/icons';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { formatINR2, numberToWordsINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listMyPayslips, getPayrollItemForEmployee } from '@/modules/payroll/payrollService';
import { getSignedPayslipUrl } from '@/modules/payslip/payslipService';
import { componentLabel, withStatutoryZeroLines } from '@/modules/payslip/payslipFormat';
import { getEmployee, getEmployeePayslipSidebar } from '@/modules/employee/employeeService';

function periodLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const isFullMonth = start.getDate() === 1 && end.getDate() === daysInMonth && start.getMonth() === end.getMonth();
  return isFullMonth ? start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : `${periodStart} – ${periodEnd}`;
}

function effectiveWorkDays(periodStart: string, periodEnd: string): number {
  return Math.round((new Date(`${periodEnd}T00:00:00`).getTime() - new Date(`${periodStart}T00:00:00`).getTime()) / 86400000) + 1;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-text-faint">{label}</div>
      <div className="mt-0.5 text-[12.5px] font-medium text-text">{value}</div>
    </div>
  );
}

export default function EssPayslips() {
  const { user } = useSession();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['my-payslips', user?.employeeId],
    queryFn: () => listMyPayslips(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });
  const payslips = [...(listQuery.data ?? [])].sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));

  useEffect(() => {
    if (!selectedRunId && payslips.length > 0) setSelectedRunId(payslips[0].runId);
  }, [payslips, selectedRunId]);

  const selected = payslips.find((p) => p.runId === selectedRunId) ?? null;

  const employeeQuery = useQuery({
    queryKey: ['employee', user?.employeeId],
    queryFn: () => getEmployee(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });
  const sidebarQuery = useQuery({
    queryKey: ['employee-payslip-sidebar', user?.employeeId],
    queryFn: () => getEmployeePayslipSidebar(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });
  const detailQuery = useQuery({
    queryKey: ['payroll-item', selectedRunId, user?.employeeId],
    queryFn: () => getPayrollItemForEmployee(selectedRunId!, user!.employeeId),
    enabled: Boolean(selectedRunId && user?.employeeId),
  });

  async function handleDownload() {
    if (!selected) return;
    setDownloadError(null);
    if (!selected.payslipId) return;
    setDownloading(true);
    try {
      const url = await getSignedPayslipUrl(selected.payslipId);
      window.open(url, '_blank');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not open that payslip.');
    } finally {
      setDownloading(false);
    }
  }

  const employee = employeeQuery.data;
  const sidebar = sidebarQuery.data;
  const item = detailQuery.data;
  const deductionsWithZeroLines = item ? withStatutoryZeroLines(item.deductions) : [];

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[19px] font-bold text-text">Payslips</div>
          {payslips.length > 0 && <p className="mt-0.5 text-[12.5px] text-text-faint">{payslips.length} payslip{payslips.length === 1 ? '' : 's'} on record</p>}
        </div>
        {payslips.length > 0 && (
          <div className="flex items-center gap-2.5">
            <select
              value={selectedRunId ?? ''}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] font-semibold text-text"
            >
              {payslips.map((p) => (
                <option key={p.runId} value={p.runId}>{periodLabel(p.periodStart, p.periodEnd)}</option>
              ))}
            </select>
            {selected?.payslipId ? (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
              >
                <DownloadIcon width={15} height={15} />
                {downloading ? 'Opening…' : 'Download'}
              </button>
            ) : (
              selected && (
                <Link
                  to={`/print/payslip/${selected.runId}/${user?.employeeId}`}
                  target="_blank"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-semibold text-text-muted"
                >
                  <DownloadIcon width={15} height={15} />
                  View
                </Link>
              )
            )}
          </div>
        )}
      </div>

      {listQuery.error && <ErrorState message={(listQuery.error as Error).message} />}
      {downloadError && <p className="text-[12.5px] text-danger">{downloadError}</p>}

      {listQuery.isLoading ? (
        <LoadingRows />
      ) : payslips.length === 0 ? (
        <EmptyState icon={<FileTextIcon width={20} height={20} />} title="No payslips yet" description="Once payroll has been processed for you, payslips will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_300px] lg:items-start">
          <div className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border-soft px-4 py-3 text-[13px] font-semibold text-text">Earnings</div>
            <div className="flex items-center justify-between border-b border-border-soft bg-bg px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
              <span>Component</span>
              <span>Amount in (₹)</span>
            </div>
            {detailQuery.isLoading ? (
              <div className="p-4"><LoadingRows /></div>
            ) : (
              <>
                {(item?.earnings ?? []).map((e) => (
                  <div key={e.code} className="flex items-center justify-between border-b border-border-soft px-4 py-2.5 text-[12.5px] last:border-b-0">
                    <span className="text-text-muted">{componentLabel(e.code)}</span>
                    <span className="font-mono-num text-text">{formatINR2(e.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 text-[13px] font-bold text-text">
                  <span>Total</span>
                  <span className="font-mono-num">{formatINR2(item?.grossEarnings ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface">
            <div className="border-b border-border-soft px-4 py-3 text-[13px] font-semibold text-text">Deductions</div>
            <div className="flex items-center justify-between border-b border-border-soft bg-bg px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
              <span>Component</span>
              <span>Amount in (₹)</span>
            </div>
            {detailQuery.isLoading ? (
              <div className="p-4"><LoadingRows /></div>
            ) : (
              <>
                {deductionsWithZeroLines.map((d) => (
                  <div key={d.code} className="flex items-center justify-between border-b border-border-soft px-4 py-2.5 text-[12.5px] last:border-b-0">
                    <span className="text-text-muted">{componentLabel(d.code)}</span>
                    <span className="font-mono-num text-text">{formatINR2(d.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 text-[13px] font-bold text-text">
                  <span>Total</span>
                  <span className="font-mono-num">{formatINR2(item?.totalDeductions ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-warning-soft p-4">
              <div className="mb-3 text-[13px] font-semibold text-text">Employee Details</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <DetailRow label="Name" value={employee?.name ?? '—'} />
                <DetailRow label="Employee No" value={employee?.code ?? '—'} />
                <DetailRow label="Joining Date" value={employee?.doj ? new Date(`${employee.doj}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <DetailRow label="Bank Name" value={sidebar?.bankName ?? '—'} />
                <DetailRow label="Designation" value={employee?.designation ?? '—'} />
                <DetailRow label="Bank Account No" value={sidebar?.bankAccountOnFile ? '•••• on file' : '—'} />
                <DetailRow label="Department" value={employee?.department ?? '—'} />
                <DetailRow label="PAN Number" value={sidebar?.panOnFile ? '•••• on file' : '—'} />
                <DetailRow label="Location" value={employee?.branch ?? '—'} />
                <DetailRow label="PF No" value={sidebar?.pfNumber ?? '—'} />
                {selected && <DetailRow label="Effective Work Days" value={String(effectiveWorkDays(selected.periodStart, selected.periodEnd))} />}
                <DetailRow label="PF UAN" value={sidebar?.uan ?? '—'} />
                <DetailRow label="LOP" value={String(item?.lopDays ?? 0)} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-[11.5px] text-text-faint">Net Pay for {selected ? periodLabel(selected.periodStart, selected.periodEnd) : '—'}</div>
              <div className="mt-1 font-mono-num text-[22px] font-bold text-success">{formatINR2(item?.netPay ?? selected?.netPay ?? 0)}</div>
              <div className="mt-1 text-[11px] text-text-faint">{numberToWordsINR(item?.netPay ?? selected?.netPay ?? 0)} Rupees Only</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
