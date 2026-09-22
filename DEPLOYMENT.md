# Deployment Runbook

Everything in this repo is written and committed, but **nothing has been
applied to your live Supabase project or verified on your live Netlify
site yet** — the session that wrote this code has no network access to
either service (see
[docs/architecture/17-supabase-resend-setup.md](docs/architecture/17-supabase-resend-setup.md)
§17.6). Run the steps below from a machine with normal internet access.

## 1. Apply the database schema

Open your Supabase project's **SQL Editor**
(`https://supabase.com/dashboard/project/opnomzejmppuxjrnspox/sql/new`) and
run each file in `supabase/migrations/` **in order**, one at a time:

```
0001_core_schema.sql
0002_attendance_leave_salary.sql
0003_payroll.sql
0004_rls.sql
0005_org_branding_and_seats.sql
0006_company_letterhead.sql
0007_otp_codes.sql
```

(Equivalent CLI path, if you'd rather: `supabase login && supabase link
--project-ref opnomzejmppuxjrnspox && supabase db push`.)

`0005` creates the public `company-logos` Storage bucket as part of its SQL
— no separate Storage dashboard step needed.

There are **no Supabase Edge Functions to deploy** and **no Supabase
secrets to set** — every privileged operation (OTP, company registration,
notifications) runs as a Netlify Function instead (see
[17-supabase-resend-setup.md](docs/architecture/17-supabase-resend-setup.md)
§17.1 for why). That's step 3 below.

## 2. Verify your sending domain in Resend

Login/registration and every notification email are sent from
`support@rhirepro.com` via Resend's API. The one prerequisite outside this
repo: `rhirepro.com` must be added and verified as a sending domain in your
Resend account (Domains → Add Domain → add the DNS records Resend gives
you), or `support@rhirepro.com` will be rejected as a sender.

## 3. Set Netlify environment variables

**Site configuration → Environment variables** — four values, all in one
place:

| Key | Value | Used by |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://opnomzejmppuxjrnspox.supabase.co` | Frontend (bundled into the client) + Netlify Functions (server-side, reused rather than duplicated) |
| `VITE_SUPABASE_ANON_KEY` | your project's publishable/anon key, from Project Settings → API | Frontend only — safe to expose client-side by design, every table it can reach is gated by RLS (`0004_rls.sql`) |
| `SUPABASE_SERVICE_ROLE_KEY` | your project's service role key, from Project Settings → API | **Netlify Functions only.** Bypasses RLS — never prefix this with `VITE_`, or it would be bundled into client-side JavaScript and readable by anyone |
| `RESEND_API_KEY` | your Resend API key | **Netlify Functions only.** Same rule — never `VITE_`-prefixed |

**Important:** Vite bakes the two `VITE_`-prefixed values into the build at
*build time*, not runtime. If you add or change any of these four after a
deploy already ran, you must trigger a fresh deploy (Deploys tab →
"Trigger deploy" → "Clear cache and deploy site") for the change to take
effect. If `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are ever missing,
the app shows a visible red banner on every page rather than failing
silently (`ConfigWarningBanner`).

## 4. Deploy to Netlify

**Netlify Dashboard** → Add new site → Import an existing project → pick
this GitHub repo and branch. `netlify.toml` already sets the build command
(`npm run build`), publish directory (`dist`), and the Functions directory
(`netlify/functions`) — nothing else to configure. Set the four
environment variables from step 3, then deploy.

## 5. Verify

1. Open the deployed site → `/auth/register` → create a test organization →
   confirm the OTP email arrives from `support@rhirepro.com` (check
   Resend's dashboard logs if not, and Netlify's function logs — Site →
   Functions → `send-otp` — if the request itself is failing).
2. Sign in at `/auth/login` with that same email → confirm it routes to
   `/admin` (the registrant is `company_owner`).
3. Check Supabase Table Editor → `companies`, `company_settings`,
   `user_company_roles` — confirm the rows landed correctly.

## Current scope

Auth (custom OTP via the Netlify Functions in step 3), email (Resend, all
of it — OTP and notifications), and every admin/employee screen (employee
directory, attendance, leave, salary, payroll, reports, audit log) are
wired to real Supabase queries — there is no mock data left in the app.
Most screens will legitimately show empty states until real workflows
populate them (adding employees, running payroll, etc.), since those
write-flows are the next phase of work, not because anything is faked.
