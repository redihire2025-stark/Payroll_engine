import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ReceiptIcon, BanknoteIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listMyReimbursements, createExpenseClaim } from '@/modules/expense/expenseService';
import { listMyLoans, requestLoan, listLoanRepayments } from '@/modules/loan/loanService';

const statusTone = { pending: 'warning', approved: 'success', rejected: 'danger', paid: 'success', closed: 'success' } as const;

type LineItem = { category: string; amount: string; expenseDate: string };

function emptyLine(): LineItem {
  return { category: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10) };
}

function ExpensesPanel() {
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

  if (claiming) {
    return (
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
        <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className="self-start text-[12px] font-semibold text-accent">
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
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setClaiming(true)} className="self-start text-[12.5px] font-semibold text-accent">+ New Claim</button>
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
    </div>
  );
}

function LoanSchedule({ loanId }: { loanId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['loan-repayments', loanId], queryFn: () => listLoanRepayments(loanId) });
  if (isLoading) return <div className="text-[11px] text-text-faint">Loading schedule…</div>;
  return (
    <div className="mt-2 flex flex-col gap-1 border-t border-border-soft pt-2">
      {(data ?? []).map((r) => (
        <div key={r.id} className="flex items-center justify-between text-[11.5px] text-text-muted">
          <span>#{r.installmentNumber} · {r.dueDate}</span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono-num">{formatINR(r.amount)}</span>
            {r.status === 'paid' && <Badge tone="success">paid</Badge>}
          </span>
        </div>
      ))}
    </div>
  );
}

function LoansPanel() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [requesting, setRequesting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useQuery({
    queryKey: ['my-loans', user?.employeeId],
    queryFn: () => listMyLoans(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });
  const loans = data ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      requestLoan({ employeeId: user!.employeeId, principalAmount: Number(principal), interestRate: Number(interestRate), tenureMonths: Number(tenureMonths) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-loans', user?.employeeId] });
      setRequesting(false);
      setPrincipal('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not submit that request.'),
  });

  if (requesting) {
    return (
      <form
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <input
          type="number"
          min={0}
          placeholder="Amount requested"
          className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            placeholder="Tenure (months)"
            className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(e.target.value)}
            required
          />
          <input
            type="number"
            min={0}
            placeholder="Interest %"
            className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
          />
        </div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => setRequesting(false)} className="flex-1 rounded-lg border border-border py-3 text-[13px] font-semibold text-text">
            Cancel
          </button>
          <button type="submit" disabled={!principal || mutation.isPending} className="flex-1 rounded-lg bg-accent py-3 text-[13px] font-bold text-white disabled:opacity-50">
            {mutation.isPending ? 'Submitting…' : 'Request Loan'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setRequesting(true)} className="self-start text-[12.5px] font-semibold text-accent">+ Request Loan</button>
      {listError && <ErrorState message={(listError as Error).message} />}
      {isLoading ? (
        <LoadingRows />
      ) : loans.length === 0 ? (
        <EmptyState icon={<BanknoteIcon width={20} height={20} />} title="No loans yet" description="Request a loan and track approval and repayments here." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {loans.map((l) => (
            <button key={l.id} onClick={() => setExpandedId(expandedId === l.id ? null : l.id)} className="w-full rounded-xl border border-border bg-surface p-4 text-left">
              <div className="flex items-center justify-between">
                <span className="font-mono-num text-[15px] font-bold text-text">{formatINR(l.principalAmount)}</span>
                <Badge tone={statusTone[l.status as keyof typeof statusTone] ?? 'warning'}>{l.status}</Badge>
              </div>
              <div className="mt-0.5 text-[11px] text-text-faint">{l.tenureMonths} months{l.status === 'approved' ? ` · ${formatINR(l.outstanding)} outstanding` : ''}</div>
              {expandedId === l.id && l.status === 'approved' && <LoanSchedule loanId={l.id} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EssExpenses() {
  const [tab, setTab] = useState<'expenses' | 'loans'>('expenses');

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="text-[19px] font-bold text-text">Expenses &amp; Loans</div>

      <div className="flex gap-1 border-b border-border">
        {(['expenses', 'loans'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2.5 text-[13px] font-semibold capitalize ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'expenses' ? <ExpensesPanel /> : <LoansPanel />}
    </div>
  );
}
