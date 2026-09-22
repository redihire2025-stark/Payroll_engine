// Transactional email — payslip-ready alerts, leave/attendance decisions,
// and the registration welcome email. Distinct from send-otp: that's a
// fixed template with its own function; this one takes arbitrary
// subject/html from the caller.

import type { Handler } from '@netlify/functions';
import { sendEmail } from './_shared/resend';
import { json } from './_shared/http';

interface SendNotificationRequest {
  to?: string | string[];
  subject?: string;
  html?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = JSON.parse(event.body || '{}') as SendNotificationRequest;
    if (!body.to || !body.subject || !body.html) {
      return json({ error: 'to, subject and html are required' });
    }
    await sendEmail(body.to, body.subject, body.html);
    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
};
