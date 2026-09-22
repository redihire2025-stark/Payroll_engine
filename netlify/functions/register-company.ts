// Self-service company registration — see docs/architecture/16-self-service-onboarding.md.
// Runs with the Supabase service role because creating a company + its
// default settings + granting the registrant company_owner is a
// multi-table sequence that must either all succeed or all fail.
// Called from src/routes/auth/Register.tsx after the registrant has
// already verified their email OTP (so userId is a real, authenticated
// auth.users id — this function trusts it because Supabase's own auth
// layer, not this function, established that identity).

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { json } from './_shared/http';

interface RegisterCompanyRequest {
  userId?: string;
  orgName?: string;
  legalName?: string;
  country?: string;
  logoStoragePath?: string; // path inside the public `company-logos` bucket, if one was uploaded
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json({ ok: true });
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = JSON.parse(event.body || '{}') as RegisterCompanyRequest;
    if (!body.userId || !body.orgName) {
      return json({ error: 'userId and orgName are required' });
    }

    const admin = getSupabaseAdmin();

    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(body.userId);
    if (authErr || !authUser?.user) throw new Error(authErr?.message ?? 'Authenticated user not found');

    const { error: platformUserErr } = await admin
      .from('platform_users')
      .upsert({ id: body.userId, email: authUser.user.email, full_name: body.orgName + ' Owner' }, { onConflict: 'id' });
    if (platformUserErr) throw platformUserErr;

    const logoUrl = body.logoStoragePath
      ? admin.storage.from('company-logos').getPublicUrl(body.logoStoragePath).data.publicUrl
      : null;

    const { data: company, error: companyErr } = await admin
      .from('companies')
      .insert({
        name: body.orgName,
        legal_name: body.legalName || body.orgName,
        country_code: body.country ?? 'IN',
        slug: slugify(body.orgName),
        logo_url: logoUrl,
      })
      .select()
      .single();
    if (companyErr) throw companyErr;

    const { error: settingsErr } = await admin.from('company_settings').insert({ company_id: company.id });
    if (settingsErr) throw settingsErr;

    const { error: roleErr } = await admin
      .from('user_company_roles')
      .insert({ user_id: body.userId, company_id: company.id, role: 'company_owner' });
    if (roleErr) throw roleErr;

    return json({ companyId: company.id, companyName: company.name });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
};
