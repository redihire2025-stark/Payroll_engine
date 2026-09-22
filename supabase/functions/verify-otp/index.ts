// Verifies our own OTP code, then bridges to a REAL Supabase Auth session
// — this is what keeps everything else (RLS, auth.uid(), getMyCompanyRoles)
// unchanged even though the OTP itself is no longer Supabase's. The bridge
// is a documented Supabase pattern for custom-SMTP OTP delivery: mint a
// token server-side with the admin API (never emailed by Supabase itself),
// hand its hashed_token to the client, which exchanges it for a session via
// supabase.auth.verifyOtp({ token_hash, type }).
//
// Deploy: supabase functions deploy verify-otp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

interface VerifyOtpRequest {
  email: string;
  code: string;
  purpose: 'login' | 'signup';
}

const MAX_ATTEMPTS = 5;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email, code, purpose } = (await req.json()) as VerifyOtpRequest;
    if (!email || !code || (purpose !== 'login' && purpose !== 'signup')) {
      return json({ error: 'email, code and a valid purpose are required' });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

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

    const codeHash = await sha256Hex(code);
    if (codeHash !== otpRow.code_hash) {
      await admin.from('otp_codes').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id);
      return json({ error: 'Incorrect code.' });
    }

    await admin.from('otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', otpRow.id);

    const isSignup = purpose === 'signup';
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink(
      isSignup
        ? { type: 'signup', email, password: crypto.randomUUID() } // throwaway — this account only ever signs in via OTP
        : { type: 'magiclink', email }
    );
    if (linkErr) throw linkErr;

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) throw new Error('Could not mint a session token.');

    return json({ tokenHash, verifyType: isSignup ? 'signup' : 'magiclink' });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
