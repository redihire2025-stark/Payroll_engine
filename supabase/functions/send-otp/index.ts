// Custom OTP generation + delivery — replaces Supabase Auth's own OTP
// email so the message is fully ours: sent from support@rhirepro.com via
// Resend, with our own copy. See docs/architecture/17-supabase-resend-setup.md.
//
// Deploy: supabase functions deploy send-otp
// Pairs with verify-otp, which checks the code and mints the real Supabase
// Auth session — this function only ever generates and emails the code.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';

interface SendOtpRequest {
  email: string;
  purpose: 'login' | 'signup';
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    const { email, purpose } = (await req.json()) as SendOtpRequest;
    if (!email || (purpose !== 'login' && purpose !== 'signup')) {
      return json({ error: 'email and a valid purpose are required' });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Login only issues a code to an email that already has an account —
    // this is the enforcement point for "only a granted seat can sign in,"
    // same rule as before, just checked against our own table now instead
    // of Supabase Auth's shouldCreateUser:false.
    if (purpose === 'login') {
      const { data: existing } = await admin.from('platform_users').select('id').eq('email', email).maybeSingle();
      if (!existing) {
        return json({ error: "No account found for this email. Ask your admin to grant you a portal seat." });
      }
    }

    const code = generateCode();
    const codeHash = await sha256Hex(code);
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
});
