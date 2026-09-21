# 3. User Role Matrix

## Roles

| Role | Scope | Typical user |
|---|---|---|
| `platform_super_admin` | Cross-tenant | Us (platform operators) |
| `company_owner` | Single company | Business owner/founder |
| `company_admin` | Single company | Admin/operations lead |
| `hr_admin` | Single company | HR team |
| `payroll_admin` | Single company | Payroll processor |
| `finance` | Single company | Finance/accounts |
| `manager` | Own team (subset of company) | Reporting manager |
| `employee` | Self only | Every employee, including the above (a manager is also an employee record) |

A `platform_users` row can hold **at most one platform-level role** (`platform_super_admin`)
and, separately, **one or more company-scoped roles** via a `user_company_roles`
join table (`user_id, company_id, role`), since a person can be `company_admin` at
Company A and `manager` at Company B is out of scope for MVP, but a person can hold
multiple roles at the *same* company (e.g., `hr_admin` + `payroll_admin`).

## Permission Matrix

Legend: **C**reate, **R**ead, **U**pdate, **D**elete/Cancel, **A**pprove. Blank = no access.
"Own" = restricted to the user's own employee record. "Team" = restricted to direct/indirect reports.

| Module / Action | Super Admin | Owner | Company Admin | HR Admin | Payroll Admin | Finance | Manager | Employee |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Platform/tenant config | CRUD | | | | | | | |
| Company profile & policies | R | CRUD | CRUD | RU | R | R | | |
| Branches/Departments/Designations | R | CRUD | CRUD | CRUD | R | R | R | R |
| Employees (create/edit) | R | CRUD | CRUD | CRUD | R | R | R (Team, R only) | RU (Own, limited fields) |
| Employee documents | R | R | CRUD | CRUD | R | R | R (Team) | CR (Own) |
| Salary structures/components | R | CRUD | CRUD | RU | CRUD | R | | |
| Employee salary assignment | R | R | CRUD | RU | CRUD | R | | R (Own) |
| Attendance records | R | R | RU | RU | R | R | RU (Team, correction approval) | CRU (Own: punch, correction request) |
| Attendance policy/shifts | R | CRUD | CRUD | CRUD | R | R | R | R |
| Leave types/policies | R | CRUD | CRUD | CRUD | R | R | R | R |
| Leave requests | R | R | R | RU (on behalf) | R | R | A (Team) | CRU (Own, before approval) |
| Holidays | R | CRUD | CRUD | CRUD | R | R | R | R |
| Reimbursements | R | R | R | RU | A (payment) | A (payment) | A (Team) | CR (Own) |
| Loans/Advances | R | R | CRUD (policy) | R | CRUD | A (disbursement) | A (Team, request) | CR (Own, request) |
| Payroll run — create/calculate | R | R | | | CRUD | R | | |
| Payroll run — review/approve | R | A | A | A | R | A | | |
| Payroll run — lock | R | | | | A (with 2nd approval) | | | |
| Payslips | R (support) | R | R | R | CRUD | R | R (Team, view only) | R (Own) |
| Tax declarations/documents | R | R | R | RU | RU | R | | CRU (Own) |
| Reports | R (platform) | R | R | R | R | R | R (Team) | R (Own, limited: payslip history) |
| Audit logs | R (platform) | R | R | R (own actions + HR scope) | R (payroll scope) | R (finance scope) | | |
| Notifications | send (platform) | R | CRUD (announcements) | CRUD | CRUD (payroll) | R | R | R |
| User/role management | CRUD | CRUD (within company) | CRUD (within company, ≤ own level) | | | | | |

Notes:
- **Segregation of duties in payroll**: the user who runs the calculation
  (`payroll_admin`) should not be the sole approver. The state machine
  ([08](./08-payroll-domain.md)) requires at least one `hr_admin` or `company_admin`
  approval before `LOCKED`, configurable per company (maker-checker).
- `finance` is read-mostly plus payment-related approvals (reimbursement/loan
  disbursement, marking payroll as `PAID`), not payroll calculation.
- This matrix is the specification for the RLS policies in
  [07-security-rls.md](./07-security-rls.md) — every row here must map to an enforced
  database policy, not just a UI guard.
