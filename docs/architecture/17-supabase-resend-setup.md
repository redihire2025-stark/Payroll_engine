# 17. Backend: Supabase (DB/Auth/Storage) + Netlify Functions + Resend

A brief detour was considered into Neon (Postgres-only) as the database.
That is **not** the direction — the project uses **Supabase** for
Postgres, Auth and Storage, per the original Phase 0 architecture
([06-supabase-architecture.md](./06-supabase-architecture.md)).

What *did* change from that original design: **every piece of privileged
server-side logic runs as a Netlify Function, not a Supabase Edge
Function.** This document explains why, and records the two concrete
features built on it: custom email OTP login and Resend as the email
provider.

## 17.1 Why Netlify Functions instead of Supabase Edge Functions

Two concrete problems, both solved by moving the logic to the same domain
as the frontend:

1. **CORS.** A Supabase Edge Function lives on `<project>.supabase.co` —
   a different origin from the deployed site (`rpayroll.netlify.app`).
   Every call is cross-origin, which means a CORS preflight (`OPTIONS`)
   request first. Supabase's platform gateway enforces JWT verification on
   *every* request by default, including that preflight — which never
   carries the caller's auth headers (browsers generate it automatically,
   before the real request, with none of the headers the real request will
   send). For `send-otp`/`verify-otp` specifically — functions that must
   work for a visitor who doesn't have a session yet — that preflight gets
   rejected at Supabase's gateway before the function's own CORS-handling
   code ever runs. A Netlify Function, by contrast, is served from
   `/.netlify/functions/<name>` on the **same domain** as the site — a
   same-origin request never triggers a CORS preflight at all. This isn't
   a workaround for the failure mode, it removes the mechanism that caused
   it.
2. **One place for secrets.** `SUPABASE_SERVICE_ROLE_KEY` and
   `RESEND_API_KEY` are both set as ordinary Netlify environment
   variables, managed in the same dashboard as `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` — no separate `supabase secrets set` step, no
   second place to remember to rotate a key.

Every privileged function (`register-company`, `send-otp`, `verify-otp`,
`send-notification`) lives in `netlify/functions/`, written in TypeScript,
bundled by Netlify's build (esbuild) alongside the frontend — see
[netlify.toml](../../netlify.toml)'s `[functions]` block. Each still uses
the Supabase **service role key** to bypass RLS for its own privileged
writes (creating a company, reading `otp_codes`, minting a session) — that
part of the original design is unchanged, only *where the function runs*
is different.

## 17.2 Authentication: fully custom email OTP (not Supabase Auth's own)

Every login — admin or employee — is a single form: enter your work email,
receive a 6-digit code, enter it. No passwords to reset, phish, or reuse.

The OTP is **not** Supabase Auth's built-in OTP (`signInWithOtp` /
Supabase's own mailer). It's generated, stored and emailed entirely by our
own code, so the message is fully ours — sent from `support@rhirepro.com`
via Resend, with our own copy.

- **`send-otp`** ([netlify/functions/send-otp.ts](../../netlify/functions/send-otp.ts)):
  generates a random 6-digit code, stores only its SHA-256 hash in
  `otp_codes` ([migration 0007](../../supabase/migrations/0007_otp_codes.sql),
  10-minute expiry, invalidates any earlier unconsumed code for that
  email+purpose), and emails the plaintext code via
  [`_shared/resend.ts`](../../netlify/functions/_shared/resend.ts). For
  `purpose: 'login'`, it first checks `platform_users` for that email and
  refuses to send a code at all if no account exists — "only a seat the
  admin granted can sign in," enforced here, not just hidden in the UI.
- **`verify-otp`** ([netlify/functions/verify-otp.ts](../../netlify/functions/verify-otp.ts)):
  checks the submitted code against the stored hash (rate-limited to 5
  attempts per code), and on success **bridges to a real Supabase Auth
  session** — it calls `admin.auth.admin.generateLink()` (the admin API,
  which mints a session token server-side *without* Supabase sending its
  own email) and returns the resulting `hashed_token` to the client. The
  client then calls `supabase.auth.verifyOtp({ token_hash, type })`
  ([authService.ts](../../src/modules/identity/authService.ts)) to actually
  establish the session locally. This is a documented Supabase pattern for
  custom-SMTP OTP delivery — RLS, `auth.uid()` and `getMyCompanyRoles()`
  work exactly as if Supabase's own OTP had been used; only *where the
  code came from and who emailed it* changed.
- After that session is established, the client calls `getMyCompanyRoles()`,
  which queries `user_company_roles` joined to `companies`. That result —
  not the URL the user opened — is what `landingRouteFor()` uses to send
  them to `/admin` or `/app` (see
  [16-self-service-onboarding.md](./16-self-service-onboarding.md) §16.1).

## 17.3 Email delivery: Resend

Every email — the OTP code and every notification — goes through the same
path: a Resend HTTP API call
([`_shared/resend.ts`](../../netlify/functions/_shared/resend.ts)) from a
`RESEND_API_KEY` **Netlify environment variable** (never `VITE_`-prefixed,
so it only ever runs server-side in the function's Lambda runtime, never
shipped to the browser), sent from `support@rhirepro.com` by default
(`NOTIFICATIONS_FROM_EMAIL` overrides it per-environment if needed).

- **`send-otp`** — the sign-in code, fixed template.
- **`send-notification`** — everything else (payslip-ready, leave/attendance
  decisions, the registration welcome email), taking arbitrary
  subject/html from the caller. Client-side wrapper:
  [`notificationService.ts`](../../src/modules/notifications/notificationService.ts).

No Supabase Dashboard SMTP configuration is needed at all — Supabase
Auth's own mailer is never invoked anywhere in this codebase. The one
prerequisite that's still an account-level step, outside this repo:
`rhirepro.com` must be a verified sending domain in Resend, or
`support@rhirepro.com` will be rejected as a sender.

## 17.4 Self-service registration, concretely

`register-company` ([netlify/functions/register-company.ts](../../netlify/functions/register-company.ts))
is the atomic-transaction function described in
[16-self-service-onboarding.md](./16-self-service-onboarding.md) §16.2:
given an already-OTP-verified `userId` plus the organization's details, it
upserts `platform_users`, inserts `companies` (+ the uploaded logo's public
URL from the `company-logos` bucket), inserts a default `company_settings`
row, and grants `company_owner` — as one function, using the service-role key.

## 17.5 What's real vs. what's still unbuilt

Honest status, so nothing here is overstated:

| Piece | Status |
|---|---|
| Custom OTP login/registration, register-company, send-notification (all four Netlify Functions) | Real code — **not yet tested against a live deployment**, since this session's network cannot reach Supabase, Resend or Netlify (see §17.6) |
| Migrations 0001–0007 | Written, not yet applied to the live project |
| Employee directory, attendance, leave, salary, payroll, reports | Wired to real `supabase-js` queries — no mock data left in the app — but likewise unverified against a live schema for the same network-access reason |
| `payroll-calculate`, `payroll-lock`, `payslip-generate`, `attendance-verify` | Not yet built, per [06-supabase-architecture.md](./06-supabase-architecture.md) §6.3 |

## 17.6 Why none of this could be tested from within the build session

The sandboxed session that wrote this code has an organization-level network
policy that only allows a small allowlist (npm/PyPI registries, GitHub,
Anthropic's API) — Neon, Netlify, Supabase and Resend were all unreachable
(403 policy denial) when checked directly. See
[DEPLOYMENT.md](../../DEPLOYMENT.md) for the exact steps to run from a
machine that *does* have normal internet access to actually stand this up.
