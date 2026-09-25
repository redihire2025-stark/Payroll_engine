import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Input';
import { getEmployeeBankDetails, saveEmployeeBankDetails } from '@/modules/employee/employeeService';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-text-faint">{label}</span>
      <span className="font-mono-num text-[13px] font-medium text-text">{value}</span>
    </div>
  );
}

export function BankDetailsCard({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bankName: '', ifsc: '', accountNumber: '', panNumber: '', pfNumber: '', uan: '' });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employee-bank-details', employeeId],
    queryFn: () => getEmployeeBankDetails(employeeId),
  });

  const mutation = useMutation({
    mutationFn: () => saveEmployeeBankDetails({ employeeId, ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-bank-details', employeeId] });
      setEditing(false);
      setForm({ bankName: '', ifsc: '', accountNumber: '', panNumber: '', pfNumber: '', uan: '' });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not save these details.'),
  });

  const hasAny = data && (data.bankName || data.panLast4 || data.pfNumber || data.uan);

  if (editing) {
    return (
      <Card>
        <CardHeader title="Bank &amp; Statutory Details" subtitle="Account number and PAN are encrypted before they're stored" />
        <form
          className="flex flex-col gap-3 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Bank Name"><Input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder={data?.bankName ?? 'e.g. ICICI Bank'} /></Field>
            <Field label="IFSC"><Input value={form.ifsc} onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))} placeholder={data?.ifsc ?? 'e.g. ICIC0001234'} /></Field>
          </div>
          <Field label="Account Number" hint={data?.accountLast4 ? `On file, ending in ${data.accountLast4} — enter a new number to replace it` : undefined}>
            <Input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} placeholder="Full account number" />
          </Field>
          <Field label="PAN" hint={data?.panLast4 ? `On file, ending in ${data.panLast4} — enter a new PAN to replace it` : undefined}>
            <Input value={form.panNumber} onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value.toUpperCase() }))} placeholder="e.g. ABCDE1234F" maxLength={10} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="PF Number"><Input value={form.pfNumber} onChange={(e) => setForm((f) => ({ ...f, pfNumber: e.target.value }))} placeholder={data?.pfNumber ?? 'e.g. APHYD25933...'} /></Field>
            <Field label="PF UAN"><Input value={form.uan} onChange={(e) => setForm((f) => ({ ...f, uan: e.target.value }))} placeholder={data?.uan ?? 'e.g. 101636370003'} /></Field>
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Bank &amp; Statutory Details"
        subtitle="Account number and PAN shown masked — encrypted at rest"
        action={<Button variant="secondary" size="sm" onClick={() => setEditing(true)}>{hasAny ? 'Edit' : 'Add Details'}</Button>}
      />
      <div className="px-5 py-3">
        {isLoading ? (
          <p className="py-3 text-center text-[12.5px] text-text-faint">Loading…</p>
        ) : !hasAny ? (
          <p className="py-3 text-center text-[12.5px] text-text-faint">No bank or statutory details on file yet.</p>
        ) : (
          <>
            {data?.bankName && <InfoRow label="Bank" value={`${data.bankName}${data.ifsc ? ` · ${data.ifsc}` : ''}`} />}
            {data?.accountLast4 && <InfoRow label="Account Number" value={`•••• •••• ${data.accountLast4}`} />}
            {data?.panLast4 && <InfoRow label="PAN" value={`•••••${data.panLast4}`} />}
            {data?.pfNumber && <InfoRow label="PF Number" value={data.pfNumber} />}
            {data?.uan && <InfoRow label="PF UAN" value={data.uan} />}
          </>
        )}
      </div>
    </Card>
  );
}
