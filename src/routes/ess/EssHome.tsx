import { useQuery } from '@tanstack/react-query';
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState';
import { BellIcon, ClockIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listMyLeaveBalances } from '@/modules/leave/leaveService';

export default function EssHome() {
  const { user } = useSession();
  const employeeId = user?.employeeId;
  const year = new Date().getFullYear();

  const balancesQuery = useQuery({
    queryKey: ['leave-balances', employeeId, year],
    queryFn: () => listMyLeaveBalances(employeeId!, year),
    enabled: Boolean(employeeId),
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

      <div className="rounded-xl border border-border bg-ink p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[12px] text-[#AEB4C2]">
              <ClockIcon width={14} height={14} />
              Not clocked in
            </div>
          </div>
          <button className="rounded-lg bg-accent px-5 py-3 text-[13px] font-bold text-white">Punch In</button>
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
