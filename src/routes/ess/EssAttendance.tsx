import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/ui/icons';
import { myAttendanceMonth } from '@/shared/lib/mockData';

const statusColor: Record<string, string> = {
  present: 'bg-success', late: 'bg-warning', on_leave: 'bg-info', weekend: 'bg-border', holiday: 'bg-border', absent: 'bg-danger',
};
const statusLabel: Record<string, string> = {
  present: 'Present', late: 'Late', on_leave: 'On Leave', weekend: 'Weekend', holiday: 'Holiday', absent: 'Absent',
};

export default function EssAttendance() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="text-[19px] font-bold text-text">Attendance</div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
        <ChevronLeftIcon width={16} height={16} className="text-text-faint" />
        <span className="text-[13px] font-semibold text-text">September 2026</span>
        <ChevronRightIcon width={16} height={16} className="text-text-faint" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <div className="font-mono-num text-[17px] font-bold text-success">18</div>
          <div className="text-[10.5px] text-text-faint">Present</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <div className="font-mono-num text-[17px] font-bold text-warning">2</div>
          <div className="text-[10.5px] text-text-faint">Late</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <div className="font-mono-num text-[17px] font-bold text-danger">1</div>
          <div className="text-[10.5px] text-text-faint">Absent</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {myAttendanceMonth.map((d) => (
          <div key={d.date} className="flex items-center justify-between border-b border-border-soft px-4 py-3 last:border-b-0">
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${statusColor[d.status]}`} />
              <div>
                <div className="text-[12.5px] font-medium text-text">{d.date} · {d.weekday}</div>
                <div className="text-[11px] text-text-faint">{statusLabel[d.status]}</div>
              </div>
            </div>
            <div className="text-right font-mono-num text-[11.5px] text-text-muted">
              {d.checkIn ? `${d.checkIn} – ${d.checkOut}` : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
