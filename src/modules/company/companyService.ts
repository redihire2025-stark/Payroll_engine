import { supabase } from '@/shared/lib/supabaseClient';

export interface Company {
  id: string;
  name: string;
  legalName: string;
  logoUrl: string | null;
  countryCode: string;
  employeeSeatLimit: number;
  seatsUsed: number;
  // Payslip letterhead fields — see supabase/migrations/0006_company_letterhead.sql
  regOffice: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  cin: string | null;
  state: string | null;
  brandAccentColor: string;
  nameAccentPrefixLength: number;
}

const COMPANY_COLUMNS =
  'id, name, legal_name, logo_url, country_code, reg_office, phone, website, email, cin, state, brand_accent_color, name_accent_prefix_length';

function mapCompany(company: Record<string, unknown>, seatLimit: number, seatsUsed: number): Company {
  return {
    id: company.id as string,
    name: company.name as string,
    legalName: company.legal_name as string,
    logoUrl: company.logo_url as string | null,
    countryCode: company.country_code as string,
    employeeSeatLimit: seatLimit,
    seatsUsed,
    regOffice: company.reg_office as string | null,
    phone: company.phone as string | null,
    website: company.website as string | null,
    email: company.email as string | null,
    cin: company.cin as string | null,
    state: company.state as string | null,
    brandAccentColor: company.brand_accent_color as string,
    nameAccentPrefixLength: company.name_accent_prefix_length as number,
  };
}

export async function getCompany(companyId: string): Promise<Company> {
  const { data: company, error } = await supabase.from('companies').select(COMPANY_COLUMNS).eq('id', companyId).single();
  if (error) throw error;

  const { data: settings } = await supabase
    .from('company_settings')
    .select('employee_seat_limit')
    .eq('company_id', companyId)
    .maybeSingle();

  const { data: usage } = await supabase
    .from('company_seat_usage')
    .select('seats_used')
    .eq('company_id', companyId)
    .maybeSingle();

  return mapCompany(company, settings?.employee_seat_limit ?? 0, usage?.seats_used ?? 0);
}

export interface UpdateCompanyProfileInput {
  name?: string;
  legalName?: string;
  regOffice?: string;
  phone?: string;
  website?: string;
  email?: string;
  cin?: string;
  state?: string;
}

export async function updateCompanyProfile(companyId: string, fields: UpdateCompanyProfileInput): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({
      name: fields.name,
      legal_name: fields.legalName,
      reg_office: fields.regOffice,
      phone: fields.phone,
      website: fields.website,
      email: fields.email,
      cin: fields.cin,
      state: fields.state,
    })
    .eq('id', companyId);
  if (error) throw error;
}

export async function uploadCompanyLogo(companyId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${companyId}/logo-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true });
  if (uploadErr) throw uploadErr;
  const publicUrl = supabase.storage.from('company-logos').getPublicUrl(path).data.publicUrl;
  const { error: updateErr } = await supabase.from('companies').update({ logo_url: publicUrl }).eq('id', companyId);
  if (updateErr) throw updateErr;
  return publicUrl;
}
