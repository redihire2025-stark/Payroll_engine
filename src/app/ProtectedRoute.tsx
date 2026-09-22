import { Navigate, Outlet } from 'react-router-dom';
import { useSession, landingRouteFor } from '@/shared/lib/session';
import { FullScreenSpinner } from '@/shared/ui/FullScreenSpinner';

/**
 * Gates a route tree behind a real Supabase session. This is UX, not the
 * security boundary — RLS (supabase/migrations/0004_rls.sql) is what
 * actually protects data; this just avoids flashing admin/employee screens
 * before we know whether anyone is signed in.
 */
export function ProtectedRoute({ requireAdmin }: { requireAdmin?: boolean }) {
  const { user, loading } = useSession();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/auth/login" replace />;

  // /admin requires an admin-ish role. /app requires nothing beyond being
  // signed in — an admin who is also an employee legitimately visits /app
  // (e.g. from a link inside the Admin Console), so admins are never
  // bounced away from it the way a non-admin is bounced away from /admin.
  if (requireAdmin && landingRouteFor(user) !== '/admin') return <Navigate to="/app" replace />;

  return <Outlet />;
}
