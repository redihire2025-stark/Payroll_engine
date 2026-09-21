# 6. Supabase Architecture

## 6.1 Components Used

| Supabase feature | Use |
|---|---|
| Postgres | System of record, all tables in [05](./05-database-erd.md) |
| Auth | Email/password now; Google/Microsoft/MFA/SSO later (same `auth.users` table, no migration needed) |
| Storage | Private buckets for documents/payslips; signed URLs only |
| RLS | Primary tenant-isolation + authorization enforcement layer |
| Edge Functions (Deno) | Privileged/service-role operations that must not run with the caller's RLS-scoped key: payroll lock, PDF generation trigger, cross-tenant platform-admin actions, webhook receivers |
| Database Functions/Triggers | `updated_at` maintenance, `audit_logs` capture, leave-balance recalculation, payroll state-transition guards |

No separate backend server. The React app talks to Postgres via `supabase-js`
(anon key, RLS-scoped) for all normal CRUD. Edge Functions are called only for the
narrow set of operations listed above, using the **service role key**, which lives
only in Edge Function environment variables — **never** shipped to the client.

## 6.2 Multi-Tenancy Model

- Every tenant-owned table carries `company_id`.
- The authenticated user's accessible `company_id`s are resolved from
  `user_company_roles` (see [05](./05-database-erd.md)) — not from a client-supplied
  header or parameter, so a user cannot simply pass a different `company_id` to read
  another tenant's data.
- RLS policies join back to `user_company_roles` for every read/write (details in
  [07](./07-security-rls.md)).
- `platform_super_admin` bypasses `company_id` scoping via a dedicated policy branch,
  used only in the Platform console, and every such access is written to
  `audit_logs`.

## 6.3 Edge Functions (initial set)

```
edge-functions/
  payroll-calculate/     Runs the calculation pipeline for a payroll_run
                          (service role — writes payroll_items/earnings/deductions,
                          never trusts client-computed numbers)
  payroll-lock/          Transitions a run to LOCKED after approval checks;
                          rejects if approval_requests for the run isn't APPROVED
  payslip-generate/      Renders payslip PDF (from locked payroll_items),
                          stores to Storage, writes payslips row
  send-notification/     Fan-out for email + in-app notification on key events
                          (leave decision, payslip ready, approval pending)
  attendance-verify/     (Phase 3+) server-side sanity check on punch
                          timestamp/geolocation vs. company policy before
                          accepting a mobile punch as authoritative
```

Rule: **any calculation or state transition that must be trustworthy (payroll math,
locking, statutory numbers) runs server-side in an Edge Function or a Postgres
function — never solely in the browser.** The browser may show a *preview*
calculation for UX, but the persisted numbers always come from the server-side run.

## 6.4 Storage Buckets

| Bucket | Contents | Access |
|---|---|---|
| `employee-documents` | ID proofs, contracts, certificates | Private; signed URL, employee (own) + HR/Admin roles via RLS-backed policy on `storage.objects` |
| `payslips` | Generated payslip PDFs | Private; signed URL, employee (own) + Payroll/HR roles |
| `company-documents` | Company-level docs, policy PDFs | Private; signed URL, company roles |
| `tax-documents` | Form 16 etc. | Private; signed URL, employee (own) + HR/Payroll |

All buckets are **private** (no public bucket for anything payroll/HR-related).
Signed URLs are short-lived (default 60s–5min depending on use, generated on demand
by the `documents` service, never cached long-term client-side).

## 6.5 Environment / Project Layout

- One Supabase project per environment: `dev`, `staging`, `prod` (not per-tenant —
  tenants are logical rows inside one project, per the multi-tenancy model above).
- Migrations tracked with the Supabase CLI (`supabase/migrations/*.sql`), applied
  through CI, never hand-run against `prod`.
- Secrets (`service_role` key, SMTP creds, etc.) live in Supabase project secrets /
  Netlify environment variables — never committed to the repo.

## 6.6 Future Extraction Points (not built now, designed for)

- If a workload needs heavy background processing (bulk statutory report
  generation, large imports), it can move to a Google Cloud Function/Cloud Run
  worker triggered by a Postgres `NOTIFY`/webhook from an Edge Function — the
  service-layer contract (`payrollService.calculate()`, etc.) doesn't change, only
  what's behind it.
- If caching/rate-limiting is later needed, Redis can sit in front of Edge Functions
  without touching RLS or the frontend service layer.
- If Storage needs to move to GCS, the `documents` module's interface
  (`upload()`, `getSignedUrl()`, `delete()`) is the only thing that changes.
