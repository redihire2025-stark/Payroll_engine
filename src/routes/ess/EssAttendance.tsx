import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@/shared/ui/icons';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { useSession } from '@/shared/lib/session';
import { listMyAttendance } from '@/modules/attendance/attendanceService';

function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function EssAttendance() {
  const { user } = useSession();
  const { start, end } = monthBounds(new Date());
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-attendance', user?.employeeId, start, end],
    queryFn: () => listMyAttendance(user!.employeeId, start, end),
    enabled: Boolean(user?.employeeId),
  });
  const days = data ?? [];

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="text-[19px] font-bold text-text">Attendance</div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
        <ChevronLeftIcon width={16} height={16} className="text-text-faint" />
        <span className="text-[13px] font-semibold text-text">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        <ChevronRightIcon width={16} height={16} className="text-text-faint" />
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      {isLoading ? (
        <LoadingRows />
      ) : days.length === 0 ? (
        <EmptyState icon={<ClockIcon width={20} height={20} />} title="No attendance recorded yet" description="Your attendance records for this month will show up here." />
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          {days.map((d) => (
            <div key={d.date} className="flex items-center justify-between border-b border-border-soft px-4 py-3 last:border-b-0">
              <div>
                <div className="text-[12.5px] font-medium text-text">{d.date}</div>
                <div className="text-[11px] text-text-faint">{d.status}</div>
              </div>
              <div className="text-right font-mono-num text-[11.5px] text-text-muted">
                {d.checkIn ? `${d.checkIn} – ${d.checkOut ?? '—'}` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
