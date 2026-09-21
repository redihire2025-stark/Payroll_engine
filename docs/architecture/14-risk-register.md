# 14. Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | Incorrect payroll calculation reaches an employee's payslip | Very High (legal/trust) | Medium | Pure, unit-tested calculation pipeline ([08](./08-payroll-domain.md)); no rule handler merges without table-driven tests; calculation logs make every number traceable; maker-checker approval before lock |
| 2 | Tenant data leak (Company A sees Company B's data) | Very High | Low (if RLS done right), High if skipped | RLS-first architecture, every table policy-tested, security test suite in Phase 9 and CI-gated ongoing |
| 3 | Frontend-only authorization checks bypassed via direct API calls | High | Medium if RLS is incomplete | RLS is mandatory on every table per [07](./07-security-rls.md); no table ships without a policy |
| 4 | Statutory rule changes (India PF/ESI/TDS slabs change) require code redeploy | Medium | High (happens most fiscal years) | Rules are versioned, effective-dated config rows (`payroll_rule_sets`), not code — see [08](./08-payroll-domain.md) §8.2 |
| 5 | Sensitive data (bank details, PAN, salary) exposed via logs, broad SELECT *, or misconfigured Storage | High | Medium | Column-level encryption for the most sensitive fields, private-only Storage buckets, signed URLs, no full-table dumps to client, audit-log review |
| 6 | Payroll locked-record correction is done by silently editing history | High (audit/legal) | Medium | State machine forbids updates to `LOCKED` rows (RLS + trigger); corrections go through `payroll_adjustments`/off-cycle runs |
| 7 | Scope creep — building microservices/Redis/Kafka before there's a scale problem | Medium (cost/time) | Medium (explicitly warned against in spec) | Architecture decisions document (this folder) is the check; any deviation requires explicit discussion |
| 8 | Client-side trust of attendance punch time/location (buddy punching, GPS spoofing) | Medium | Medium | Server-side re-validation in `attendance-verify` Edge Function; punches are advisory from client, authoritative from server clock; geofence check server-side |
| 9 | Single Supabase project becomes a scaling bottleneck at high tenant count | Medium | Low at MVP scale, rises later | Schema designed with `company_id` indexes on every tenant table now; connection pooling (Supavisor) available; sharding/dedicated-project-per-large-tenant is a later option, not needed at MVP |
| 10 | Capacitor/native quirks (permissions, background punch) discovered late | Medium | Medium | Native capabilities isolated behind service interfaces from Phase 1 ([10](./10-capacitor-architecture.md)) so they're tested incrementally rather than bolted on in Phase 8 |
| 11 | Solo/small dev team (Claude Pro-assisted) underestimates payroll domain complexity, ships incomplete statutory coverage | Medium | Medium | Rule engine is extensible by design — ship the common case (regular salaried employees, standard PF/ESI/PT/TDS) first, document explicitly what's NOT covered per release rather than silently getting it wrong |
| 12 | PDF/payslip generation or Edge Function cold starts affect payroll processing time for large employee counts | Low–Medium | Low at MVP scale | Payroll calculation is not required to be synchronous/instant; run status (`CALCULATING`) allows async processing with UI polling; revisit if a company's headcount makes this material |
| 13 | Netlify + Supabase free/low tiers hit limits as usage grows | Low | Medium over time | Monitor usage against plan limits; upgrading tiers is a config change, not an architecture change |
| 14 | Loss of institutional knowledge / architecture drift as features are added ad hoc | Medium | Medium | This `docs/architecture/` folder is a living document, updated alongside code each phase, per [11-folder-structure.md](./11-folder-structure.md) |

Risks 1, 2, and 6 are the ones this architecture treats as **non-negotiable design
constraints** (auditable payroll engine, RLS-first, immutable locked records) rather
than items to "keep in mind" — they are structurally addressed above, not left to
developer discipline alone.
