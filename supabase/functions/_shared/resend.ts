const DEFAULT_FROM = 'Payroll OS <support@rhirepro.com>';

export async function sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured — run: supabase secrets set RESEND_API_KEY=...');
  }
  const from = Deno.env.get('NOTIFICATIONS_FROM_EMAIL') ?? DEFAULT_FROM;

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
