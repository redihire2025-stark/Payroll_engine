# 10. Capacitor Architecture

## 10.1 Approach

The ESS routes (`src/routes/app/**`, plus `auth`) are built as the web app and
packaged into native Android/iOS shells with Capacitor. The Admin web app is not
packaged natively in MVP (Admins use desktop/mobile browser) — Capacitor targets
only the employee/manager experience, matching the product spec.

```
capacitor.config.ts       webDir: 'dist', appId, appName
android/                   Generated native project (checked in, per Capacitor convention)
ios/                       Generated native project (checked in)
```

## 10.2 Native Capability Isolation

All native-capable functionality is accessed through a **service interface** in
`src/shared/native/`, never by calling `@capacitor/*` plugins directly from
components. Each service has a web fallback so the same UI code runs in a browser
during development without a native shell.

```
shared/native/
  cameraService.ts          capture/pick photo (documents, profile picture)
  locationService.ts        get current position (attendance punch geo-tag)
  secureStorageService.ts   Capacitor Preferences+encryption, wraps token storage
  notificationService.ts    push registration + local notification display
  fileService.ts            save/share a downloaded file (payslip PDF)
  deviceService.ts          device id/model info (attendance_devices metadata)
  networkService.ts         connection status (used by the offline queue, 10.4)
```

Example contract:
```ts
export interface LocationService {
  getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null>;
}
// capacitor implementation uses @capacitor/geolocation
// web implementation uses navigator.geolocation, or returns null gracefully
```

Components/services call `locationService.getCurrentPosition()` and handle `null`
(permission denied / unsupported) as a normal case — the UI must never assume native
capability is present.

## 10.3 Authentication/Session on Mobile

- Supabase session tokens stored via `secureStorageService` (Capacitor
  `Preferences` API is not itself encrypted — wrapped with `@capacitor/secure-storage`
  or platform Keychain/Keystore-backed access), never in plain `localStorage` on
  native builds.
- Biometric app-unlock (Face ID/fingerprint) is a Phase 8 nice-to-have, not MVP.

## 10.4 Offline Support (scoped, per product spec — not offline-first)

Limited to: attendance punch queue (per section 27/19 of the spec). If a punch is
made without connectivity, it's queued locally (small local table via
`@capacitor/preferences` or SQLite plugin) with device timestamp + location, synced
when `networkService` reports connectivity restored. **The server is the source of
truth**: on sync, the punch is submitted to `attendance-verify` (Edge Function),
which re-validates against server time and company geofence policy — the queued
client timestamp is informational, not authoritative (per section 19's requirement
to never trust client-side time/location blindly). Nothing else in the app (leave,
payroll, payslips) is built offline-first; those screens simply show cached
read-only data via React Query's cache when offline and disable write actions.

## 10.5 Push Notifications (Phase 8)

`@capacitor/push-notifications` registers device tokens against
`platform_users`/`employees` (new `device_tokens` table, added in Phase 8, not
Phase 0's core schema); the `send-notification` Edge Function fans out to APNs/FCM
in addition to in-app/email. Not built until Phase 8 — MVP notifications are
in-app + email only, per the spec's phasing.

## 10.6 Build/Release Pipeline (Phase 8)

Standard Capacitor flow: `vite build` → `npx cap sync` → open in Android
Studio/Xcode for signing and store submission. No CI automation for store releases
in MVP; this is a manual, deliberate release process given payroll data sensitivity
and app-store review requirements.
