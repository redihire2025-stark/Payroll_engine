# 4. Navigation Architecture

## 4.1 HR/Admin Web Application

Persistent left sidebar (collapsible on tablet, becomes a drawer on mobile web),
top bar with company switcher (for users with access to >1 company — rare, mostly
`platform_super_admin`), search, notifications, profile menu.

```
Dashboard
Company
 ├─ Profile & Settings
 ├─ Branches
 ├─ Departments
 ├─ Designations
 ├─ Locations
 ├─ Holiday Calendar
 └─ Policies (Attendance / Leave / Payroll)
Employees
 ├─ Directory
 ├─ Add Employee
 ├─ Employee Detail (tabs: Profile / Employment / Salary / Documents / Attendance / Leave / History)
 └─ Exits / Offboarding
Attendance
 ├─ Daily/Monthly View
 ├─ Shifts
 ├─ Corrections (approval queue)
 └─ Import
Leave
 ├─ Requests (approval queue)
 ├─ Balances
 ├─ Leave Types & Policies
 └─ Holidays (link to Company > Holiday Calendar)
Salary
 ├─ Salary Components
 ├─ Salary Structures
 └─ Employee Assignments
Payroll
 ├─ Payroll Runs (list, statuses)
 ├─ Run Detail (state machine view, item-level drill-down)
 ├─ Adjustments
 └─ Payslips
Reimbursements & Loans
 ├─ Reimbursement Claims (approval queue)
 └─ Loans & Advances
Reports
 ├─ Payroll Summary / Variance
 ├─ Attendance / Leave
 ├─ Statutory (PF/ESI/PT/TDS)
 └─ Custom Export
Audit Log
Settings
 ├─ Users & Roles
 ├─ Notification Templates
 └─ Integrations (future)
```

Role-based visibility: sidebar items are filtered by the permission matrix
([03](./03-roles-matrix.md)) — a `manager` sees only Dashboard, Employees (team,
read-only), Attendance (team approvals), Leave (team approvals), Reports (team). A
`finance` user sees Dashboard, Payroll (read + payment approval), Reimbursements &
Loans (approval), Reports.

## 4.2 Employee Mobile/Web Application (ESS)

Bottom tab bar (mobile) / top nav (desktop web), 5 primary destinations per spec:

```
Home        Attendance        Leave        Payslips        Profile
```

- **Home**: greeting, punch in/out card, today's status, leave balance summary,
  latest payslip card, pending approvals-on-me, notifications feed.
- **Attendance**: calendar/list view of own attendance, punch history, request
  correction.
- **Leave**: balance by type, apply for leave, request history/status.
- **Payslips**: list by month/year, view/download PDF.
- **Profile**: personal info (editable subset), bank details, documents, tax
  declarations, emergency contacts, "More" section (settings, help, logout) — this
  is where less-frequent items live rather than cluttering the tab bar.

## 4.3 Manager Experience

Managers use the **same ESS app** with an additional entry point rather than a
separate app:

- A "Team" tab/section appears (replacing or alongside "Profile → More") when the
  logged-in user has direct or indirect reports.
- Team → Approvals (leave, attendance corrections, reimbursements, loans — unified
  approval inbox backed by the `approvals` module), Team → Directory (read-only),
  Team → Attendance overview.

This avoids building a fourth application: role determines which extra navigation
nodes render, both on web and in the Capacitor-packaged mobile app.

## 4.4 Routing Conventions (web)

```
/admin/...        Admin web app (protected: any company-scoped role)
/app/...          Employee/manager experience (protected: authenticated)
/auth/...         Login, register (invite-only), forgot/reset password
/platform/...     Super Admin console (protected: platform_super_admin)
```

A single Vite/React app hosts all of the above; route guards resolve the user's
roles at session start and redirect to the appropriate landing route
(`/admin` vs `/app`) after login, with `/admin` also reachable from `/app` for users
holding both an admin role and being an employee themselves (the common case).
