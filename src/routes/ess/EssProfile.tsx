import { Avatar } from '@/shared/ui/Avatar';
import { ChevronRightIcon, FileTextIcon, ShieldIcon, BellIcon, LogOutIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { currentEmployee } from '@/shared/lib/mockData';

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
  const { logout } = useSession();

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="flex items-center gap-3.5">
        <Avatar name={currentEmployee.name} size={56} />
        <div>
          <div className="text-[17px] font-bold text-text">{currentEmployee.name}</div>
          <div className="text-[12.5px] text-text-faint">{currentEmployee.designation} · {currentEmployee.code}</div>
        </div>
      </div>

      <Section
        title="Personal Info"
        rows={[
          { label: 'Phone', value: currentEmployee.phone },
          { label: 'Personal Email', value: currentEmployee.email },
          { label: 'Date of Birth', value: currentEmployee.dob },
        ]}
      />
      <Section
        title="Bank Details"
        rows={[
          { label: 'Account No.', value: currentEmployee.bankAccountMasked },
          { label: 'IFSC', value: currentEmployee.ifsc },
        ]}
      />

      <div className="rounded-xl border border-border bg-surface">
        {[
          { icon: FileTextIcon, label: 'Documents' },
          { icon: ShieldIcon, label: 'Tax Declaration' },
          { icon: BellIcon, label: 'Notification Settings' },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex w-full items-center justify-between border-b border-border-soft px-4 py-3.5 last:border-b-0">
            <div className="flex items-center gap-3 text-[13px] font-medium text-text">
              <Icon width={17} height={17} className="text-text-muted" />
              {label}
            </div>
            <ChevronRightIcon width={16} height={16} className="text-text-faint" />
          </button>
        ))}
        <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3.5 text-[13px] font-medium text-danger">
          <LogOutIcon width={17} height={17} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
