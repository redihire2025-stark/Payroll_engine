import { supabase } from '@/shared/lib/supabaseClient';
import { callNetlifyFunction } from '@/shared/lib/netlifyFunctions';
import type { Role } from '@/shared/lib/session';

/**
 * Custom OTP — generated, stored (hashed) and emailed by Netlify Functions
 * (send-otp / verify-otp) via Resend from support@rhirepro.com, not by
 * Supabase Auth's own mailer. verify-otp still mints a real Supabase Auth
 * session under the hood (via the admin API's generateLink + this client
 * calling supabase.auth.verifyOtp with the resulting token_hash) — so RLS,
 * auth.uid() and getMyCompanyRoles below are unaffected by where the OTP
 * itself came from. See docs/architecture/17-supabase-resend-setup.md.
 */

/** Login: only an email that already has a role granted by an admin can request a code. */
export async function requestLoginOtp(email: string): Promise<void> {
  await callNetlifyFunction('send-otp', { email, purpose: 'login' });
}

/** Registration: any email can start signup; the auth user is created on first successful verification. */
export async function requestSignupOtp(email: string): Promise<void> {
  await callNetlifyFunction('send-otp', { email, purpose: 'signup' });
}

export async function verifyOtp(email: string, code: string, purpose: 'login' | 'signup') {
  const { tokenHash, verifyType } = await callNetlifyFunction<{ tokenHash: string; verifyType: 'signup' | 'magiclink' }>(
    'verify-otp',
    { email, code, purpose }
  );
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: verifyType });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export interface ResolvedCompanyRole {
  companyId: string;
  companyName: string;
  companyLogoUrl: string | null;
  role: Role;
  employeeId: string | null;
}

/**
 * Looks up the signed-in user's company role(s) — the data that decides
 * Admin Console vs. Employee app (see landingRouteFor in shared/lib/session).
 * Throws (rather than silently returning []) when the query itself fails,
 * e.g. because supabase/migrations/*.sql haven't been applied to the linked
 * project yet — callers must not treat "no schema" the same as "no roles".
 */
export async function getMyCompanyRoles(): Promise<ResolvedCompanyRole[]> {
  const { data, error } = await supabase
    .from('user_company_roles')
    .select('company_id, role, employee_id, companies:company_id (name, logo_url)');
  if (error) throw error;

  return (data ?? []).map((row) => {
    // Supabase's generated types would make this a typed join; kept as a
    // narrow runtime cast here since this repo has no live-generated types
    // yet (no `supabase gen types` run against the linked project).
    const company = row.companies as unknown as { name: string; logo_url: string | null } | null;
    return {
      companyId: row.company_id as string,
      companyName: company?.name ?? 'Unknown Organization',
      companyLogoUrl: company?.logo_url ?? null,
      role: row.role as Role,
      employeeId: (row.employee_id as string | null) ?? null,
    };
  });
}
