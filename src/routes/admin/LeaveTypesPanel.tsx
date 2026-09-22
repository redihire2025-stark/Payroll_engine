import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { listLeaveTypes, createLeaveType } from '@/modules/leave/leaveService';

export function LeaveTypesPanel({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['leave-types', companyId], queryFn: () => listLeaveTypes(companyId) });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createLeaveType({ companyId, name: name.trim(), code: code.trim().toUpperCase(), isPaid: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types', companyId] });
      setName('');
      setCode('');
      setAdding(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add leave type.'),
  });

  const types = data ?? [];

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-text">Leave Types</h3>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>+ Add</Button>}
      </div>

      {types.length === 0 && !adding && (
        <p className="text-[12px] text-text-faint">No leave types configured yet — employees can't request leave until at least one exists.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => (
          <Badge key={t.id} tone="neutral">{t.name}</Badge>
        ))}
      </div>

      {adding && (
        <form
          className="flex flex-col gap-2 border-t border-border-soft pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          <Input placeholder="Name (e.g. Casual Leave)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="Code (e.g. CL)" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={10} />
          {error && <p className="text-[11.5px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" size="sm" variant="primary" disabled={!name.trim() || !code.trim() || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
