import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ReceiptIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listReimbursements, decideReimbursement, getReimbursementItems } from '@/modules/expense/expenseService';

const statusTone = { pending: 'warning', approved: 'success', rejected: 'danger', paid: 'success' } as const;
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

export default function Reimbursements() {
  const { user } = useSession();
  const companyId = user!.companyId;
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Reimbursements &amp; Loans</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">{pending.length} expense claim{pending.length === 1 ? '' : 's'} pending approval</p>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : claims.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<ReceiptIcon width={20} height={20} />} title="No expense claims" description="Claims employees submit will appear here for review." />
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Employee', 'Total', 'Status', ''].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {claims.map((c) => (
              <div key={c.id} className="border-b border-border-soft last:border-b-0">
                <button
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  style={{ display: 'grid', gridTemplateColumns: cols }}
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
          </>
        )}
      </Card>
    </div>
  );
}
