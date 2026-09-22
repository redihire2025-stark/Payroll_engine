import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { CalendarIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listLeaveRequests, updateLeaveRequestStatus } from '@/modules/leave/leaveService';
import { LeaveTypesPanel } from './LeaveTypesPanel';
import { HolidaysPanel } from './HolidaysPanel';

const tabs = ['Pending', 'Approved', 'Rejected', 'All'] as const;
const cols = '1.8fr 1.2fr 1.6fr 0.7fr 2.2fr 1fr 1.3fr';

export default function Leave() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>('Pending');
  const { data, isLoading, error } = useQuery({ queryKey: ['leave-requests', companyId], queryFn: () => listLeaveRequests(companyId) });

  const decisionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => updateLeaveRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests', companyId] }),
  });

  const requests = data ?? [];
  const filtered = requests.filter((l) => tab === 'All' || l.status === tab.toLowerCase());
  const pendingCount = requests.filter((l) => l.status === 'pending').length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Leave Requests</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Review and act on employee leave applications</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3.5 pb-2.5 text-[13px] font-semibold ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint hover:text-text-muted'
            }`}
          >
            {t} {t === 'Pending' && pendingCount > 0 && <span className="ml-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] text-warning">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <div className="grid grid-cols-[2.2fr_1fr] gap-5">
        <Card>
          {isLoading ? (
            <LoadingRows />
          ) : filtered.length === 0 ? (
            <div className="px-5 pb-6 pt-2">
              <EmptyState icon={<CalendarIcon width={20} height={20} />} title="No leave requests" description="Requests submitted by employees will show up here for review." />
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
                {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Applied On', ''].map((h) => (
                  <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
                ))}
              </div>
              {filtered.map((l) => (
                <div key={l.id} style={{ display: 'grid', gridTemplateColumns: cols }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={l.employeeName} size={28} />
                    <span className="truncate font-medium text-text">{l.employeeName}</span>
                  </div>
                  <div><Badge tone="info">{l.leaveType}</Badge></div>
                  <div className="font-mono-num text-text-muted">{l.startDate} – {l.endDate}</div>
                  <div className="font-mono-num text-text-muted">{l.days}</div>
                  <div className="truncate text-text-muted">{l.reason ?? '—'}</div>
                  <div className="font-mono-num text-text-muted">{l.createdAt.slice(0, 10)}</div>
                  <div className="flex justify-end gap-1.5">
                    {l.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={decisionMutation.isPending}
                          onClick={() => decisionMutation.mutate({ id: l.id, status: 'rejected' })}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={decisionMutation.isPending}
                          onClick={() => decisionMutation.mutate({ id: l.id, status: 'approved' })}
                        >
                          Approve
                        </Button>
                      </>
                    ) : (
                      <Badge tone={l.status === 'approved' ? 'success' : 'danger'}>{l.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <LeaveTypesPanel companyId={companyId} />
          <HolidaysPanel companyId={companyId} />
        </div>
      </div>
    </div>
  );
}
