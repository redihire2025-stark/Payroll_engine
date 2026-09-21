# 13. MVP Scope

The MVP is "Phases 1–7 complete" (Capacitor packaging and hardening, Phases 8–9,
are the step after MVP is functionally validated on web — an HR team can run real
payroll end-to-end in a browser before native apps are needed).

## In Scope for MVP

**Admin (web)**
- Login (email/password)
- Company setup: profile, branches, departments, designations, holiday calendar,
  attendance/leave/payroll policies
- Employee management: full CRUD, documents, bank/tax/statutory profile
- Salary structures + employee salary assignment
- Attendance: punch (web), corrections, approval
- Leave: types/policies, requests, approvals, holidays
- Payroll: run creation → calculation → review → approval → lock → mark paid,
  full state machine, EPF/ESI/PT/LWF/TDS as configurable rules (company opts in per
  applicability)
- Payslips: generation, distribution, download
- Reports: payroll summary, attendance, leave, statutory
- Audit logs (viewable by permitted roles)
- Reimbursements and loans/advances (claim → approval → payroll deduction)

**Employee (responsive web, mobile-browser-friendly; not yet native)**
- Login, dashboard
- Attendance (web punch), leave (apply/track), payslips (view/download), profile
  (view/edit permitted fields, documents, tax declaration)

**Technical**
- Supabase (Postgres, Auth, Storage, Edge Functions, RLS) fully wired
- React + TypeScript + Tailwind, deployed to Netlify
- GitHub for source control, CI (lint/typecheck/test/build) on every PR
- Full RLS tenant-isolation and role-based policies matching
  [03-roles-matrix](./03-roles-matrix.md)

## Explicitly Out of Scope for MVP (see [12](./12-development-phases.md) Phases 8–9
and the spec's §40 Future Features)
- Native Android/iOS apps (Capacitor) — Phase 8
- Push notifications, biometric app-unlock
- Geofenced mobile punch, offline punch queue
- SSO/MFA/Google/Microsoft login (architecture allows it; not implemented)
- Full & Final Settlement automation, gratuity — designed for in the rule engine,
  implemented once regular payroll is proven
- Multi-country payroll beyond the configurable architecture (India rule handlers
  ship first; other countries add handlers later, not built speculatively)
- Recruitment/ATS, performance management, full accounting, AI features,
  microservices/Kafka/Kubernetes — never assumed needed at this stage

## MVP Exit Criteria
- A company admin can, unaided, onboard a company, add employees, define a salary
  structure, run a full payroll cycle for a real pay period, and produce correct,
  auditable payslips — with every payroll number traceable per
  [08-payroll-domain.md](./08-payroll-domain.md) §8.4.
- Tenant isolation and role permissions verified by automated security tests
  (Phase 9), not just manual spot-checks.
