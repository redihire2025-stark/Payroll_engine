import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Input';
import { OrgLogo } from '@/shared/ui/OrgLogo';
import { ErrorState } from '@/shared/ui/EmptyState';
import { useSession } from '@/shared/lib/session';
import { getCompany, updateCompanyProfile, uploadCompanyLogo } from '@/modules/company/companyService';

export default function Company() {
  const { user, refresh } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const { data: company, isLoading, error } = useQuery({ queryKey: ['company', companyId], queryFn: () => getCompany(companyId) });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSaveError(null);
    try {
      await uploadCompanyLogo(companyId, file);
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Logo upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setSaveError(null);
    try {
      await updateCompanyProfile(companyId, {
        name: String(form.get('name') ?? ''),
        legalName: String(form.get('legalName') ?? ''),
        regOffice: String(form.get('regOffice') ?? ''),
        phone: String(form.get('phone') ?? ''),
        website: String(form.get('website') ?? ''),
        email: String(form.get('email') ?? ''),
        cin: String(form.get('cin') ?? ''),
        state: String(form.get('state') ?? ''),
      });
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState message={(error as Error).message} />;
  if (isLoading || !company) return <div className="text-[13px] text-text-faint">Loading…</div>;

  const seatPct = company.employeeSeatLimit > 0 ? Math.round((company.seatsUsed / company.employeeSeatLimit) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Company</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Organization profile, branding and licensing</p>
      </div>

      {saveError && <ErrorState message={saveError} />}

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Branding" subtitle="Appears on the employee portal and every generated payslip" />
          <div className="flex items-center gap-5 px-5 py-5">
            <OrgLogo name={company.name} url={company.logoUrl} size={64} />
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2 text-[12.5px] font-semibold text-text">
                {uploading ? 'Uploading…' : 'Upload new logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={uploading} />
              </label>
              <p className="mt-2 text-[11px] text-text-faint">PNG or SVG, at least 256×256px. No logo yet — a generated monogram is shown instead.</p>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSave}>
          <Card>
            <CardHeader title="Organization Details" />
            <div className="flex flex-col gap-4 px-5 py-5">
              <Field label="Organization name"><Input name="name" defaultValue={company.name} /></Field>
              <Field label="Legal name"><Input name="legalName" defaultValue={company.legalName} /></Field>
              <Field label="Registered office"><Input name="regOffice" defaultValue={company.regOffice ?? ''} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><Input name="phone" defaultValue={company.phone ?? ''} /></Field>
                <Field label="State"><Input name="state" defaultValue={company.state ?? ''} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Website"><Input name="website" defaultValue={company.website ?? ''} /></Field>
                <Field label="Email"><Input name="email" type="email" defaultValue={company.email ?? ''} /></Field>
              </div>
              <Field label="CIN"><Input name="cin" defaultValue={company.cin ?? ''} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country"><Select defaultValue="IN"><option value="IN">India</option></Select></Field>
                <Field label="Default Currency"><Select defaultValue="INR"><option value="INR">INR (₹)</option></Select></Field>
              </div>
              <Button type="submit" variant="primary" size="sm" className="w-fit self-end" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </form>

        <Card className="col-span-2">
          <CardHeader title="Seats & Licensing" subtitle="A seat is used the moment an employee is granted portal login access" />
          <div className="px-5 py-5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-text">{company.seatsUsed} of {company.employeeSeatLimit} seats used</span>
              <span className="text-text-faint">{seatPct}%</span>
            </div>
            <div className="mt-2.5 h-2 rounded-full bg-border-soft">
              <div
                className={`h-2 rounded-full ${seatPct > 90 ? 'bg-danger' : seatPct > 75 ? 'bg-warning' : 'bg-accent'}`}
                style={{ width: `${seatPct}%` }}
              />
            </div>
            <p className="mt-3 text-[12.5px] text-text-muted">
              Adding an employee to HR records does not use a seat — only granting them portal login access does.
              Contact us to increase your plan's seat limit.
            </p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Seats</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
