import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PayslipDocument } from '@/modules/payslip/PayslipDocument';
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState';
import { useSession } from '@/shared/lib/session';
import { getCompany } from '@/modules/company/companyService';
import { getEmployee } from '@/modules/employee/employeeService';
import { getPayrollRun, getPayrollItemForEmployee } from '@/modules/payroll/payrollService';

/**
 * Standalone, chrome-free payslip document for PDF export — what
 * payroll_admin/finance download and what payslip-generate (Edge Function)
 * would render server-side in production. No sidebar, no topbar, no app
 * shell: just the document, sized for A4/Letter printing.
 *
 * Not wrapped in ProtectedRoute (see App.tsx) — RLS on payroll_items is the
 * real access boundary here, not client-side routing, per
 * docs/architecture/07-security-rls.md.
 */
export default function PayslipPrint() {
  const { id, employeeId } = useParams();
  const { user, loading: sessionLoading } = useSession();

  const companyQuery = useQuery({
    queryKey: ['company', user?.companyId],
    queryFn: () => getCompany(user!.companyId),
    enabled: Boolean(user),
  });
  const employeeQuery = useQuery({ queryKey: ['employee', employeeId], queryFn: () => getEmployee(employeeId!), enabled: Boolean(employeeId) });
  const runQuery = useQuery({ queryKey: ['payroll-run', id], queryFn: () => getPayrollRun(id!), enabled: Boolean(id) });
  const itemQuery = useQuery({
    queryKey: ['payroll-item', id, employeeId],
    queryFn: () => getPayrollItemForEmployee(id!, employeeId!),
    enabled: Boolean(id && employeeId),
  });

  if (sessionLoading) return null;
  if (!user) return <div className="p-10"><EmptyState title="Sign in required" description="Sign in to view this payslip." /></div>;

  const error = companyQuery.error || employeeQuery.error || runQuery.error || itemQuery.error;
  if (error) return <div className="p-10"><ErrorState message={(error as Error).message} /></div>;

  const loading = companyQuery.isLoading || employeeQuery.isLoading || runQuery.isLoading || itemQuery.isLoading;
  if (loading) return null;

  const company = companyQuery.data;
  const employee = employeeQuery.data;
  const run = runQuery.data;
  const item = itemQuery.data;

  if (!company || !employee || !run || !item) {
    return <div className="p-10"><EmptyState title="Payslip not available" description="This payslip hasn't been generated yet." /></div>;
  }

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <PayslipDocument company={company} employee={employee} run={run} item={item} />
    </div>
  );
}
