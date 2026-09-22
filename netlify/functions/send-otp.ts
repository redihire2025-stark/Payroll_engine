// Custom OTP generation + delivery, running as a Netlify Function so it's
// same-origin with the frontend (no CORS) and reads Resend/Supabase
// secrets from Netlify's own environment variables — see
// docs/architecture/17-supabase-resend-setup.md.
//
// Pairs with verify-otp, which checks the code and mints the real Supabase
// Auth session — this function only ever generates and emails the code.

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { sendEmail } from './_shared/resend';
import { generateCode, hashCode } from './_shared/otp';
import { json } from './_shared/http';

interface SendOtpRequest {
  email?: string;
  purpose?: 'login' | 'signup';
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { email, purpose } = JSON.parse(event.body || '{}') as SendOtpRequest;
    if (!email || (purpose !== 'login' && purpose !== 'signup')) {
      return json({ error: 'email and a valid purpose are required' });
    }

    const admin = getSupabaseAdmin();

    // Login only issues a code to an email that already has an account —
    // the enforcement point for "only a granted seat can sign in."
    if (purpose === 'login') {
      const { data: existing } = await admin.from('platform_users').select('id').eq('email', email).maybeSingle();
      if (!existing) {
        return json({ error: 'No account found for this email. Ask your admin to grant you a portal seat.' });
      }
    }

    const code = generateCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate any earlier unconsumed codes for this email+purpose so only the latest one works.
    await admin
      .from('otp_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('email', email)
      .eq('purpose', purpose)
      .is('consumed_at', null);

    const { error: insertErr } = await admin.from('otp_codes').insert({ email, purpose, code_hash: codeHash, expires_at: expiresAt });
    if (insertErr) throw insertErr;

    await sendEmail(
      email,
      'Your Payroll OS sign-in code',
      `<p>Your one-time sign-in code is:</p>
       <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
       <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>`
    );

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
};
