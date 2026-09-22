import { Navigate } from 'react-router-dom';
import { useSession, landingRouteFor } from '@/shared/lib/session';
import { FullScreenSpinner } from '@/shared/ui/FullScreenSpinner';

/**
 * The root route. A signed-out visitor lands on sign-in, not a dashboard
 * that doesn't belong to them yet — they either sign in or create an
 * organization from there. A signed-in visitor is sent straight to their
 * console (admin or employee) so "/" never shows stale/wrong-role content.
 */
export default function Landing() {
  const { user, loading } = useSession();
  if (loading) return <FullScreenSpinner />;
  return <Navigate to={user ? landingRouteFor(user) : '/auth/login'} replace />;
}
