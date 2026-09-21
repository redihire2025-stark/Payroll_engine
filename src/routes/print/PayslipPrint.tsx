import { useParams } from 'react-router-dom';
import { PayslipDocument } from '@/modules/payslip/PayslipDocument';
import { currentRunItems, employees, payrollRuns, company } from '@/shared/lib/mockData';

/**
 * Standalone, chrome-free payslip document for PDF export — this is what
 * payroll_admin/finance download and what payslip-generate (Edge Function)
 * would render server-side in production. No sidebar, no topbar, no app
 * shell: just the document, sized for A4/Letter printing.
 */
export default function PayslipPrint() {
  const { id, employeeId } = useParams();
  const run = payrollRuns.find((r) => r.id === id) ?? payrollRuns[0];
  const item = currentRunItems.find((i) => i.employeeId === employeeId) ?? currentRunItems[0];
  const employee = employees.find((e) => e.id === item.employeeId)!;

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <PayslipDocument company={company} employee={employee} run={run} item={item} />
    </div>
  );
}
