import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Input';
import { grantPortalAccess, revokePortalAccess } from '@/modules/employee/employeeService';
import type { EmployeeDetailRecord } from '@/modules/employee/employeeService';
import type { Role } from '@/shared/lib/session';

const GRANTABLE_ROLES: Role[] = [
  'employee', 'manager', 'hr_admin', 'payroll_admin', 'finance', 'recruiter', 'performance_admin', 'company_admin',
];
const ROLE_LABELS: Record<Role, string> = {
  employee: 'Employee', manager: 'Manager', hr_admin: 'HR Admin', payroll_admin: 'Payroll Admin',
  finance: 'Finance', recruiter: 'Recruiter', performance_admin: 'Performance Admin',
  company_admin: 'Company Admin', company_owner: 'Company Owner',
};

export function PortalAccessCard({ employee }: { employee: EmployeeDetailRecord }) {
  const queryClient = useQueryClient();
  const [granting, setGranting] = useState(false);
  const [email, setEmail] = useState(employee.personalEmail ?? '');
  const [role, setRole] = useState<Role>('employee');
  const [error, setError] = useState<string | null>(null);

  const grantMutation = useMutation({
    mutationFn: () => grantPortalAccess(employee.id, email.trim(), role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
      setGranting(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not grant portal access.'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokePortalAccess(employee.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee', employee.id] }),
  });

  return (
    <Card>
      <CardHeader
        title="Portal Access"
        action={<Badge tone={employee.hasPortalAccess ? 'success' : 'neutral'}>{employee.hasPortalAccess ? 'Enabled' : 'Not enabled'}</Badge>}
      />
      <div className="px-5 py-4">
        {employee.hasPortalAccess ? (
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] text-text-faint">This employee can sign in to the Employee portal.</p>
            <Button
              variant="danger"
              size="sm"
              disabled={revokeMutation.isPending}
              onClick={() => {
                if (confirm('Revoke portal access? They will no longer be able to sign in.')) revokeMutation.mutate();
              }}
            >
              {revokeMutation.isPending ? 'Revoking…' : 'Revoke Access'}
            </Button>
          </div>
        ) : granting ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              grantMutation.mutate();
            }}
          >
            <Field label="Login email" hint="They'll sign in with a one-time code sent to this address">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Role" hint="Governs which console they land on and what they can access">
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {GRANTABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            </Field>
            {error && <p className="text-[12px] text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setGranting(false)}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm" disabled={!email.trim() || grantMutation.isPending}>
                {grantMutation.isPending ? 'Granting…' : 'Grant Access'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] text-text-faint">This employee cannot sign in yet.</p>
            <Button variant="primary" size="sm" onClick={() => setGranting(true)}>Grant Portal Access</Button>
          </div>
        )}
      </div>
    </Card>
  );
}
