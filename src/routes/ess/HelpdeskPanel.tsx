import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { AlertIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listMyTickets, createTicket, listTicketComments, addTicketComment } from '@/modules/helpdesk/helpdeskService';

const statusTone = { open: 'warning', in_progress: 'info', resolved: 'success', closed: 'neutral' } as const;

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
    <div className="mt-2 flex flex-col gap-2 border-t border-border-soft pt-2">
      {(data ?? []).map((c) => (
        <div key={c.id} className="rounded-lg bg-bg px-3 py-2 text-[11.5px] text-text-muted">{c.body}</div>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (comment.trim()) mutation.mutate();
        }}
      >
        <input
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-[12px]"
          placeholder="Reply…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button type="submit" disabled={!comment.trim() || mutation.isPending} className="rounded-lg bg-accent px-3 py-2 text-[11.5px] font-semibold text-white disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}

export function HelpdeskPanel() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useQuery({
    queryKey: ['my-tickets', user?.employeeId],
    queryFn: () => listMyTickets(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });

  const mutation = useMutation({
    mutationFn: () => createTicket(user!.companyId, user!.employeeId, category.trim(), subject.trim(), priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets', user?.employeeId] });
      setCreating(false);
      setCategory('');
      setSubject('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create ticket.'),
  });

  if (creating) {
    return (
      <form
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <input placeholder="Category (e.g. Payroll)" className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]" value={category} onChange={(e) => setCategory(e.target.value)} required />
        <input placeholder="Subject" className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <select className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => setCreating(false)} className="flex-1 rounded-lg border border-border py-3 text-[13px] font-semibold text-text">Cancel</button>
          <button type="submit" disabled={!category.trim() || !subject.trim() || mutation.isPending} className="flex-1 rounded-lg bg-accent py-3 text-[13px] font-bold text-white disabled:opacity-50">
            {mutation.isPending ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setCreating(true)} className="self-start text-[12.5px] font-semibold text-accent">+ New Ticket</button>
      {listError && <ErrorState message={(listError as Error).message} />}
      {isLoading ? (
        <LoadingRows />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<AlertIcon width={20} height={20} />} title="No tickets yet" description="Raise a ticket and track it here." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {(data ?? []).map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-surface p-4">
              <button className="flex w-full items-center justify-between text-left" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <div>
                  <div className="text-[13px] font-semibold text-text">{t.subject}</div>
                  <div className="mt-0.5 text-[11px] text-text-faint">{t.category}</div>
                </div>
                <Badge tone={statusTone[t.status]}>{t.status.replace('_', ' ')}</Badge>
              </button>
              {expandedId === t.id && <TicketThread ticketId={t.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
