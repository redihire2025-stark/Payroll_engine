import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { PlusIcon, TargetIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import {
  listCycles,
  createCycle,
  updateCycleStatus,
  listGoalsForCycle,
  listReviewsForCycle,
  submitManagerReview,
  type CycleRow,
} from '@/modules/performance/performanceService';

const cycleTone = { draft: 'neutral', active: 'info', closed: 'success' } as const;
const goalTone = { pending: 'neutral', in_progress: 'warning', completed: 'success' } as const;
const reviewTone = { pending: 'neutral', self_submitted: 'warning', manager_submitted: 'success' } as const;

function NewCycleModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => createCycle(companyId, name.trim(), startDate, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create cycle.'),
  });
  return (
    <Modal title="New Review Cycle" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input placeholder="Name (e.g. H1 2026)" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <div className="flex gap-3">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || !startDate || !endDate || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ManagerReviewForm({ cycleId, employeeId, onClose }: { cycleId: string; employeeId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(3);
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => submitManagerReview(cycleId, employeeId, rating, comments.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews', cycleId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not submit review.'),
  });
  return (
    <Modal title="Manager Review" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </Select>
        <textarea
          className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
          rows={4}
          placeholder="Manager comments…"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CycleDetail({ cycle, companyId, onBack }: { cycle: CycleRow; companyId: string; onBack: () => void }) {
  const [tab, setTab] = useState<'goals' | 'reviews'>('goals');
  const [reviewingEmployeeId, setReviewingEmployeeId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({ queryKey: ['performance-goals', cycle.id], queryFn: () => listGoalsForCycle(companyId, cycle.id), enabled: tab === 'goals' });
  const reviewsQuery = useQuery({ queryKey: ['performance-reviews', cycle.id], queryFn: () => listReviewsForCycle(companyId, cycle.id), enabled: tab === 'reviews' });

  const statusMutation = useMutation({
    mutationFn: (status: CycleRow['status']) => updateCycleStatus(cycle.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-cycles', companyId] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="self-start text-[12.5px] font-semibold text-accent">← Back to Cycles</button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-text">{cycle.name}</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">{cycle.startDate} – {cycle.endDate}</p>
        </div>
        <Select value={cycle.status} onChange={(e) => statusMutation.mutate(e.target.value as CycleRow['status'])} className="w-36">
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </Select>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['goals', 'reviews'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2.5 text-[13px] font-semibold capitalize ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'goals' && (
        <Card>
          {goalsQuery.isLoading ? (
            <LoadingRows />
          ) : (goalsQuery.data ?? []).length === 0 ? (
            <div className="px-5 pb-6 pt-2">
              <EmptyState icon={<TargetIcon width={20} height={20} />} title="No goals yet" description="Goals employees set for this cycle will appear here." />
            </div>
          ) : (
            (goalsQuery.data ?? []).map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-text">{g.title}</div>
                  <div className="text-[11.5px] text-text-faint">{g.employeeName}{g.description ? ` · ${g.description}` : ''}</div>
                </div>
                <Badge tone={goalTone[g.status]}>{g.status.replace('_', ' ')}</Badge>
              </div>
            ))
          )}
        </Card>
      )}

      {tab === 'reviews' && (
        <Card>
          {reviewsQuery.isLoading ? (
            <LoadingRows />
          ) : (reviewsQuery.data ?? []).length === 0 ? (
            <div className="px-5 pb-6 pt-2">
              <EmptyState icon={<TargetIcon width={20} height={20} />} title="No reviews yet" description="Self and manager reviews will appear here once submitted." />
            </div>
          ) : (
            (reviewsQuery.data ?? []).map((r) => (
              <div key={r.id} className="border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-text">{r.employeeName}</div>
                  <div className="flex items-center gap-2">
                    <Badge tone={reviewTone[r.status]}>{r.status.replace('_', ' ')}</Badge>
                    <Button size="sm" variant="secondary" onClick={() => setReviewingEmployeeId(r.employeeId)}>
                      {r.managerRating ? 'Edit Review' : 'Review'}
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <div className="text-text-faint">Self: {r.selfRating ? `${r.selfRating}/5` : '—'}</div>
                    {r.selfComments && <div className="mt-0.5 text-text-muted">{r.selfComments}</div>}
                  </div>
                  <div>
                    <div className="text-text-faint">Manager: {r.managerRating ? `${r.managerRating}/5` : '—'}</div>
                    {r.managerComments && <div className="mt-0.5 text-text-muted">{r.managerComments}</div>}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {reviewingEmployeeId && (
        <ManagerReviewForm cycleId={cycle.id} employeeId={reviewingEmployeeId} onClose={() => setReviewingEmployeeId(null)} />
      )}
    </div>
  );
}

export default function Performance() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const [showNew, setShowNew] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<CycleRow | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['performance-cycles', companyId], queryFn: () => listCycles(companyId) });
  const cycles = data ?? [];

  if (selectedCycle) {
    const fresh = cycles.find((c) => c.id === selectedCycle.id) ?? selectedCycle;
    return <CycleDetail cycle={fresh} companyId={companyId} onBack={() => setSelectedCycle(null)} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Performance</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">Review cycles, goals, and appraisals</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />} onClick={() => setShowNew(true)}>New Cycle</Button>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : cycles.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<TargetIcon width={20} height={20} />} title="No review cycles yet" description="Open a cycle to start collecting goals and reviews." />
          </div>
        ) : (
          cycles.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCycle(c)}
              className="flex w-full items-center justify-between border-b border-border-soft px-5 py-3.5 text-left text-[13px] last:border-b-0 hover:bg-bg/70"
            >
              <div>
                <div className="font-medium text-text">{c.name}</div>
                <div className="text-[11.5px] text-text-faint">{c.startDate} – {c.endDate}</div>
              </div>
              <Badge tone={cycleTone[c.status]}>{c.status}</Badge>
            </button>
          ))
        )}
      </Card>

      {showNew && <NewCycleModal companyId={companyId} onClose={() => setShowNew(false)} />}
    </div>
  );
}
