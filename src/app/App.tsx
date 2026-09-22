import { Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from '@/shared/lib/session';
import { ConfigWarningBanner } from '@/shared/ui/ConfigWarningBanner';
import { ProtectedRoute } from './ProtectedRoute';
import AdminLayout from './AdminLayout';
import EssLayout from './EssLayout';
import Landing from '@/routes/Landing';
import Login from '@/routes/auth/Login';
import Register from '@/routes/auth/Register';
import Company from '@/routes/admin/Company';
import PayslipPrint from '@/routes/print/PayslipPrint';
import Dashboard from '@/routes/admin/Dashboard';
import Employees from '@/routes/admin/Employees';
import EmployeeDetail from '@/routes/admin/EmployeeDetail';
import Attendance from '@/routes/admin/Attendance';
import Leave from '@/routes/admin/Leave';
import Salary from '@/routes/admin/Salary';
import PayrollRuns from '@/routes/admin/PayrollRuns';
import PayrollRunDetail from '@/routes/admin/PayrollRunDetail';
import Payslip from '@/routes/admin/Payslip';
import Reports from '@/routes/admin/Reports';
import AuditLog from '@/routes/admin/AuditLog';
import Reimbursements from '@/routes/admin/Reimbursements';
import Assets from '@/routes/admin/Assets';
import Helpdesk from '@/routes/admin/Helpdesk';
import Performance from '@/routes/admin/Performance';
import Recruitment from '@/routes/admin/Recruitment';
import EssHome from '@/routes/ess/EssHome';
import EssAttendance from '@/routes/ess/EssAttendance';
import EssLeave from '@/routes/ess/EssLeave';
import EssPayslips from '@/routes/ess/EssPayslips';
import EssExpenses from '@/routes/ess/EssExpenses';
import EssProfile from '@/routes/ess/EssProfile';
import ManagerTeam from '@/routes/ess/ManagerTeam';

export default function App() {
  return (
    <SessionProvider>
      <ConfigWarningBanner />
      <Routes>
        {/* The landing page IS the sign-in page — no dashboard is shown to a signed-out visitor. */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/print/payslip/:id/:employeeId" element={<PayslipPrint />} />

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="company" element={<Company />} />
            <Route path="employees" element={<Employees />} />
            <Route path="employees/:id" element={<EmployeeDetail />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="salary" element={<Salary />} />
            <Route path="payroll" element={<PayrollRuns />} />
            <Route path="payroll/:id" element={<PayrollRunDetail />} />
            <Route path="payroll/:id/payslip/:employeeId" element={<Payslip />} />
            <Route path="reimbursements" element={<Reimbursements />} />
            <Route path="assets" element={<Assets />} />
            <Route path="helpdesk" element={<Helpdesk />} />
            <Route path="performance" element={<Performance />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit-log" element={<AuditLog />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<EssLayout />}>
            <Route index element={<EssHome />} />
            <Route path="attendance" element={<EssAttendance />} />
            <Route path="leave" element={<EssLeave />} />
            <Route path="payslips" element={<EssPayslips />} />
            <Route path="expenses" element={<EssExpenses />} />
            <Route path="profile" element={<EssProfile />} />
            <Route path="team" element={<ManagerTeam />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}
