import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '@/shared/lib/session';
import { HomeIcon, ClockIcon, CalendarIcon, FileTextIcon, ReceiptIcon, LogOutIcon } from '@/shared/ui/icons';
import { Avatar } from '@/shared/ui/Avatar';
import { OrgLogo } from '@/shared/ui/OrgLogo';

const tabs = [
  { to: '/app', label: 'Home', icon: HomeIcon, end: true },
  { to: '/app/attendance', label: 'Attendance', icon: ClockIcon },
  { to: '/app/leave', label: 'Leave', icon: CalendarIcon },
  { to: '/app/payslips', label: 'Payslips', icon: FileTextIcon },
  { to: '/app/expenses', label: 'Expenses', icon: ReceiptIcon },
];

/**
 * One route tree, one <Outlet/> — only the surrounding chrome is
 * responsive. Below md (768px) this looks like the original mobile-first
 * phone frame with a bottom tab bar. At md and up, a left sidebar
 * replaces the bottom nav and the content column widens instead of
 * staying pinned to a 430px phone frame — that was the bug (desktop
 * Chrome showed the mobile layout letterboxed in the middle of the
 * page). Two separate <Outlet/> instances toggled by CSS would double
 * every page's data fetches, so instead only the nav chrome (sidebar vs.
 * bottom bar) and the content wrapper's width/padding are conditional.
 */
export default function EssLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const profileTab = { to: '/app/profile', label: 'Profile', icon: () => <Avatar name={user?.name ?? 'U'} size={20} />, end: false };
  const allTabs = [...tabs, profileTab];

  async function handleLogout() {
    await logout();
    navigate('/auth/login');
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#EDEFF2] md:justify-start md:bg-bg">
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-border bg-surface px-3 py-6 md:flex">
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-2.5 px-2">
            <OrgLogo name={user?.companyName ?? ''} url={user?.companyLogoUrl} size={28} />
            <span className="truncate text-[15px] font-bold tracking-tight text-text">{user?.companyName ?? 'Payroll OS'}</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {allTabs.map(({ to, label, icon: Icon, end }) => (
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
            <div className="flex items-center gap-1 text-[11.5px] text-text-faint">
              <LogOutIcon width={11} height={11} /> Sign out
            </div>
          </div>
        </button>
      </aside>

      <div className="flex w-full max-w-[430px] flex-col bg-bg shadow-2xl md:max-w-3xl md:px-8 md:py-8 md:shadow-none">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </div>
        <nav className="fixed bottom-0 z-10 flex w-full max-w-[430px] items-stretch border-t border-border bg-white/95 backdrop-blur md:hidden">
          {allTabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold ${
                  isActive ? 'text-accent' : 'text-text-faint'
                }`
              }
            >
              <Icon width={20} height={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
