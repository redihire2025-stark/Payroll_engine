import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { UsersIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listDirectReports } from '@/modules/employee/employeeService';
import { listLeaveRequests } from '@/modules/leave/leaveService';
import { listCorrections } from '@/modules/attendance/attendanceService';

const tabs = ['Approvals', 'Directory'] as const;

export default function ManagerTeam() {
  const { user } = useSession();
  const [tab, setTab] = useState<(typeof tabs)[number]>('Approvals');

  const reportsQuery = useQuery({
    queryKey: ['direct-reports', user?.companyId, user?.employeeId],
    queryFn: () => listDirectReports(user!.companyId, user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });
  const reportIds = new Set((reportsQuery.data ?? []).map((r) => r.id));

  const leaveQuery = useQuery({
    queryKey: ['leave-requests', user?.companyId],
    queryFn: () => listLeaveRequests(user!.companyId),
    enabled: Boolean(user?.companyId) && tab === 'Approvals',
  });
  const correctionsQuery = useQuery({
    queryKey: ['attendance-corrections', user?.companyId],
    queryFn: () => listCorrections(user!.companyId),
    enabled: Boolean(user?.companyId) && tab === 'Approvals',
  });

  const pendingLeave = (leaveQuery.data ?? []).filter((l) => l.status === 'pending' && reportIds.has(l.employeeId));
  const pendingCorrections = (correctionsQuery.data ?? []).filter((c) => c.status === 'pending' && reportIds.has(c.employeeId));
  const loading = reportsQuery.isLoading || (tab === 'Approvals' && (leaveQuery.isLoading || correctionsQuery.isLoading));
  const error = reportsQuery.error || leaveQuery.error || correctionsQuery.error;

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="text-[19px] font-bold text-text">Team</div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
            {t === 'Approvals' && pendingLeave.length + pendingCorrections.length > 0 && (
              <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] text-warning">
                {pendingLeave.length + pendingCorrections.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <ErrorState message={(error as Error).message} />}
      {loading && <LoadingRows />}

      {!loading && tab === 'Approvals' && (
        pendingLeave.length + pendingCorrections.length === 0 ? (
          <EmptyState icon={<UsersIcon width={20} height={20} />} title="Nothing pending" description="Leave and attendance correction requests from your team will show up here." />
        ) : (
          <div className="flex flex-col gap-3">
            {pendingLeave.map((l) => (
              <div key={l.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar name={l.employeeName} size={30} />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-text">{l.employeeName}</div>
                    <div className="text-[11.5px] text-text-faint">{l.leaveType} · {l.startDate}–{l.endDate} ({l.days}d)</div>
                  </div>
                  <Badge tone="info">Leave</Badge>
                </div>
                {l.reason && <p className="mt-2 text-[12px] text-text-muted">{l.reason}</p>}
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded-lg border border-border py-2 text-[12.5px] font-semibold text-text">Reject</button>
                  <button className="flex-1 rounded-lg bg-accent py-2 text-[12.5px] font-semibold text-white">Approve</button>
                </div>
              </div>
            ))}
            {pendingCorrections.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.employeeName} size={30} />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-text">{c.employeeName}</div>
                    <div className="text-[11.5px] text-text-faint">Attendance correction · {c.date}</div>
                  </div>
                  <Badge tone="warning">Attendance</Badge>
                </div>
                <p className="mt-2 text-[12px] text-text-muted">{c.reason}</p>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded-lg border border-border py-2 text-[12.5px] font-semibold text-text">Reject</button>
                  <button className="flex-1 rounded-lg bg-accent py-2 text-[12.5px] font-semibold text-white">Approve</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'Directory' && (
        reportsQuery.isLoading ? (
          <LoadingRows />
        ) : (reportsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<UsersIcon width={20} height={20} />} title="No direct reports" description="Employees reporting to you will appear here." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {(reportsQuery.data ?? []).map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
                <Avatar name={e.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">{e.name}</div>
                  <div className="truncate text-[11.5px] text-text-faint">{e.code}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
