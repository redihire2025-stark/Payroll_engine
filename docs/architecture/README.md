# Payroll & HRMS SaaS — Architecture (Phase 0)

Status: **Phase 0 — Architecture & Design. No application code has been written yet.**

This folder is the single source of truth for how the product is built. Every later
phase must stay consistent with these documents unless a change is explicitly discussed
and this documentation is updated alongside the code.

## Document Index

| # | Document | Covers |
|---|----------|--------|
| 1 | This README | Product vision, architecture style, executive summary |
| 2 | [02-modules.md](./02-modules.md) | Module/bounded-context map |
| 3 | [03-roles-matrix.md](./03-roles-matrix.md) | User roles & permission matrix |
| 4 | [04-navigation.md](./04-navigation.md) | Navigation architecture (web + mobile) |
| 5 | [05-database-erd.md](./05-database-erd.md) | Database entity model / ERD |
| 6 | [06-supabase-architecture.md](./06-supabase-architecture.md) | Supabase (Auth/DB/Storage/Edge Functions) architecture |
| 7 | [07-security-rls.md](./07-security-rls.md) | RLS & security architecture |
| 8 | [08-payroll-domain.md](./08-payroll-domain.md) | Payroll domain/engine architecture |
| 9 | [09-web-mobile-architecture.md](./09-web-mobile-architecture.md) | Web/mobile application architecture |
| 10 | [10-capacitor-architecture.md](./10-capacitor-architecture.md) | Capacitor (Android/iOS) architecture |
| 11 | [11-folder-structure.md](./11-folder-structure.md) | Repository/folder structure |
| 12 | [12-development-phases.md](./12-development-phases.md) | Development phases (0–9) |
| 13 | [13-mvp-scope.md](./13-mvp-scope.md) | MVP scope definition |
| 14 | [14-risk-register.md](./14-risk-register.md) | Risk register |
| 15 | [15-implementation-order.md](./15-implementation-order.md) | Recommended implementation order |
| 16 | [16-self-service-onboarding.md](./16-self-service-onboarding.md) | Self-service company registration, tenant branding, seat-based licensing |
| 17 | [17-supabase-resend-setup.md](./17-supabase-resend-setup.md) | Backend confirmed as Supabase (not Neon); email OTP login + Resend setup |

## Product Vision (Summary)

A cloud-based, multi-tenant Payroll + HRMS platform, India-first but built so
country-specific statutory rules are **configuration**, not hard-coded logic. One
codebase serves three experiences — HR/Admin web app, Employee/Manager mobile app,
and the Manager approval surface — sharing a single React + TypeScript core, packaged
for native mobile via Capacitor.

## Architecture Style

**Modular monolith on Supabase**, not microservices.

```
┌─────────────────────────────────────────────────────────────┐
│                    React + TypeScript (Vite)                 │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────────┐ │
│  │  Admin Web App │ │ Employee/Mgr   │ │  Shared Design     │ │
│  │  (routes/admin)│ │ App (routes/ess)│ │  System + Core Lib │ │
│  └───────┬───────┘ └────────┬───────┘ └──────────┬─────────┘ │
│          └──────────────────┴────────────────────┘           │
│                     Service/Domain Layer                      │
│    employeeService · attendanceService · leaveService         │
│    salaryService · payrollService (payroll engine) · ...      │
└───────────────────────────┬────────────────────────────────┘
                             │ supabase-js (typed client)
┌───────────────────────────▼────────────────────────────────┐
│                          Supabase                             │
│  Postgres (RLS) · Auth · Storage (private buckets) · Edge Fns │
└───────────────────────────────────────────────────────────────┘
                             │ Capacitor bridge (native shell only)
              ┌──────────────┴──────────────┐
              │      Android / iOS apps      │
              └──────────────────────────────┘
```

Guiding principles (non-negotiable for Phase 0–6):

- **No separate backend server.** Business logic lives in a TypeScript domain/service
  layer inside the frontend repo, calling Supabase directly (via `supabase-js`) or via
  Edge Functions for logic that must run with elevated/service-role privileges
  (e.g., payroll locking, cross-tenant admin actions).
- **No Redis, no queues, no Kubernetes, no microservices** until real scale data
  justifies it. The service layer is written so these can be introduced later without
  a rewrite (see [06](./06-supabase-architecture.md) "Future extraction points").
- **Tenant isolation is enforced at the database (RLS), not just the UI.**
- **Payroll rules are data, not code.** Statutory logic (PF/ESI/TDS/PT/LWF/etc.) is
  expressed as versioned, effective-dated rule configuration consumed by a generic
  calculation pipeline — see [08](./08-payroll-domain.md).

## What Phase 0 Delivers

Architecture, schema design, security model, and roadmap only. **No React project,
no Supabase project, no npm packages have been created in this repository yet.**
Phase 1 (project foundation) begins only after this documentation is reviewed and
approved.
