import { supabase } from '@/shared/lib/supabaseClient';
import type { Role } from '@/shared/lib/session';

/**
 * Real Supabase Auth — passwordless email OTP. Supabase sends the code
 * itself via whatever SMTP provider is configured for the project (Resend,
 * once wired per docs/architecture/17-supabase-resend-setup.md); there is
 * no Edge Function in this path, the OTP email is Supabase's own Auth email.
 */

/** Login: only an email that already has a role granted by an admin can request a code. */
export async function requestLoginOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

/** Registration: creates the auth user and sends its first OTP in one call. */
export async function requestSignupOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
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
