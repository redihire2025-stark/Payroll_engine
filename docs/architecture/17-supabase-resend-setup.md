# 17. Backend: Supabase (not Neon) + Resend for Email

A brief detour was considered into Neon (Postgres-only) + Netlify Functions
as a lighter-weight backend. That is **not** the direction — the project
uses **Supabase**, per the original Phase 0 architecture
([06-supabase-architecture.md](./06-supabase-architecture.md)), because
Supabase bundles Auth, Storage and Edge Functions alongside Postgres; Neon
alone would have meant building a custom auth layer and file storage from
scratch, which is more moving parts, not fewer. This document records the
two concrete additions on top of that original design: **email OTP login**
and **Resend as the email provider**.

## 17.1 Authentication: fully custom email OTP (not Supabase Auth's own)

Every login — admin or employee — is a single form: enter your work email,
receive a 6-digit code, enter it. No passwords to reset, phish, or reuse.

The OTP is **not** Supabase Auth's built-in OTP (`signInWithOtp` /
Supabase's own mailer). It's generated, stored and emailed entirely by our
own code, so the message can be fully ours — sent from
`support@rhirepro.com` via Resend, with our own copy — rather than
Supabase's default template and whatever SMTP happens to be configured in
the dashboard.

- **`send-otp`** ([Edge Function](../../supabase/functions/send-otp/index.ts)):
  generates a random 6-digit code, stores only its SHA-256 hash in
  `otp_codes` ([migration 0007](../../supabase/migrations/0007_otp_codes.sql),
  10-minute expiry, invalidates any earlier unconsumed code for that
  email+purpose), and emails the plaintext code via
  [`_shared/resend.ts`](../../supabase/functions/_shared/resend.ts). For
  `purpose: 'login'`, it first checks `platform_users` for that email and
  refuses to send a code at all if no account exists — the same
  "only a seat the admin granted can sign in" rule as before, just enforced
  against our own table instead of Supabase Auth's `shouldCreateUser: false`.
- **`verify-otp`** ([Edge Function](../../supabase/functions/verify-otp/index.ts)):
  checks the submitted code against the stored hash (rate-limited to 5
  attempts per code), and on success **bridges to a real Supabase Auth
  session** — it calls `admin.auth.admin.generateLink()` (the admin API,
  which mints a session token server-side *without* Supabase sending its
  own email) and returns the resulting `hashed_token` to the client. The
  client then calls `supabase.auth.verifyOtp({ token_hash, type })`
  ([authService.ts](../../src/modules/identity/authService.ts)) to actually
  establish the session locally. This is a documented Supabase pattern for
  custom-SMTP OTP delivery — it means RLS, `auth.uid()` and
  `getMyCompanyRoles()` below work exactly as if Supabase's own OTP had
  been used; only *where the code came from and who emailed it* changed.
- After that session is established, the client calls `getMyCompanyRoles()`,
  which queries `user_company_roles` joined to `companies`. That result —
  not the URL the user opened — is what `landingRouteFor()` uses to send
  them to `/admin` or `/app` (see
  [16-self-service-onboarding.md](./16-self-service-onboarding.md) §16.1).

## 17.2 Email delivery: Resend

Every email — the OTP code and every notification — goes through the same
path: a Resend HTTP API call (`_shared/resend.ts`) from a
`RESEND_API_KEY` **Edge Function secret** (`supabase secrets set
RESEND_API_KEY=...`), never embedded in frontend code, never committed to
the repo, sent from `support@rhirepro.com` by default
(`NOTIFICATIONS_FROM_EMAIL` overrides it per-environment if needed).

- **`send-otp`** — the sign-in code, fixed template.
- **`send-notification`** — everything else (payslip-ready, leave/attendance
  decisions, the registration welcome email), taking arbitrary
  subject/html from the caller. Client-side wrapper:
  [`notificationService.ts`](../../src/modules/notifications/notificationService.ts).

**No Supabase Dashboard SMTP configuration is needed at all** — since
Supabase Auth's own mailer is never invoked (no `signInWithOtp` anywhere in
this codebase), there's nothing to point at Resend in the dashboard. The
one prerequisite that *is* still a dashboard/account step, outside this
repo: `rhirepro.com` must be a verified sending domain in Resend, or
`support@rhirepro.com` will be rejected as a sender.

## 17.3 Self-service registration, concretely

`register-company` ([Edge Function](../../supabase/functions/register-company/index.ts))
is the atomic-transaction function described in
[16-self-service-onboarding.md](./16-self-service-onboarding.md) §16.2,
now actually implemented: given an already-OTP-verified `userId` plus the
organization's details, it upserts `platform_users`, inserts `companies`
(+ the uploaded logo's public URL from the `company-logos` bucket),
inserts a default `company_settings` row, and grants `company_owner` — as
one function, using the service-role key (auto-provided to every Edge
Function as `SUPABASE_SERVICE_ROLE_KEY`, never exposed to the client).

## 17.4 What's real vs. what's still mock

Honest status, so nothing here is overstated:

| Piece | Status |
|---|---|
| Custom OTP login/registration (send-otp + verify-otp) | Real code, calling the real project once env vars are set — **not yet tested against a live database**, since this session's network cannot reach Supabase (see §17.5) |
| `register-company`, `send-otp`, `verify-otp`, `send-notification` Edge Functions | Written, not yet deployed (`supabase functions deploy` needs to run from a machine with real network access) |
| Migrations 0001–0007 | Written, not yet applied to the live project |
| Employee directory, attendance, leave, salary, payroll, reports | Wired to real `supabase-js` queries (see docs/architecture — this is no longer mock data), but likewise unverified against a live schema for the same network-access reason |

## 17.5 Why none of this could be tested from within the build session

The sandboxed session that wrote this code has an organization-level network
policy that only allows a small allowlist (npm/PyPI registries, GitHub,
Anthropic's API) — Neon, Netlify, Supabase and Resend were all unreachable
(403 policy denial) when checked directly. See
[DEPLOYMENT.md](../../DEPLOYMENT.md) for the exact steps to run from a
machine that *does* have normal internet access to actually stand this up.
