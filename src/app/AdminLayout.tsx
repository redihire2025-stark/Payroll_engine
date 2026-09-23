import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/shared/lib/session';
import { Avatar } from '@/shared/ui/Avatar';
import { OrgLogo } from '@/shared/ui/OrgLogo';
import {
  GridIcon,
  BuildingIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  WalletIcon,
  BanknoteIcon,
  ReceiptIcon,
  FileTextIcon,
  BoxIcon,
  BarChartIcon,
  ShieldIcon,
  GearIcon,
  SearchIcon,
  BellIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  TargetIcon,
  BriefcaseIcon,
  MenuIcon,
  XIcon,
} from '@/shared/ui/icons';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: GridIcon, end: true },
  { to: '/admin/company', label: 'Company', icon: BuildingIcon },
  { to: '/admin/employees', label: 'Employees', icon: UsersIcon },
  { to: '/admin/attendance', label: 'Attendance', icon: ClockIcon },
  { to: '/admin/leave', label: 'Leave', icon: CalendarIcon },
  { to: '/admin/salary', label: 'Salary', icon: WalletIcon },
  { to: '/admin/payroll', label: 'Payroll', icon: BanknoteIcon },
  { to: '/admin/reimbursements', label: 'Reimbursements & Loans', icon: ReceiptIcon },
  { to: '/admin/letters', label: 'Letters', icon: FileTextIcon },
  { to: '/admin/tax-declarations', label: 'Tax Declarations', icon: ShieldIcon },
  { to: '/admin/assets', label: 'Assets', icon: BoxIcon },
  { to: '/admin/helpdesk', label: 'Helpdesk', icon: HelpCircleIcon },
  { to: '/admin/performance', label: 'Performance', icon: TargetIcon },
  { to: '/admin/recruitment', label: 'Recruitment', icon: BriefcaseIcon },
  { to: '/admin/reports', label: 'Reports', icon: BarChartIcon },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ShieldIcon },
  { to: '/admin/settings', label: 'Settings', icon: GearIcon },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useSession();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/auth/login');
  }

  return (
    <div className="flex h-full flex-col justify-between px-3 py-6">
      <div className="flex flex-col gap-7">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="M14 3v6h6" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-text">Payroll OS</span>
        </div>
        <nav className="flex flex-col gap-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                  isActive ? 'bg-accent-soft text-accent font-semibold' : 'text-text-muted hover:bg-bg hover:text-text'
                }`
              }
            >
              <Icon width={17} height={17} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <button onClick={handleLogout} className="flex items-center gap-2.5 rounded-lg border-t border-border px-2 pt-3 text-left hover:bg-bg">
        <Avatar name={user?.name ?? 'Guest'} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-text">{user?.name}</div>
          <div className="text-[11.5px] text-text-faint">Payroll Admin · Sign out</div>
        </div>
      </button>
    </div>
  );
}

/** Falls back to "Admin Console" for the root dashboard; otherwise the active nav item's label, so the mobile header has something meaningful instead of a static title on every page. */
function useActivePageTitle(): string {
  const location = useLocation();
  const match = [...nav].reverse().find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  return match?.label ?? 'Admin Console';
}

export default function AdminLayout() {
  const { user } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pageTitle = useActivePageTitle();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:block">
        <SidebarContent />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative flex w-72 max-w-[80vw] flex-col bg-surface shadow-2xl">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-text-faint hover:bg-bg"
              aria-label="Close menu"
            >
              <XIcon width={18} height={18} />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:h-16 md:px-7">
          <div className="flex items-center gap-3 md:block">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-bg md:hidden"
              aria-label="Open menu"
            >
              <MenuIcon width={20} height={20} />
            </button>
            <div>
              <div className="text-[15px] font-bold leading-tight text-text md:text-[18px]">
                <span className="md:hidden">{pageTitle}</span>
                <span className="hidden md:inline">Admin Console</span>
              </div>
              <div className="hidden text-[12px] text-text-faint md:block">{user?.companyName}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden w-56 items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 lg:flex">
              <SearchIcon width={15} height={15} className="text-text-faint" />
              <span className="text-[12.5px] text-text-faint">Search employees, runs…</span>
            </div>
            <div className="relative text-text-muted">
              <BellIcon width={19} height={19} />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-white bg-danger" />
            </div>
            <div className="hidden h-6 w-px bg-border md:block" />
            <div className="hidden items-center gap-2 text-[12.5px] font-medium text-text-muted md:flex">
              <OrgLogo name={user?.companyName ?? ''} url={user?.companyLogoUrl} size={22} />
              {user?.companyName}
              <ChevronDownIcon width={13} height={13} className="text-text-faint" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 md:px-8 md:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
