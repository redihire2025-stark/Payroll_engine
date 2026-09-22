import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Input';
import { useSession, landingRouteFor, type SessionUser } from '@/shared/lib/session';
import { requestLoginOtp, verifyOtp, getMyCompanyRoles } from '@/modules/identity/authService';

type Step = 'email' | 'code';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useSession();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestLoginOtp(email);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyOtp(email, code);
      // Signed in with Supabase — now resolve which company role(s) this
      // user was granted, which is what decides Admin Console vs Employee app.
      const roles = await getMyCompanyRoles();
      if (roles.length === 0) {
        setError("You're signed in, but no organization role is set up for this email yet. Ask your admin to grant you a portal seat.");
        return;
      }
      const primary = roles[0];
      const user: SessionUser = {
        id: email,
        name: email.split('@')[0],
        email,
        roles: [primary.role],
        companyId: primary.companyId,
        companyName: primary.companyName,
        companyLogoUrl: primary.companyLogoUrl,
        employeeId: primary.employeeId ?? '',
        isManager: false,
      };
      login(user);
      navigate(landingRouteFor(user));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not verify that code.';
      setError(
        message.includes('relation') || message.includes('schema')
          ? "Signed in, but your organization's database schema isn't set up yet — apply the Supabase migrations first, then try again."
          : message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink p-12 text-white md:flex">
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" viewBox="0 0 400 800" fill="none">
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={-100 + i * 40} y1="0" x2={100 + i * 40} y2="800" stroke="white" strokeWidth="1" />
          ))}
        </svg>
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="M14 3v6h6" />
            </svg>
          </div>
          <span className="text-[17px] font-bold">Payroll OS</span>
        </div>
        <div className="relative max-w-sm">
          <p className="text-[26px] font-semibold leading-snug">Payroll you can explain to any auditor.</p>
          <p className="mt-4 text-[14px] leading-relaxed text-[#AEB4C2]">
            Every earning, deduction and statutory number is traceable back to the rule that produced it — for every
            employee, every pay cycle.
          </p>
          <p className="mt-5 text-[12.5px] leading-relaxed text-[#8B93A1]">
            One login for your whole organization — we route admins to the Admin Console and employees to the
            Employee app automatically, based on the access they've been granted.
          </p>
        </div>
        <div className="relative text-[12px] text-[#8B93A1]">© 2026 Payroll OS · Redihire Global Services workspace</div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          {step === 'email' ? (
            <>
              <h1 className="text-[22px] font-bold text-text">Sign in to Payroll OS</h1>
              <p className="mt-1.5 text-[13px] text-text-muted">
                No password — we'll email you a one-time code.
              </p>

              <form className="mt-7 flex flex-col gap-4" onSubmit={handleSendCode}>
                <Field label="Work email">
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                {error && <p className="text-[12.5px] text-danger">{error}</p>}
                <Button type="submit" variant="primary" className="w-full justify-center" size="md" disabled={busy || !email}>
                  {busy ? 'Sending code…' : 'Send code'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-[22px] font-bold text-text">Enter your code</h1>
              <p className="mt-1.5 text-[13px] text-text-muted">
                We sent a 6-digit code to <span className="font-semibold text-text">{email}</span>.
              </p>

              <form className="mt-7 flex flex-col gap-4" onSubmit={handleVerifyCode}>
                <Field label="One-time code">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </Field>
                {error && <p className="text-[12.5px] text-danger">{error}</p>}
                <Button type="submit" variant="primary" className="w-full justify-center" size="md" disabled={busy || code.length < 6}>
                  {busy ? 'Verifying…' : 'Verify & Sign in'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(null); }}
                  className="text-[12.5px] font-semibold text-text-muted"
                >
                  ← Use a different email
                </button>
              </form>
            </>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold text-text-faint">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-center text-[12.5px] text-text-faint">
            New organization?{' '}
            <Link to="/auth/register" className="font-semibold text-accent">
              Create your workspace
            </Link>
          </p>
          <p className="mt-2 text-center text-[11.5px] text-text-faint">
            Joining an existing company? Ask your HR admin to grant you a portal seat.
          </p>
        </div>
      </div>
    </div>
  );
}
