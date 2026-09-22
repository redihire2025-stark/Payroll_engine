import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { StatTile } from '@/shared/ui/StatTile';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ClockIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listCorrections, decideCorrection } from '@/modules/attendance/attendanceService';

const cols = '1.8fr 1fr 1fr 1fr 2fr 1fr 1.2fr';

export default function Attendance() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['attendance-corrections', companyId], queryFn: () => listCorrections(companyId) });

  const decisionMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) => decideCorrection(id, decision, companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-corrections', companyId] }),
  });

  const corrections = data ?? [];
  const pending = corrections.filter((c) => c.status === 'pending');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Attendance</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Correction requests</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Correction Requests" value={String(corrections.length)} />
        <StatTile label="Pending" value={String(pending.length)} />
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        <CardHeader title="Correction Requests" subtitle={`${pending.length} pending approval`} />
        {isLoading ? (
          <LoadingRows />
        ) : corrections.length === 0 ? (
          <div className="px-5 pb-6">
            <EmptyState icon={<ClockIcon width={20} height={20} />} title="No correction requests" description="Employee attendance correction requests will appear here." />
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Employee', 'Date', 'Requested In', 'Requested Out', 'Reason', 'Status', ''].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {corrections.map((c) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: cols }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.employeeName} size={28} />
                  <span className="truncate font-medium text-text">{c.employeeName}</span>
                </div>
                <div className="font-mono-num text-text-muted">{c.date}</div>
                <div className="font-mono-num text-text-muted">{c.requestedIn ?? '—'}</div>
                <div className="font-mono-num text-text-muted">{c.requestedOut ?? '—'}</div>
                <div className="truncate text-text-muted">{c.reason}</div>
                <div>
                  <Badge tone={c.status === 'pending' ? 'warning' : c.status === 'approved' ? 'success' : 'danger'}>{c.status}</Badge>
                </div>
                <div className="flex justify-end gap-1.5">
                  {c.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={decisionMutation.isPending}
                        onClick={() => decisionMutation.mutate({ id: c.id, decision: 'rejected' })}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={decisionMutation.isPending}
                        onClick={() => decisionMutation.mutate({ id: c.id, decision: 'approved' })}
                      >
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
