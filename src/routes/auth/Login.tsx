import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Input';
import { useSession } from '@/shared/lib/session';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useSession();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login();
    navigate('/admin');
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
        </div>
        <div className="relative text-[12px] text-[#8B93A1]">© 2026 Payroll OS · Meridian Textiles Pvt Ltd workspace</div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          <h1 className="text-[22px] font-bold text-text">Sign in to Payroll OS</h1>
          <p className="mt-1.5 text-[13px] text-text-muted">Enter your work email and password to continue.</p>

          <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field label="Work email">
              <Input type="email" placeholder="you@company.com" defaultValue="ananya.rao@meridiantextiles.in" required />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="••••••••••" defaultValue="••••••••••" required />
            </Field>
            <div className="flex justify-end">
              <a href="#" className="text-[12.5px] font-semibold text-accent">
                Forgot password?
              </a>
            </div>
            <Button type="submit" variant="primary" className="w-full justify-center" size="md">
              Sign in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold text-text-faint">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-center text-[12.5px] text-text-faint">
            Invitation-only workspace — contact your HR admin for access.
          </p>
        </div>
      </div>
    </div>
  );
}
