import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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

export default function AdminLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/auth/login');
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-border bg-surface px-3 py-6">
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                <path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                <path d="M14 3v6h6" />
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-text">Payroll OS</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
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
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-7">
          <div>
            <div className="text-[18px] font-bold leading-tight text-text">Admin Console</div>
            <div className="text-[12px] text-text-faint">{user?.companyName}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex w-56 items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
              <SearchIcon width={15} height={15} className="text-text-faint" />
              <span className="text-[12.5px] text-text-faint">Search employees, runs…</span>
            </div>
            <div className="relative text-text-muted">
              <BellIcon width={19} height={19} />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-white bg-danger" />
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-text-muted">
              <OrgLogo name={user?.companyName ?? ''} url={user?.companyLogoUrl} size={22} />
              {user?.companyName}
              <ChevronDownIcon width={13} height={13} className="text-text-faint" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
