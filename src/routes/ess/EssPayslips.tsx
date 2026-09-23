import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DownloadIcon, FileTextIcon } from '@/shared/ui/icons';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listMyPayslips } from '@/modules/payroll/payrollService';
import { getSignedPayslipUrl } from '@/modules/payslip/payslipService';

function periodLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const isFullMonth = start.getDate() === 1 && end.getDate() === daysInMonth && start.getMonth() === end.getMonth();
  return isFullMonth ? start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `${periodStart} – ${periodEnd}`;
}

export default function EssPayslips() {
  const { user } = useSession();
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-payslips', user?.employeeId],
    queryFn: () => listMyPayslips(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });
  const payslips = [...(data ?? [])].sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));

  async function handleDownload(payslipId: string, runId: string) {
    setDownloadingRunId(runId);
    setDownloadError(null);
    try {
      const url = await getSignedPayslipUrl(payslipId);
      window.open(url, '_blank');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not open that payslip.');
    } finally {
      setDownloadingRunId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div>
        <div className="text-[19px] font-bold text-text">Payslips</div>
        {payslips.length > 0 && <p className="mt-0.5 text-[12.5px] text-text-faint">{payslips.length} payslip{payslips.length === 1 ? '' : 's'} on record</p>}
      </div>

      {error && <ErrorState message={(error as Error).message} />}
      {downloadError && <p className="text-[12.5px] text-danger">{downloadError}</p>}

      {isLoading ? (
        <LoadingRows />
      ) : payslips.length === 0 ? (
        <EmptyState icon={<FileTextIcon width={20} height={20} />} title="No payslips yet" description="Once payroll has been processed for you, payslips will appear here." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {payslips.map((p) => (
            <div key={p.runId} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <FileTextIcon width={19} height={19} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">{periodLabel(p.periodStart, p.periodEnd)}</div>
                <div className="mt-0.5 font-mono-num text-[16px] font-bold text-text">{formatINR(p.netPay)}</div>
                <div className="mt-1"><Badge tone={p.payslipId ? 'success' : 'neutral'}>{p.runStatus.replace('_', ' ')}</Badge></div>
              </div>
              {p.payslipId ? (
                <button
                  onClick={() => handleDownload(p.payslipId!, p.runId)}
                  disabled={downloadingRunId === p.runId}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
                  aria-label={`Download payslip for ${p.periodStart}`}
                >
                  <DownloadIcon width={17} height={17} />
                </button>
              ) : (
                <Link
                  to={`/print/payslip/${p.runId}/${user?.employeeId}`}
                  target="_blank"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-accent transition-colors hover:bg-accent-soft"
                  aria-label={`View payslip for ${p.periodStart}`}
                >
                  <DownloadIcon width={17} height={17} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
