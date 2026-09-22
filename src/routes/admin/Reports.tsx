import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { BarChartIcon, FileTextIcon } from '@/shared/ui/icons';

const reportCatalog = [
  { title: 'Payroll Summary', description: 'Gross, deductions and net payable by pay period.' },
  { title: 'Attendance Report', description: 'Present/absent/LOP days by employee and department.' },
  { title: 'Leave Report', description: 'Leave taken, balances and encashment by employee.' },
  { title: 'Statutory Report', description: 'PF, ESI, Professional Tax and TDS filings by period.' },
  { title: 'Department Payroll Cost', description: 'Cost distribution across departments and branches.' },
  { title: 'Payroll Variance', description: 'Month-over-month change in gross and net payroll cost.' },
  { title: 'Reimbursement Report', description: 'Claims submitted, approved and paid by category.' },
];

export default function Reports() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-text">Reports</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Generate and export reports across payroll and HR</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {reportCatalog.map((r) => (
          <Card key={r.title} className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
              <BarChartIcon width={18} height={18} />
            </div>
            <h3 className="mt-3.5 text-[14px] font-semibold text-text">{r.title}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-text-faint">{r.description}</p>
            <button className="mt-3.5 text-[12.5px] font-semibold text-accent">Generate →</button>
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-border-soft px-5 py-4">
          <h3 className="text-[14px] font-semibold text-text">Recent Exports</h3>
        </div>
        <div className="px-5 pb-6 pt-2">
          <EmptyState
            icon={<FileTextIcon width={20} height={20} />}
            title="No reports generated yet"
            description="Generated report exports will appear here once report generation is connected to the live data."
          />
        </div>
      </Card>
    </div>
  );
}
