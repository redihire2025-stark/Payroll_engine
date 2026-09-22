import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Field, Input, Select } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { updateEmployee, listEmployeesLite, type EmployeeDetailRecord } from '@/modules/employee/employeeService';

export function EditEmployeeModal({
  companyId,
  employee,
  onClose,
}: {
  companyId: string;
  employee: EmployeeDetailRecord;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const employeesQuery = useQuery({ queryKey: ['employees-lite', companyId], queryFn: () => listEmployeesLite(companyId) });
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    personalEmail: '',
    phone: '',
    dob: '',
    gender: '',
    dateOfJoining: '',
    dateOfExit: '',
    status: 'active' as 'active' | 'on_leave' | 'exited',
    employmentType: 'full_time',
    managerId: '',
    departmentName: '',
    designationTitle: '',
    branchName: '',
  });

  useEffect(() => {
    const [firstName, ...rest] = employee.name.split(' ');
    setForm({
      firstName: employee.name === '(Profile incomplete)' ? '' : firstName,
      lastName: employee.name === '(Profile incomplete)' ? '' : rest.join(' '),
      personalEmail: employee.personalEmail ?? '',
      phone: employee.phone ?? '',
      dob: employee.dob ?? '',
      gender: employee.gender ?? '',
      dateOfJoining: employee.doj,
      dateOfExit: '',
      status: employee.status,
      employmentType: 'full_time',
      managerId: employee.managerId ?? '',
      departmentName: employee.department ?? '',
      designationTitle: employee.designation ?? '',
      branchName: employee.branch ?? '',
    });
  }, [employee]);

  const mutation = useMutation({
    mutationFn: () =>
      updateEmployee({
        employeeId: employee.id,
        companyId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        personalEmail: form.personalEmail.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dob: form.dob || undefined,
        gender: form.gender.trim() || undefined,
        dateOfJoining: form.dateOfJoining,
        dateOfExit: form.dateOfExit || undefined,
        status: form.status,
        employmentType: form.employmentType,
        managerId: form.managerId || undefined,
        departmentName: form.departmentName.trim() || undefined,
        designationTitle: form.designationTitle.trim() || undefined,
        branchName: form.branchName.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save changes.'),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const managers = (employeesQuery.data ?? []).filter((e) => e.id !== employee.id);

  return (
    <Modal title="Edit Employee" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Personal email">
            <Input type="email" value={form.personalEmail} onChange={(e) => update('personalEmail', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of birth">
            <Input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
          </Field>
          <Field label="Gender">
            <Input value={form.gender} onChange={(e) => update('gender', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Department">
            <Input value={form.departmentName} onChange={(e) => update('departmentName', e.target.value)} />
          </Field>
          <Field label="Designation">
            <Input value={form.designationTitle} onChange={(e) => update('designationTitle', e.target.value)} />
          </Field>
          <Field label="Branch">
            <Input value={form.branchName} onChange={(e) => update('branchName', e.target.value)} />
          </Field>
        </div>

        <Field label="Reporting manager">
          <Select value={form.managerId} onChange={(e) => update('managerId', e.target.value)}>
            <option value="">No manager</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of joining">
            <Input type="date" value={form.dateOfJoining} onChange={(e) => update('dateOfJoining', e.target.value)} required />
          </Field>
          <Field label="Employment type">
            <Select value={form.employmentType} onChange={(e) => update('employmentType', e.target.value)}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={form.status} onChange={(e) => update('status', e.target.value as typeof form.status)}>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="exited">Exited</option>
            </Select>
          </Field>
          <Field label="Date of exit" hint="Only if exited">
            <Input type="date" value={form.dateOfExit} onChange={(e) => update('dateOfExit', e.target.value)} />
          </Field>
        </div>

        {error && <p className="text-[12.5px] text-danger">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!form.firstName.trim() || !form.dateOfJoining || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
