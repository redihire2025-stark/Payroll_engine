// Verifies the caller's Supabase session from the Authorization header,
// rather than trusting a client-supplied userId field in the request
// body. Several functions (set-password, portal-access, get-payslip-url)
// used to accept a "requestedByUserId"/"userId" body field as the source
// of truth for who was calling — which let anyone who knew (or guessed)
// another user's UUID act as them: set their password, grant themselves
// portal access by claiming to be an admin, or read someone else's
// payslip. This re-derives the caller's real identity from their own
// signed session token instead.

import type { HandlerEvent } from '@netlify/functions';
import { getSupabaseAdmin } from './supabaseAdmin';

export async function requireAuthenticatedUser(event: HandlerEvent): Promise<string> {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Missing or invalid session — please sign in again.');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new Error('Missing or invalid session — please sign in again.');
  return data.user.id;
}
