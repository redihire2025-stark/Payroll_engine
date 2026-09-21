# 11. Repository / Folder Structure

This is the structure Phase 1 will create. Documented now so every later phase adds
to a known shape rather than improvising.

```
Payroll_engine/
  docs/
    architecture/            this documentation set (Phase 0, kept up to date)
  supabase/
    migrations/               timestamped SQL migrations (Supabase CLI)
    functions/                 Edge Functions (payroll-calculate, payroll-lock, ...)
    seed.sql                   local dev seed data (fake, never real tenant data)
  src/
    app/                        router, providers, layout shells (App.tsx, providers.tsx)
    routes/
      auth/
      admin/
      app/                      employee/manager (ESS)
      platform/
    modules/
      identity/
      company/
      employee/
      attendance/
      leave/
      salary/
      reimbursement/
      loans/
      payroll/
        engine/                 pure calculation pipeline (08-payroll-domain.md)
        rules/                  statutory rule handlers (epf.ts, esi.ts, tds.ts, ...)
      payslip/
      tax/
      reports/
      notifications/
      audit/
      documents/
      approvals/
      # each module: types.ts, <name>Service.ts, <name>Service.schemas.ts,
      #              components/, hooks/, __tests__/
    shared/
      ui/                       design system components
      lib/                      supabase client, formatters, constants
      native/                   Capacitor service abstractions (10-capacitor-architecture.md)
      config/                    env/config loading
    test/
      setup.ts                   test environment setup (vitest)
  capacitor.config.ts
  android/                       (added Phase 8)
  ios/                            (added Phase 8)
  public/
  index.html
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json
  .env.example                     documents required env vars, never real values
  netlify.toml
  .github/
    workflows/                     CI: lint, typecheck, test, build
```

Conventions:
- A module's `*Service.ts` is the **only** file allowed to import `shared/lib/supabaseClient`
  directly for that module's tables.
- Tests live next to the code they test (`__tests__/` per module), not in a
  separate top-level `tests/` tree — keeps payroll rule tests visible beside the
  rule handler they cover.
- `docs/architecture/` is updated in the same PR whenever a phase changes something
  documented here (new table, new role, new module) — it is not a one-time Phase 0
  artifact.
