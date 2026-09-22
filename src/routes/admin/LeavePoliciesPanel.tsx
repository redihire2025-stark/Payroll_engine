import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { listLeavePolicies, createLeavePolicy, grantAnnualLeave, listLeaveTypes } from '@/modules/leave/leaveService';

export function LeavePoliciesPanel({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data: policies } = useQuery({ queryKey: ['leave-policies', companyId], queryFn: () => listLeavePolicies(companyId) });
  const { data: leaveTypes } = useQuery({ queryKey: ['leave-types', companyId], queryFn: () => listLeaveTypes(companyId) });

  const [adding, setAdding] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [annualQuota, setAnnualQuota] = useState('12');
  const [carryForwardMax, setCarryForwardMax] = useState('0');
  const [encashable, setEncashable] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [error, setError] = useState<string | null>(null);
  const [grantMessage, setGrantMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createLeavePolicy({
        companyId,
        leaveTypeId,
        annualQuota: Number(annualQuota),
        carryForwardMax: Number(carryForwardMax),
        encashable,
        effectiveFrom,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policies', companyId] });
      setAdding(false);
      setLeaveTypeId('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create policy.'),
  });

  const grantMutation = useMutation({
    mutationFn: ({ typeId, quota }: { typeId: string; quota: number }) => grantAnnualLeave(companyId, typeId, quota, new Date().getFullYear()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setGrantMessage(`Granted to ${result.granted} employee(s), ${result.skipped} already had a balance for this year.`);
    },
  });

  const rows = policies ?? [];
  const types = leaveTypes ?? [];

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-text">Leave Policies</h3>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>+ Add</Button>}
      </div>

      {rows.length === 0 && !adding && (
        <p className="text-[12px] text-text-faint">No leave policies configured yet — annual entitlements won't be granted automatically.</p>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2 text-[12px]">
            <div>
              <span className="font-semibold text-text">{p.leaveTypeName}</span>
              <span className="ml-2 text-text-faint">{p.annualQuota} days/yr{p.carryForwardMax > 0 ? ` · carry up to ${p.carryForwardMax}` : ''}{p.encashable ? ' · encashable' : ''}</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={grantMutation.isPending}
              onClick={() => {
                setGrantMessage(null);
                grantMutation.mutate({ typeId: p.leaveTypeId, quota: p.annualQuota });
              }}
            >
              Grant for {new Date().getFullYear()}
            </Button>
          </div>
        ))}
      </div>

      {grantMessage && <p className="text-[11.5px] text-success">{grantMessage}</p>}

      {adding && (
        <form
          className="flex flex-col gap-2 border-t border-border-soft pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            createMutation.mutate();
          }}
        >
          <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} required>
            <option value="">Select leave type…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={0} placeholder="Annual quota" value={annualQuota} onChange={(e) => setAnnualQuota(e.target.value)} required />
            <Input type="number" min={0} placeholder="Carry-forward max" value={carryForwardMax} onChange={(e) => setCarryForwardMax(e.target.value)} />
          </div>
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
          <label className="flex items-center gap-2 text-[12px] text-text-muted">
            <input type="checkbox" checked={encashable} onChange={(e) => setEncashable(e.target.checked)} />
            Encashable
          </label>
          {error && <p className="text-[11.5px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" size="sm" variant="primary" disabled={!leaveTypeId || !annualQuota || createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
