import { OrgLogo } from '@/shared/ui/OrgLogo';
import { formatINR2, numberToWordsINR } from '@/shared/lib/format';
import type { Employee, PayrollItem, PayrollRun, Company } from '@/shared/lib/mockData';

/**
 * The payslip document itself — matches the exact field set and layout of
 * the payslip format Redihire already issues to employees (bordered info
 * tables, colored REGULAR EARNINGS / DEDUCTIONS section bars, a full-width
 * NET PAY banner with the amount in words, an Important Notes block, and a
 * letterhead footer with the registered office, contact details and CIN).
 * Rendered identically by the in-app preview (routes/admin/Payslip.tsx) and
 * the standalone print/PDF route (routes/print/PayslipPrint.tsx).
 */
export function PayslipDocument({
  company,
  employee,
  run,
  item,
}: {
  company: Company;
  employee: Employee;
  run: PayrollRun;
  item: PayrollItem;
}) {
  const totalDeductions = item.pf + item.esi + item.pt + item.tds + item.otherDeductions;
  const workingDays = run.totalDaysInMonth - item.lopDays;

  // Earnings breakdown by component, in the same proportions Redihire uses
  // (Basic / HRA / Special / Conveyance). Conveyance is the balancing figure
  // so the four rows always sum exactly to gross, regardless of rounding.
  const basic = Math.round(item.gross * 0.48);
  const hra = Math.round(item.gross * 0.2304);
  const special = Math.round(item.gross * 0.2096);
  const conveyance = item.gross - basic - hra - special;

  const notes: string[] = [
    `Professional Tax of ${formatINR2(item.pt)} is as per ${company.state} State rules.`,
  ];
  if (item.pf === 0 && item.esi === 0) {
    notes.push('PF and ESI deductions are not applicable as per the current salary structure.');
  }
  if (item.tds === 0) {
    notes.push('No Income Tax deduction as annual income is below the taxable limit.');
  }
  if (item.lopDays > 0) {
    notes.push(`${item.lopDays} day(s) of loss-of-pay adjusted for this period.`);
  }
  notes.push('This payslip is computer generated and does not require a signature.');

  const upperName = company.name.toUpperCase();
  const accentPart = upperName.slice(0, company.nameAccentPrefixLength);
  const restPart = upperName.slice(company.nameAccentPrefixLength);

  const cellHeadClass = 'border border-border-soft bg-bg px-3 py-2 text-[12px] font-semibold text-text';
  const cellValClass = 'border border-border-soft px-3 py-2 text-[12.5px] text-text';

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-white p-10">
      {/* decorative letterhead corner — top right */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-32 w-48"
        style={{ background: company.brandAccentColor, clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
      />

      <div className="relative flex flex-col gap-4">
        <OrgLogo name={company.name} url={company.logoUrl} size={40} />

        <div className="text-center">
          <h1 className="text-[17px] font-bold uppercase tracking-wide">
            <span style={{ color: company.brandAccentColor }}>{accentPart}</span>
            <span className="text-text">{restPart} {company.legalSuffixShort}</span>
          </h1>
          <p className="mt-1.5 text-[12.5px] font-semibold text-text">Salary Slip For the Month of {run.period}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <table className="w-full border-collapse">
            <tbody>
              <tr><td className={`${cellHeadClass} w-[42%]`}>Employee Name:</td><td className={cellValClass}>{employee.name}</td></tr>
              <tr><td className={cellHeadClass}>Department:</td><td className={cellValClass}>{employee.department}</td></tr>
              <tr><td className={cellHeadClass}>Date of Joining:</td><td className={cellValClass}>{employee.doj}</td></tr>
            </tbody>
          </table>
          <table className="w-full border-collapse">
            <tbody>
              <tr><td className={`${cellHeadClass} w-[42%]`}>Employee ID:</td><td className={cellValClass}>{employee.code}</td></tr>
              <tr><td className={cellHeadClass}>Designation:</td><td className={cellValClass}>{employee.designation}</td></tr>
              <tr><td className={cellHeadClass}>Working Days:</td><td className={cellValClass}>{workingDays}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr><th colSpan={2} className="border border-border-soft px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: '#5CB85C' }}>Regular Earnings</th></tr>
            </thead>
            <tbody>
              <tr><td className="border border-border-soft px-3 py-1.5 font-medium text-text">Basic Salary</td><td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(basic)}</td></tr>
              <tr><td className="border border-border-soft px-3 py-1.5 font-medium text-text">House Rent Allowance</td><td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(hra)}</td></tr>
              <tr><td className="border border-border-soft px-3 py-1.5 font-medium text-text">Special Allowance</td><td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(special)}</td></tr>
              <tr><td className="border border-border-soft px-3 py-1.5 font-medium text-text">Conveyance Allowance</td><td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(conveyance)}</td></tr>
              <tr><td className="border border-border-soft px-3 py-2 font-bold text-text">TOTAL EARNINGS</td><td className="border border-border-soft px-3 py-2 text-right font-mono-num font-bold text-text">{formatINR2(item.gross)}</td></tr>
            </tbody>
          </table>

          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr><th colSpan={2} className="border border-border-soft px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: '#E2574C' }}>Deductions</th></tr>
            </thead>
            <tbody>
              <tr><td className="border border-border-soft px-3 py-1.5 font-medium text-text">Provident Fund</td><td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(item.pf)}</td></tr>
              <tr><td className="border border-border-soft px-3 py-1.5 font-medium text-text">ESI</td><td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(item.esi)}</td></tr>
              <tr><td className="border border-border-soft px-3 py-1.5 font-medium text-text">Professional Tax</td><td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(item.pt)}</td></tr>
              <tr><td className="border border-border-soft px-3 py-1.5 font-medium text-text">Income Tax (TDS)</td><td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(item.tds)}</td></tr>
              <tr><td className="border border-border-soft px-3 py-2 font-bold text-text">TOTAL DEDUCTIONS</td><td className="border border-border-soft px-3 py-2 text-right font-mono-num font-bold text-text">{formatINR2(totalDeductions)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between rounded px-5 py-3 text-white" style={{ background: company.brandAccentColor }}>
          <span className="text-[13px] font-bold">
            NET PAY: {formatINR2(item.net)} (Rupees {numberToWordsINR(item.net)} Only)
          </span>
        </div>

        <div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: '#2B6CB0' }}>Important Notes</div>
          <ul className="mt-1.5 list-disc pl-5 text-[11.5px] leading-relaxed text-text-muted">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>

        <div className="relative mt-2 border-t border-border-soft pt-4 text-center text-[11px] text-text-faint">
          {/* decorative diagonal squares — bottom left */}
          <div className="pointer-events-none absolute -bottom-2 -left-2 h-20 w-20 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 24 - i * 3,
                  height: 24 - i * 3,
                  background: company.brandAccentColor,
                  opacity: 1 - i * 0.16,
                  left: i * 13,
                  bottom: i * 13,
                  transform: 'rotate(45deg)',
                }}
              />
            ))}
          </div>
          <div className="font-bold text-text">{company.legalNameFull}</div>
          <div className="mt-1">REG OFF: {company.regOffice}</div>
          <div className="mt-0.5">T: {company.phone} | W: {company.website} | E: {company.email}</div>
          <div className="mt-0.5">CIN No: {company.cin}</div>
        </div>
      </div>
    </div>
  );
}
