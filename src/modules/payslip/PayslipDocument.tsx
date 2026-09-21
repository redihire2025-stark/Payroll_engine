import { OrgLogo } from '@/shared/ui/OrgLogo';
import { formatINR } from '@/shared/lib/format';
import type { Employee, PayrollItem, PayrollRun, Company } from '@/shared/lib/mockData';

/**
 * The payslip document itself — the exact content that both the in-app
 * preview (src/routes/admin/Payslip.tsx) and the standalone print view
 * (src/routes/print/PayslipPrint.tsx) render, so the on-screen preview and
 * the exported PDF can never drift apart.
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

  return (
    <div className="w-full rounded-xl border border-border bg-white p-10">
      <div className="flex items-start justify-between border-b border-border-soft pb-6">
        <div className="flex items-center gap-3.5">
          <OrgLogo name={company.name} url={company.logoUrl} size={44} />
          <div>
            <div className="text-[16px] font-bold text-text">{company.name}</div>
            <div className="mt-0.5 text-[12px] text-text-faint">{company.address}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold text-text">Payslip</div>
          <div className="text-[12px] text-text-faint">{run.period}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-b border-border-soft py-6 text-[12.5px]">
        <div className="flex justify-between"><span className="text-text-faint">Employee Name</span><span className="font-medium text-text">{employee.name}</span></div>
        <div className="flex justify-between"><span className="text-text-faint">Employee Code</span><span className="font-mono-num text-text">{employee.code}</span></div>
        <div className="flex justify-between"><span className="text-text-faint">Designation</span><span className="text-text">{employee.designation}</span></div>
        <div className="flex justify-between"><span className="text-text-faint">Department</span><span className="text-text">{employee.department}</span></div>
        <div className="flex justify-between"><span className="text-text-faint">PAN</span><span className="font-mono-num text-text">{employee.panMasked}</span></div>
        <div className="flex justify-between"><span className="text-text-faint">Bank A/C</span><span className="font-mono-num text-text">{employee.bankAccountMasked}</span></div>
        <div className="flex justify-between"><span className="text-text-faint">Date of Joining</span><span className="font-mono-num text-text">{employee.doj}</span></div>
        <div className="flex justify-between"><span className="text-text-faint">Days Paid</span><span className="font-mono-num text-text">{26 - item.lopDays} / 26</span></div>
      </div>

      <div className="grid grid-cols-2 gap-8 py-6">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-faint">Earnings</div>
          <div className="flex flex-col gap-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-text-muted">Basic</span><span className="font-mono-num text-text">{formatINR(Math.round(item.gross * 0.6))}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">House Rent Allowance</span><span className="font-mono-num text-text">{formatINR(Math.round(item.gross * 0.24))}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Special Allowance</span><span className="font-mono-num text-text">{formatINR(Math.round(item.gross * 0.16))}</span></div>
          </div>
          <div className="mt-3 flex justify-between border-t border-border-soft pt-2 text-[13px] font-semibold">
            <span className="text-text">Gross Earnings</span><span className="font-mono-num text-text">{formatINR(item.gross)}</span>
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-faint">Deductions</div>
          <div className="flex flex-col gap-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-text-muted">Employee PF</span><span className="font-mono-num text-text">{formatINR(item.pf)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">ESI</span><span className="font-mono-num text-text">{item.esi ? formatINR(item.esi) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Professional Tax</span><span className="font-mono-num text-text">{formatINR(item.pt)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">TDS</span><span className="font-mono-num text-text">{item.tds ? formatINR(item.tds) : '—'}</span></div>
            {item.otherDeductions > 0 && <div className="flex justify-between"><span className="text-text-muted">Loan EMI</span><span className="font-mono-num text-text">{formatINR(item.otherDeductions)}</span></div>}
          </div>
          <div className="mt-3 flex justify-between border-t border-border-soft pt-2 text-[13px] font-semibold">
            <span className="text-text">Total Deductions</span><span className="font-mono-num text-text">{formatINR(totalDeductions)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-accent-soft px-5 py-4">
        <div>
          <div className="text-[12px] font-semibold text-accent-strong">Net Pay</div>
          <div className="text-[11px] text-text-faint">Rupees {formatINR(item.net).replace('₹', '')} only</div>
        </div>
        <div className="font-mono-num text-[24px] font-bold text-accent-strong">{formatINR(item.net)}</div>
      </div>

      <p className="mt-6 text-center text-[11px] text-text-faint">
        This is a system-generated payslip and does not require a signature.
      </p>
    </div>
  );
}
