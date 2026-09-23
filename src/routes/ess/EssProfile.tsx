import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/shared/ui/Avatar';
import { ChevronRightIcon, FileTextIcon, ShieldIcon, BellIcon, LogOutIcon, AlertIcon, BoxIcon, HelpCircleIcon, TargetIcon } from '@/shared/ui/icons';
import { ErrorState } from '@/shared/ui/EmptyState';
import { useSession } from '@/shared/lib/session';
import { getEmployee } from '@/modules/employee/employeeService';
import { DocumentsPanel } from '@/modules/document/DocumentsPanel';
import { ResignationPanel } from './ResignationPanel';
import { MyAssetsPanel } from './MyAssetsPanel';
import { HelpdeskPanel } from './HelpdeskPanel';
import { PerformancePanel } from './PerformancePanel';
import { LettersPanel } from './LettersPanel';
import { TaxDeclarationPanel } from './TaxDeclarationPanel';

function Section({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border-soft px-4 py-3 text-[13px] font-semibold text-text">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between border-b border-border-soft px-4 py-2.5 text-[12.5px] last:border-b-0">
          <span className="text-text-faint">{r.label}</span>
          <span className="font-medium text-text">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

interface MenuTile {
  icon: (p: { width: number; height: number }) => JSX.Element;
  label: string;
  onClick?: () => void;
  chip: string;
}

function MenuGrid({ items }: { items: MenuTile[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ icon: Icon, label, onClick, chip }) => (
        <button
          key={label}
          onClick={onClick}
          disabled={!onClick}
          className="flex flex-col items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/30 disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-surface"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${chip}`}>
            <Icon width={18} height={18} />
          </div>
          <div className="flex w-full items-center justify-between">
            <span className="text-[13px] font-semibold text-text">{label}</span>
            <ChevronRightIcon width={14} height={14} className="text-text-faint" />
          </div>
        </button>
      ))}
    </div>
  );
}

export default function EssProfile() {
  const { user, logout } = useSession();
  const [panel, setPanel] = useState<'documents' | 'resignation' | 'assets' | 'helpdesk' | 'performance' | 'letters' | 'tax' | null>(null);
  const { data: employee, error } = useQuery({
    queryKey: ['employee', user?.employeeId],
    queryFn: () => getEmployee(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });

  if (panel === 'documents') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Documents</div>
        {user?.employeeId && <DocumentsPanel employeeId={user.employeeId} />}
      </div>
    );
  }

  if (panel === 'resignation') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Resignation</div>
        <ResignationPanel />
      </div>
    );
  }

  if (panel === 'assets') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">My Assets</div>
        <MyAssetsPanel />
      </div>
    );
  }

  if (panel === 'helpdesk') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Helpdesk</div>
        <HelpdeskPanel />
      </div>
    );
  }

  if (panel === 'performance') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Performance</div>
        <PerformancePanel />
      </div>
    );
  }

  if (panel === 'letters') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Letters</div>
        <LettersPanel />
      </div>
    );
  }

  if (panel === 'tax') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Tax Declaration</div>
        <TaxDeclarationPanel />
      </div>
    );
  }

  const menuItems: MenuTile[] = [
    { icon: FileTextIcon, label: 'Documents', onClick: () => setPanel('documents'), chip: 'bg-info-soft text-info' },
    { icon: ShieldIcon, label: 'Tax Declaration', onClick: () => setPanel('tax'), chip: 'bg-accent-soft text-accent' },
    { icon: BellIcon, label: 'Notification Settings', onClick: undefined, chip: 'bg-border-soft text-text-muted' },
    { icon: AlertIcon, label: 'Resignation', onClick: () => setPanel('resignation'), chip: 'bg-danger-soft text-danger' },
    { icon: BoxIcon, label: 'My Assets', onClick: () => setPanel('assets'), chip: 'bg-warning-soft text-warning' },
    { icon: HelpCircleIcon, label: 'Helpdesk', onClick: () => setPanel('helpdesk'), chip: 'bg-info-soft text-info' },
    { icon: TargetIcon, label: 'Performance', onClick: () => setPanel('performance'), chip: 'bg-success-soft text-success' },
    { icon: FileTextIcon, label: 'Letters', onClick: () => setPanel('letters'), chip: 'bg-accent-soft text-accent' },
  ];

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 lg:px-0">
      <div className="flex items-center gap-3.5 rounded-2xl bg-gradient-to-br from-accent-strong to-accent p-5 text-white shadow-card lg:p-6">
        <Avatar name={user?.name ?? ''} size={56} />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-bold text-white lg:text-[19px]">{user?.name}</div>
          <div className="mt-0.5 truncate text-[12.5px] text-white/80">
            {employee?.code && <span className="font-mono-num font-semibold">{employee.code}</span>}
            {employee?.code && (employee?.designation ?? user?.email) && ' · '}
            {employee?.designation ?? user?.email}
          </div>
        </div>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        {employee && (
          <Section
            title="Personal Info"
            rows={[
              { label: 'Employee ID', value: employee.code ?? '—' },
              { label: 'Department', value: employee.department ?? '—' },
              { label: 'Date of Joining', value: employee.doj ?? '—' },
              { label: 'Phone', value: employee.phone ?? '—' },
              { label: 'Personal Email', value: employee.personalEmail ?? '—' },
              { label: 'Date of Birth', value: employee.dob ?? '—' },
            ]}
          />
        )}

        <div className="flex flex-col gap-4">
          <MenuGrid items={menuItems} />
          <button onClick={() => logout()} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger-soft">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-soft text-danger">
              <LogOutIcon width={16} height={16} />
            </div>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
