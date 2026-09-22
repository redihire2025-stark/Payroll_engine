import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Field, Input, Select } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { createEmployee } from '@/modules/employee/employeeService';

export function AddEmployeeModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    personalEmail: '',
    phone: '',
    dateOfJoining: '',
    employmentType: 'full_time',
    departmentName: '',
    designationTitle: '',
    branchName: '',
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createEmployee({
        companyId,
        employeeCode: form.employeeCode.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        personalEmail: form.personalEmail.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dateOfJoining: form.dateOfJoining,
        employmentType: form.employmentType,
        departmentName: form.departmentName.trim() || undefined,
        designationTitle: form.designationTitle.trim() || undefined,
        branchName: form.branchName.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create employee.'),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canSubmit = form.employeeCode.trim() && form.firstName.trim() && form.dateOfJoining;

  return (
    <Modal title="Add Employee" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee code">
            <Input value={form.employeeCode} onChange={(e) => update('employeeCode', e.target.value)} placeholder="EMP001" required />
          </Field>
          <Field label="Date of joining">
            <Input type="date" value={form.dateOfJoining} onChange={(e) => update('dateOfJoining', e.target.value)} required />
          </Field>
        </div>

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

        <div className="grid grid-cols-3 gap-3">
          <Field label="Department" hint="Created if new">
            <Input value={form.departmentName} onChange={(e) => update('departmentName', e.target.value)} placeholder="e.g. Engineering" />
          </Field>
          <Field label="Designation" hint="Created if new">
            <Input value={form.designationTitle} onChange={(e) => update('designationTitle', e.target.value)} placeholder="e.g. Software Engineer" />
          </Field>
          <Field label="Branch" hint="Created if new">
            <Input value={form.branchName} onChange={(e) => update('branchName', e.target.value)} placeholder="e.g. Hyderabad" />
          </Field>
        </div>

        <Field label="Employment type">
          <Select value={form.employmentType} onChange={(e) => update('employmentType', e.target.value)}>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </Select>
        </Field>

        {error && <p className="text-[12.5px] text-danger">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
