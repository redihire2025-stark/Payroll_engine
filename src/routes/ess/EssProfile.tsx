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
      <div className="flex flex-col gap-4 px-5 pt-6">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Documents</div>
        {user?.employeeId && <DocumentsPanel employeeId={user.employeeId} />}
      </div>
    );
  }

  if (panel === 'resignation') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Resignation</div>
        <ResignationPanel />
      </div>
    );
  }

  if (panel === 'assets') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">My Assets</div>
        <MyAssetsPanel />
      </div>
    );
  }

  if (panel === 'helpdesk') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Helpdesk</div>
        <HelpdeskPanel />
      </div>
    );
  }

  if (panel === 'performance') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Performance</div>
        <PerformancePanel />
      </div>
    );
  }

  if (panel === 'letters') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Letters</div>
        <LettersPanel />
      </div>
    );
  }

  if (panel === 'tax') {
    return (
      <div className="flex flex-col gap-4 px-5 pt-6">
        <button onClick={() => setPanel(null)} className="self-start text-[12.5px] font-semibold text-accent">← Back to Profile</button>
        <div className="text-[19px] font-bold text-text">Tax Declaration</div>
        <TaxDeclarationPanel />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="flex items-center gap-3.5">
        <Avatar name={user?.name ?? ''} size={56} />
        <div>
          <div className="text-[17px] font-bold text-text">{user?.name}</div>
          <div className="text-[12.5px] text-text-faint">{employee?.designation ?? user?.email}</div>
        </div>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      {employee && (
        <Section
          title="Personal Info"
          rows={[
            { label: 'Phone', value: employee.phone ?? '—' },
            { label: 'Personal Email', value: employee.personalEmail ?? '—' },
            { label: 'Date of Birth', value: employee.dob ?? '—' },
          ]}
        />
      )}

      <div className="rounded-xl border border-border bg-surface">
        {[
          { icon: FileTextIcon, label: 'Documents', onClick: () => setPanel('documents') },
          { icon: ShieldIcon, label: 'Tax Declaration', onClick: () => setPanel('tax') },
          { icon: BellIcon, label: 'Notification Settings', onClick: undefined },
          { icon: AlertIcon, label: 'Resignation', onClick: () => setPanel('resignation') },
          { icon: BoxIcon, label: 'My Assets', onClick: () => setPanel('assets') },
          { icon: HelpCircleIcon, label: 'Helpdesk', onClick: () => setPanel('helpdesk') },
          { icon: TargetIcon, label: 'Performance', onClick: () => setPanel('performance') },
          { icon: FileTextIcon, label: 'Letters', onClick: () => setPanel('letters') },
        ].map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={!onClick}
            className="flex w-full items-center justify-between border-b border-border-soft px-4 py-3.5 last:border-b-0 disabled:opacity-50"
          >
            <div className="flex items-center gap-3 text-[13px] font-medium text-text">
              <Icon width={17} height={17} className="text-text-muted" />
              {label}
            </div>
            <ChevronRightIcon width={16} height={16} className="text-text-faint" />
          </button>
        ))}
        <button onClick={() => logout()} className="flex w-full items-center gap-3 px-4 py-3.5 text-[13px] font-medium text-danger">
          <LogOutIcon width={17} height={17} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
