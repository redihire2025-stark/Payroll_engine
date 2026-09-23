import { supabase } from '@/shared/lib/supabaseClient';

export interface BackgroundJobRow {
  id: string;
  jobType: string;
  status: 'running' | 'succeeded' | 'failed';
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export async function startJob(companyId: string, jobType: string, payload?: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase
    .from('background_jobs')
    .insert({ company_id: companyId, job_type: jobType, payload: payload ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function completeJob(jobId: string, result?: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('background_jobs')
    .update({ status: 'succeeded', result: result ?? null, finished_at: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw error;
}

export async function failJob(jobId: string, message: string): Promise<void> {
  const { error } = await supabase
    .from('background_jobs')
    .update({ status: 'failed', error: message, finished_at: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw error;
}

/** Runs fn as a tracked job: creates a 'running' row, marks it succeeded/failed on completion, and always re-throws so callers' existing error handling still works. */
export async function runAsJob<T>(companyId: string, jobType: string, payload: Record<string, unknown> | undefined, fn: () => Promise<T>): Promise<T> {
  const jobId = await startJob(companyId, jobType, payload);
  try {
    const result = await fn();
    await completeJob(jobId, result && typeof result === 'object' ? (result as Record<string, unknown>) : undefined);
    return result;
  } catch (err) {
    await failJob(jobId, err instanceof Error ? err.message : 'Unknown error').catch(() => {});
    throw err;
  }
}

export async function listJobs(companyId: string, limit = 50): Promise<BackgroundJobRow[]> {
  const { data, error } = await supabase
    .from('background_jobs')
    .select('id, job_type, status, payload, result, error, started_at, finished_at')
    .eq('company_id', companyId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    jobType: r.job_type as string,
    status: r.status as BackgroundJobRow['status'],
    payload: r.payload as Record<string, unknown> | null,
    result: r.result as Record<string, unknown> | null,
    error: r.error as string | null,
    startedAt: r.started_at as string,
    finishedAt: r.finished_at as string | null,
  }));
}
