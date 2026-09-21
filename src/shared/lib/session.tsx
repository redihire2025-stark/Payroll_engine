import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'company_owner' | 'company_admin' | 'hr_admin' | 'payroll_admin' | 'finance' | 'manager' | 'employee';

const ADMIN_CONSOLE_ROLES: Role[] = ['company_owner', 'company_admin', 'hr_admin', 'payroll_admin', 'finance'];

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
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

export const demoUser: SessionUser = {
  id: 'u-1001',
  name: 'Ananya Rao',
  email: 'ananya.rao@redihireglobal.com',
  roles: ['payroll_admin', 'hr_admin'],
  companyName: 'Redihire Global Services',
  companyLogoUrl: '/branding/redihire-logo.jpg',
  employeeId: 'EMP-0007',
  isManager: true,
};

const SessionContext = createContext<{ user: SessionUser | null; login: (user?: SessionUser) => void; logout: () => void }>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(demoUser);
  return (
    <SessionContext.Provider value={{ user, login: (u) => setUser(u ?? demoUser), logout: () => setUser(null) }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
