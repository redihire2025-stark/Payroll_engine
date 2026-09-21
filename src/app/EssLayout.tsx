import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '@/shared/lib/session';
import { HomeIcon, ClockIcon, CalendarIcon, FileTextIcon, UsersIcon } from '@/shared/ui/icons';
import { Avatar } from '@/shared/ui/Avatar';

const tabs = [
  { to: '/app', label: 'Home', icon: HomeIcon, end: true },
  { to: '/app/attendance', label: 'Attendance', icon: ClockIcon },
  { to: '/app/leave', label: 'Leave', icon: CalendarIcon },
  { to: '/app/payslips', label: 'Payslips', icon: FileTextIcon },
];

export default function EssLayout() {
  const { user } = useSession();
  const profileTab = { to: '/app/profile', label: 'Profile', icon: () => <Avatar name={user?.name ?? 'U'} size={20} />, end: false };
  const allTabs = [...tabs, profileTab];

  return (
    <div className="flex min-h-screen justify-center bg-[#EDEFF2]">
      <div className="flex w-full max-w-[430px] flex-col bg-bg shadow-2xl">
        <div className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </div>
        <nav className="fixed bottom-0 z-10 flex w-full max-w-[430px] items-stretch border-t border-border bg-white/95 backdrop-blur">
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
