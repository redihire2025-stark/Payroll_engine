// Mints a short-lived signed URL for a stored employee document. Same
// pattern as get-payslip-url.ts: the bucket has no client SELECT policy,
// so every read goes through this instead, re-deriving the caller's
// identity from their verified session (never a client-supplied id) and
// re-checking the same authorization employee_documents' own RLS encodes
// (self, or admin-like for that company).

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { requireAuthenticatedUser } from './_shared/auth';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

const ADMIN_LIKE_ROLES = ['company_owner', 'company_admin', 'hr_admin'];

interface GetDocumentUrlRequest {
  documentId?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const requestedByUserId = await requireAuthenticatedUser(event);
    const { documentId } = JSON.parse(event.body || '{}') as GetDocumentUrlRequest;
    if (!documentId) return json({ error: 'documentId is required' });

    const admin = getSupabaseAdmin();

    const { data: document, error: docErr } = await admin
      .from('employee_documents')
      .select('storage_path, employees(auth_user_id, company_id)')
      .eq('id', documentId)
      .single();
    if (docErr || !document) throw new Error(docErr?.message ?? 'Document not found');

    const employee = document.employees as unknown as { auth_user_id: string | null; company_id: string } | null;
    if (!employee) throw new Error('Document is not linked to a valid employee.');

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

    if (!isSelf && !isAdmin) throw new Error('You do not have permission to view this document.');

    const { data: signed, error: signErr } = await admin.storage.from('employee-documents').createSignedUrl(document.storage_path, 300);
    if (signErr || !signed) throw new Error(signErr?.message ?? 'Could not create a download link.');

    return json({ url: signed.signedUrl });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
