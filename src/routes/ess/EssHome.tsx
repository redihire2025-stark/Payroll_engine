import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState';
import { BellIcon, ClockIcon, CalendarIcon, FileTextIcon, ReceiptIcon, HelpCircleIcon, ChevronRightIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { leaveStyle } from '@/shared/lib/leaveStyle';
import { listMyLeaveBalances } from '@/modules/leave/leaveService';
import { getTodayAttendance, punchIn, punchOut } from '@/modules/attendance/attendanceService';
import { listHolidays } from '@/modules/company/holidayService';

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const QUICK_ACTIONS = [
  { label: 'Apply Leave', icon: CalendarIcon, to: '/app/leave' },
  { label: 'Payslips', icon: FileTextIcon, to: '/app/payslips' },
  { label: 'Expenses', icon: ReceiptIcon, to: '/app/expenses' },
  { label: 'Helpdesk', icon: HelpCircleIcon, to: '/app/profile' },
];

export default function EssHome() {
  const { user } = useSession();
  const navigate = useNavigate();
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

  const holidaysQuery = useQuery({
    queryKey: ['holidays', companyId],
    queryFn: () => listHolidays(companyId!),
    enabled: Boolean(companyId),
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

  let statusLabel = "You haven't clocked in yet";
  if (checkedIn && !checkedOut) statusLabel = `Clocked in at ${formatTime(today!.checkIn)}`;
  if (checkedOut) statusLabel = `Clocked out at ${formatTime(today!.checkOut)} · in at ${formatTime(today!.checkIn)}`;

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayIso = new Date().toISOString().slice(0, 10);
  const nextHoliday = (holidaysQuery.data ?? []).filter((h) => h.date >= todayIso).sort((a, b) => (a.date < b.date ? -1 : 1))[0];

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name ?? ''} size={44} />
          <div>
            <div className="text-[12.5px] text-text-faint">{greeting()} · {todayStr}</div>
            <div className="text-[19px] font-bold text-text">{user?.name}</div>
          </div>
        </div>
        <div className="relative text-text-muted">
          <BellIcon width={21} height={21} />
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-accent-strong to-accent p-5 text-white shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-white/70">
              <ClockIcon width={13} height={13} />
              Today's Attendance
            </div>
            <div className="mt-1.5 truncate text-[15px] font-semibold text-white">{statusLabel}</div>
          </div>
          {checkedOut ? (
            <span className="shrink-0 rounded-lg bg-white/15 px-5 py-3 text-[13px] font-bold text-white">Day complete</span>
          ) : checkedIn ? (
            <button
              className="shrink-0 rounded-lg bg-white px-5 py-3 text-[13px] font-bold text-accent-strong transition-transform active:scale-95 disabled:opacity-60"
              disabled={punchBusy}
              onClick={() => punchOutMutation.mutate()}
            >
              {punchOutMutation.isPending ? 'Punching out…' : 'Punch Out'}
            </button>
          ) : (
            <button
              className="shrink-0 rounded-lg bg-white px-5 py-3 text-[13px] font-bold text-accent-strong transition-transform active:scale-95 disabled:opacity-60"
              disabled={punchBusy}
              onClick={() => punchInMutation.mutate()}
            >
              {punchInMutation.isPending ? 'Punching in…' : 'Punch In'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {QUICK_ACTIONS.map(({ label, icon: Icon, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3.5 transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <Icon width={19} height={19} className="text-accent" />
            <span className="text-center text-[10.5px] font-semibold leading-tight text-text-muted">{label}</span>
          </button>
        ))}
      </div>

      {nextHoliday && (
        <button
          onClick={() => navigate('/app/leave')}
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-accent"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <CalendarIcon width={17} height={17} />
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-text">{nextHoliday.name}</div>
              <div className="text-[11px] text-text-faint">
                Upcoming holiday · {new Date(nextHoliday.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
          <ChevronRightIcon width={16} height={16} className="text-text-faint" />
        </button>
      )}

      <div>
        <div className="mb-2.5 text-[12.5px] font-bold text-text">My Leave Balances</div>
        {balancesQuery.error && <ErrorState message={(balancesQuery.error as Error).message} />}
        {!balancesQuery.isLoading && (balancesQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="No leave balances set up yet" description="Your leave balances will appear here once your admin configures leave policies." />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(balancesQuery.data ?? []).map((lt) => {
              const style = leaveStyle(lt.name);
              return (
                <div key={lt.leaveTypeId} className="rounded-xl border border-border bg-surface p-4">
                  <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${style.chip} ${style.text}`}>
                    <CalendarIcon width={16} height={16} />
                  </div>
                  <div className="mt-2.5 font-mono-num text-[22px] font-bold leading-none text-text">{lt.closing}</div>
                  <div className="mt-1 text-[11.5px] text-text-faint">{lt.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
