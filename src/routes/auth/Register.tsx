import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stepper } from '@/shared/ui/Stepper';
import { Field, Input, Select } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { OrgLogo } from '@/shared/ui/OrgLogo';
import { CheckIcon } from '@/shared/ui/icons';
import { useSession, demoUser, type SessionUser } from '@/shared/lib/session';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabaseClient';
import { requestSignupOtp, verifyOtp } from '@/modules/identity/authService';
import { sendWelcomeEmail } from '@/modules/notifications/notificationService';

const STEPS = ['Organization', 'Admin Account', 'Verify', 'Done'];

export default function Register() {
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalCompanyLogoUrl, setFinalCompanyLogoUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useSession();

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestSignupOtp(email);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyAndCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session = await verifyOtp(email, code);
      if (!session?.user) throw new Error('Verification succeeded but no session was returned.');
      const userId = session.user.id;

      let logoStoragePath: string | undefined;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() || 'png';
        logoStoragePath = `${userId}/logo-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('company-logos').upload(logoStoragePath, logoFile, {
          upsert: true,
        });
        if (uploadErr) throw new Error(`Logo upload failed: ${uploadErr.message}`);
      }

      const { data, error: fnError } = await supabase.functions.invoke('register-company', {
        body: { userId, orgName, legalName: legalName || orgName, country: 'IN', logoStoragePath },
      });
      if (fnError) throw fnError;

      const companyLogoUrl = logoStoragePath
        ? supabase.storage.from('company-logos').getPublicUrl(logoStoragePath).data.publicUrl
        : null;
      setFinalCompanyLogoUrl(companyLogoUrl);

      // Best-effort — a failed welcome email should never block onboarding.
      sendWelcomeEmail(email, data?.companyName ?? orgName).catch(() => {});

      setStep(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not verify that code.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function finishRegistration() {
    const user: SessionUser = {
      id: email,
      name: email.split('@')[0],
      email,
      roles: ['company_owner'],
      companyName: orgName || demoUser.companyName,
      companyLogoUrl: finalCompanyLogoUrl,
      employeeId: '',
      isManager: false,
    };
    login(user);
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
              <Input placeholder="As registered with statutory authorities" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
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
          <form className="mt-9 flex flex-col gap-5" onSubmit={handleSendCode}>
            <div>
              <h1 className="text-[19px] font-bold text-text">Create your admin account</h1>
              <p className="mt-1 text-[13px] text-text-muted">
                You'll be the Company Owner — able to invite HR, Payroll and Finance roles, and grant employee portal access.
                No password — we'll email you a one-time code.
              </p>
            </div>
            <Field label="Work email">
              <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            {error && <p className="text-[12.5px] text-danger">{error}</p>}
            <div className="mt-2 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={() => setStep(0)}>Back</Button>
              <Button type="submit" variant="primary" className="flex-1 justify-center" disabled={busy || !email}>
                {busy ? 'Sending code…' : 'Send Code'}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-9 flex flex-col gap-5" onSubmit={handleVerifyAndCreate}>
            <div>
              <h1 className="text-[19px] font-bold text-text">Enter your code</h1>
              <p className="mt-1 text-[13px] text-text-muted">
                We sent a 6-digit code to <span className="font-semibold text-text">{email}</span>.
              </p>
            </div>
            <Field label="One-time code">
              <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
            </Field>
            {error && <p className="text-[12.5px] text-danger">{error}</p>}
            <div className="mt-2 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" variant="primary" className="flex-1 justify-center" disabled={busy || code.length < 6}>
                {busy ? 'Creating workspace…' : 'Verify & Create Workspace'}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
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
                <OrgLogo name={orgName || 'Your Organization'} url={finalCompanyLogoUrl ?? logoPreview} size={36} />
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

        {!isSupabaseConfigured && (
          <p className="mt-3 text-center text-[11px] text-text-faint">
            No Supabase project configured in this environment — this form will call the real API once deployed with real env vars.
          </p>
        )}
      </div>
    </div>
  );
}
