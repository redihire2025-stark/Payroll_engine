# 2. Module Architecture

Each module is a **bounded context**: its own service files, types, and (later) its
own folder under `src/modules/<name>`. Modules communicate through typed service
function calls, never by reaching into another module's internals or tables directly
from a component.

## Module Map

```
platform/            Super Admin: tenants, plans, platform-wide config
company/             Company profile, branches, departments, designations,
                     locations, work/leave/attendance/payroll policies, holiday calendars
identity/            Auth, platform_users <-> auth.users mapping, roles, permissions
employee/            Employee profile, contacts, bank, tax/statutory profile,
                     documents, employment history
attendance/          Punch in/out, shifts, corrections, approvals, overtime
leave/                Leave types, policies, balances, requests, approvals, holidays
salary/              Salary components, structures, employee salary assignments, history
reimbursement/        Reimbursement types, claims, approvals
loans/                Loans, advances, repayment schedules
payroll/              Payroll runs, calculation engine, items, adjustments, locking
payslip/              Payslip generation (PDF), storage, distribution
tax/                  Tax declarations, tax documents (Form 16 etc., India-specific,
                     pluggable per country)
reports/              Cross-module reporting/read-models
notifications/        In-app + email notifications, templates, delivery log
audit/                 Audit log capture + query
documents/             Generic document storage abstraction (used by employee, company,
                     payslip, tax modules)
approvals/             Generic approval-workflow primitive (used by leave, attendance,
                     reimbursement, loans — avoids duplicating approval state machines)
```

## Module Dependency Rules

- `payroll` depends on `employee`, `salary`, `attendance`, `leave`, `loans`,
  `reimbursement`, `tax`, `company` (read-only, through service functions).
- `payslip` depends on `payroll` only (never recalculates; renders locked data).
- `approvals` is a shared primitive — `leave`, `attendance`, `reimbursement`, `loans`
  register their workflows against it rather than each building bespoke approval logic.
- `documents` is a shared primitive over Supabase Storage — `employee`, `company`,
  `payslip`, `tax` all use it rather than talking to Storage directly.
- No module imports another module's Supabase queries directly; every cross-module
  read goes through that module's public `*Service` functions (see
  [09](./09-web-mobile-architecture.md) for the service-layer contract).
- `platform` and `identity` sit below everything (tenant + auth context is resolved
  once, at session start, and passed down).

## Module → Primary Tables (preview; full detail in [05](./05-database-erd.md))

| Module | Primary tables |
|---|---|
| platform | `platform_users`, `companies`, `subscription_plans` (future) |
| company | `company_settings`, `branches`, `departments`, `designations`, `locations`, `holidays`, `*_policies` |
| identity | `platform_users`, `user_roles`, `role_permissions` |
| employee | `employees`, `employee_profiles`, `employee_contacts`, `employee_bank_accounts`, `employee_tax_profiles`, `employee_statutory_profiles`, `employment_history` |
| attendance | `attendance_records`, `attendance_devices`, `attendance_corrections`, `shifts`, `shift_assignments` |
| leave | `leave_types`, `leave_policies`, `leave_balances`, `leave_requests` |
| salary | `salary_components`, `salary_structures`, `salary_structure_components`, `employee_salary_assignments` |
| reimbursement | `reimbursements`, `reimbursement_items` |
| loans | `loans`, `loan_repayments`, `advances` |
| payroll | `payroll_runs`, `payroll_items`, `payroll_earnings`, `payroll_deductions`, `payroll_contributions`, `payroll_adjustments`, `payroll_calculation_logs`, `payroll_rule_sets` (config) |
| payslip | `payslips` |
| tax | `tax_declarations`, `tax_documents` |
| notifications | `notifications`, `notification_templates` |
| audit | `audit_logs` |
| documents | `employee_documents`, `company_documents` |
| approvals | `approval_requests`, `approval_steps` |
