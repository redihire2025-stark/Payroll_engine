import { Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from '@/shared/lib/session';
import AdminLayout from './AdminLayout';
import EssLayout from './EssLayout';
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
import EssHome from '@/routes/ess/EssHome';
import EssAttendance from '@/routes/ess/EssAttendance';
import EssLeave from '@/routes/ess/EssLeave';
import EssPayslips from '@/routes/ess/EssPayslips';
import EssProfile from '@/routes/ess/EssProfile';
import ManagerTeam from '@/routes/ess/ManagerTeam';

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/print/payslip/:id/:employeeId" element={<PayslipPrint />} />

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
          <Route path="reports" element={<Reports />} />
          <Route path="audit-log" element={<AuditLog />} />
        </Route>

        <Route path="/app" element={<EssLayout />}>
          <Route index element={<EssHome />} />
          <Route path="attendance" element={<EssAttendance />} />
          <Route path="leave" element={<EssLeave />} />
          <Route path="payslips" element={<EssPayslips />} />
          <Route path="profile" element={<EssProfile />} />
          <Route path="team" element={<ManagerTeam />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </SessionProvider>
  );
}
