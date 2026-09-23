import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { CalendarIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { leaveStyle } from '@/shared/lib/leaveStyle';
import { listMyLeaveBalances, listMyLeaveRequests, listLeaveTypes, createLeaveRequest } from '@/modules/leave/leaveService';
import { listHolidays } from '@/modules/company/holidayService';

const tabs = ['Balance', 'Apply', 'History', 'Holidays'] as const;

export default function EssLeave() {
  const { user } = useSession();
  const employeeId = user?.employeeId;
  const companyId = user?.companyId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>('Balance');
  const year = new Date().getFullYear();

  const balancesQuery = useQuery({
    queryKey: ['leave-balances', employeeId, year],
    queryFn: () => listMyLeaveBalances(employeeId!, year),
    enabled: Boolean(employeeId) && tab === 'Balance',
  });
  const historyQuery = useQuery({
    queryKey: ['my-leave-requests', employeeId],
    queryFn: () => listMyLeaveRequests(employeeId!),
    enabled: Boolean(employeeId) && tab === 'History',
  });
  const leaveTypesQuery = useQuery({
    queryKey: ['leave-types', companyId],
    queryFn: () => listLeaveTypes(companyId!),
    enabled: Boolean(companyId) && tab === 'Apply',
  });
  const holidaysQuery = useQuery({
    queryKey: ['holidays', companyId],
    queryFn: () => listHolidays(companyId!),
    enabled: Boolean(companyId) && tab === 'Holidays',
  });

  const [applyForm, setApplyForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const applyMutation = useMutation({
    mutationFn: () =>
      createLeaveRequest({
        companyId: companyId!,
        employeeId: employeeId!,
        leaveTypeId: applyForm.leaveTypeId,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests', employeeId] });
      setApplyForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      setApplySuccess(true);
      setApplyError(null);
    },
    onError: (err) => setApplyError(err instanceof Error ? err.message : 'Could not submit that request.'),
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingHolidaysCount = (holidaysQuery.data ?? []).filter((h) => h.date >= todayIso).length;

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="text-[19px] font-bold text-text">Leave</div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
            {t === 'Holidays' && upcomingHolidaysCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === t ? 'bg-accent-soft text-accent' : 'bg-border-soft text-text-faint'}`}>
                {upcomingHolidaysCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Balance' && (
        <>
          {balancesQuery.error && <ErrorState message={(balancesQuery.error as Error).message} />}
          {balancesQuery.isLoading ? (
            <LoadingRows />
          ) : (balancesQuery.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<CalendarIcon width={20} height={20} />} title="No leave balances yet" description="Leave balances appear once your admin configures leave policies for your company." />
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
                    <div className="mt-1 text-[11.5px] font-semibold text-text">{lt.name}</div>
                    <div className="mt-0.5 text-[10.5px] text-text-faint">{lt.used} used this year</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'Apply' && (
        <form
          className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setApplySuccess(false);
            applyMutation.mutate();
          }}
        >
          {(leaveTypesQuery.data?.length ?? 0) === 0 && !leaveTypesQuery.isLoading ? (
            <p className="text-[12.5px] text-text-faint">No leave types have been set up yet — ask your admin to add one before you can apply.</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-text-muted">Leave Type</span>
                <select
                  className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
                  value={applyForm.leaveTypeId}
                  onChange={(e) => setApplyForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {(leaveTypesQuery.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-text-muted">Start Date</span>
                  <input
                    type="date"
                    className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-text-muted">End Date</span>
                  <input
                    type="date"
                    className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-text-muted">Reason</span>
                <textarea
                  rows={3}
                  className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </label>
              {applyError && <p className="text-[12px] text-danger">{applyError}</p>}
              {applySuccess && <p className="text-[12px] text-success">Request submitted.</p>}
              <button
                type="submit"
                className="rounded-lg bg-accent py-3 text-[13px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
                disabled={applyMutation.isPending || !applyForm.leaveTypeId || !applyForm.startDate || !applyForm.endDate}
              >
                {applyMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </>
          )}
        </form>
      )}

      {tab === 'History' && (
        <>
          {historyQuery.error && <ErrorState message={(historyQuery.error as Error).message} />}
          {historyQuery.isLoading ? (
            <LoadingRows />
          ) : (historyQuery.data?.length ?? 0) === 0 ? (
            <EmptyState title="No leave requests yet" description="Requests you submit will show up here with their status." />
          ) : (
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
              {(historyQuery.data ?? []).map((l) => {
                const style = leaveStyle(l.leaveType);
                return (
                  <div key={l.id} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.chip} ${style.text}`}>
                        <CalendarIcon width={15} height={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-text">{l.leaveType}</div>
                        <div className="text-[11.5px] text-text-faint">{l.startDate} – {l.endDate} · {l.days} day(s)</div>
                      </div>
                      <Badge tone={l.status === 'approved' ? 'success' : l.status === 'pending' ? 'warning' : 'danger'}>{l.status}</Badge>
                    </div>
                    {l.reason && <div className="mt-2 text-[11.5px] text-text-faint">{l.reason}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'Holidays' && (
        <>
          {holidaysQuery.error && <ErrorState message={(holidaysQuery.error as Error).message} />}
          {holidaysQuery.isLoading ? (
            <LoadingRows />
          ) : (holidaysQuery.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<CalendarIcon width={20} height={20} />} title="No holidays listed yet" description="Your admin hasn't added the company holiday calendar yet." />
          ) : (
            <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-2.5">
              {(holidaysQuery.data ?? []).map((h) => {
                const isPast = h.date < todayIso;
                return (
                  <div key={h.id} className={`flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 ${isPast ? 'opacity-50' : ''}`}>
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <div className="text-[13px] font-bold leading-none">{new Date(`${h.date}T00:00:00`).getDate()}</div>
                      <div className="text-[8.5px] font-semibold uppercase leading-none">{new Date(`${h.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-text">{h.name}</div>
                      <div className="mt-0.5 text-[11.5px] text-text-faint">
                        {new Date(`${h.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' })}
                        {h.branchName && ` · ${h.branchName}`}
                      </div>
                    </div>
                    {h.isOptional && <Badge tone="neutral">Optional</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
