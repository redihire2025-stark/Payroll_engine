// Transactional email — currently just the registration welcome email.
// Distinct from send-otp: that's a fixed template with its own function;
// this one takes arbitrary subject/html from the caller, so it requires a
// real signed-in session (see _shared/auth.ts) rather than being an open
// relay for this app's Resend account. Notifications that need to reach
// someone other than the caller (leave decisions, payslip-ready) go
// through their own dedicated, authorization-checked functions instead —
// see notify-leave-decision.ts / notify-payslip-ready.ts.

import type { Handler } from '@netlify/functions';
import { sendEmail } from './_shared/resend';
import { requireAuthenticatedUser } from './_shared/auth';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

interface SendNotificationRequest {
  to?: string | string[];
  subject?: string;
  html?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    await requireAuthenticatedUser(event);
    const body = JSON.parse(event.body || '{}') as SendNotificationRequest;
    if (!body.to || !body.subject || !body.html) {
      return json({ error: 'to, subject and html are required' });
    }
    await sendEmail(body.to, body.subject, body.html);
    return json({ ok: true });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
