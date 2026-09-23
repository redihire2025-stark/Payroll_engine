import { OrgLogo } from '@/shared/ui/OrgLogo';
import { formatINR2, numberToWordsINR } from '@/shared/lib/format';
import { componentLabel, isBonus, withStatutoryZeroLines, formatSalarySlipTitle, buildImportantNotes } from './payslipFormat';
import type { Company } from '@/modules/company/companyService';
import type { EmployeeDetailRecord } from '@/modules/employee/employeeService';
import type { PayrollRunRow, PayrollItemDetail } from '@/modules/payroll/payrollService';

/**
 * The payslip document itself — matches the field set and layout of the
 * payslip format Redihire issues to employees (bordered info tables,
 * colored REGULAR EARNINGS / DEDUCTIONS section bars, a full-width NET PAY
 * banner with the amount in words, an Important Notes block, and a
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
  employee: EmployeeDetailRecord;
  run: PayrollRunRow;
  item: PayrollItemDetail;
}) {
  const workingDays = 30 - item.lopDays; // calendar days in the pay period, minus LOP

  const regularEarnings = item.earnings.filter((e) => !isBonus(e.code));
  const bonusEarnings = item.earnings.filter((e) => isBonus(e.code));
  const regularEarningsTotal = regularEarnings.reduce((s, e) => s + e.amount, 0);
  const bonusTotal = bonusEarnings.reduce((s, e) => s + e.amount, 0);
  const deductionsWithStatutoryZeroLines = withStatutoryZeroLines(item.deductions);

  const pt = item.deductions.find((d) => d.code === 'professional_tax')?.amount ?? 0;
  const epf = item.deductions.find((d) => d.code === 'epf')?.amount ?? 0;
  const esi = item.deductions.find((d) => d.code === 'esi')?.amount ?? 0;
  const tds = item.deductions.find((d) => d.code === 'tds')?.amount ?? 0;
  const notes = buildImportantNotes({ state: company.state, professionalTax: pt, epf, esi, tds, lopDays: item.lopDays });

  const upperName = company.name.toUpperCase();
  const accentPart = upperName.slice(0, company.nameAccentPrefixLength);
  const restPart = upperName.slice(company.nameAccentPrefixLength);

  const cellHeadClass = 'border border-border-soft bg-bg px-3 py-2 text-[12px] font-semibold text-text';
  const cellValClass = 'border border-border-soft px-3 py-2 text-[12.5px] text-text';

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-white p-10">
      <div
        className="pointer-events-none absolute right-0 top-0 h-32 w-48"
        style={{ background: company.brandAccentColor, clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
      />

      <div className="relative flex flex-col gap-4">
        <OrgLogo name={company.name} url={company.logoUrl} size={40} />

        <div className="text-center">
          <h1 className="text-[17px] font-bold uppercase tracking-wide">
            <span style={{ color: company.brandAccentColor }}>{accentPart}</span>
            <span className="text-text">{restPart}</span>
          </h1>
          <p className="mt-1.5 text-[12.5px] font-semibold text-text">{formatSalarySlipTitle(run.periodStart, run.periodEnd)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <table className="w-full border-collapse">
            <tbody>
              <tr><td className={`${cellHeadClass} w-[42%]`}>Employee Name:</td><td className={cellValClass}>{employee.name}</td></tr>
              <tr><td className={cellHeadClass}>Department:</td><td className={cellValClass}>{employee.department ?? '—'}</td></tr>
              <tr><td className={cellHeadClass}>Date of Joining:</td><td className={cellValClass}>{employee.doj}</td></tr>
            </tbody>
          </table>
          <table className="w-full border-collapse">
            <tbody>
              <tr><td className={`${cellHeadClass} w-[42%]`}>Employee ID:</td><td className={cellValClass}>{employee.code}</td></tr>
              <tr><td className={cellHeadClass}>Designation:</td><td className={cellValClass}>{employee.designation ?? '—'}</td></tr>
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
              {regularEarnings.length === 0 ? (
                <tr><td colSpan={2} className="border border-border-soft px-3 py-3 text-center text-text-faint">No earnings recorded</td></tr>
              ) : (
                regularEarnings.map((e) => (
                  <tr key={e.code}>
                    <td className="border border-border-soft px-3 py-1.5 font-medium text-text">{componentLabel(e.code)}</td>
                    <td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(e.amount)}</td>
                  </tr>
                ))
              )}
              <tr><td className="border border-border-soft px-3 py-2 font-bold text-text">TOTAL EARNINGS</td><td className="border border-border-soft px-3 py-2 text-right font-mono-num font-bold text-text">{formatINR2(regularEarningsTotal)}</td></tr>
            </tbody>
          </table>

          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr><th colSpan={2} className="border border-border-soft px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: '#E2574C' }}>Deductions</th></tr>
            </thead>
            <tbody>
              {deductionsWithStatutoryZeroLines.map((d) => (
                <tr key={d.code}>
                  <td className="border border-border-soft px-3 py-1.5 font-medium text-text">{componentLabel(d.code)}</td>
                  <td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(d.amount)}</td>
                </tr>
              ))}
              <tr><td className="border border-border-soft px-3 py-2 font-bold text-text">TOTAL DEDUCTIONS</td><td className="border border-border-soft px-3 py-2 text-right font-mono-num font-bold text-text">{formatINR2(item.totalDeductions)}</td></tr>
            </tbody>
          </table>
        </div>

        {bonusEarnings.length > 0 && (
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr><th colSpan={2} className="border border-border-soft px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white" style={{ background: '#F0A500' }}>Bonus / Incentives</th></tr>
            </thead>
            <tbody>
              {bonusEarnings.map((e) => (
                <tr key={e.code}>
                  <td className="border border-border-soft px-3 py-1.5 font-medium text-text">{componentLabel(e.code)}</td>
                  <td className="border border-border-soft px-3 py-1.5 text-right font-mono-num text-text">{formatINR2(e.amount)}</td>
                </tr>
              ))}
              <tr><td className="border border-border-soft px-3 py-2 font-bold text-text">TOTAL BONUS</td><td className="border border-border-soft px-3 py-2 text-right font-mono-num font-bold text-text">{formatINR2(bonusTotal)}</td></tr>
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between rounded px-5 py-3 text-white" style={{ background: company.brandAccentColor }}>
          <span className="text-[13px] font-bold">
            NET PAY: {formatINR2(item.netPay)} (Rupees {numberToWordsINR(item.netPay)} Only)
          </span>
        </div>

        <div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: '#2B6CB0' }}>Important Notes</div>
          <ul className="mt-1.5 list-disc pl-5 text-[11.5px] leading-relaxed text-text-muted">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>

        <div className="relative mt-2 border-t border-border-soft pt-4 text-center text-[11px] text-text-faint">
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
          <div className="font-bold text-text">{company.legalName}</div>
          {company.regOffice && <div className="mt-1">REG OFF: {company.regOffice}</div>}
          {(company.phone || company.website || company.email) && (
            <div className="mt-0.5">
              {[company.phone && `T: ${company.phone}`, company.website && `W: ${company.website}`, company.email && `E: ${company.email}`]
                .filter(Boolean)
                .join(' | ')}
            </div>
          )}
          {company.cin && <div className="mt-0.5">CIN No: {company.cin}</div>}
        </div>
      </div>
    </div>
  );
}
