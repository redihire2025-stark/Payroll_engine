// Sends the leave approved/rejected email. Runs with the service role
// because the calling admin/manager's browser session cannot read another
// user's platform_users row under RLS (see 0009_password_auth.sql) — this
// re-derives the recipient's login email server-side instead, after
// independently re-checking the same authorization leave_requests_update's
// RLS policy already encodes (admin-like, or the employee's manager).

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { requireAuthenticatedUser } from './_shared/auth';
import { sendEmail } from './_shared/resend';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

const ADMIN_LIKE_ROLES = ['company_owner', 'company_admin', 'hr_admin', 'payroll_admin', 'finance'];

interface NotifyLeaveDecisionRequest {
  leaveRequestId?: string;
  decision?: 'approved' | 'rejected';
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const requestedByUserId = await requireAuthenticatedUser(event);
    const { leaveRequestId, decision } = JSON.parse(event.body || '{}') as NotifyLeaveDecisionRequest;
    if (!leaveRequestId || !decision) return json({ error: 'leaveRequestId and decision are required' });

    const admin = getSupabaseAdmin();

    const { data: request, error: reqErr } = await admin
      .from('leave_requests')
      .select(
        'company_id, start_date, end_date, leave_types(name), employees(auth_user_id, manager_id, employee_profiles(first_name, last_name, personal_email))',
      )
      .eq('id', leaveRequestId)
      .single();
    if (reqErr || !request) throw new Error(reqErr?.message ?? 'Leave request not found.');

    const employeeRow = request.employees as unknown as {
      auth_user_id: string | null;
      manager_id: string | null;
      employee_profiles: { first_name: string; last_name: string | null; personal_email: string | null } | null;
    } | null;
    if (!employeeRow) throw new Error('Leave request has no linked employee.');
    const employee = {
      auth_user_id: employeeRow.auth_user_id,
      manager_id: employeeRow.manager_id,
      first_name: employeeRow.employee_profiles?.first_name ?? '',
      last_name: employeeRow.employee_profiles?.last_name ?? null,
      personal_email: employeeRow.employee_profiles?.personal_email ?? null,
    };

    const { data: roleRows, error: roleErr } = await admin
      .from('user_company_roles')
      .select('role')
      .eq('user_id', requestedByUserId)
      .eq('company_id', request.company_id as string);
    if (roleErr) throw roleErr;
    const isAdmin = (roleRows ?? []).some((r) => ADMIN_LIKE_ROLES.includes(r.role as string));

    let isManager = false;
    if (!isAdmin && employee.manager_id) {
      const { data: manager } = await admin.from('employees').select('auth_user_id').eq('id', employee.manager_id).maybeSingle();
      isManager = manager?.auth_user_id === requestedByUserId;
    }
    if (!isAdmin && !isManager) throw new Error('You do not have permission to notify this employee.');

    let recipientEmail = employee.personal_email;
    if (employee.auth_user_id) {
      const { data: platformUser } = await admin.from('platform_users').select('email').eq('id', employee.auth_user_id).maybeSingle();
      if (platformUser?.email) recipientEmail = platformUser.email as string;
    }
    if (!recipientEmail) return json({ ok: true, skipped: 'no_email_on_file' });

    const leaveType = request.leave_types as unknown as { name: string } | null;
    const name = [employee.first_name, employee.last_name].filter(Boolean).join(' ');
    const dates = request.start_date === request.end_date ? (request.start_date as string) : `${request.start_date} – ${request.end_date}`;

    await sendEmail(
      recipientEmail,
      `Your ${leaveType?.name ?? 'leave'} request was ${decision}`,
      `<p>Hi ${name},</p><p>Your ${leaveType?.name ?? 'leave'} request for <strong>${dates}</strong> has been <strong>${decision}</strong>.</p>`,
    );

    return json({ ok: true });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
