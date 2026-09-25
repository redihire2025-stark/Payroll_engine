// Encrypt path for employee bank account number + PAN (both stored
// pgp-encrypted — see 0001_core_schema.sql / 0025_employee_bank_details_rpcs.sql).
// Runs with the service role and calls SQL functions that are revoked from
// PUBLIC, so this Netlify function is the only way to write or read these
// fields — never directly from the browser. Reads are masked to the last 4
// digits by the RPCs themselves; this function never sees or returns the
// full decrypted value.

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { requireAuthenticatedUser } from './_shared/auth';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

const ADMIN_LIKE_ROLES = ['company_owner', 'company_admin', 'hr_admin', 'payroll_admin'];

interface BankDetailsRequest {
  action?: 'save' | 'get';
  employeeId?: string;
  bankName?: string;
  ifsc?: string;
  accountNumber?: string;
  panNumber?: string;
  pfNumber?: string;
  uan?: string;
}

async function assertRequesterIsAdmin(admin: ReturnType<typeof getSupabaseAdmin>, requestedByUserId: string, companyId: string) {
  const { data: roleRows, error } = await admin
    .from('user_company_roles')
    .select('role')
    .eq('user_id', requestedByUserId)
    .eq('company_id', companyId);
  if (error) throw error;
  const isAdmin = (roleRows ?? []).some((r) => ADMIN_LIKE_ROLES.includes(r.role as string));
  if (!isAdmin) throw new Error('You do not have permission to manage bank/statutory details for this company.');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const key = process.env.BANK_DETAILS_ENCRYPTION_KEY;
    if (!key) throw new Error('BANK_DETAILS_ENCRYPTION_KEY is not configured on the server.');

    const requestedByUserId = await requireAuthenticatedUser(event);
    const body = JSON.parse(event.body || '{}') as BankDetailsRequest;
    if (!body.action || !body.employeeId) return json({ error: 'action and employeeId are required' });

    const admin = getSupabaseAdmin();

    const { data: employee, error: empErr } = await admin
      .from('employees')
      .select('id, company_id')
      .eq('id', body.employeeId)
      .single();
    if (empErr || !employee) throw new Error(empErr?.message ?? 'Employee not found');

    await assertRequesterIsAdmin(admin, requestedByUserId, employee.company_id);

    if (body.action === 'get') {
      const [bankResult, panResult, { data: statutory }] = await Promise.all([
        admin.rpc('admin_get_employee_bank_last4', { p_employee_id: employee.id, p_key: key }),
        admin.rpc('admin_get_employee_pan_last4', { p_employee_id: employee.id, p_key: key }),
        admin.from('employee_statutory_profiles').select('pf_number, uan').eq('employee_id', employee.id).maybeSingle(),
      ]);
      const bankRow = (bankResult.data as { bank_name: string; ifsc: string; account_last4: string }[] | null)?.[0] ?? null;
      const panLast4 = (panResult.data as string | null) ?? null;
      return json({
        bankName: bankRow?.bank_name ?? null,
        ifsc: bankRow?.ifsc ?? null,
        accountLast4: bankRow?.account_last4 ?? null,
        panLast4,
        pfNumber: statutory?.pf_number ?? null,
        uan: statutory?.uan ?? null,
      });
    }

    // save
    if (body.bankName?.trim() || body.ifsc?.trim() || body.accountNumber?.trim()) {
      if (!body.bankName?.trim() || !body.ifsc?.trim() || !body.accountNumber?.trim()) {
        return json({ error: 'Bank name, IFSC and account number are all required together.' });
      }
      const { error } = await admin.rpc('admin_upsert_employee_bank_account', {
        p_employee_id: employee.id,
        p_bank_name: body.bankName.trim(),
        p_ifsc: body.ifsc.trim().toUpperCase(),
        p_account_number: body.accountNumber.trim(),
        p_key: key,
      });
      if (error) throw error;
    }

    if (body.panNumber?.trim()) {
      const { error } = await admin.rpc('admin_upsert_employee_tax_profile', {
        p_employee_id: employee.id,
        p_pan: body.panNumber.trim().toUpperCase(),
        p_key: key,
      });
      if (error) throw error;
    }

    if (body.pfNumber?.trim() || body.uan?.trim()) {
      const { error } = await admin.rpc('admin_upsert_employee_statutory_profile', {
        p_employee_id: employee.id,
        p_pf_number: body.pfNumber?.trim() ?? '',
        p_uan: body.uan?.trim() ?? '',
      });
      if (error) throw error;
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
