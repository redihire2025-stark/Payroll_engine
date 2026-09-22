import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Real Supabase client. `anonKey` is the publishable/anon key — safe to ship
 * to the browser by design; every table it can reach is gated by RLS
 * (supabase/migrations/0004_rls.sql), never by keeping this key secret.
 *
 * When env vars aren't set (e.g. local preview without a linked project),
 * this still constructs a client against placeholder values so importing
 * modules don't crash — callers that need a real backend should check
 * `isSupabaseConfigured` first, per docs/architecture/17-supabase-resend-setup.md.
 */
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key'
);
