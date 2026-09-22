// Sets (or changes) a user's password and clears must_change_password.
// Runs with the service role for two reasons: admin.auth.admin.updateUserById
// is the only way to set a password without already having one (the client
// SDK's auth.updateUser() requires an existing password-capable session),
// and must_change_password has no client write policy — every write to
// platform_users goes through a server function, never a direct client
// update (see 0009_password_auth.sql).

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { requireAuthenticatedUser } from './_shared/auth';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

interface SetPasswordRequest {
  newPassword?: string;
}

const MIN_PASSWORD_LENGTH = 8;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // Self-service only — a user can set their own password, never
    // someone else's, so the account to change is the verified caller,
    // never a client-supplied id.
    const userId = await requireAuthenticatedUser(event);
    const { newPassword } = JSON.parse(event.body || '{}') as SetPasswordRequest;
    if (!newPassword) return json({ error: 'newPassword is required' });
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const admin = getSupabaseAdmin();

    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (updateErr) throw updateErr;

    const { error: flagErr } = await admin.from('platform_users').update({ must_change_password: false }).eq('id', userId);
    if (flagErr) throw flagErr;

    return json({ ok: true });
  } catch (err) {
    return json({ error: errorMessage(err) }, 500);
  }
};
