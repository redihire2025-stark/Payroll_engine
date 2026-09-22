// Transactional email — payslip-ready alerts, leave/attendance decisions,
// and any other in-app notification that should also land in an inbox.
// Distinct from the OTP email (send-otp): that's a fixed template with its
// own dedicated function; this one takes arbitrary subject/html from the
// caller. See docs/architecture/17-supabase-resend-setup.md.
//
// Deploy: supabase functions deploy send-notification
// Secret required: supabase secrets set RESEND_API_KEY=<your Resend API key>

import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';

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
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await sendEmail(body.to, body.subject, body.html);

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
