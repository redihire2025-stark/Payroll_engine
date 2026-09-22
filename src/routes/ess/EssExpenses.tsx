import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ReceiptIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listMyReimbursements, createExpenseClaim } from '@/modules/expense/expenseService';

const statusTone = { pending: 'warning', approved: 'success', rejected: 'danger', paid: 'success' } as const;

type LineItem = { category: string; amount: string; expenseDate: string };

function emptyLine(): LineItem {
  return { category: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10) };
}

export default function EssExpenses() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useQuery({
    queryKey: ['my-reimbursements', user?.employeeId],
    queryFn: () => listMyReimbursements(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });
  const claims = data ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      createExpenseClaim({
        companyId: user!.companyId,
        employeeId: user!.employeeId,
        items: lines.map((l) => ({ category: l.category.trim(), amount: Number(l.amount), expenseDate: l.expenseDate })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reimbursements', user?.employeeId] });
      setClaiming(false);
      setLines([emptyLine()]);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not submit that claim.'),
  });

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const canSubmit = lines.every((l) => l.category.trim() && Number(l.amount) > 0);

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="flex items-center justify-between">
        <div className="text-[19px] font-bold text-text">Expenses</div>
        {!claiming && <button onClick={() => setClaiming(true)} className="text-[12.5px] font-semibold text-accent">New Claim</button>}
      </div>

      {claiming ? (
        <form
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          {lines.map((line, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border-soft p-3">
              <input
                placeholder="Category (e.g. Travel)"
                className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]"
                value={line.category}
                onChange={(e) => updateLine(i, { category: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Amount"
                  className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]"
                  value={line.amount}
                  onChange={(e) => updateLine(i, { amount: e.target.value })}
                  required
                />
                <input
                  type="date"
                  className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]"
                  value={line.expenseDate}
                  onChange={(e) => updateLine(i, { expenseDate: e.target.value })}
                  required
                />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className="text-[12px] font-semibold text-accent self-start">
            + Add another item
          </button>
          <div className="flex items-center justify-between border-t border-border-soft pt-3 text-[13px] font-semibold text-text">
            <span>Total</span>
            <span className="font-mono-num">{formatINR(total)}</span>
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setClaiming(false)} className="flex-1 rounded-lg border border-border py-3 text-[13px] font-semibold text-text">
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit || mutation.isPending} className="flex-1 rounded-lg bg-accent py-3 text-[13px] font-bold text-white disabled:opacity-50">
              {mutation.isPending ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {listError && <ErrorState message={(listError as Error).message} />}
          {isLoading ? (
            <LoadingRows />
          ) : claims.length === 0 ? (
            <EmptyState icon={<ReceiptIcon width={20} height={20} />} title="No expense claims yet" description="Submit a claim and track its status here." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {claims.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num text-[15px] font-bold text-text">{formatINR(c.totalAmount)}</span>
                    <Badge tone={statusTone[c.status]}>{c.status}</Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-faint">{c.createdAt.slice(0, 10)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
