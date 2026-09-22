import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DownloadIcon, FileTextIcon } from '@/shared/ui/icons';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listMyPayslips } from '@/modules/payroll/payrollService';
import { getSignedPayslipUrl } from '@/modules/payslip/payslipService';

export default function EssPayslips() {
  const { user } = useSession();
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-payslips', user?.employeeId],
    queryFn: () => listMyPayslips(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });
  const payslips = data ?? [];

  async function handleDownload(payslipId: string, runId: string) {
    setDownloadingRunId(runId);
    try {
      const url = await getSignedPayslipUrl(payslipId, user!.id);
      window.open(url, '_blank');
    } catch {
      // fall through — the print route below stays available regardless
    } finally {
      setDownloadingRunId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="text-[19px] font-bold text-text">Payslips</div>

      {error && <ErrorState message={(error as Error).message} />}

      {isLoading ? (
        <LoadingRows />
      ) : payslips.length === 0 ? (
        <EmptyState icon={<FileTextIcon width={20} height={20} />} title="No payslips yet" description="Once payroll has been processed for you, payslips will appear here." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {payslips.map((p) => (
            <div key={p.runId} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div>
                <div className="text-[13px] font-semibold text-text">{p.periodStart} – {p.periodEnd}</div>
                <div className="mt-0.5 font-mono-num text-[15px] font-bold text-text">{formatINR(p.netPay)}</div>
                <div className="mt-0.5 text-[11px] text-text-faint capitalize">{p.runStatus.replace('_', ' ')}</div>
              </div>
              {p.payslipId ? (
                <button
                  onClick={() => handleDownload(p.payslipId!, p.runId)}
                  disabled={downloadingRunId === p.runId}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-accent disabled:opacity-50"
                  aria-label={`Download payslip for ${p.periodStart}`}
                >
                  <DownloadIcon width={17} height={17} />
                </button>
              ) : (
                <Link
                  to={`/print/payslip/${p.runId}/${user?.employeeId}`}
                  target="_blank"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-accent"
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
