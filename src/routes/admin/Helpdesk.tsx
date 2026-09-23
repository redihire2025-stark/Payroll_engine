import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Select } from '@/shared/ui/Input';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { AlertIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listTickets, updateTicketStatus, listTicketComments, addTicketComment, type TicketRow } from '@/modules/helpdesk/helpdeskService';

const priorityTone = { low: 'neutral', medium: 'warning', high: 'danger' } as const;
const cols = '1.8fr 1.2fr 1.4fr 1fr 1fr';

function TicketThread({ ticketId }: { ticketId: string }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const { data } = useQuery({ queryKey: ['ticket-comments', ticketId], queryFn: () => listTicketComments(ticketId) });

  const mutation = useMutation({
    mutationFn: () => addTicketComment(ticketId, user!.id, comment.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      setComment('');
    },
  });

  return (
    <div className="flex flex-col gap-2 bg-bg px-5 py-3">
      {(data ?? []).map((c) => (
        <div key={c.id} className="rounded-lg bg-white px-3 py-2 text-[12px] text-text-muted">
          {c.body}
          <div className="mt-1 text-[10.5px] text-text-faint">{new Date(c.createdAt).toLocaleString()}</div>
        </div>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (comment.trim()) mutation.mutate();
        }}
      >
        <input
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]"
          placeholder="Reply…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button type="submit" disabled={!comment.trim() || mutation.isPending} className="rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}

export default function Helpdesk() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['tickets', companyId], queryFn: () => listTickets(companyId) });
  const tickets = data ?? [];
  const open = tickets.filter((t) => t.status === 'open').length;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketRow['status'] }) => updateTicketStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets', companyId] }),
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Helpdesk</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">{open} open ticket{open === 1 ? '' : 's'}</p>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : tickets.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<AlertIcon width={20} height={20} />} title="No tickets" description="Employee support requests will appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 700 }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Employee', 'Category', 'Subject', 'Priority', 'Status'].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {tickets.map((t) => (
              <div key={t.id} className="border-b border-border-soft last:border-b-0">
                <button
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 700 }}
                  className="w-full items-center gap-3 px-5 py-3.5 text-left text-[13px] hover:bg-bg/70"
                >
                  <div className="truncate font-medium text-text">{t.employeeName}</div>
                  <div className="text-text-muted">{t.category}</div>
                  <div className="truncate text-text-muted">{t.subject}</div>
                  <div><Badge tone={priorityTone[t.priority]}>{t.priority}</Badge></div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={t.status}
                      onChange={(e) => statusMutation.mutate({ id: t.id, status: e.target.value as TicketRow['status'] })}
                      className="w-full"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>
                </button>
                {expandedId === t.id && <TicketThread ticketId={t.id} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
