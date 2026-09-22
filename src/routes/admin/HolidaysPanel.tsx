import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { listHolidays, createHoliday, deleteHoliday } from '@/modules/company/holidayService';

export function HolidaysPanel({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['holidays', companyId], queryFn: () => listHolidays(companyId) });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createHoliday({ companyId, name: name.trim(), date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays', companyId] });
      setName('');
      setDate('');
      setAdding(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add holiday.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays', companyId] }),
  });

  const holidays = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date >= today);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-text">Company Holidays</h3>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>+ Add</Button>}
      </div>

      {holidays.length === 0 && !adding && (
        <p className="text-[12px] text-text-faint">No holidays added yet. Employees see this list on their Leave page.</p>
      )}

      <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
        {holidays.map((h) => (
          <div key={h.id} className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2 text-[12.5px]">
            <div>
              <span className="font-semibold text-text">{h.name}</span>
              <span className="ml-2 font-mono-num text-text-faint">{h.date}</span>
              {h.date < today && <span className="ml-2 text-[10.5px] text-text-faint">(past)</span>}
            </div>
            <button
              onClick={() => deleteMutation.mutate(h.id)}
              className="text-[11px] font-semibold text-danger hover:underline"
              disabled={deleteMutation.isPending}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <form
          className="flex flex-col gap-2 border-t border-border-soft pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            createMutation.mutate();
          }}
        >
          <Input placeholder="Holiday name (e.g. Diwali)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          {error && <p className="text-[11.5px] text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" size="sm" variant="primary" disabled={!name.trim() || !date || createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {!adding && upcoming.length > 0 && (
        <p className="text-[11px] text-text-faint">{upcoming.length} upcoming holiday{upcoming.length === 1 ? '' : 's'}</p>
      )}
    </Card>
  );
}
