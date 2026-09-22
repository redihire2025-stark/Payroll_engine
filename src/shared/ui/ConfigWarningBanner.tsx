import { isSupabaseConfigured } from '@/shared/lib/supabaseClient';

/**
 * Surfaces a missing/misconfigured VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY
 * on the page itself instead of only as a cryptic ERR_NAME_NOT_RESOLVED in
 * DevTools the moment a network call is first made (e.g. sending an OTP).
 * Vite bakes these env vars in at build time — this can only go stale by
 * deploying without them set, or without redeploying after setting them.
 */
export function ConfigWarningBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-danger px-4 py-2 text-center text-[12.5px] font-semibold text-white">
      Configuration error: this deployment is missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
      Set them in your hosting provider's environment variables and redeploy — see DEPLOYMENT.md.
    </div>
  );
}
