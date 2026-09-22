import { createClient } from '@supabase/supabase-js';

/**
 * The service-role Supabase client for privileged server-side operations
 * (bypasses RLS). Reads SUPABASE_SERVICE_ROLE_KEY — a Netlify environment
 * variable, never VITE_-prefixed, so it is never bundled into client code.
 * Reuses VITE_SUPABASE_URL (already set for the frontend) rather than a
 * duplicate variable — Netlify Functions see every configured env var in
 * process.env regardless of prefix; VITE_ only matters to Vite's client bundling.
 */
export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Netlify environment variables.');
  }
  return createClient(url, serviceRoleKey);
}
