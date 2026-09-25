import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { ErrorState, EmptyState, LoadingRows } from '@/shared/ui/EmptyState';
import { formatINR } from '@/shared/lib/format';
import { getEmployee, deactivateEmployee } from '@/modules/employee/employeeService';
import { getCurrentSalaryAssignment, listSalaryStructures } from '@/modules/salary/salaryService';
import { listMyAttendance } from '@/modules/attendance/attendanceService';
import { listMyLeaveBalances, listMyLeaveRequests } from '@/modules/leave/leaveService';
import { getMyExitCase } from '@/modules/exit/exitService';
import { useSession } from '@/shared/lib/session';
import { EditEmployeeModal } from './employees/EditEmployeeModal';
import { PortalAccessCard } from './employees/PortalAccessCard';
import { BankDetailsCard } from './employees/BankDetailsCard';
import { DocumentsPanel } from '@/modules/document/DocumentsPanel';
import { ExitCard } from './employees/ExitCard';
import type { EmployeeDetailRecord } from '@/modules/employee/employeeService';

const tabs = ['Profile', 'Employment', 'Salary', 'Documents', 'Attendance', 'Leave', 'History'] as const;
type Tab = (typeof tabs)[number];

const statusTone = { active: 'success', on_leave: 'warning', exited: 'neutral' } as const;
const statusLabel = { active: 'Active', on_leave: 'On Leave', exited: 'Exited' } as const;
const attendanceTone: Record<string, BadgeTone> = { present: 'success', late: 'warning', half_day: 'warning', absent: 'danger' };
const leaveTone: Record<string, BadgeTone> = { approved: 'success', pending: 'warning', rejected: 'danger' };

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-text-faint">{label}</span>
      <span className="text-[13px] font-medium text-text">{value}</span>
    </div>
  );
}

function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function SalaryTab({ employeeId }: { employeeId: string }) {
  const { user } = useSession();
  const companyId = user!.companyId;
  const { data: assignment, isLoading } = useQuery({
    queryKey: ['salary-assignment', employeeId],
    queryFn: () => getCurrentSalaryAssignment(employeeId, new Date().toISOString().slice(0, 10)),
  });
  const { data: structures } = useQuery({ queryKey: ['salary-structures', companyId], queryFn: () => listSalaryStructures(companyId) });
  const structureName = structures?.find((s) => s.id === assignment?.salaryStructureId)?.name;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Current Salary" action={<Link to="/admin/salary" className="text-[12.5px] font-semibold text-accent">Manage in Salary →</Link>} />
        <div className="px-5 py-3">
          {isLoading ? (
            <LoadingRows />
          ) : !assignment ? (
            <p className="py-3 text-center text-[12.5px] text-text-faint">No salary structure assigned yet.</p>
          ) : (
            <>
              <InfoRow label="Structure" value={structureName ?? '—'} />
              <InfoRow label="Annual CTC" value={formatINR(assignment.annualCtc)} />
              <InfoRow label="Monthly (approx.)" value={formatINR(assignment.annualCtc / 12)} />
            </>
          )}
        </div>
      </Card>
      <BankDetailsCard employeeId={employeeId} />
    </div>
  );
}

function AttendanceTab({ employeeId }: { employeeId: string }) {
  const { start, end } = monthBounds(new Date());
  const { data, isLoading } = useQuery({
    queryKey: ['employee-attendance', employeeId, start],
    queryFn: () => listMyAttendance(employeeId, start, end),
  });
  const days = data ?? [];
  const present = days.filter((d) => d.status === 'present' || d.status === 'late').length;
  const absent = days.filter((d) => d.status === 'absent').length;

  return (
    <Card>
      <CardHeader title="Attendance This Month" subtitle={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} />
      {isLoading ? (
        <LoadingRows />
      ) : days.length === 0 ? (
        <div className="px-5 pb-6 pt-2"><EmptyState title="No attendance recorded yet" description="Punch records for this employee will appear here." /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border-soft p-3 text-center">
              <div className="font-mono-num text-[18px] font-bold text-success">{present}</div>
              <div className="mt-0.5 text-[10.5px] text-text-faint">Present</div>
            </div>
            <div className="rounded-lg border border-border-soft p-3 text-center">
              <div className="font-mono-num text-[18px] font-bold text-danger">{absent}</div>
              <div className="mt-0.5 text-[10.5px] text-text-faint">Absent</div>
            </div>
            <div className="rounded-lg border border-border-soft p-3 text-center">
              <div className="font-mono-num text-[18px] font-bold text-text">{days.length}</div>
              <div className="mt-0.5 text-[10.5px] text-text-faint">Days Logged</div>
            </div>
          </div>
          <div className="border-t border-border-soft">
            {days.slice(0, 8).map((d) => (
              <div key={d.date} className="flex items-center justify-between border-b border-border-soft px-5 py-2.5 text-[12.5px] last:border-b-0">
                <span className="text-text-muted">{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono-num text-text-faint">{d.checkIn ? `${d.checkIn} – ${d.checkOut ?? '—'}` : '—'}</span>
                  <Badge tone={attendanceTone[d.status] ?? 'neutral'}>{d.status.replace('_', ' ')}</Badge>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function LeaveTab({ employeeId }: { employeeId: string }) {
  const balancesQuery = useQuery({ queryKey: ['employee-leave-balances', employeeId], queryFn: () => listMyLeaveBalances(employeeId, new Date().getFullYear()) });
  const historyQuery = useQuery({ queryKey: ['employee-leave-history', employeeId], queryFn: () => listMyLeaveRequests(employeeId) });
  const balances = balancesQuery.data ?? [];
  const history = historyQuery.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Leave Balances" subtitle={String(new Date().getFullYear())} />
        {balancesQuery.isLoading ? (
          <LoadingRows />
        ) : balances.length === 0 ? (
          <div className="px-5 pb-6 pt-2"><EmptyState title="No leave balances" description="Set up leave policies to grant balances." /></div>
        ) : (
          <div className="px-5 py-3">
            {balances.map((b) => (
              <InfoRow key={b.leaveTypeId} label={b.name} value={`${b.closing} left · ${b.used} used`} />
            ))}
          </div>
        )}
      </Card>
      <Card>
        <CardHeader title="Leave History" />
        {historyQuery.isLoading ? (
          <LoadingRows />
        ) : history.length === 0 ? (
          <div className="px-5 pb-6 pt-2"><EmptyState title="No leave requests yet" description="Requests this employee submits will appear here." /></div>
        ) : (
          <div className="border-t border-border-soft">
            {history.slice(0, 8).map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-border-soft px-5 py-2.5 text-[12.5px] last:border-b-0">
                <span className="text-text-muted">{l.leaveType} · {l.startDate} – {l.endDate}</span>
                <Badge tone={leaveTone[l.status] ?? 'neutral'}>{l.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function HistoryTab({ employee }: { employee: EmployeeDetailRecord }) {
  const { data: exitCase, isLoading } = useQuery({ queryKey: ['exit-case', employee.id], queryFn: () => getMyExitCase(employee.id) });
  if (isLoading) return <Card><LoadingRows /></Card>;
  if (!exitCase || exitCase.status === 'rejected') {
    return (
      <Card>
        <CardHeader title="History" />
        <div className="px-5 pb-6 pt-2"><EmptyState title="No offboarding history" description="Resignation and exit records for this employee will appear here." /></div>
      </Card>
    );
  }
  return <ExitCard employee={employee} />;
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('Profile');
  const [editing, setEditing] = useState(false);
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id!),
    enabled: Boolean(id),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateEmployee(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
      // Deactivation sets status to 'exited', which company_seat_usage
      // excludes — without this the seat counter on Employees/Company
      // stays stale until a full page reload.
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    },
  });

  if (error) return <ErrorState message={(error as Error).message} />;
  if (isLoading) return <div className="text-[13px] text-text-faint">Loading…</div>;
  if (!employee) return <EmptyState title="Employee not found" description="This employee doesn't exist or you don't have access to view them." />;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[12.5px] text-text-faint">
        <Link to="/admin/employees" className="text-accent">Employees</Link> / {employee.name}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar name={employee.name} size={56} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] font-bold text-text">{employee.name}</h1>
              <Badge tone={statusTone[employee.status]}>{statusLabel[employee.status]}</Badge>
            </div>
            <p className="mt-0.5 text-[13px] text-text-faint">
              {employee.code} · {employee.designation ?? 'No designation set'} · {employee.department ?? 'No department set'}
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          {employee.status !== 'exited' && (
            <Button
              variant="danger"
              size="sm"
              disabled={deactivateMutation.isPending}
              onClick={() => {
                if (confirm(`Deactivate ${employee.name}? Their status will be set to Exited.`)) {
                  deactivateMutation.mutate();
                }
              }}
            >
              {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3.5 pb-2.5 text-[13px] font-semibold ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint hover:text-text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <Card>
          <CardHeader title="Personal Information" />
          <div className="px-5 py-3">
            <InfoRow label="Date of Birth" value={employee.dob ?? '—'} />
            <InfoRow label="Gender" value={employee.gender ?? '—'} />
            <InfoRow label="Personal Email" value={employee.personalEmail ?? '—'} />
            <InfoRow label="Phone" value={employee.phone ?? '—'} />
          </div>
        </Card>
      )}

      {tab === 'Employment' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Employment" />
            <div className="px-5 py-3">
              <InfoRow label="Department" value={employee.department ?? '—'} />
              <InfoRow label="Designation" value={employee.designation ?? '—'} />
              <InfoRow label="Branch" value={employee.branch ?? '—'} />
              <InfoRow label="Date of Joining" value={employee.doj} />
              <InfoRow label="Reporting Manager" value={employee.managerId ? 'Assigned' : 'Not set'} />
            </div>
          </Card>
          <PortalAccessCard employee={employee} />
        </div>
      )}

      {tab === 'Salary' && <SalaryTab employeeId={employee.id} />}

      {tab === 'Documents' && (
        <Card>
          <CardHeader title="Documents" />
          <div className="px-5 py-4">
            <DocumentsPanel employeeId={employee.id} canVerify />
          </div>
        </Card>
      )}

      {tab === 'Attendance' && <AttendanceTab employeeId={employee.id} />}

      {tab === 'Leave' && <LeaveTab employeeId={employee.id} />}

      {tab === 'History' && <HistoryTab employee={employee} />}

      {editing && <EditEmployeeModal companyId={companyId} employee={employee} onClose={() => setEditing(false)} />}
    </div>
  );
}
