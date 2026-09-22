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

## 17.1 Authentication: passwordless email OTP

Every login — admin or employee — is a single form: enter your work email,
receive a 6-digit code, enter it. No passwords to reset, phish, or reuse.

- **Login** (`/auth/login`): `supabase.auth.signInWithOtp({ email, options:
  { shouldCreateUser: false } })`. `shouldCreateUser: false` is the
  enforcement point for "only a seat the admin granted can sign in" — an
  email with no existing `auth.users` row is rejected here, not just hidden
  in the UI.
- **Registration** (`/auth/register`): the one place `shouldCreateUser:
  true` is used — this is how a new company's first user (the eventual
  `company_owner`) gets created.
- After `verifyOtp` succeeds, the client calls `getMyCompanyRoles()`
  ([authService.ts](../../src/modules/identity/authService.ts)), which
  queries `user_company_roles` joined to `companies`. That result — not the
  URL the user opened — is what `landingRouteFor()` uses to send them to
  `/admin` or `/app` (see [16-self-service-onboarding.md](./16-self-service-onboarding.md) §16.1).
- The OTP *email itself* is sent by Supabase Auth's own mailer, not by
  application code — which is why the SMTP provider matters (below).

## 17.2 Email delivery: Resend

Two distinct paths send email, and they're configured differently:

1. **Auth emails (OTP codes, and later password-reset/magic-link if ever
   added)** — sent automatically by Supabase Auth. Configured once, in the
   Supabase Dashboard, **not in application code**:
   `Authentication → Emails → SMTP Settings`:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: the Resend API key
   - Sender email: an address on a domain verified in Resend (Resend's
     sandbox sender only delivers to the Resend account's own email until a
     real domain is verified — fine for testing, not for real employees).
2. **Transactional/notification emails** (payslip-ready, leave decisions,
   the registration welcome email) — sent by the
   [`send-notification`](../../supabase/functions/send-notification/index.ts)
   Edge Function, which calls Resend's HTTP API directly
   (`POST https://api.resend.com/emails`) using a `RESEND_API_KEY` **Edge
   Function secret** (`supabase secrets set RESEND_API_KEY=...`) — never
   embedded in frontend code, never committed to the repo. The reusable
   client-side wrapper is
   [`notificationService.ts`](../../src/modules/notifications/notificationService.ts).

Both paths point at the same Resend account but are configured
independently — rotating the API key means updating both the Supabase SMTP
password and the `RESEND_API_KEY` secret.

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
| Supabase Auth OTP login/registration | Real code, calling the real project once env vars are set — **not yet tested against a live database**, since this session's network cannot reach Supabase (see §17.5) |
| `register-company`, `send-notification` Edge Functions | Written, not yet deployed (`supabase functions deploy` needs to run from a machine with real network access) |
| Migrations 0001–0005 | Written, not yet applied to the live project |
| Everything else (employee directory, attendance, leave, salary, payroll, reports) | Still the mock data layer from Phases 1–7 — swapping these to real `supabase-js` calls is the next slice of work, deliberately not done blind in the same pass as the auth/email wiring, since it can't be tested here either |

## 17.5 Why none of this could be tested from within the build session

The sandboxed session that wrote this code has an organization-level network
policy that only allows a small allowlist (npm/PyPI registries, GitHub,
Anthropic's API) — Neon, Netlify, Supabase and Resend were all unreachable
(403 policy denial) when checked directly. See
[DEPLOYMENT.md](../../DEPLOYMENT.md) for the exact steps to run from a
machine that *does* have normal internet access to actually stand this up.
