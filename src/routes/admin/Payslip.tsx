import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/Button';
import { DownloadIcon } from '@/shared/ui/icons';
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState';
import { PayslipDocument } from '@/modules/payslip/PayslipDocument';
import { useSession } from '@/shared/lib/session';
import { getCompany } from '@/modules/company/companyService';
import { getEmployee } from '@/modules/employee/employeeService';
import { getPayrollRun, getPayrollItemForEmployee } from '@/modules/payroll/payrollService';

export default function Payslip() {
  const { id, employeeId } = useParams();
  const { user } = useSession();

  const companyQuery = useQuery({ queryKey: ['company', user!.companyId], queryFn: () => getCompany(user!.companyId) });
  const employeeQuery = useQuery({ queryKey: ['employee', employeeId], queryFn: () => getEmployee(employeeId!), enabled: Boolean(employeeId) });
  const runQuery = useQuery({ queryKey: ['payroll-run', id], queryFn: () => getPayrollRun(id!), enabled: Boolean(id) });
  const itemQuery = useQuery({
    queryKey: ['payroll-item', id, employeeId],
    queryFn: () => getPayrollItemForEmployee(id!, employeeId!),
    enabled: Boolean(id && employeeId),
  });

  const error = companyQuery.error || employeeQuery.error || runQuery.error || itemQuery.error;
  const loading = companyQuery.isLoading || employeeQuery.isLoading || runQuery.isLoading || itemQuery.isLoading;

  if (error) return <ErrorState message={(error as Error).message} />;
  if (loading) return <div className="text-[13px] text-text-faint">Loading…</div>;

  const company = companyQuery.data;
  const employee = employeeQuery.data;
  const run = runQuery.data;
  const item = itemQuery.data;

  if (!company || !employee || !run || !item) {
    return <EmptyState title="Payslip not available" description="This payslip hasn't been generated yet, or this payroll run hasn't been calculated for this employee." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] text-text-faint">
          <Link to="/admin/payroll" className="text-accent">Payroll</Link> / {run.periodStart} – {run.periodEnd} / {employee.name}
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
