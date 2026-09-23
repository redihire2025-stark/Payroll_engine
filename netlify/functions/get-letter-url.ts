// Mints a short-lived signed URL for a stored employee letter. Same pattern
// as get-document-url.ts / get-payslip-url.ts: the bucket has no client
// SELECT policy, so every read goes through this instead.

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { requireAuthenticatedUser } from './_shared/auth';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

const ADMIN_LIKE_ROLES = ['company_owner', 'company_admin', 'hr_admin'];

interface GetLetterUrlRequest {
  letterId?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const requestedByUserId = await requireAuthenticatedUser(event);
    const { letterId } = JSON.parse(event.body || '{}') as GetLetterUrlRequest;
    if (!letterId) return json({ error: 'letterId is required' });

    const admin = getSupabaseAdmin();

    const { data: letter, error: letterErr } = await admin
      .from('employee_letters')
      .select('storage_path, employees(auth_user_id, company_id)')
      .eq('id', letterId)
      .single();
    if (letterErr || !letter) throw new Error(letterErr?.message ?? 'Letter not found');

    const employee = letter.employees as unknown as { auth_user_id: string | null; company_id: string } | null;
    if (!employee) throw new Error('Letter is not linked to a valid employee.');

    const isSelf = employee.auth_user_id === requestedByUserId;

    let isAdmin = false;
    if (!isSelf) {
      const { data: roleRows, error: roleErr } = await admin
        .from('user_company_roles')
        .select('role')
        .eq('user_id', requestedByUserId)
        .eq('company_id', employee.company_id);
      if (roleErr) throw roleErr;
      isAdmin = (roleRows ?? []).some((r) => ADMIN_LIKE_ROLES.includes(r.role as string));
    }

    if (!isSelf && !isAdmin) throw new Error('You do not have permission to view this letter.');

    const { data: signed, error: signErr } = await admin.storage.from('employee-letters').createSignedUrl(letter.storage_path, 300);
    if (signErr || !signed) throw new Error(signErr?.message ?? 'Could not create a download link.');

    return json({ url: signed.signedUrl });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
