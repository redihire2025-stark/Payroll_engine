// Mints a short-lived signed URL for a stored payslip PDF. Runs with the
// service role because the payslips storage bucket has no client SELECT
// policy at all (see 0010_payslips_bucket.sql) — every read goes through
// this authorization check instead, mirroring what the payslips table's
// own RLS policy already encodes (self, or admin/payroll_admin/manager
// for that company).

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { requireAuthenticatedUser } from './_shared/auth';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

const ADMIN_LIKE_ROLES = ['company_owner', 'company_admin', 'hr_admin'];

interface GetPayslipUrlRequest {
  payslipId?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const requestedByUserId = await requireAuthenticatedUser(event);
    const { payslipId } = JSON.parse(event.body || '{}') as GetPayslipUrlRequest;
    if (!payslipId) return json({ error: 'payslipId is required' });

    const admin = getSupabaseAdmin();

    const { data: payslip, error: payslipErr } = await admin
      .from('payslips')
      .select('storage_path, payroll_items(employee_id, payroll_runs(company_id))')
      .eq('id', payslipId)
      .single();
    if (payslipErr || !payslip) throw new Error(payslipErr?.message ?? 'Payslip not found');

    const item = payslip.payroll_items as unknown as { employee_id: string; payroll_runs: { company_id: string } | null } | null;
    const companyId = item?.payroll_runs?.company_id;
    if (!item || !companyId) throw new Error('Payslip is not linked to a valid payroll run.');

    const { data: employee, error: empErr } = await admin.from('employees').select('auth_user_id').eq('id', item.employee_id).single();
    if (empErr) throw empErr;

    const isSelf = employee.auth_user_id === requestedByUserId;

    let isAdmin = false;
    if (!isSelf) {
      const { data: roleRows, error: roleErr } = await admin
        .from('user_company_roles')
        .select('role')
        .eq('user_id', requestedByUserId)
        .eq('company_id', companyId);
      if (roleErr) throw roleErr;
      isAdmin = (roleRows ?? []).some((r) => ADMIN_LIKE_ROLES.includes(r.role as string) || r.role === 'payroll_admin');
    }

    if (!isSelf && !isAdmin) throw new Error('You do not have permission to view this payslip.');

    const { data: signed, error: signErr } = await admin.storage.from('payslips').createSignedUrl(payslip.storage_path, 300);
    if (signErr || !signed) throw new Error(signErr?.message ?? 'Could not create a download link.');

    return json({ url: signed.signedUrl });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
