import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { StatTile } from '@/shared/ui/StatTile';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { useSession } from '@/shared/lib/session';
import { listEmployees } from '@/modules/employee/employeeService';
import { listLeaveRequests } from '@/modules/leave/leaveService';
import { listCorrections } from '@/modules/attendance/attendanceService';
import { listPayrollRuns } from '@/modules/payroll/payrollService';
import { UsersIcon, BanknoteIcon } from '@/shared/ui/icons';

export default function Dashboard() {
  const { user } = useSession();
  const companyId = user!.companyId;

  const employeesQuery = useQuery({ queryKey: ['employees', companyId], queryFn: () => listEmployees(companyId) });
  const leaveQuery = useQuery({ queryKey: ['leave-requests', companyId], queryFn: () => listLeaveRequests(companyId) });
  const correctionsQuery = useQuery({ queryKey: ['attendance-corrections', companyId], queryFn: () => listCorrections(companyId) });
  const payrollQuery = useQuery({ queryKey: ['payroll-runs', companyId], queryFn: () => listPayrollRuns(companyId) });

  const activeEmployees = employeesQuery.data?.filter((e) => e.status === 'active').length ?? 0;
  const pendingLeave = leaveQuery.data?.filter((l) => l.status === 'pending') ?? [];
  const pendingCorrections = correctionsQuery.data?.filter((c) => c.status === 'pending') ?? [];
  const runs = payrollQuery.data ?? [];

  const error = employeesQuery.error || leaveQuery.error || correctionsQuery.error || payrollQuery.error;
  const loading = employeesQuery.isLoading || leaveQuery.isLoading || correctionsQuery.isLoading || payrollQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-text">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">{user?.companyName}</p>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      {loading ? (
        <LoadingRows />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Active Employees" value={String(activeEmployees)} />
            <StatTile label="Pending Leave" value={String(pendingLeave.length)} />
            <StatTile label="Pending Corrections" value={String(pendingCorrections.length)} />
            <StatTile label="Payroll Runs" value={String(runs.length)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <Card>
                <CardHeader title="Payroll Runs" subtitle="Most recent first" />
                {runs.length === 0 ? (
                  <div className="px-5 py-2 pb-5">
                    <EmptyState
                      icon={<BanknoteIcon width={22} height={22} />}
                      title="No payroll runs yet"
                      description="Once payroll processing is connected, runs created here will appear in this list."
                    />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {runs.map((run) => (
                      <div key={run.id} className="flex items-center justify-between border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                        <div className="font-medium text-text">{run.periodStart} – {run.periodEnd}</div>
                        <span className="text-text-muted">{run.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader title="Pending Approvals" subtitle={`${pendingLeave.length + pendingCorrections.length} items need your review`} />
                {pendingLeave.length + pendingCorrections.length === 0 ? (
                  <div className="px-5 py-2 pb-5">
                    <EmptyState
                      icon={<UsersIcon width={20} height={20} />}
                      title="Nothing pending"
                      description="Leave and attendance correction requests will show up here."
                    />
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-border-soft">
                    {pendingLeave.slice(0, 3).map((l) => (
                      <div key={l.id} className="px-5 py-3 text-[12.5px]">
                        <div className="font-semibold text-text">{l.employeeName}</div>
                        <div className="text-text-faint">{l.leaveType} · {l.days}d</div>
                      </div>
                    ))}
                    {pendingCorrections.slice(0, 3).map((c) => (
                      <div key={c.id} className="px-5 py-3 text-[12.5px]">
                        <div className="font-semibold text-text">{c.employeeName}</div>
                        <div className="text-text-faint">Attendance correction</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
