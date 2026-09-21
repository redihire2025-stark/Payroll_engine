import { Link } from 'react-router-dom';
import { Badge } from '@/shared/ui/Badge';
import { BellIcon, ClockIcon, DownloadIcon, ChevronRightIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { leaveBalances, notifications } from '@/shared/lib/mockData';

export default function EssHome() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] text-text-faint">Good morning</div>
          <div className="text-[19px] font-bold text-text">Arjun Mehta</div>
        </div>
        <div className="relative text-text-muted">
          <BellIcon width={21} height={21} />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-white bg-danger" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-ink p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[12px] text-[#AEB4C2]">
              <ClockIcon width={14} height={14} />
              Not clocked in
            </div>
            <div className="mt-1 font-mono-num text-[22px] font-bold">09:41 AM</div>
          </div>
          <button className="rounded-lg bg-accent px-5 py-3 text-[13px] font-bold text-white">Punch In</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {leaveBalances.map((lt) => (
          <div key={lt.id} className="rounded-xl border border-border bg-surface p-3 text-center">
            <div className="font-mono-num text-[18px] font-bold text-text">{lt.balance}</div>
            <div className="mt-0.5 text-[10.5px] leading-tight text-text-faint">{lt.name}</div>
          </div>
        ))}
      </div>

      <Link to="/app/payslips" className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <div>
          <div className="text-[11.5px] text-text-faint">Latest Payslip · August 2026</div>
          <div className="mt-0.5 font-mono-num text-[17px] font-bold text-text">{formatINR(58240)}</div>
        </div>
        <div className="flex items-center gap-1 text-accent">
          <DownloadIcon width={16} height={16} />
          <span className="text-[12px] font-semibold">View</span>
        </div>
      </Link>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          <span className="text-[13px] font-semibold text-text">Pending on you</span>
          <Badge tone="warning">1</Badge>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-[12.5px] font-medium text-text">Attendance correction</div>
            <div className="text-[11.5px] text-text-faint">Submitted Sep 18, awaiting HR</div>
          </div>
          <ChevronRightIcon width={16} height={16} className="text-text-faint" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border-soft px-4 py-3">
          <span className="text-[13px] font-semibold text-text">Notifications</span>
        </div>
        {notifications.map((n) => (
          <div key={n.id} className="border-b border-border-soft px-4 py-3 last:border-b-0">
            <div className="text-[12.5px] font-medium text-text">{n.title}</div>
            <div className="mt-0.5 text-[11.5px] text-text-faint">{n.body}</div>
            <div className="mt-1 text-[10.5px] text-text-faint">{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
