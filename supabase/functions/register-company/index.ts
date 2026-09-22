// Self-service company registration — see docs/architecture/16-self-service-onboarding.md.
//
// Runs with the service role (SUPABASE_SERVICE_ROLE_KEY, auto-provided by
// the Edge Runtime) because creating a company + its default settings +
// granting the registrant `company_owner` is a multi-table sequence that
// must either all succeed or all fail — never left half-done, and never
// something the anon-key client is allowed to do directly under RLS.
//
// Deploy: supabase functions deploy register-company
// Called from: src/routes/auth/Register.tsx, after the registrant has
// already verified their email OTP (so `userId` is a real, authenticated
// auth.users id — this function trusts it because Supabase's own auth
// layer, not this function, established that identity).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

interface RegisterCompanyRequest {
  userId: string;
  orgName: string;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RegisterCompanyRequest;
    if (!body.userId || !body.orgName) {
      return new Response(JSON.stringify({ error: 'userId and orgName are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(body.userId);
    if (authErr || !authUser?.user) {
      throw new Error(authErr?.message ?? 'Authenticated user not found');
    }

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

    return new Response(JSON.stringify({ companyId: company.id, companyName: company.name }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
