import { supabase } from './supabaseClient';

/**
 * Calls a Netlify Function at /.netlify/functions/<name>. Same-origin with
 * the frontend by construction — no CORS preflight, unlike calling a
 * Supabase Edge Function from a different domain. Every function returns
 * `{ error }` for handled failures (still HTTP 200) so that shape is
 * checked first, before falling back to the HTTP status.
 *
 * Attaches the current Supabase session's access token as a Bearer
 * header whenever one exists, so privileged functions (portal-access,
 * set-password, get-payslip-url) can verify who is actually calling
 * instead of trusting a client-supplied user id in the body — a real
 * account-takeover class of bug otherwise (see _shared/auth.ts).
 */
export async function callNetlifyFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: unknown }).error) {
    throw new Error(String((data as { error: unknown }).error));
  }
  if (!res.ok) {
    throw new Error(`Request to ${name} failed (${res.status})`);
  }
  return data as T;
}
