/**
 * Calls a Netlify Function at /.netlify/functions/<name>. Same-origin with
 * the frontend by construction — no CORS preflight, unlike calling a
 * Supabase Edge Function from a different domain. Every function returns
 * `{ error }` for handled failures (still HTTP 200) so that shape is
 * checked first, before falling back to the HTTP status.
 */
export async function callNetlifyFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
