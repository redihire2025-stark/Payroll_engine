import { supabase } from '@/shared/lib/supabaseClient';

export interface JobRow {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  status: 'open' | 'on_hold' | 'closed';
  candidateCount: number;
}

export async function listJobs(companyId: string): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, department, location, employment_type, status, candidates(count)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    department: r.department as string | null,
    location: r.location as string | null,
    employmentType: r.employment_type as JobRow['employmentType'],
    status: r.status as JobRow['status'],
    candidateCount: (r.candidates as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

export async function createJob(
  companyId: string,
  title: string,
  department: string,
  location: string,
  employmentType: JobRow['employmentType'],
): Promise<void> {
  const { error } = await supabase.from('jobs').insert({
    company_id: companyId,
    title,
    department: department || null,
    location: location || null,
    employment_type: employmentType,
  });
  if (error) throw error;
}

export async function updateJobStatus(jobId: string, status: JobRow['status']): Promise<void> {
  const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
  if (error) throw error;
}

export interface CandidateRow {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string | null;
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
}

export async function listCandidates(jobId: string): Promise<CandidateRow[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select('id, job_id, name, email, phone, stage')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    jobId: r.job_id as string,
    name: r.name as string,
    email: r.email as string,
    phone: r.phone as string | null,
    stage: r.stage as CandidateRow['stage'],
  }));
}

export async function addCandidate(jobId: string, name: string, email: string, phone: string): Promise<void> {
  const { error } = await supabase.from('candidates').insert({ job_id: jobId, name, email, phone: phone || null });
  if (error) throw error;
}

export async function updateCandidateStage(candidateId: string, stage: CandidateRow['stage']): Promise<void> {
  const { error } = await supabase.from('candidates').update({ stage }).eq('id', candidateId);
  if (error) throw error;
}

export interface InterviewRow {
  id: string;
  candidateId: string;
  scheduledAt: string;
  mode: 'phone' | 'video' | 'onsite';
  interviewerName: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback: string | null;
}

export async function listInterviews(candidateId: string): Promise<InterviewRow[]> {
  const { data, error } = await supabase
    .from('interviews')
    .select('id, candidate_id, scheduled_at, mode, interviewer_name, status, feedback')
    .eq('candidate_id', candidateId)
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    candidateId: r.candidate_id as string,
    scheduledAt: r.scheduled_at as string,
    mode: r.mode as InterviewRow['mode'],
    interviewerName: r.interviewer_name as string | null,
    status: r.status as InterviewRow['status'],
    feedback: r.feedback as string | null,
  }));
}

export async function scheduleInterview(
  candidateId: string,
  scheduledAt: string,
  mode: InterviewRow['mode'],
  interviewerName: string,
): Promise<void> {
  const { error } = await supabase.from('interviews').insert({
    candidate_id: candidateId,
    scheduled_at: scheduledAt,
    mode,
    interviewer_name: interviewerName || null,
  });
  if (error) throw error;
}

export async function recordInterviewOutcome(interviewId: string, status: InterviewRow['status'], feedback: string): Promise<void> {
  const { error } = await supabase.from('interviews').update({ status, feedback: feedback || null }).eq('id', interviewId);
  if (error) throw error;
}

export interface OfferRow {
  id: string;
  candidateId: string;
  positionTitle: string;
  annualCtc: number;
  joiningDate: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
}

export async function listOffers(candidateId: string): Promise<OfferRow[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, candidate_id, position_title, annual_ctc, joining_date, status')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    candidateId: r.candidate_id as string,
    positionTitle: r.position_title as string,
    annualCtc: Number(r.annual_ctc),
    joiningDate: r.joining_date as string | null,
    status: r.status as OfferRow['status'],
  }));
}

export async function createOffer(candidateId: string, positionTitle: string, annualCtc: number, joiningDate: string): Promise<void> {
  const { error } = await supabase.from('offers').insert({
    candidate_id: candidateId,
    position_title: positionTitle,
    annual_ctc: annualCtc,
    joining_date: joiningDate || null,
    status: 'sent',
  });
  if (error) throw error;
  await supabase.from('candidates').update({ stage: 'offer' }).eq('id', candidateId);
}

export async function updateOfferStatus(offerId: string, candidateId: string, status: OfferRow['status']): Promise<void> {
  const { error } = await supabase.from('offers').update({ status }).eq('id', offerId);
  if (error) throw error;
  if (status === 'accepted') {
    await supabase.from('candidates').update({ stage: 'hired' }).eq('id', candidateId);
  }
}
