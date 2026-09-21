# 12. Development Phases

Each phase ends with working, verified software (or, for Phase 0, verified
documentation) before the next begins. No phase starts until the previous one is
approved.

## Phase 0 — Product Architecture *(this document set)*
Deliverable: everything in this `docs/architecture/` folder. No app code.

## Phase 1 — Project Foundation
- Vite + React + TypeScript project scaffold
- Tailwind + initial design system (`shared/ui`: Button, Input, Card, Table, Modal,
  Badge, Toast, EmptyState, form primitives)
- Supabase project connection (`shared/lib/supabaseClient.ts`), `.env.example`
- Auth (email/password: login, register-by-invite, forgot/reset password), session
  context, route guards
- Base routing/layout shells for `/auth`, `/admin`, `/app`
- Minimal dashboard shell (structure only — real widgets come with their modules)
- CI: lint, typecheck, test, build on PR

## Phase 2 — Company + Employee Management
- Schema + RLS: `companies`, `company_settings`, `branches`, `departments`,
  `designations`, `locations`, `holidays`
- Schema + RLS: `employees`, `employee_profiles`, `employee_contacts`,
  `employee_bank_accounts`, `employee_tax_profiles`, `employee_statutory_profiles`,
  `employee_documents`, `employment_history`
- `company` and `employee` modules (service + UI): directory, add/edit employee,
  employee detail tabs, document upload (Storage)
- `user_company_roles`, role assignment UI (Settings → Users & Roles)

## Phase 3 — Attendance + Leave
- Schema + RLS: `shifts`, `shift_assignments`, `attendance_records`,
  `attendance_devices`, `attendance_corrections`, `leave_types`, `leave_policies`,
  `leave_balances`, `leave_requests`
- `approvals` shared module (generic workflow primitive) built here, first consumed
  by leave + attendance corrections
- Punch in/out (web first; mobile geo-punch after Capacitor exists in Phase 8, web
  ESS gets a simplified punch button in the meantime)
- Leave application + manager approval inbox

## Phase 4 — Salary
- Schema + RLS: `salary_components`, `salary_structures`,
  `salary_structure_components`, `employee_salary_assignments`
- Salary structure builder UI, employee salary assignment + history

## Phase 5 — Payroll Engine
- Schema + RLS: `payroll_rule_sets`, `payroll_runs`, `payroll_items`,
  `payroll_earnings`, `payroll_deductions`, `payroll_contributions`,
  `payroll_adjustments`, `payroll_calculation_logs`
- Calculation pipeline + statutory rule handlers (EPF, ESI, PT, LWF, TDS) with full
  test suites per [08](./08-payroll-domain.md) §8.5 — **no rule ships without tests**
- `payroll-calculate` and `payroll-lock` Edge Functions
- Payroll run UI: create/draft → review → approve → lock, state-machine-driven

## Phase 6 — Payslips + Reports
- `payslips` schema, `payslip-generate` Edge Function (PDF)
- Reports module: payroll summary, attendance, leave, statutory, department payroll,
  variance
- Export (CSV/PDF) respecting the same RLS/permission scoping as the UI

## Phase 7 — Employee Experience
- Full ESS: Home, Attendance, Leave, Payslips, Profile
- Manager "Team" surface (approvals inbox, team read views)
- `reimbursements`, `loans`, `advances` schema + module (claims/approval, loan EMI
  feeding into payroll deductions)

## Phase 8 — Capacitor
- `android/`, `ios/` projects, native service layer wiring (camera, location,
  secure storage, notifications), push notifications, geo-punch on mobile

## Phase 9 — Hardening
- Full RLS/tenant-isolation security test pass
- Performance review (indexes, N+1 checks, pagination on all list views)
- Payroll calculation audit (re-verify rule handlers against known-good manual
  calculations)
- UX/accessibility review
- Mobile device testing (Android/iOS, range of screen sizes)

## What Changes Between Phases
Documentation in this folder is amended, not replaced, as each phase adds detail
(e.g., [05-database-erd.md](./05-database-erd.md) gains real column-level DDL
references as each phase's migration lands). Architectural *decisions* recorded
here (modular monolith, RLS-first security, configurable rule engine, no Redis/
microservices at MVP) do not change without an explicit discussion and an update to
this document.
