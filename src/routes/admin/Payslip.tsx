import { Link, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { DownloadIcon } from '@/shared/ui/icons';
import { PayslipDocument } from '@/modules/payslip/PayslipDocument';
import { currentRunItems, employees, payrollRuns, company } from '@/shared/lib/mockData';

export default function Payslip() {
  const { id, employeeId } = useParams();
  const run = payrollRuns.find((r) => r.id === id) ?? payrollRuns[0];
  const item = currentRunItems.find((i) => i.employeeId === employeeId) ?? currentRunItems[0];
  const employee = employees.find((e) => e.id === item.employeeId)!;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] text-text-faint">
          <Link to="/admin/payroll" className="text-accent">Payroll</Link> / {run.period} / {employee.name}
        </div>
        <a href={`/print/payslip/${run.id}/${employee.id}`} target="_blank" rel="noreferrer">
          <Button variant="primary" size="sm" icon={<DownloadIcon width={15} height={15} />}>Download PDF</Button>
        </a>
      </div>

      <div className="mx-auto w-full max-w-2xl shadow-card rounded-xl">
        <PayslipDocument company={company} employee={employee} run={run} item={item} />
      </div>
    </div>
  );
}
