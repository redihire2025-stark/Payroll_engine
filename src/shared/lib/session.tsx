import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { getMyCompanyRoles } from '@/modules/identity/authService';

export type Role =
  | 'company_owner' | 'company_admin' | 'hr_admin' | 'payroll_admin' | 'finance'
  | 'manager' | 'recruiter' | 'performance_admin' | 'employee';

const ADMIN_CONSOLE_ROLES: Role[] = ['company_owner', 'company_admin', 'hr_admin', 'payroll_admin', 'finance', 'recruiter', 'performance_admin'];

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  companyId: string;
  companyName: string;
  companyLogoUrl: string | null;
  employeeId: string;
  isManager: boolean;
}

/**
 * One login, two consoles: a user's role(s) — never the URL they typed —
 * decide whether they land on the Admin Console or the Employee/Manager
 * experience. See docs/architecture/16-self-service-onboarding.md §16.1.
 */
export function landingRouteFor(user: SessionUser): '/admin' | '/app' {
  return user.roles.some((r) => ADMIN_CONSOLE_ROLES.includes(r)) ? '/admin' : '/app';
}

interface SessionContextValue {
  user: SessionUser | null;
  /** True until the initial Supabase session check (and role lookup, if a session exists) has resolved. */
  loading: boolean;
  login: (user: SessionUser) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refresh: async () => {},
});

async function resolveSessionUser(authUserId: string, email: string): Promise<SessionUser | null> {
  const roles = await getMyCompanyRoles();
  if (roles.length === 0) return null;
  const primary = roles[0];
  return {
    id: authUserId,
    name: email.split('@')[0],
    email,
    roles: [primary.role],
    companyId: primary.companyId,
    companyName: primary.companyName,
    companyLogoUrl: primary.companyLogoUrl,
    employeeId: primary.employeeId ?? '',
    isManager: false,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadFromCurrentAuthSession() {
    const { data } = await supabase.auth.getSession();
    const authUser = data.session?.user;
    if (!authUser?.email) {
      setUser(null);
      return;
    }
    try {
      const resolved = await resolveSessionUser(authUser.id, authUser.email);
      setUser(resolved);
    } catch {
      // Real auth session, but the role lookup failed (e.g. schema not
      // migrated yet on the linked project) — never fall back to fake data.
      setUser(null);
    }
  }

  useEffect(() => {
    loadFromCurrentAuthSession().finally(() => setLoading(false));

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadFromCurrentAuthSession();
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value: SessionContextValue = {
    user,
    loading,
    login: (u) => setUser(u),
    logout: async () => {
      await supabase.auth.signOut();
      setUser(null);
    },
    refresh: loadFromCurrentAuthSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
