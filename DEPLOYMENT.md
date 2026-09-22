# Deployment Runbook

Everything in this repo is written and committed, but **nothing has been
applied to your live Supabase project or deployed to Netlify yet** — the
session that wrote this code has no network access to either service (see
[docs/architecture/17-supabase-resend-setup.md](docs/architecture/17-supabase-resend-setup.md)
§17.5). Run the steps below from a machine with normal internet access.

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

## 2. Verify your sending domain in Resend

Login/registration and every notification email are sent from
`support@rhirepro.com` via Resend's API — **not** through Supabase's own
mailer (there's nothing to configure in the Supabase dashboard for this).
The one prerequisite outside this repo: `rhirepro.com` must be added and
verified as a sending domain in your Resend account
(Domains → Add Domain → add the DNS records Resend gives you), or
`support@rhirepro.com` will be rejected as a sender.

## 3. Set the Edge Function secret

From a machine with network access:

```bash
npm i -g supabase
supabase login
supabase link --project-ref opnomzejmppuxjrnspox
supabase secrets set RESEND_API_KEY=<your Resend API key>
```

## 4. Deploy the Edge Functions

```bash
supabase functions deploy register-company
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy send-notification
```

## 5. Set frontend environment variables

Wherever the frontend builds (Netlify, or local `.env.local`):

```
VITE_SUPABASE_URL=https://opnomzejmppuxjrnspox.supabase.co
VITE_SUPABASE_ANON_KEY=<your project's publishable/anon key, from Project Settings → API>
```

(The anon key is safe to expose client-side by design — every table it can
reach is gated by RLS, per `0004_rls.sql`.)

**Important:** Vite bakes these into the build at *build time*, not
runtime. If you add or change them in Netlify after a deploy already ran,
you must trigger a fresh deploy (Deploys tab → "Trigger deploy" → "Clear
cache and deploy site") for the change to take effect — saving the
variable alone does nothing to a site that's already built. If the app is
ever missing these, it shows a visible red banner on every page rather than
failing silently — see `ConfigWarningBanner`.

## 6. Deploy to Netlify

**Netlify Dashboard** → Add new site → Import an existing project → pick
this GitHub repo and branch. `netlify.toml` already sets the build command
(`npm run build`) and publish directory (`dist`) — nothing to configure
there. Add the two environment variables from step 5 under **Site
configuration → Environment variables**, then deploy.

## 7. Verify

1. Open the deployed site → `/auth/register` → create a test organization →
   confirm the OTP email arrives from `support@rhirepro.com` (check
   Resend's dashboard logs if not, and Supabase's Edge Function logs for
   `send-otp` if the request itself is failing).
2. Sign in at `/auth/login` with that same email → confirm it routes to
   `/admin` (the registrant is `company_owner`).
3. Check Supabase Table Editor → `companies`, `company_settings`,
   `user_company_roles` — confirm the rows landed correctly.

## Current scope

Auth (custom OTP via send-otp/verify-otp), email (Resend, all of it — OTP
and notifications), and every admin/employee screen (employee directory,
attendance, leave, salary, payroll, reports, audit log) are wired to real
Supabase queries — there is no mock data left in the app. Most screens will
legitimately show empty states until real workflows populate them (adding
employees, running payroll, etc.), since those write-flows are the next
phase of work, not because anything is faked.
