import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { SearchInput, Select } from '@/shared/ui/Input';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { PlusIcon, UsersIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listEmployees } from '@/modules/employee/employeeService';
import { getCompany } from '@/modules/company/companyService';
import { AddEmployeeModal } from './employees/AddEmployeeModal';
import { ImportEmployeesModal } from './employees/ImportEmployeesModal';

const statusTone = { active: 'success', on_leave: 'warning', exited: 'neutral' } as const;
const statusLabel = { active: 'Active', on_leave: 'On Leave', exited: 'Exited' } as const;

const cols = '2.2fr 1.3fr 1.3fr 1fr 0.9fr 1fr';

type StatusFilter = 'all' | 'active' | 'on_leave' | 'exited';

export default function Employees() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const [modal, setModal] = useState<'add' | 'import' | null>(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const employeesQuery = useQuery({ queryKey: ['employees', companyId], queryFn: () => listEmployees(companyId) });
  const companyQuery = useQuery({ queryKey: ['company', companyId], queryFn: () => getCompany(companyId) });

  const employees = employeesQuery.data ?? [];
  const company = companyQuery.data;

  const departments = [...new Set(employees.map((e) => e.department).filter((d): d is string => Boolean(d)))].sort();
  const branches = [...new Set(employees.map((e) => e.branch).filter((b): b is string => Boolean(b)))].sort();

  const searchLower = search.trim().toLowerCase();
  const filtered = employees.filter((e) => {
    if (searchLower && !e.name.toLowerCase().includes(searchLower) && !e.code.toLowerCase().includes(searchLower)) return false;
    if (departmentFilter !== 'all' && e.department !== departmentFilter) return false;
    if (branchFilter !== 'all' && e.branch !== branchFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });
  const filtersActive = Boolean(searchLower) || departmentFilter !== 'all' || branchFilter !== 'all' || statusFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setDepartmentFilter('all');
    setBranchFilter('all');
    setStatusFilter('all');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-text">Employees</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">
            {filtersActive ? `${filtered.length} of ${employees.length} employees` : `${employees.length} employee${employees.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {company && (
            <div className="text-right">
              <div className="text-[12px] font-semibold text-text">{company.seatsUsed} / {company.employeeSeatLimit} seats used</div>
              <div className="mt-1 h-1.5 w-32 rounded-full bg-border-soft">
                <div
                  className="h-1.5 rounded-full bg-accent"
                  style={{ width: `${company.employeeSeatLimit > 0 ? Math.round((company.seatsUsed / company.employeeSeatLimit) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}
          <Button variant="secondary" onClick={() => setModal('import')}>Import from Excel</Button>
          <Button variant="primary" icon={<PlusIcon width={15} height={15} />} onClick={() => setModal('add')}>Add Employee</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search by name or employee code…" value={search} onChange={setSearch} />
        <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="exited">Exited</option>
        </Select>
        {filtersActive && (
          <button onClick={clearFilters} className="text-[12.5px] font-semibold text-accent hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {employeesQuery.error && <ErrorState message={(employeesQuery.error as Error).message} />}

      {employeesQuery.isLoading ? (
        <div className="rounded-xl border border-border bg-surface shadow-card">
          <LoadingRows />
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<UsersIcon width={22} height={22} />}
          title="No employees yet"
          description="Add your first employee to start building out attendance, leave and payroll for this organization."
          action={<Button variant="primary" icon={<PlusIcon width={15} height={15} />} onClick={() => setModal('add')}>Add Employee</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UsersIcon width={22} height={22} />}
          title="No employees match these filters"
          description="Try a different search term or clear the filters."
          action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
          <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 780 }} className="gap-3 border-b border-border px-5 py-2.5">
            {['Employee', 'Department', 'Designation', 'Branch', 'Status', 'Date of Joining'].map((h) => (
              <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
            ))}
          </div>
          {filtered.map((e) => (
            <Link
              to={`/admin/employees/${e.id}`}
              key={e.id}
              style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 780 }}
              className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0 hover:bg-bg/70"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={e.name} size={32} />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-text">{e.name}</div>
                  <div className="font-mono-num text-[11.5px] text-text-faint">{e.code}</div>
                </div>
              </div>
              <div className="truncate text-text-muted">{e.department ?? '—'}</div>
              <div className="truncate text-text-muted">{e.designation ?? '—'}</div>
              <div className="truncate text-text-muted">{e.branch ?? '—'}</div>
              <div><Badge tone={statusTone[e.status]}>{statusLabel[e.status]}</Badge></div>
              <div className="font-mono-num text-text-muted">{e.doj}</div>
            </Link>
          ))}
        </div>
      )}

      {modal === 'add' && <AddEmployeeModal companyId={companyId} onClose={() => setModal(null)} />}
      {modal === 'import' && <ImportEmployeesModal companyId={companyId} onClose={() => setModal(null)} />}
    </div>
  );
}
