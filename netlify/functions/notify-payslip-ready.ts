// Sends the "your payslip is ready" email. Links to the ESS payslips page
// rather than a raw signed storage URL — a signed URL minted here would be
// stale by the time the recipient opens their inbox (get-payslip-url's
// links are intentionally short-lived, 300s). Authorization mirrors
// get-payslip-url.ts: admin/payroll_admin for the payslip's company.

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { requireAuthenticatedUser } from './_shared/auth';
import { sendEmail } from './_shared/resend';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

const ADMIN_LIKE_ROLES = ['company_owner', 'company_admin', 'hr_admin', 'payroll_admin'];

interface NotifyPayslipReadyRequest {
  payslipId?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const requestedByUserId = await requireAuthenticatedUser(event);
    const { payslipId } = JSON.parse(event.body || '{}') as NotifyPayslipReadyRequest;
    if (!payslipId) return json({ error: 'payslipId is required' });

    const admin = getSupabaseAdmin();

    const { data: payslip, error: payslipErr } = await admin
      .from('payslips')
      .select(
        'payroll_items(employee_id, employees(auth_user_id, employee_profiles(first_name, last_name, personal_email)), payroll_runs(company_id, period_start, period_end))',
      )
      .eq('id', payslipId)
      .single();
    if (payslipErr || !payslip) throw new Error(payslipErr?.message ?? 'Payslip not found');

    const item = payslip.payroll_items as unknown as {
      employee_id: string;
      employees: { auth_user_id: string | null; employee_profiles: { first_name: string; last_name: string | null; personal_email: string | null } | null } | null;
      payroll_runs: { company_id: string; period_start: string; period_end: string } | null;
    } | null;
    const companyId = item?.payroll_runs?.company_id;
    const employeeRow = item?.employees;
    if (!item || !companyId || !employeeRow) throw new Error('Payslip is not linked to a valid payroll run.');
    const employee = {
      auth_user_id: employeeRow.auth_user_id,
      first_name: employeeRow.employee_profiles?.first_name ?? '',
      last_name: employeeRow.employee_profiles?.last_name ?? null,
      personal_email: employeeRow.employee_profiles?.personal_email ?? null,
    };

    const { data: roleRows, error: roleErr } = await admin
      .from('user_company_roles')
      .select('role')
      .eq('user_id', requestedByUserId)
      .eq('company_id', companyId);
    if (roleErr) throw roleErr;
    const isAdmin = (roleRows ?? []).some((r) => ADMIN_LIKE_ROLES.includes(r.role as string));
    if (!isAdmin) throw new Error('You do not have permission to notify for this payroll run.');

    let recipientEmail = employee.personal_email;
    if (employee.auth_user_id) {
      const { data: platformUser } = await admin.from('platform_users').select('email').eq('id', employee.auth_user_id).maybeSingle();
      if (platformUser?.email) recipientEmail = platformUser.email as string;
    }
    if (!recipientEmail) return json({ ok: true, skipped: 'no_email_on_file' });

    const name = [employee.first_name, employee.last_name].filter(Boolean).join(' ');
    const period = `${item.payroll_runs?.period_start} – ${item.payroll_runs?.period_end}`;
    const siteUrl = process.env.URL;
    const link = siteUrl ? `<p><a href="${siteUrl}/app/payslips">View your payslip</a></p>` : '<p>Log in to your employee portal to view it.</p>';

    await sendEmail(
      recipientEmail,
      `Your payslip for ${period} is ready`,
      `<p>Hi ${name},</p><p>Your payslip for <strong>${period}</strong> has been generated and is ready to view.</p>${link}`,
    );

    return json({ ok: true });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
