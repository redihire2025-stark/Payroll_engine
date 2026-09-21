import { Card } from '@/shared/ui/Card';
import { BarChartIcon } from '@/shared/ui/icons';
import { reportCatalog } from '@/shared/lib/mockData';

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
        <div className="flex flex-col">
          {[
            { name: 'Payroll Summary — Aug 2026.pdf', date: 'Sep 2, 2026', size: '340 KB' },
            { name: 'Statutory Report — PF & ESI Q2 FY26.xlsx', date: 'Aug 28, 2026', size: '128 KB' },
            { name: 'Department Payroll Cost — Aug 2026.pdf', date: 'Aug 5, 2026', size: '212 KB' },
          ].map((f) => (
            <div key={f.name} className="flex items-center justify-between border-b border-border-soft px-5 py-3 text-[13px] last:border-b-0">
              <span className="font-medium text-text">{f.name}</span>
              <div className="flex items-center gap-5 text-text-faint">
                <span className="font-mono-num text-[12px]">{f.date}</span>
                <span className="font-mono-num text-[12px]">{f.size}</span>
                <span className="font-semibold text-accent">Download</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
