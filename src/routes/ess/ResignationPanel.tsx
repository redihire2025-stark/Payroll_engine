import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useSession } from '@/shared/lib/session';
import { getMyExitCase, submitResignation } from '@/modules/exit/exitService';

const statusTone = { pending: 'warning', approved: 'info', cleared: 'info', settled: 'success', rejected: 'danger' } as const;

export function ResignationPanel() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: exitCase, isLoading } = useQuery({
    queryKey: ['exit-case', user?.employeeId],
    queryFn: () => getMyExitCase(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });

  const mutation = useMutation({
    mutationFn: () => submitResignation(user!.companyId, user!.employeeId, reason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exit-case', user?.employeeId] });
      setSubmitting(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not submit your resignation.'),
  });

  if (isLoading) return null;

  const active = exitCase && exitCase.status !== 'rejected';

  if (active) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-text">Resignation Status</span>
          <Badge tone={statusTone[exitCase.status]}>{exitCase.status}</Badge>
        </div>
        <div className="mt-1.5 text-[12px] text-text-faint">Submitted {exitCase.resignationDate}</div>
        {exitCase.lastWorkingDay && <div className="mt-1 text-[12px] text-text-muted">Last working day: {exitCase.lastWorkingDay}</div>}
      </div>
    );
  }

  if (submitting) {
    return (
      <form
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <textarea
          rows={3}
          placeholder="Reason for resignation"
          className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        {error && <p className="text-[12px] text-danger">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={() => setSubmitting(false)} className="flex-1 rounded-lg border border-border py-3 text-[13px] font-semibold text-text">
            Cancel
          </button>
          <button type="submit" disabled={!reason.trim() || mutation.isPending} className="flex-1 rounded-lg bg-danger py-3 text-[13px] font-bold text-white disabled:opacity-50">
            {mutation.isPending ? 'Submitting…' : 'Submit Resignation'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <EmptyState title="No resignation on file" description="If you're planning to leave, you can submit your resignation here." />
      <button onClick={() => setSubmitting(true)} className="self-start text-[12.5px] font-semibold text-danger">Submit Resignation</button>
    </div>
  );
}
