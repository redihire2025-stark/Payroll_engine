import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { TargetIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { getActiveCycle, listMyGoals, addGoal, getMyReview, submitSelfReview } from '@/modules/performance/performanceService';

const goalTone = { pending: 'neutral', in_progress: 'warning', completed: 'success' } as const;

function SelfReviewForm({ cycleId, employeeId }: { cycleId: string; employeeId: string }) {
  const queryClient = useQueryClient();
  const { data: review } = useQuery({ queryKey: ['my-review', cycleId, employeeId], queryFn: () => getMyReview(cycleId, employeeId) });
  const [rating, setRating] = useState(review?.selfRating ?? 3);
  const [comments, setComments] = useState(review?.selfComments ?? '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => submitSelfReview(cycleId, employeeId, rating, comments.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-review', cycleId, employeeId] }),
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not submit review.'),
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-text">Self Review</div>
        {review?.status && review.status !== 'pending' && <Badge tone="success">Submitted</Badge>}
      </div>
      {review?.managerRating != null && (
        <div className="mt-2 rounded-lg bg-bg px-3 py-2 text-[12px] text-text-muted">
          Manager: {review.managerRating}/5{review.managerComments ? ` — ${review.managerComments}` : ''}
        </div>
      )}
      <form
        className="mt-3 flex flex-col gap-2.5"
        onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}
      >
        <select className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </select>
        <textarea
          className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]"
          rows={3}
          placeholder="How did this cycle go?"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
        {error && <p className="text-[11.5px] text-danger">{error}</p>}
        <button type="submit" disabled={mutation.isPending} className="self-end rounded-lg bg-accent px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">
          {mutation.isPending ? 'Submitting…' : review?.selfRating != null ? 'Update Review' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}

export function PerformancePanel() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [addingGoal, setAddingGoal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cycleQuery = useQuery({
    queryKey: ['active-cycle', user?.companyId],
    queryFn: () => getActiveCycle(user!.companyId),
    enabled: Boolean(user?.companyId),
  });
  const cycle = cycleQuery.data;

  const goalsQuery = useQuery({
    queryKey: ['my-goals', cycle?.id, user?.employeeId],
    queryFn: () => listMyGoals(cycle!.id, user!.employeeId),
    enabled: Boolean(cycle?.id && user?.employeeId),
  });

  const addMutation = useMutation({
    mutationFn: () => addGoal(cycle!.id, user!.employeeId, title.trim(), description.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-goals', cycle?.id, user?.employeeId] });
      setAddingGoal(false);
      setTitle('');
      setDescription('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add goal.'),
  });

  if (cycleQuery.error) return <ErrorState message={(cycleQuery.error as Error).message} />;
  if (cycleQuery.isLoading) return <LoadingRows />;
  if (!cycle) {
    return <EmptyState icon={<TargetIcon width={20} height={20} />} title="No active review cycle" description="Your goals and review will appear here once HR opens a cycle." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="text-[13px] font-semibold text-text">{cycle.name}</div>
        <div className="mt-0.5 text-[11.5px] text-text-faint">{cycle.startDate} – {cycle.endDate}</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-text">My Goals</div>
        <button onClick={() => setAddingGoal((v) => !v)} className="text-[12.5px] font-semibold text-accent">
          {addingGoal ? 'Cancel' : '+ Add Goal'}
        </button>
      </div>

      {addingGoal && (
        <form
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4"
          onSubmit={(e) => { e.preventDefault(); setError(null); addMutation.mutate(); }}
        >
          <input placeholder="Goal title" className="rounded-lg border border-border bg-white px-3 py-2 text-[13px]" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea placeholder="Description (optional)" className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <p className="text-[11.5px] text-danger">{error}</p>}
          <button type="submit" disabled={!title.trim() || addMutation.isPending} className="self-end rounded-lg bg-accent px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">
            {addMutation.isPending ? 'Adding…' : 'Add Goal'}
          </button>
        </form>
      )}

      {goalsQuery.isLoading ? (
        <LoadingRows />
      ) : (goalsQuery.data ?? []).length === 0 ? (
        <EmptyState icon={<TargetIcon width={20} height={20} />} title="No goals yet" description="Add your goals for this review cycle." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {(goalsQuery.data ?? []).map((g) => (
            <div key={g.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-text">{g.title}</div>
                <Badge tone={goalTone[g.status]}>{g.status.replace('_', ' ')}</Badge>
              </div>
              {g.description && <p className="mt-1 text-[12px] text-text-muted">{g.description}</p>}
            </div>
          ))}
        </div>
      )}

      {user?.employeeId && <SelfReviewForm cycleId={cycle.id} employeeId={user.employeeId} />}
    </div>
  );
}
