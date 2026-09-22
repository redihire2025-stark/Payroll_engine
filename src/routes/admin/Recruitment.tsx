import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { PlusIcon, BriefcaseIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import {
  listJobs,
  createJob,
  updateJobStatus,
  listCandidates,
  addCandidate,
  updateCandidateStage,
  listInterviews,
  scheduleInterview,
  recordInterviewOutcome,
  listOffers,
  createOffer,
  updateOfferStatus,
  type JobRow,
  type CandidateRow,
} from '@/modules/recruitment/recruitmentService';

const jobStatusTone: Record<JobRow['status'], BadgeTone> = { open: 'success', on_hold: 'warning', closed: 'neutral' };
const stageTone: Record<CandidateRow['stage'], BadgeTone> = {
  applied: 'neutral',
  screening: 'info',
  interview: 'warning',
  offer: 'warning',
  hired: 'success',
  rejected: 'danger',
};
const stages: CandidateRow['stage'][] = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

function NewJobModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState<JobRow['employmentType']>('full_time');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => createJob(companyId, title.trim(), department.trim(), location.trim(), employmentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create job.'),
  });
  return (
    <Modal title="New Job Posting" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        <div className="flex gap-3">
          <Input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as JobRow['employmentType'])}>
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </Select>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!title.trim() || mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddCandidateModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => addCandidate(jobId, name.trim(), email.trim(), phone.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add candidate.'),
  });
  return (
    <Modal title="Add Candidate" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || !email.trim() || mutation.isPending}>
            {mutation.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleInterviewModal({ candidateId, onClose }: { candidateId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState('');
  const [mode, setMode] = useState<'phone' | 'video' | 'onsite'>('video');
  const [interviewerName, setInterviewerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => scheduleInterview(candidateId, new Date(scheduledAt).toISOString(), mode, interviewerName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', candidateId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not schedule interview.'),
  });
  return (
    <Modal title="Schedule Interview" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        <Select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="video">Video</option>
          <option value="phone">Phone</option>
          <option value="onsite">Onsite</option>
        </Select>
        <Input placeholder="Interviewer name" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!scheduledAt || mutation.isPending}>{mutation.isPending ? 'Scheduling…' : 'Schedule'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function NewOfferModal({ candidateId, onClose }: { candidateId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [positionTitle, setPositionTitle] = useState('');
  const [annualCtc, setAnnualCtc] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => createOffer(candidateId, positionTitle.trim(), Number(annualCtc), joiningDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create offer.'),
  });
  return (
    <Modal title="Generate Offer" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input placeholder="Position title" value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} required autoFocus />
        <Input type="number" min="0" placeholder="Annual CTC" value={annualCtc} onChange={(e) => setAnnualCtc(e.target.value)} required />
        <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!positionTitle.trim() || !annualCtc || mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Send Offer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CandidateDetail({ candidate }: { candidate: CandidateRow }) {
  const [scheduling, setScheduling] = useState(false);
  const [offering, setOffering] = useState(false);
  const queryClient = useQueryClient();

  const interviewsQuery = useQuery({ queryKey: ['interviews', candidate.id], queryFn: () => listInterviews(candidate.id) });
  const offersQuery = useQuery({ queryKey: ['offers', candidate.id], queryFn: () => listOffers(candidate.id) });

  const outcomeMutation = useMutation({
    mutationFn: ({ id, status, feedback }: { id: string; status: 'completed' | 'cancelled'; feedback: string }) =>
      recordInterviewOutcome(id, status, feedback),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interviews', candidate.id] }),
  });

  const offerStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) => updateOfferStatus(id, candidate.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  return (
    <div className="flex flex-col gap-3 bg-bg px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] font-semibold text-text">Interviews</div>
        <Button size="sm" variant="secondary" onClick={() => setScheduling(true)}>Schedule</Button>
      </div>
      {(interviewsQuery.data ?? []).length === 0 ? (
        <div className="text-[12px] text-text-faint">No interviews scheduled.</div>
      ) : (
        (interviewsQuery.data ?? []).map((iv) => (
          <div key={iv.id} className="rounded-lg bg-white px-3 py-2.5 text-[12px]">
            <div className="flex items-center justify-between">
              <div className="font-medium text-text">{new Date(iv.scheduledAt).toLocaleString()} · {iv.mode}</div>
              <Badge tone={iv.status === 'completed' ? 'success' : iv.status === 'cancelled' ? 'danger' : 'info'}>{iv.status}</Badge>
            </div>
            {iv.interviewerName && <div className="mt-0.5 text-text-faint">with {iv.interviewerName}</div>}
            {iv.feedback && <div className="mt-1 text-text-muted">{iv.feedback}</div>}
            {iv.status === 'scheduled' && (
              <div className="mt-2 flex gap-2">
                <button
                  className="text-[11.5px] font-semibold text-success"
                  onClick={() => outcomeMutation.mutate({ id: iv.id, status: 'completed', feedback: prompt('Feedback (optional)') ?? '' })}
                >
                  Mark Completed
                </button>
                <button
                  className="text-[11.5px] font-semibold text-danger"
                  onClick={() => outcomeMutation.mutate({ id: iv.id, status: 'cancelled', feedback: '' })}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="text-[12.5px] font-semibold text-text">Offers</div>
        <Button size="sm" variant="secondary" onClick={() => setOffering(true)}>Generate Offer</Button>
      </div>
      {(offersQuery.data ?? []).length === 0 ? (
        <div className="text-[12px] text-text-faint">No offers yet.</div>
      ) : (
        (offersQuery.data ?? []).map((o) => (
          <div key={o.id} className="rounded-lg bg-white px-3 py-2.5 text-[12px]">
            <div className="flex items-center justify-between">
              <div className="font-medium text-text">{o.positionTitle} · ₹{o.annualCtc.toLocaleString('en-IN')}</div>
              <Badge tone={o.status === 'accepted' ? 'success' : o.status === 'declined' ? 'danger' : 'info'}>{o.status}</Badge>
            </div>
            {o.joiningDate && <div className="mt-0.5 text-text-faint">Joining {o.joiningDate}</div>}
            {o.status === 'sent' && (
              <div className="mt-2 flex gap-2">
                <button className="text-[11.5px] font-semibold text-success" onClick={() => offerStatusMutation.mutate({ id: o.id, status: 'accepted' })}>Mark Accepted</button>
                <button className="text-[11.5px] font-semibold text-danger" onClick={() => offerStatusMutation.mutate({ id: o.id, status: 'declined' })}>Mark Declined</button>
              </div>
            )}
          </div>
        ))
      )}

      {scheduling && <ScheduleInterviewModal candidateId={candidate.id} onClose={() => setScheduling(false)} />}
      {offering && <NewOfferModal candidateId={candidate.id} onClose={() => setOffering(false)} />}
    </div>
  );
}

function JobDetail({ job, onBack }: { job: JobRow; onBack: () => void }) {
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: ['candidates', job.id], queryFn: () => listCandidates(job.id) });
  const candidates = data ?? [];

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateRow['stage'] }) => updateCandidateStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidates', job.id] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="self-start text-[12.5px] font-semibold text-accent">← Back to Jobs</button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-text">{job.title}</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">{[job.department, job.location].filter(Boolean).join(' · ') || '—'}</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />} onClick={() => setShowAddCandidate(true)}>Add Candidate</Button>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : candidates.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<BriefcaseIcon width={20} height={20} />} title="No candidates yet" description="Add candidates to start the pipeline." />
          </div>
        ) : (
          candidates.map((c) => (
            <div key={c.id} className="border-b border-border-soft last:border-b-0">
              <button
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-[13px] hover:bg-bg/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-text">{c.name}</div>
                  <div className="text-[11.5px] text-text-faint">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Select value={c.stage} onChange={(e) => stageMutation.mutate({ id: c.id, stage: e.target.value as CandidateRow['stage'] })} className="w-36">
                    {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <Badge tone={stageTone[c.stage]}>{c.stage}</Badge>
              </button>
              {expandedId === c.id && <CandidateDetail candidate={c} />}
            </div>
          ))
        )}
      </Card>

      {showAddCandidate && <AddCandidateModal jobId={job.id} onClose={() => setShowAddCandidate(false)} />}
    </div>
  );
}

export default function Recruitment() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const [showNewJob, setShowNewJob] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: ['jobs', companyId], queryFn: () => listJobs(companyId) });
  const jobs = data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobRow['status'] }) => updateJobStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs', companyId] }),
  });

  if (selectedJob) {
    const fresh = jobs.find((j) => j.id === selectedJob.id) ?? selectedJob;
    return <JobDetail job={fresh} onBack={() => setSelectedJob(null)} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Recruitment</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">Job postings and the candidate pipeline</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />} onClick={() => setShowNewJob(true)}>New Job</Button>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : jobs.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<BriefcaseIcon width={20} height={20} />} title="No job postings yet" description="Post a job to start receiving candidates." />
          </div>
        ) : (
          jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
              <button onClick={() => setSelectedJob(j)} className="min-w-0 flex-1 text-left hover:opacity-80">
                <div className="font-medium text-text">{j.title}</div>
                <div className="text-[11.5px] text-text-faint">
                  {[j.department, j.location].filter(Boolean).join(' · ') || '—'} · {j.candidateCount} candidate{j.candidateCount === 1 ? '' : 's'}
                </div>
              </button>
              <div onClick={(e) => e.stopPropagation()}>
                <Select value={j.status} onChange={(e) => statusMutation.mutate({ id: j.id, status: e.target.value as JobRow['status'] })} className="w-32">
                  <option value="open">Open</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>
            </div>
          ))
        )}
      </Card>

      {showNewJob && <NewJobModal companyId={companyId} onClose={() => setShowNewJob(false)} />}
    </div>
  );
}
