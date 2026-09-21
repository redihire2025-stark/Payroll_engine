import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stepper } from '@/shared/ui/Stepper';
import { Field, Input, Select } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { OrgLogo } from '@/shared/ui/OrgLogo';
import { CheckIcon } from '@/shared/ui/icons';
import { useSession, demoUser } from '@/shared/lib/session';

const STEPS = ['Organization', 'Admin Account', 'Done'];

export default function Register() {
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('');
  const navigate = useNavigate();
  const { login } = useSession();

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function finishRegistration() {
    login({ ...demoUser, name: adminName || demoUser.name, companyName: orgName || demoUser.companyName, companyLogoUrl: logoPreview, roles: ['company_owner'] });
    navigate('/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-white p-10 shadow-card">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="M14 3v6h6" />
            </svg>
          </div>
          <span className="text-[16px] font-bold text-text">Payroll OS</span>
        </div>

        <Stepper steps={STEPS} currentIndex={step} />

        {step === 0 && (
          <div className="mt-9 flex flex-col gap-5">
            <div>
              <h1 className="text-[19px] font-bold text-text">Register your organization</h1>
              <p className="mt-1 text-[13px] text-text-muted">
                This creates a private, isolated workspace — your data is never visible to any other organization on the platform.
              </p>
            </div>

            <Field label="Organization name">
              <Input placeholder="e.g. Meridian Textiles Pvt Ltd" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </Field>
            <Field label="Legal name">
              <Input placeholder="As registered with statutory authorities" defaultValue={orgName} />
            </Field>
            <Field label="Country">
              <Select defaultValue="IN">
                <option value="IN">India</option>
              </Select>
            </Field>

            <Field label="Organization logo" hint="Shown on the employee portal and every generated payslip. You can add this later.">
              <div className="flex items-center gap-4 rounded-lg border border-dashed border-border bg-bg p-4">
                <OrgLogo name={orgName || 'Your Organization'} url={logoPreview} size={48} />
                <div className="flex-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] font-semibold text-text">
                    Upload logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                  <p className="mt-1.5 text-[11px] text-text-faint">PNG or SVG, at least 256×256px</p>
                </div>
              </div>
            </Field>

            <Button variant="primary" className="mt-2 w-full justify-center" onClick={() => setStep(1)} disabled={!orgName}>
              Continue
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-9 flex flex-col gap-5">
            <div>
              <h1 className="text-[19px] font-bold text-text">Create your admin account</h1>
              <p className="mt-1 text-[13px] text-text-muted">
                You'll be the Company Owner — able to invite HR, Payroll and Finance roles, and grant employee portal access.
              </p>
            </div>
            <Field label="Your full name">
              <Input placeholder="e.g. Ananya Rao" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </Field>
            <Field label="Work email">
              <Input type="email" placeholder="you@company.com" />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="At least 10 characters" />
            </Field>
            <div className="mt-2 flex gap-3">
              <Button variant="secondary" className="flex-1 justify-center" onClick={() => setStep(0)}>Back</Button>
              <Button variant="primary" className="flex-1 justify-center" onClick={() => setStep(2)} disabled={!adminName}>
                Create Workspace
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-9 flex flex-col items-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckIcon width={26} height={26} />
            </div>
            <div>
              <h1 className="text-[19px] font-bold text-text">{orgName || 'Your workspace'} is ready</h1>
              <p className="mt-1.5 text-[13px] text-text-muted">
                Your organization has its own isolated data — separate employees, payroll and reports from every other
                company on the platform. Next, add branches and start granting employee portal seats.
              </p>
            </div>
            <div className="w-full rounded-lg bg-bg p-4 text-left text-[12.5px] text-text-muted">
              <div className="flex items-center gap-3">
                <OrgLogo name={orgName || 'Your Organization'} url={logoPreview} size={36} />
                <div>
                  <div className="font-semibold text-text">{orgName || 'Your Organization'}</div>
                  <div>0 / 200 employee seats used on the Starter plan</div>
                </div>
              </div>
            </div>
            <Button variant="primary" className="w-full justify-center" onClick={finishRegistration}>
              Go to Dashboard
            </Button>
          </div>
        )}

        <p className="mt-8 text-center text-[12.5px] text-text-faint">
          Already have a workspace? <Link to="/auth/login" className="font-semibold text-accent">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
