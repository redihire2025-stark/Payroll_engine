import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'company_admin' | 'hr_admin' | 'payroll_admin' | 'finance' | 'manager' | 'employee';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  companyName: string;
  employeeId: string;
  isManager: boolean;
}

const demoUser: SessionUser = {
  id: 'u-1001',
  name: 'Ananya Rao',
  email: 'ananya.rao@meridiantextiles.in',
  roles: ['payroll_admin', 'hr_admin'],
  companyName: 'Meridian Textiles Pvt Ltd',
  employeeId: 'EMP-0007',
  isManager: true,
};

const SessionContext = createContext<{ user: SessionUser | null; login: () => void; logout: () => void }>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(demoUser);
  return (
    <SessionContext.Provider value={{ user, login: () => setUser(demoUser), logout: () => setUser(null) }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
