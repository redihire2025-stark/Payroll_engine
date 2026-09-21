# 7. RLS / Security Architecture

## 7.1 Principles

1. **RLS is the source of truth for authorization**, not the frontend. The frontend
   hides UI for roles that can't act, but every table has policies that would block
   the same action even if called directly via the API.
2. **Every tenant table policy starts from `company_id` membership**, then narrows
   by role/ownership.
3. **No table is left with RLS disabled** except genuinely public reference data
   (e.g., a future public plans/pricing table — none exist in MVP).
4. **Service-role key** is used only inside Edge Functions, never in client code,
   for operations RLS is deliberately too strict to allow the *user's own* session to
   perform (payroll locking, cross-tenant platform admin).

## 7.2 Helper Functions (used inside policies)

```sql
-- returns the set of company_ids the current user has any role in
auth.user_company_ids() -> setof uuid

-- returns true if current user has `role` in `company_id`
auth.has_company_role(company_id uuid, role text) -> boolean

-- returns true if current user is platform_super_admin
auth.is_platform_super_admin() -> boolean

-- returns the employee_id row belonging to the current auth user, for a company
auth.current_employee_id(company_id uuid) -> uuid

-- returns true if target_employee_id reports (directly or indirectly) to current user
auth.is_manager_of(target_employee_id uuid) -> boolean
```

These are `SECURITY DEFINER` SQL functions in a dedicated schema, kept simple and
indexed (`user_company_roles(user_id, company_id, role)`), since every RLS check
calls them.

## 7.3 Representative Policies

**employees** (read):
```sql
create policy employees_select on employees for select using (
  auth.is_platform_super_admin()
  or auth.has_company_role(company_id, 'company_admin')
  or auth.has_company_role(company_id, 'company_owner')
  or auth.has_company_role(company_id, 'hr_admin')
  or auth.has_company_role(company_id, 'payroll_admin')
  or id = auth.current_employee_id(company_id)          -- self
  or auth.is_manager_of(id)                              -- manager, own team
);
```

**employees** (update) — narrower than select: only HR/Admin roles, or self for a
restricted column set enforced via a `SECURITY DEFINER` RPC (`update_own_profile`)
rather than a raw table `UPDATE`, so employees can't self-edit `department_id` or
`status`.

**payroll_runs** (all): only `payroll_admin`, `company_admin`, `company_owner` of
that `company_id`; `hr_admin`/`finance` get a read-only select policy; everyone else
denied. Write access to `status` transitions is further restricted at the
application/Edge Function layer (see [08](./08-payroll-domain.md) state machine —
RLS allows the update, the Edge Function enforces *which* transitions are legal).

**payslips** (select): `employee_id = auth.current_employee_id(company_id)` OR
HR/Payroll/manager-of roles. No insert/update/delete policy for regular users —
only the `payslip-generate` Edge Function (service role) writes rows.

**leave_requests** (select/insert): self, or manager (`auth.is_manager_of`), or
HR/Admin. Insert restricted to `employee_id = auth.current_employee_id(...)` — an
employee can only file leave for themselves.

**audit_logs**: insert-only via `SECURITY DEFINER` trigger functions (never direct
client insert); select restricted to Admin/HR/Payroll roles scoped to their
`company_id`, platform logs restricted to `platform_super_admin`.

**storage.objects** (per bucket): policy checks the object path convention
`{company_id}/{employee_id}/...` against the same `auth.has_company_role` /
`auth.current_employee_id` helpers, so storage access mirrors table access exactly.

## 7.4 Defense in Depth Beyond RLS

- **Zod schemas** validate all input at the service layer before it reaches
  Supabase (shape, ranges, enums) — RLS stops *unauthorized* writes, Zod stops
  *malformed* ones.
- **Edge Functions** re-validate authorization (don't just trust "the caller passed
  RLS to read this") before performing privileged writes like payroll locking.
- **Encrypted sensitive columns** (bank account numbers, statutory IDs) as noted in
  [05](./05-database-erd.md) — RLS controls row access, encryption controls what's
  readable even if a row is exposed.
- **Signed URLs, short expiry**, for all document/payslip access — no long-lived or
  public links.
- **Audit logging** of every payroll state change, salary change, bank-detail
  change, and permission change, captured via database triggers so it can't be
  bypassed by calling Supabase directly.
- **Rate limiting**: deferred to Supabase's built-in Auth rate limits for MVP;
  Edge Function-level rate limiting added if abuse is observed (no Redis needed at
  MVP volume — see [14-risk-register](./14-risk-register.md)).
- **Secrets**: `service_role` key and SMTP credentials only ever in Supabase/Netlify
  environment variables, never in the repo, never in client bundles (verified by CI
  secret-scanning).

## 7.5 Testing Requirement

Every RLS policy above must have a corresponding **security test** ([12
Development Phases](./12-development-phases.md), Phase 9, and ongoing per-phase):
attempt the operation as each role, assert allowed/denied matches the matrix in
[03](./03-roles-matrix.md). Tenant-isolation tests specifically attempt cross-company
reads and must fail.
