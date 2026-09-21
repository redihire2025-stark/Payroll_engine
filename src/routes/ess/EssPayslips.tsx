import { DownloadIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';

const months = [
  { m: 'September 2026', net: 61120, status: 'Processing' },
  { m: 'August 2026', net: 58240, status: 'Paid' },
  { m: 'July 2026', net: 58240, status: 'Paid' },
  { m: 'June 2026', net: 57980, status: 'Paid' },
  { m: 'May 2026', net: 57980, status: 'Paid' },
  { m: 'April 2026', net: 57980, status: 'Paid' },
];

export default function EssPayslips() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div className="flex items-center justify-between">
        <div className="text-[19px] font-bold text-text">Payslips</div>
        <select className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-text">
          <option>2026</option>
          <option>2025</option>
        </select>
      </div>

      <div className="flex flex-col gap-2.5">
        {months.map((p) => (
          <div key={p.m} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <div className="text-[13px] font-semibold text-text">{p.m}</div>
              <div className="mt-0.5 font-mono-num text-[15px] font-bold text-text">{formatINR(p.net)}</div>
              <div className="mt-0.5 text-[11px] text-text-faint">{p.status}</div>
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-accent" aria-label={`Download payslip for ${p.m}`}>
              <DownloadIcon width={17} height={17} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
