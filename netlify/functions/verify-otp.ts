// Verifies our own OTP code, then bridges to a REAL Supabase Auth session
// — this is what keeps RLS/auth.uid()/getMyCompanyRoles unchanged even
// though the OTP itself is no longer Supabase's. The bridge is a
// documented Supabase pattern for custom OTP delivery: mint a token
// server-side with the admin API (never emailed by Supabase), hand its
// hashed_token to the client, which exchanges it for a session via
// supabase.auth.verifyOtp({ token_hash, type }).

import type { Handler } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { hashCode } from './_shared/otp';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

interface VerifyOtpRequest {
  email?: string;
  code?: string;
  purpose?: 'login' | 'signup';
}

const MAX_ATTEMPTS = 5;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { email, code, purpose } = JSON.parse(event.body || '{}') as VerifyOtpRequest;
    if (!email || !code || (purpose !== 'login' && purpose !== 'signup')) {
      return json({ error: 'email, code and a valid purpose are required' });
    }

    const admin = getSupabaseAdmin();

    const { data: otpRow, error: fetchErr } = await admin
      .from('otp_codes')
      .select('id, code_hash, attempts, expires_at, consumed_at')
      .eq('email', email)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!otpRow) return json({ error: 'No active code for this email. Request a new one.' });
    if (new Date(otpRow.expires_at) < new Date()) return json({ error: 'This code has expired. Request a new one.' });
    if (otpRow.attempts >= MAX_ATTEMPTS) return json({ error: 'Too many incorrect attempts. Request a new code.' });

    const codeHash = hashCode(code);
    if (codeHash !== otpRow.code_hash) {
      await admin.from('otp_codes').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id);
      return json({ error: 'Incorrect code.' });
    }

    await admin.from('otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', otpRow.id);

    const isSignup = purpose === 'signup';
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink(
      isSignup
        ? { type: 'signup', email, password: randomUUID() } // throwaway — this account only ever signs in via OTP
        : { type: 'magiclink', email }
    );
    if (linkErr) throw linkErr;

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) throw new Error('Could not mint a session token.');

    return json({ tokenHash, verifyType: isSignup ? 'signup' : 'magiclink' });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
