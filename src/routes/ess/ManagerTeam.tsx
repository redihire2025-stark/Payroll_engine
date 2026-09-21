import { useState } from 'react';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { leaveRequests, attendanceCorrections, employees } from '@/shared/lib/mockData';

const tabs = ['Approvals', 'Directory'] as const;

export default function ManagerTeam() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Approvals');
  const pendingLeave = leaveRequests.filter((l) => l.status === 'pending');
  const pendingCorrections = attendanceCorrections.filter((c) => c.status === 'pending');
  const team = employees.slice(0, 6);

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="text-[19px] font-bold text-text">Team</div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
            {t === 'Approvals' && (
              <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] text-warning">
                {pendingLeave.length + pendingCorrections.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Approvals' && (
        <div className="flex flex-col gap-3">
          {pendingLeave.map((l) => {
            const emp = employees.find((e) => e.id === l.employeeId)!;
            return (
              <div key={l.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar name={emp.name} size={30} />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-text">{emp.name}</div>
                    <div className="text-[11.5px] text-text-faint">{l.leaveType} · {l.startDate}–{l.endDate} ({l.days}d)</div>
                  </div>
                  <Badge tone="info">Leave</Badge>
                </div>
                <p className="mt-2 text-[12px] text-text-muted">{l.reason}</p>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded-lg border border-border py-2 text-[12.5px] font-semibold text-text">Reject</button>
                  <button className="flex-1 rounded-lg bg-accent py-2 text-[12.5px] font-semibold text-white">Approve</button>
                </div>
              </div>
            );
          })}
          {pendingCorrections.map((c) => {
            const emp = employees.find((e) => e.id === c.employeeId)!;
            return (
              <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar name={emp.name} size={30} />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-text">{emp.name}</div>
                    <div className="text-[11.5px] text-text-faint">Attendance correction · {c.date}</div>
                  </div>
                  <Badge tone="warning">Attendance</Badge>
                </div>
                <p className="mt-2 text-[12px] text-text-muted">{c.reason}</p>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded-lg border border-border py-2 text-[12.5px] font-semibold text-text">Reject</button>
                  <button className="flex-1 rounded-lg bg-accent py-2 text-[12.5px] font-semibold text-white">Approve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'Directory' && (
        <div className="flex flex-col gap-2.5">
          {team.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
              <Avatar name={e.name} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">{e.name}</div>
                <div className="truncate text-[11.5px] text-text-faint">{e.designation}</div>
              </div>
              <Badge tone="success">Active</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
