// Grants or revokes an existing HR-only employee record's portal login
// access. Runs with the service role because it creates a real Supabase
// Auth user (grant) or removes a company role (revoke) — operations RLS
// deliberately doesn't let a normal admin session perform directly.
//
// Grant wires the employee into the SAME OTP-login flow used everywhere
// else in the app (see verify-otp.ts): send-otp.ts only issues a code to
// an email with a platform_users row, so grant must create both the auth
// user AND that platform_users row for OTP login to recognize them.

import type { Handler } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { requireAuthenticatedUser } from './_shared/auth';
import { sendEmail } from './_shared/resend';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

const ADMIN_LIKE_ROLES = ['company_owner', 'company_admin', 'hr_admin'];

interface PortalAccessRequest {
  action?: 'grant' | 'revoke';
  employeeId?: string;
  email?: string;
  role?: string;
}

async function assertRequesterIsAdmin(admin: ReturnType<typeof getSupabaseAdmin>, requestedByUserId: string, companyId: string) {
  const { data: roleRows, error } = await admin
    .from('user_company_roles')
    .select('role')
    .eq('user_id', requestedByUserId)
    .eq('company_id', companyId);
  if (error) throw error;
  const isAdmin = (roleRows ?? []).some((r) => ADMIN_LIKE_ROLES.includes(r.role as string));
  if (!isAdmin) throw new Error('You do not have permission to manage portal access for this company.');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const requestedByUserId = await requireAuthenticatedUser(event);
    const body = JSON.parse(event.body || '{}') as PortalAccessRequest;
    if (!body.action || !body.employeeId) {
      return json({ error: 'action and employeeId are required' });
    }

    const admin = getSupabaseAdmin();

    const { data: employee, error: empErr } = await admin
      .from('employees')
      .select('id, company_id, auth_user_id, employee_code')
      .eq('id', body.employeeId)
      .single();
    if (empErr || !employee) throw new Error(empErr?.message ?? 'Employee not found');

    await assertRequesterIsAdmin(admin, requestedByUserId, employee.company_id);

    if (body.action === 'revoke') {
      if (!employee.auth_user_id) return json({ error: 'This employee does not have portal access.' });
      const { error: roleDeleteErr } = await admin
        .from('user_company_roles')
        .delete()
        .eq('user_id', employee.auth_user_id)
        .eq('company_id', employee.company_id);
      if (roleDeleteErr) throw roleDeleteErr;
      const { error: unlinkErr } = await admin.from('employees').update({ auth_user_id: null }).eq('id', employee.id);
      if (unlinkErr) throw unlinkErr;
      return json({ ok: true });
    }

    // grant
    if (employee.auth_user_id) return json({ error: 'This employee already has portal access.' });
    if (!body.email) return json({ error: 'email is required to grant portal access.' });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      email_confirm: true,
      password: randomUUID(), // throwaway — this account only ever signs in via OTP (or, once built, a set password)
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? 'Could not create a portal account for this email.');
    }
    const authUserId = created.user.id;

    const { error: platformUserErr } = await admin
      .from('platform_users')
      .upsert({ id: authUserId, email: body.email, full_name: body.email.split('@')[0] }, { onConflict: 'id' });
    if (platformUserErr) throw platformUserErr;

    const { error: linkErr } = await admin.from('employees').update({ auth_user_id: authUserId }).eq('id', employee.id);
    if (linkErr) throw linkErr;

    const { error: roleInsertErr } = await admin
      .from('user_company_roles')
      .insert({ user_id: authUserId, company_id: employee.company_id, role: body.role || 'employee', employee_id: employee.id });
    if (roleInsertErr) throw roleInsertErr;

    await sendEmail(
      body.email,
      'Your Payroll OS portal access is ready',
      `<p>You've been granted portal access for employee code <strong>${employee.employee_code}</strong>.</p>
       <p>Sign in at your company's Payroll OS login page with this email address — we'll send you a one-time code, no password needed.</p>`
    ).catch(() => {});

    return json({ ok: true, authUserId });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
