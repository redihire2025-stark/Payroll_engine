const DEFAULT_FROM = 'Payroll OS <support@rhirepro.com>';

/**
 * RESEND_API_KEY is a Netlify environment variable, never VITE_-prefixed —
 * it only ever runs here, server-side in the Netlify Function's Lambda
 * runtime, never shipped to the browser.
 */
export async function sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured in Netlify environment variables.');
  }
  const from = process.env.NOTIFICATIONS_FROM_EMAIL ?? DEFAULT_FROM;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error (${res.status}): ${text}`);
  }
}
