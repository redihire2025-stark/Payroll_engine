# 15. Recommended Implementation Order

This sequencing follows strict dependency order — each step only relies on what's
already built. It maps 1:1 onto [12-development-phases.md](./12-development-phases.md)
but states *why* this order and not another.

1. **Foundation (Phase 1)** — nothing else can exist without auth, routing, the
   design system, and a Supabase connection. Building UI screens before the design
   system exists guarantees rework; building auth after other modules guarantees
   insecure scaffolding.

2. **Company + Employee (Phase 2)** — every other module (attendance, leave,
   salary, payroll) foreign-keys to `companies` and `employees`. This must exist
   and be correct — including RLS and multi-tenancy — before anything downstream is
   built, or every later module inherits an untested tenancy model.

3. **Attendance + Leave (Phase 3)** — payroll needs attendance/LOP and leave data
   as *inputs*; building payroll before this exists means faking the input data,
   which risks the calculation pipeline being designed around wrong assumptions.
   This phase also introduces the shared `approvals` primitive, reused by every
   later approval workflow (reimbursements, loans) instead of being rebuilt each
   time.

4. **Salary (Phase 4)** — the other required payroll input. Salary structures are
   comparatively simple (mostly CRUD + a component-composition UI) and low-risk,
   a good phase to build before the highest-risk phase (payroll).

5. **Payroll Engine (Phase 5)** — only now do all required inputs (employee,
   attendance, leave, salary) exist for real. This is deliberately the **last**
   module built before payslips/reports, not the first, despite being the product's
   core value — building it earlier would mean building it against incomplete or
   mocked data, which is exactly how payroll bugs get baked in early per Risk #1
   and #11 in [14-risk-register.md](./14-risk-register.md).

6. **Payslips + Reports (Phase 6)** — pure consumers of locked payroll data;
   trivial to get right once Phase 5's data model and state machine are solid, and
   would be impossible to build correctly before it.

7. **Employee Experience (Phase 7)** — by this point every backend module exists;
   this phase is primarily UI/UX plus the remaining reimbursement/loan modules
   (which feed payroll deductions — built here because they're needed for the ESS
   claim flow, and payroll's deduction stage already anticipated them in Phase 5's
   design even though the rows don't exist until now).

8. **Capacitor (Phase 8)** — native packaging is meaningful only once the ESS
   experience it wraps is feature-complete; packaging earlier just means repackaging
   repeatedly.

9. **Hardening (Phase 9)** — a dedicated security/performance/audit pass across the
   *whole* system needs the whole system to exist; partial hardening happens
   continuously (RLS policy per table, tests per rule) but the cross-cutting review
   is last by necessity.

## Anti-patterns This Order Avoids
- Building payroll UI against mocked attendance/salary data (guarantees rework).
- Building native mobile before the web ESS UX is validated (guarantees repackaging
  churn).
- Deferring RLS/security to a "hardening phase" for *tenancy* specifically — tenancy
  and RLS are built into Phase 2, not bolted on in Phase 9; Phase 9 hardens and
  verifies, it does not introduce tenant isolation for the first time.
- Building reporting before there's real payroll data to report on.
