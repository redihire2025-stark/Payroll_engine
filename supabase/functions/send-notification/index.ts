// Transactional email — payslip-ready alerts, leave/attendance decisions,
// and any other in-app notification that should also land in an inbox.
// Distinct from Supabase Auth's own OTP emails (those are sent by Supabase
// itself via whatever SMTP provider is configured in the dashboard, not by
// this function) — see docs/architecture/17-supabase-resend-setup.md.
//
// Deploy: supabase functions deploy send-notification
// Secret required: supabase secrets set RESEND_API_KEY=<your Resend API key>
// Optional secret: NOTIFICATIONS_FROM_EMAIL (defaults to Resend's shared
// sandbox sender, which only delivers to your own verified Resend account
// email until you verify a real sending domain in Resend).

import { corsHeaders } from '../_shared/cors.ts';

interface SendNotificationRequest {
  to: string | string[];
  subject: string;
  html: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SendNotificationRequest;
    if (!body.to || !body.subject || !body.html) {
      return new Response(JSON.stringify({ error: 'to, subject and html are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured — run: supabase secrets set RESEND_API_KEY=...');
    }
    const from = Deno.env.get('NOTIFICATIONS_FROM_EMAIL') ?? 'Payroll OS <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: body.to, subject: body.subject, html: body.html }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend API error (${res.status}): ${text}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
