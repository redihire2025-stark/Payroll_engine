# 9. Web / Mobile Application Architecture

## 9.1 Single Codebase, Multiple Shells

One React + TypeScript + Vite application. Capacitor wraps the *built web output*
for Android/iOS — there is no separate mobile codebase to keep in sync (detailed in
[10-capacitor-architecture](./10-capacitor-architecture.md)).

```
src/
  app/            App shell: router, providers, layout switch (admin vs ESS)
  modules/        One folder per bounded context (see 02-modules.md), each with:
                    types.ts          domain types (mirrors DB shape + view models)
                    <name>Service.ts  all Supabase calls + business logic for this module
                    components/       module-specific UI
                    hooks/            module-specific React Query hooks
  shared/
    ui/           Design-system components (Button, Input, Table, Modal, ...)
    lib/          supabase client, zod helpers, date/currency utils
    native/       Capacitor service abstractions (see 10)
  routes/
    admin/        HR/Admin web screens
    app/          Employee/Manager (ESS) screens
    auth/
    platform/
```

## 9.2 Service Layer Contract

Every module exposes a single service object; **components never call
`supabase.from(...)` directly** — always through a service function. This is what
keeps business logic out of components (per your coding rules) and is what allows
extracting a module to a separate backend later without touching UI code.

```ts
// modules/leave/leaveService.ts
export const leaveService = {
  listMyRequests(employeeId: string): Promise<LeaveRequest[]> { ... },
  requestLeave(input: RequestLeaveInput): Promise<LeaveRequest> { ... },   // zod-validated
  approve(requestId: string, actorId: string): Promise<void> { ... },
  getBalances(employeeId: string, year: number): Promise<LeaveBalance[]> { ... },
};
```

React components/hooks call `leaveService.*`; React Query (or equivalent) wraps
these for caching/loading/error state. Zod schemas for input validation live beside
each service (`leaveService.schemas.ts`), shared between form validation and the
service call so validation never drifts between UI and logic.

## 9.3 State/Data Layer

- **Server state**: TanStack Query (React Query) — caching, refetch, optimistic
  updates for approvals, pagination.
- **Client/UI state**: local component state + a light global store (Zustand) only
  for cross-cutting concerns (current company context, current user/roles, theme).
  No heavyweight global state library — most state is server state.
- **Auth/session context**: resolved once at app load (Supabase session +
  `user_company_roles` + derived permissions), provided via a context, read by route
  guards and the sidebar/nav filtering in [04](./04-navigation.md).

## 9.4 Rendering Strategy

- **Vite + React Router**, client-rendered SPA. (Next.js is not needed — this is an
  authenticated internal application, not a public content site; SSR would add
  operational complexity — a Supabase auth session, RLS-scoped data — without SEO
  benefit here. Marketing/landing page, if built, can be a separate lightweight
  static site later.)
- **PWA**: `vite-plugin-pwa` for the ESS experience specifically (installable,
  works reasonably offline for read-heavy screens like payslips/leave balance) —
  the Admin web app does not need PWA/offline behavior.

## 9.5 Design System

Tailwind CSS + a small internal component library in `shared/ui`, tokens defined
once (`tailwind.config.ts`): color palette (with dedicated status colors — success/
warning/danger/info — used consistently for payroll/attendance/leave status badges),
type scale, spacing scale, radius, shadow scale. Every screen composes from this
library — tables, cards, modals, form fields, empty/loading/error states — rather
than one-off styling per page, per your "avoid template/generic appearance, avoid
duplicated UI code" requirement. This library is built early in Phase 1 before
volume screens are built in Phase 2+.

## 9.6 Responsive Strategy

Mobile-first Tailwind breakpoints. The Admin web app targets desktop/tablet primarily
but must remain usable on mobile web (many HR/managers will approve leave from a
phone browser before the native app exists). The ESS routes are designed mobile-first
since that's the Capacitor target, and gracefully scale up to desktop web.
