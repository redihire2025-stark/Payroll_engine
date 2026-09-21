import { useState, type ChangeEvent } from 'react';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Input';
import { OrgLogo } from '@/shared/ui/OrgLogo';
import { company } from '@/shared/lib/mockData';

export default function Company() {
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logoUrl);
  const seatPct = Math.round((company.seatsUsed / company.employeeSeatLimit) * 100);

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Company</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Organization profile, branding and licensing</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Branding" subtitle="Appears on the employee portal and every generated payslip" />
          <div className="flex items-center gap-5 px-5 py-5">
            <OrgLogo name={company.name} url={logoPreview} size={64} />
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2 text-[12.5px] font-semibold text-text">
                Upload new logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              <p className="mt-2 text-[11px] text-text-faint">PNG or SVG, at least 256×256px. No logo yet — a generated monogram is shown instead.</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Organization Details" />
          <div className="flex flex-col gap-4 px-5 py-5">
            <Field label="Organization name"><Input defaultValue={company.name} /></Field>
            <Field label="Legal name"><Input defaultValue={company.legalNameFull} /></Field>
            <Field label="Registered office"><Input defaultValue={company.regOffice} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country"><Select defaultValue="IN"><option value="IN">India</option></Select></Field>
              <Field label="Default Currency"><Select defaultValue="INR"><option value="INR">INR (₹)</option></Select></Field>
            </div>
            <Button variant="primary" size="sm" className="w-fit self-end">Save Changes</Button>
          </div>
        </Card>

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
