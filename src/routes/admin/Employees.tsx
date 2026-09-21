import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { SearchInput, Select } from '@/shared/ui/Input';
import { Avatar } from '@/shared/ui/Avatar';
import { PlusIcon } from '@/shared/ui/icons';
import { employees, company } from '@/shared/lib/mockData';

const statusTone = { active: 'success', on_leave: 'warning', exited: 'neutral' } as const;
const statusLabel = { active: 'Active', on_leave: 'On Leave', exited: 'Exited' } as const;

const cols = '2.2fr 1.3fr 1.3fr 1fr 0.9fr 1fr 0.4fr';

export default function Employees() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Employees</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">142 employees across 3 branches</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[12px] font-semibold text-text">{company.seatsUsed} / {company.employeeSeatLimit} seats used</div>
            <div className="mt-1 h-1.5 w-32 rounded-full bg-border-soft">
              <div
                className="h-1.5 rounded-full bg-accent"
                style={{ width: `${Math.round((company.seatsUsed / company.employeeSeatLimit) * 100)}%` }}
              />
            </div>
          </div>
          <Button variant="primary" icon={<PlusIcon width={15} height={15} />}>Add Employee</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput placeholder="Search by name or employee code…" />
        <Select defaultValue="all"><option value="all">All Departments</option><option>Engineering</option><option>Sales</option><option>Finance</option></Select>
        <Select defaultValue="all"><option value="all">All Branches</option><option>Bengaluru HQ</option><option>Mumbai Office</option><option>Pune Office</option></Select>
        <Select defaultValue="active"><option value="all">All Status</option><option value="active">Active</option><option value="on_leave">On Leave</option><option value="exited">Exited</option></Select>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-card">
        <div style={{ display: 'grid', gridTemplateColumns: cols }} className="gap-3 border-b border-border px-5 py-2.5">
          {['Employee', 'Department', 'Designation', 'Branch', 'Status', 'Date of Joining', ''].map((h) => (
            <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
          ))}
        </div>
        {employees.slice(0, 9).map((e) => (
          <Link
            to={`/admin/employees/${e.id}`}
            key={e.id}
            style={{ display: 'grid', gridTemplateColumns: cols }}
            className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0 hover:bg-bg/70"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={e.name} size={32} />
              <div className="min-w-0">
                <div className="truncate font-semibold text-text">{e.name}</div>
                <div className="font-mono-num text-[11.5px] text-text-faint">{e.code}</div>
              </div>
            </div>
            <div className="truncate text-text-muted">{e.department}</div>
            <div className="truncate text-text-muted">{e.designation}</div>
            <div className="truncate text-text-muted">{e.branch}</div>
            <div><Badge tone={statusTone[e.status]}>{statusLabel[e.status]}</Badge></div>
            <div className="font-mono-num text-text-muted">{e.doj}</div>
            <div className="text-right text-text-faint">···</div>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between text-[12.5px] text-text-faint">
        <span>Showing 1–9 of 142</span>
        <div className="flex items-center gap-1">
          <button className="rounded-md border border-border px-2.5 py-1 text-text-muted">Prev</button>
          <button className="rounded-md bg-accent px-2.5 py-1 font-semibold text-white">1</button>
          <button className="rounded-md border border-border px-2.5 py-1 text-text-muted">2</button>
          <button className="rounded-md border border-border px-2.5 py-1 text-text-muted">3</button>
          <button className="rounded-md border border-border px-2.5 py-1 text-text-muted">Next</button>
        </div>
      </div>
    </div>
  );
}
