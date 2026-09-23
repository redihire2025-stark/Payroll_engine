import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@/shared/ui/icons';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { useSession } from '@/shared/lib/session';
import { listMyAttendance, listMyCorrections, createCorrection } from '@/modules/attendance/attendanceService';

function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

const STATUS_TONE: Record<string, BadgeTone> = {
  present: 'success',
  late: 'warning',
  half_day: 'warning',
  absent: 'danger',
};

const tabs = ['History', 'Corrections'] as const;

export default function EssAttendance() {
  const { user } = useSession();
  const [monthOffset, setMonthOffset] = useState(0);
  const viewedMonth = new Date();
  viewedMonth.setDate(1);
  viewedMonth.setMonth(viewedMonth.getMonth() + monthOffset);
  const { start, end } = monthBounds(viewedMonth);
  const isCurrentMonth = monthOffset === 0;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>('History');
  const [requesting, setRequesting] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), checkInTime: '09:30', checkOutTime: '18:30', reason: '' });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useQuery({
    queryKey: ['my-attendance', user?.employeeId, start, end],
    queryFn: () => listMyAttendance(user!.employeeId, start, end),
    enabled: Boolean(user?.employeeId) && tab === 'History',
  });

  const correctionsQuery = useQuery({
    queryKey: ['my-corrections', user?.employeeId],
    queryFn: () => listMyCorrections(user!.employeeId),
    enabled: Boolean(user?.employeeId) && tab === 'Corrections',
  });

  const correctionMutation = useMutation({
    mutationFn: () =>
      createCorrection({
        employeeId: user!.employeeId,
        date: form.date,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        reason: form.reason.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-corrections', user?.employeeId] });
      setRequesting(false);
      setForm((f) => ({ ...f, reason: '' }));
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not submit that request.'),
  });

  const days = data ?? [];
  const presentCount = days.filter((d) => d.status === 'present' || d.status === 'late').length;
  const absentCount = days.filter((d) => d.status === 'absent').length;
  const lateCount = days.filter((d) => d.status === 'late').length;

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="flex items-center justify-between">
        <div className="text-[19px] font-bold text-text">Attendance</div>
        <button onClick={() => setRequesting(true)} className="text-[12.5px] font-semibold text-accent">Request Correction</button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'History' && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
            <button onClick={() => setMonthOffset((m) => m - 1)} className="rounded-lg p-1 hover:bg-bg" aria-label="Previous month">
              <ChevronLeftIcon width={16} height={16} className="text-text-muted" />
            </button>
            <span className="text-[13px] font-semibold text-text">{viewedMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            <button
              onClick={() => setMonthOffset((m) => m + 1)}
              disabled={isCurrentMonth}
              className="rounded-lg p-1 hover:bg-bg disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next month"
            >
              <ChevronRightIcon width={16} height={16} className="text-text-muted" />
            </button>
          </div>

          {!isLoading && days.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <div className="font-mono-num text-[18px] font-bold text-success">{presentCount}</div>
                <div className="mt-0.5 text-[10.5px] text-text-faint">Present</div>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <div className="font-mono-num text-[18px] font-bold text-warning">{lateCount}</div>
                <div className="mt-0.5 text-[10.5px] text-text-faint">Late</div>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3 text-center">
                <div className="font-mono-num text-[18px] font-bold text-danger">{absentCount}</div>
                <div className="mt-0.5 text-[10.5px] text-text-faint">Absent</div>
              </div>
            </div>
          )}

          {listError && <ErrorState message={(listError as Error).message} />}

          {isLoading ? (
            <LoadingRows />
          ) : days.length === 0 ? (
            <EmptyState icon={<ClockIcon width={20} height={20} />} title="No attendance recorded yet" description="Your attendance records for this month will show up here." />
          ) : (
            <div className="rounded-xl border border-border bg-surface">
              {days.map((d) => (
                <div key={d.date} className="flex items-center justify-between border-b border-border-soft px-4 py-3 last:border-b-0">
                  <div>
                    <div className="text-[12.5px] font-medium text-text">
                      {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="mt-1">
                      <Badge tone={STATUS_TONE[d.status] ?? 'neutral'}>{d.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  <div className="text-right font-mono-num text-[11.5px] text-text-muted">
                    {d.checkIn ? `${d.checkIn} – ${d.checkOut ?? '—'}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'Corrections' && (
        <>
          {correctionsQuery.error && <ErrorState message={(correctionsQuery.error as Error).message} />}
          {correctionsQuery.isLoading ? (
            <LoadingRows />
          ) : (correctionsQuery.data?.length ?? 0) === 0 ? (
            <EmptyState title="No correction requests yet" description="Requests you submit will show up here with their status." />
          ) : (
            <div className="flex flex-col gap-3">
              {(correctionsQuery.data ?? []).map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text">{c.date}</span>
                    <Badge tone={c.status === 'approved' ? 'success' : c.status === 'pending' ? 'warning' : 'danger'}>{c.status}</Badge>
                  </div>
                  <div className="mt-1 text-[12px] text-text-muted">{c.requestedIn ?? '—'} – {c.requestedOut ?? '—'}</div>
                  {c.reason && <div className="mt-1 text-[11.5px] text-text-faint">{c.reason}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {requesting && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setRequesting(false)}>
          <div className="w-full max-w-[430px] rounded-t-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-[15px] font-bold text-text">Request Attendance Correction</div>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                correctionMutation.mutate();
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-text-muted">Date</span>
                <input
                  type="date"
                  className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-text-muted">Check-in</span>
                  <input
                    type="time"
                    className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
                    value={form.checkInTime}
                    onChange={(e) => setForm((f) => ({ ...f, checkInTime: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-text-muted">Check-out</span>
                  <input
                    type="time"
                    className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
                    value={form.checkOutTime}
                    onChange={(e) => setForm((f) => ({ ...f, checkOutTime: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-text-muted">Reason</span>
                <textarea
                  rows={3}
                  className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  required
                />
              </label>
              {error && <p className="text-[12px] text-danger">{error}</p>}
              <div className="mt-1 flex gap-3">
                <button type="button" onClick={() => setRequesting(false)} className="flex-1 rounded-lg border border-border py-3 text-[13px] font-semibold text-text">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctionMutation.isPending || !form.reason.trim()}
                  className="flex-1 rounded-lg bg-accent py-3 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {correctionMutation.isPending ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
