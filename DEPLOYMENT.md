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
```

(Equivalent CLI path, if you'd rather: `supabase login && supabase link
--project-ref opnomzejmppuxjrnspox && supabase db push`.)

`0005` creates the public `company-logos` Storage bucket as part of its SQL
— no separate Storage dashboard step needed.

## 2. Configure Resend as the Auth SMTP provider (for OTP login emails)

Supabase Dashboard → **Authentication → Emails → SMTP Settings**:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email | an address on a domain verified in Resend (or Resend's sandbox sender for testing — it only delivers to your own Resend account email until a domain is verified) |

## 3. Set the Edge Function secret (for notification/payslip emails)

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

## 6. Deploy to Netlify

**Netlify Dashboard** → Add new site → Import an existing project → pick
this GitHub repo and branch. `netlify.toml` already sets the build command
(`npm run build`) and publish directory (`dist`) — nothing to configure
there. Add the two environment variables from step 5 under **Site
configuration → Environment variables**, then deploy.

## 7. Verify

1. Open the deployed site → `/auth/register` → create a test organization →
   confirm the OTP email arrives (check Resend's dashboard logs if not).
2. Sign in at `/auth/login` with that same email → confirm it routes to
   `/admin` (the registrant is `company_owner`).
3. Check Supabase Table Editor → `companies`, `company_settings`,
   `user_company_roles` — confirm the rows landed correctly.

## What's still on mock data after this

Only **auth (login/registration)** and **email** are wired to real
Supabase/Resend calls. The rest of the app — employee directory,
attendance, leave, salary, payroll, reports — still reads from
`src/shared/lib/mockData.ts`. Swapping each module's service layer to real
`supabase-js` queries against the now-live schema is the next phase of
work, intentionally done module-by-module rather than all at once blind.
