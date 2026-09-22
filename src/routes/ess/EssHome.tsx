import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState';
import { BellIcon, ClockIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listMyLeaveBalances } from '@/modules/leave/leaveService';
import { getTodayAttendance, punchIn, punchOut } from '@/modules/attendance/attendanceService';

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function EssHome() {
  const { user } = useSession();
  const employeeId = user?.employeeId;
  const companyId = user?.companyId;
  const year = new Date().getFullYear();
  const queryClient = useQueryClient();

  const balancesQuery = useQuery({
    queryKey: ['leave-balances', employeeId, year],
    queryFn: () => listMyLeaveBalances(employeeId!, year),
    enabled: Boolean(employeeId),
  });

  const attendanceQuery = useQuery({
    queryKey: ['today-attendance', employeeId],
    queryFn: () => getTodayAttendance(employeeId!),
    enabled: Boolean(employeeId),
  });

  const punchInMutation = useMutation({
    mutationFn: () => punchIn(companyId!, employeeId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['today-attendance', employeeId] }),
  });
  const punchOutMutation = useMutation({
    mutationFn: () => punchOut(employeeId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['today-attendance', employeeId] }),
  });

  if (!employeeId) {
    return (
      <div className="px-5 pt-6">
        <EmptyState
          title="No employee profile linked"
          description="Your account isn't linked to an employee record yet. Ask your admin to link your login to your employee profile."
        />
      </div>
    );
  }

  const today = attendanceQuery.data;
  const checkedIn = Boolean(today?.checkIn);
  const checkedOut = Boolean(today?.checkOut);
  const punchBusy = punchInMutation.isPending || punchOutMutation.isPending;

  let statusLabel = 'Not clocked in';
  if (checkedIn && !checkedOut) statusLabel = `Clocked in at ${formatTime(today!.checkIn)}`;
  if (checkedOut) statusLabel = `Clocked out at ${formatTime(today!.checkOut)} · in at ${formatTime(today!.checkIn)}`;

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] text-text-faint">Good morning</div>
          <div className="text-[19px] font-bold text-text">{user?.name}</div>
        </div>
        <div className="relative text-text-muted">
          <BellIcon width={21} height={21} />
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-accent-strong to-accent p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[12px] text-white/75">
              <ClockIcon width={14} height={14} />
              {statusLabel}
            </div>
          </div>
          {checkedOut ? (
            <span className="rounded-lg bg-white/15 px-5 py-3 text-[13px] font-bold text-white">Day complete</span>
          ) : checkedIn ? (
            <button
              className="rounded-lg bg-white px-5 py-3 text-[13px] font-bold text-accent-strong disabled:opacity-60"
              disabled={punchBusy}
              onClick={() => punchOutMutation.mutate()}
            >
              {punchOutMutation.isPending ? 'Punching out…' : 'Punch Out'}
            </button>
          ) : (
            <button
              className="rounded-lg bg-white px-5 py-3 text-[13px] font-bold text-accent-strong disabled:opacity-60"
              disabled={punchBusy}
              onClick={() => punchInMutation.mutate()}
            >
              {punchInMutation.isPending ? 'Punching in…' : 'Punch In'}
            </button>
          )}
        </div>
      </div>

      {balancesQuery.error && <ErrorState message={(balancesQuery.error as Error).message} />}

      {!balancesQuery.isLoading && (balancesQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title="No leave balances set up yet" description="Your leave balances will appear here once your admin configures leave policies." />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {(balancesQuery.data ?? []).map((lt) => (
            <div key={lt.leaveTypeId} className="rounded-xl border border-border bg-surface p-3 text-center">
              <div className="font-mono-num text-[18px] font-bold text-text">{lt.closing}</div>
              <div className="mt-0.5 text-[10.5px] leading-tight text-text-faint">{lt.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
