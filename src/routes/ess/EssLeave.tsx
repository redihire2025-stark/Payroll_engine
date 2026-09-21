import { useState } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { leaveBalances, leaveRequests, currentEmployee } from '@/shared/lib/mockData';

const tabs = ['Balance', 'Apply', 'History'] as const;

export default function EssLeave() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Balance');
  const myRequests = leaveRequests.filter((l) => l.employeeId === currentEmployee.id || true).slice(0, 4);

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="text-[19px] font-bold text-text">Leave</div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Balance' && (
        <div className="flex flex-col gap-3">
          {leaveBalances.map((lt) => (
            <div key={lt.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text">{lt.name}</span>
                <span className="font-mono-num text-[13px] text-text-muted">{lt.balance} / {lt.total}</span>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-border-soft">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(lt.balance / lt.total) * 100}%` }} />
              </div>
              <div className="mt-1.5 text-[11px] text-text-faint">{lt.used} used this year</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Apply' && (
        <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-muted">Leave Type</span>
            <select className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]">
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Earned Leave</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-text-muted">Start Date</span>
              <input type="date" defaultValue="2026-09-24" className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-text-muted">End Date</span>
              <input type="date" defaultValue="2026-09-26" className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-text-muted">
            <input type="checkbox" /> Half day
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-muted">Reason</span>
            <textarea rows={3} placeholder="Family function out of town" className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]" />
          </label>
          <button className="rounded-lg bg-accent py-3 text-[13px] font-bold text-white">Submit Request</button>
        </div>
      )}

      {tab === 'History' && (
        <div className="flex flex-col gap-3">
          {myRequests.map((l) => (
            <div key={l.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text">{l.leaveType}</span>
                <Badge tone={l.status === 'approved' ? 'success' : l.status === 'pending' ? 'warning' : 'danger'}>{l.status}</Badge>
              </div>
              <div className="mt-1 text-[12px] text-text-muted">{l.startDate} – {l.endDate} · {l.days} day(s)</div>
              <div className="mt-1 text-[11.5px] text-text-faint">{l.reason}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
