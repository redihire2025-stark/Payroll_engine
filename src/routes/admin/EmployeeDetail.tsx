import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { ErrorState, EmptyState } from '@/shared/ui/EmptyState';
import { getEmployee, deactivateEmployee } from '@/modules/employee/employeeService';
import { useSession } from '@/shared/lib/session';
import { EditEmployeeModal } from './employees/EditEmployeeModal';
import { PortalAccessCard } from './employees/PortalAccessCard';
import { DocumentsPanel } from '@/modules/document/DocumentsPanel';
import { ExitCard } from './employees/ExitCard';

const tabs = ['Profile', 'Employment', 'Salary', 'Documents', 'Attendance', 'Leave', 'History'];
const statusTone = { active: 'success', on_leave: 'warning', exited: 'neutral' } as const;
const statusLabel = { active: 'Active', on_leave: 'On Leave', exited: 'Exited' } as const;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-text-faint">{label}</span>
      <span className="text-[13px] font-medium text-text">{value}</span>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('Profile');
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
            className={`border-b-2 px-3.5 pb-2.5 text-[13px] font-semibold ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint hover:text-text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personal Information" />
          <div className="px-5 py-3">
            <InfoRow label="Date of Birth" value={employee.dob ?? '—'} />
            <InfoRow label="Gender" value={employee.gender ?? '—'} />
            <InfoRow label="Personal Email" value={employee.personalEmail ?? '—'} />
            <InfoRow label="Phone" value={employee.phone ?? '—'} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Bank &amp; Statutory" subtitle="Encrypted at rest — not decrypted in this view" />
          <div className="px-5 py-6 text-center text-[12.5px] text-text-faint">
            Bank account, PAN and statutory numbers are stored encrypted and are not displayed here.
          </div>
        </Card>

        <Card>
          <CardHeader title="Employment" />
          <div className="px-5 py-3">
            <InfoRow label="Branch" value={employee.branch ?? '—'} />
            <InfoRow label="Date of Joining" value={employee.doj} />
            <InfoRow label="Reporting Manager" value={employee.managerId ? 'Assigned' : 'Not set'} />
          </div>
        </Card>

        <PortalAccessCard employee={employee} />

        <Card>
          <CardHeader title="Documents" />
          <div className="px-5 py-4">
            <DocumentsPanel employeeId={employee.id} canVerify />
          </div>
        </Card>

        <ExitCard employee={employee} />
      </div>

      {editing && <EditEmployeeModal companyId={companyId} employee={employee} onClose={() => setEditing(false)} />}
    </div>
  );
}
