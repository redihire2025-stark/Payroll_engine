# 16. Self-Service Onboarding, Branding & Seat-Based Licensing

Adds three things the original Phase 0 docs left implicit: how a new company
actually gets onto the platform, how its brand shows up on payslips, and how
"who can log in" is licensed and enforced. This supersedes the earlier
"invitation-only" login copy — **organizations self-register**; only
individual *employees* are invitation/admin-granted after that.

## 16.1 One login, two consoles

There is exactly **one login screen** (`/auth/login`) for every person on the
platform — admins, HR, payroll, managers, employees. There is no "admin
login" vs "employee login" URL to choose between. After authentication, the
app resolves the user's role(s) for their company (`user_company_roles`) and
routes them:

```
has any of {company_owner, company_admin, hr_admin, payroll_admin, finance}?
  → land on /admin  (Admin Console)
else (employee, or manager with only the employee role)
  → land on /app    (Employee/Manager experience)
```

A person who holds *both* an admin role and is an employee (the common case
for a small company's owner) lands on `/admin` and can reach `/app` from
there — same as documented in [04-navigation.md](./04-navigation.md). This
logic lives in one place (`landingRouteFor(user)` in the session module) so
it is never duplicated or drifted between the login screen and any other
entry point (password reset, magic link, SSO later).

## 16.2 Self-service company registration

`/auth/register` is a new, unauthenticated flow — a company does **not**
need to be created by us. Three steps, one Postgres transaction on submit:

1. **Organization details** — company name, legal name, country (default
   India), and **logo upload**. The logo is required for a complete profile
   but registration can proceed without one (falls back to an auto-generated
   monogram, same as a chat app's default avatar) — this is asked for, not
   forced, per the no-forced-fields principle.
2. **Admin account** — the registrant's name, work email, password. This
   person becomes that company's `company_owner`.
3. **Confirmation** — summary + "Go to Dashboard". From there the new owner
   adds branches/departments and starts inviting employees (Phase 2 flows,
   unchanged).

Server-side, this is one Edge Function, `register-company` (added to the
Edge Functions list in [06-supabase-architecture.md](./06-supabase-architecture.md)),
run with the service role so the whole sequence — `auth.users` row (via
Supabase Auth signUp), `platform_users`, `companies`, `company_settings`,
`user_company_roles(role='company_owner')`, and the logo upload to Storage —
either all succeeds or all rolls back. A registration that failed halfway
(auth user created, no company) must never be reachable client-side — the
Edge Function is the only writer of this sequence.

## 16.3 Tenant branding

- `companies.logo_url` stores the path to the uploaded logo in a new
  `company-logos` Storage bucket. Unlike the private buckets in
  [06-supabase-architecture.md](./06-supabase-architecture.md), this bucket
  is **public-read** (a company logo is not sensitive, and needs to render
  in downloadable PDFs and the login screen without a signed-URL round
  trip) but still write-restricted to that company's `company_admin`/
  `company_owner` via a Storage RLS policy.
- The logo renders: on the admin console topbar (next to the company
  switcher — distinct from the "Payroll OS" platform mark in the sidebar,
  which stays the platform's own brand, not the tenant's), and — the
  concrete requirement — **on every generated payslip header**, next to the
  company name and address, via the `payslip-generate` Edge Function
  reading `companies.logo_url` at generation time.
- No logo uploaded yet: a deterministic monogram (initials on a tinted
  square, same pattern as employee avatars) renders everywhere a logo would,
  so the payslip is never left with a broken image or empty gap.

## 16.4 Seats

"Seats" = employees who have been **granted portal login access** (an
`employees` row has been linked to an `auth.users` row via
`employees.auth_user_id`), as distinct from an `employees` row that exists
purely as an HR record (e.g., an employee mid-onboarding, or one who never
needs portal access). This is the concrete meaning behind "seat allocated by
the admin": adding a person to payroll does not by itself consume a seat;
inviting them to log in does.

- `company_settings.employee_seat_limit` — the plan's seat cap (a plain
  integer for now; not tied to a billing system yet, per the "don't build
  what isn't needed" principle — a `subscription_plans` table is a listed
  future table, not built until real billing exists).
- Seats **used** is never a stored, driftable column — it's a live count:
  a `company_seat_usage` view (`count(*) from employees where
  auth_user_id is not null and status = 'active'`), so it can never go stale
  the way a manually-maintained counter would.
- The "Invite to Portal" action (Employees module) is the one place a seat
  gets consumed; the UI shows the running total (e.g., "142 / 200 seats
  used") wherever that action is offered, and the invite Edge Function
  checks the limit server-side before creating the `auth.users` row — never
  trusting a client-side check alone, consistent with every other
  enforcement rule in [07-security-rls.md](./07-security-rls.md).
- Exceeding the seat limit is a hard stop with a clear message ("You've used
  all 200 seats on your plan — contact us to add more"), not a silent
  failure.

## 16.5 What changed in earlier documents

- [04-navigation.md](./04-navigation.md): `/auth/login` is joined by
  `/auth/register`; the login screen's copy no longer says
  "invitation-only" — that restriction now applies to *employee* accounts
  within an already-registered company, not to companies joining the
  platform.
- [05-database-erd.md](./05-database-erd.md): `companies` gains `logo_url`;
  `company_settings` gains `employee_seat_limit`; a new
  `company_seat_usage` view is added (not a table — it has no independent
  existence to model).
- [06-supabase-architecture.md](./06-supabase-architecture.md): Edge
  Functions gain `register-company` and `invite-employee`; Storage buckets
  gain the public `company-logos` bucket.
