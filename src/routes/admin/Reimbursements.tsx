import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ReceiptIcon, BanknoteIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listReimbursements, decideReimbursement, getReimbursementItems } from '@/modules/expense/expenseService';
import { listLoans, approveLoan, rejectLoan, listLoanRepayments, markInstallmentPaid } from '@/modules/loan/loanService';

const statusTone: Record<string, 'warning' | 'success' | 'danger'> = { pending: 'warning', approved: 'success', rejected: 'danger', paid: 'success', closed: 'success' };
const cols = '1.8fr 1.2fr 1fr 1.3fr';

function ExpandedItems({ reimbursementId }: { reimbursementId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['reimbursement-items', reimbursementId], queryFn: () => getReimbursementItems(reimbursementId) });
  if (isLoading) return <div className="px-5 pb-3 text-[12px] text-text-faint">Loading items…</div>;
  return (
    <div className="flex flex-col gap-1.5 bg-bg px-5 py-3">
      {(data ?? []).map((item, i) => (
        <div key={i} className="flex items-center justify-between text-[12px] text-text-muted">
          <span>{item.category} · {item.expenseDate}</span>
          <span className="font-mono-num">{formatINR(item.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function ExpenseClaimsTab({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['reimbursements', companyId], queryFn: () => listReimbursements(companyId) });
  const claims = data ?? [];
  const pending = claims.filter((c) => c.status === 'pending');

  const decisionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'paid' }) => decideReimbursement(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reimbursements', companyId] }),
  });

  return (
    <>
      <p className="text-[13px] text-text-faint">{pending.length} expense claim{pending.length === 1 ? '' : 's'} pending approval</p>
      {error && <ErrorState message={(error as Error).message} />}
      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : claims.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<ReceiptIcon width={20} height={20} />} title="No expense claims" description="Claims employees submit will appear here for review." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 640 }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Employee', 'Total', 'Status', ''].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {claims.map((c) => (
              <div key={c.id} className="border-b border-border-soft last:border-b-0">
                <button
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 640 }}
                  className="w-full items-center gap-3 px-5 py-3.5 text-left text-[13px] hover:bg-bg/70"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.employeeName} size={28} />
                    <span className="truncate font-medium text-text">{c.employeeName}</span>
                  </div>
                  <div className="font-mono-num text-text">{formatINR(c.totalAmount)}</div>
                  <div><Badge tone={statusTone[c.status]}>{c.status}</Badge></div>
                  <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {c.status === 'pending' && (
                      <>
                        <Button size="sm" variant="secondary" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ id: c.id, status: 'rejected' })}>
                          Reject
                        </Button>
                        <Button size="sm" variant="primary" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ id: c.id, status: 'approved' })}>
                          Approve
                        </Button>
                      </>
                    )}
                    {c.status === 'approved' && (
                      <Button size="sm" variant="primary" disabled={decisionMutation.isPending} onClick={() => decisionMutation.mutate({ id: c.id, status: 'paid' })}>
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </button>
                {expandedId === c.id && <ExpandedItems reimbursementId={c.id} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function RepaymentSchedule({ loanId }: { loanId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['loan-repayments', loanId], queryFn: () => listLoanRepayments(loanId) });
  const payMutation = useMutation({
    mutationFn: (repaymentId: string) => markInstallmentPaid(repaymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-repayments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });

  if (isLoading) return <div className="px-5 pb-3 text-[12px] text-text-faint">Loading schedule…</div>;
  return (
    <div className="flex flex-col gap-1.5 bg-bg px-5 py-3">
      {(data ?? []).map((r) => (
        <div key={r.id} className="flex items-center justify-between text-[12px] text-text-muted">
          <span>#{r.installmentNumber} · due {r.dueDate}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono-num">{formatINR(r.amount)}</span>
            {r.status === 'paid' ? (
              <Badge tone="success">paid</Badge>
            ) : (
              <Button size="sm" variant="secondary" disabled={payMutation.isPending} onClick={() => payMutation.mutate(r.id)}>Mark Paid</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoansTab({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['loans', companyId], queryFn: () => listLoans(companyId) });
  const loans = data ?? [];
  const pending = loans.filter((l) => l.status === 'pending');

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLoan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans', companyId] }),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectLoan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans', companyId] }),
  });

  return (
    <>
      <p className="text-[13px] text-text-faint">{pending.length} loan request{pending.length === 1 ? '' : 's'} pending approval</p>
      {error && <ErrorState message={(error as Error).message} />}
      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : loans.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<BanknoteIcon width={20} height={20} />} title="No loan requests" description="Employee loan requests will appear here for review." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 640 }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Employee', 'Principal', 'Outstanding', ''].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {loans.map((l) => (
              <div key={l.id} className="border-b border-border-soft last:border-b-0">
                <button
                  onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                  style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 640 }}
                  className="w-full items-center gap-3 px-5 py-3.5 text-left text-[13px] hover:bg-bg/70"
                  disabled={l.status !== 'approved'}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={l.employeeName} size={28} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-text">{l.employeeName}</div>
                      <div className="text-[11px] text-text-faint">{l.tenureMonths} months · {l.interestRate}%</div>
                    </div>
                  </div>
                  <div className="font-mono-num text-text">{formatINR(l.principalAmount)}</div>
                  <div>
                    {l.status === 'approved' ? <span className="font-mono-num text-text">{formatINR(l.outstanding)}</span> : <Badge tone={statusTone[l.status] ?? 'warning'}>{l.status}</Badge>}
                  </div>
                  <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {l.status === 'pending' && (
                      <>
                        <Button size="sm" variant="secondary" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate(l.id)}>Reject</Button>
                        <Button size="sm" variant="primary" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(l.id)}>Approve</Button>
                      </>
                    )}
                  </div>
                </button>
                {expandedId === l.id && l.status === 'approved' && <RepaymentSchedule loanId={l.id} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

export default function Reimbursements() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const [tab, setTab] = useState<'expenses' | 'loans'>('expenses');

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[22px] font-bold text-text">Reimbursements &amp; Loans</h1>

      <div className="flex gap-1 border-b border-border">
        {(['expenses', 'loans'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3.5 pb-2.5 text-[13px] font-semibold capitalize ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint hover:text-text-muted'
            }`}
          >
            {t === 'expenses' ? 'Expense Claims' : 'Loans'}
          </button>
        ))}
      </div>

      {tab === 'expenses' ? <ExpenseClaimsTab companyId={companyId} /> : <LoansTab companyId={companyId} />}
    </div>
  );
}
