// Seed data for the mock service layer. Shape mirrors the Postgres schema in
// docs/architecture/05-database-erd.md so swapping these services for real
// supabase-js calls later requires no change to callers.

export interface Employee {
  id: string;
  code: string;
  name: string;
  designation: string;
  department: string;
  branch: string;
  status: 'active' | 'on_leave' | 'exited';
  doj: string;
  managerId: string | null;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  bankAccountMasked: string;
  ifsc: string;
  bankName: string;
  panMasked: string;
  uan: string;
  pfNumber: string;
  esiNumber: string;
  emergencyContact: string;
}

const names = [
  'Priya Sharma', 'Arjun Mehta', 'Karan Verma', 'Sneha Iyer', 'Rohan Gupta',
  'Ananya Rao', 'Vikram Nair', 'Divya Reddy', 'Aditya Kumar', 'Meera Pillai',
  'Rahul Joshi', 'Kavita Menon', 'Suresh Pillai', 'Neha Kapoor', 'Amit Singh',
];
const departments = ['Engineering', 'Sales', 'Finance', 'Human Resources', 'Operations', 'Customer Success'];
const designations = ['Software Engineer', 'Sales Executive', 'Accountant', 'HR Executive', 'Operations Manager', 'Support Lead'];
const branches = ['Bengaluru HQ', 'Mumbai Office', 'Pune Office'];

export const employees: Employee[] = names.map((name, i) => ({
  id: `emp-${i + 1}`,
  code: `EMP-${String(i + 1).padStart(4, '0')}`,
  name,
  designation: designations[i % designations.length],
  department: departments[i % departments.length],
  branch: branches[i % branches.length],
  status: i === 12 ? 'on_leave' : i === 13 ? 'exited' : 'active',
  doj: `20${20 + (i % 5)}-0${(i % 9) + 1}-1${i % 2}`,
  managerId: i === 0 ? null : 'emp-6',
  email: `${name.toLowerCase().replace(' ', '.')}@meridiantextiles.in`,
  phone: `+91 98${(10000000 + i * 137).toString().slice(0, 8)}`,
  dob: `199${i % 9}-0${(i % 9) + 1}-12`,
  gender: i % 3 === 0 ? 'Female' : 'Male',
  address: `${102 + i}, MG Road, ${branches[i % branches.length]}`,
  bankAccountMasked: `XXXX XXXX ${1000 + i * 7}`,
  ifsc: 'HDFC0001234',
  bankName: 'HDFC Bank',
  panMasked: `AB${i}PX${1000 + i}Z`,
  uan: `10${(100000000 + i * 91).toString().slice(0, 9)}`,
  pfNumber: `KN/BNG/00${1200 + i}`,
  esiNumber: `31002345${100 + i}`,
  emergencyContact: 'Spouse · +91 98765 4321' + (i % 10),
}));

export const currentEmployee = employees[5]; // Ananya Rao — logged-in payroll admin, also an employee

export interface Company {
  id: string;
  name: string;
  legalName: string;
  logoUrl: string | null;
  address: string;
  country: string;
  employeeSeatLimit: number;
  seatsUsed: number; // live count of employees with portal access granted — never a stored total
}

export const company: Company = {
  id: 'company-1',
  name: 'Meridian Textiles Pvt Ltd',
  legalName: 'Meridian Textiles Private Limited',
  logoUrl: null, // no logo uploaded yet — UI falls back to a generated monogram
  address: 'Plot 44, Whitefield Industrial Area, Bengaluru 560066',
  country: 'India',
  employeeSeatLimit: 200,
  seatsUsed: 142,
};

export interface AttendanceCorrection {
  id: string;
  employeeId: string;
  date: string;
  requestedIn: string;
  requestedOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const attendanceCorrections: AttendanceCorrection[] = [
  { id: 'ac-1', employeeId: 'emp-1', date: '2026-09-18', requestedIn: '09:12', requestedOut: '18:40', reason: 'Forgot to punch out, left after client call', status: 'pending' },
  { id: 'ac-2', employeeId: 'emp-3', date: '2026-09-19', requestedIn: '09:45', requestedOut: '18:15', reason: 'Biometric device offline at branch', status: 'pending' },
  { id: 'ac-3', employeeId: 'emp-9', date: '2026-09-17', requestedIn: '10:05', requestedOut: '19:00', reason: 'Traffic disruption, informed manager', status: 'pending' },
  { id: 'ac-4', employeeId: 'emp-2', date: '2026-09-15', requestedIn: '09:00', requestedOut: '18:00', reason: 'Missed punch-in', status: 'approved' },
  { id: 'ac-5', employeeId: 'emp-7', date: '2026-09-14', requestedIn: '09:30', requestedOut: '17:30', reason: 'Half-day approved by manager, system not updated', status: 'rejected' },
];

export interface AttendanceDay {
  date: string;
  weekday: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'late' | 'on_leave' | 'weekend' | 'holiday' | 'absent';
}

export const myAttendanceMonth: AttendanceDay[] = [
  { date: 'Sep 1', weekday: 'Mon', checkIn: '09:04', checkOut: '18:22', status: 'present' },
  { date: 'Sep 2', weekday: 'Tue', checkIn: '09:32', checkOut: '18:10', status: 'late' },
  { date: 'Sep 3', weekday: 'Wed', checkIn: '08:58', checkOut: '18:05', status: 'present' },
  { date: 'Sep 4', weekday: 'Thu', checkIn: '09:01', checkOut: '18:30', status: 'present' },
  { date: 'Sep 5', weekday: 'Fri', checkIn: null, checkOut: null, status: 'on_leave' },
  { date: 'Sep 6', weekday: 'Sat', checkIn: null, checkOut: null, status: 'weekend' },
  { date: 'Sep 7', weekday: 'Sun', checkIn: null, checkOut: null, status: 'weekend' },
  { date: 'Sep 8', weekday: 'Mon', checkIn: '09:10', checkOut: '18:15', status: 'present' },
  { date: 'Sep 9', weekday: 'Tue', checkIn: '08:55', checkOut: '18:00', status: 'present' },
  { date: 'Sep 10', weekday: 'Wed', checkIn: null, checkOut: null, status: 'absent' },
];

export interface LeaveType {
  id: string;
  name: string;
  used: number;
  balance: number;
  total: number;
}

export const leaveBalances: LeaveType[] = [
  { id: 'lt-1', name: 'Casual Leave', used: 6, balance: 6, total: 12 },
  { id: 'lt-2', name: 'Sick Leave', used: 3, balance: 4, total: 7 },
  { id: 'lt-3', name: 'Earned Leave', used: 3, balance: 12, total: 15 },
];

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  appliedOn: string;
  status: 'pending' | 'approved' | 'rejected';
}

export const leaveRequests: LeaveRequest[] = [
  { id: 'lr-1', employeeId: 'emp-1', leaveType: 'Casual Leave', startDate: 'Sep 24', endDate: 'Sep 26', days: 3, reason: 'Family function out of town', appliedOn: 'Sep 15', status: 'pending' },
  { id: 'lr-2', employeeId: 'emp-3', leaveType: 'Sick Leave', startDate: 'Sep 22', endDate: 'Sep 22', days: 1, reason: 'Fever, doctor visit', appliedOn: 'Sep 21', status: 'pending' },
  { id: 'lr-3', employeeId: 'emp-9', leaveType: 'Earned Leave', startDate: 'Oct 2', endDate: 'Oct 6', days: 5, reason: 'Diwali travel', appliedOn: 'Sep 12', status: 'pending' },
  { id: 'lr-4', employeeId: 'emp-2', leaveType: 'Casual Leave', startDate: 'Sep 10', endDate: 'Sep 10', days: 1, reason: 'Personal work', appliedOn: 'Sep 8', status: 'approved' },
  { id: 'lr-5', employeeId: 'emp-7', leaveType: 'Sick Leave', startDate: 'Sep 5', endDate: 'Sep 6', days: 2, reason: 'Viral fever', appliedOn: 'Sep 5', status: 'approved' },
  { id: 'lr-6', employeeId: 'emp-4', leaveType: 'Casual Leave', startDate: 'Aug 28', endDate: 'Aug 29', days: 2, reason: 'Moving apartments', appliedOn: 'Aug 20', status: 'rejected' },
];

export interface SalaryComponentRow {
  name: string;
  type: 'earning' | 'deduction' | 'employer_contribution';
  calculation: string;
  monthly: number;
}

export const salaryStructures = ['Standard – Grade A', 'Standard – Grade B', 'Sales Incentive Plan', 'Leadership Band'];

export const activeSalaryStructureComponents: SalaryComponentRow[] = [
  { name: 'Basic', type: 'earning', calculation: 'Fixed', monthly: 40000 },
  { name: 'House Rent Allowance', type: 'earning', calculation: '40% of Basic', monthly: 16000 },
  { name: 'Conveyance Allowance', type: 'earning', calculation: 'Fixed', monthly: 1600 },
  { name: 'Special Allowance', type: 'earning', calculation: 'Fixed (balancing)', monthly: 12400 },
  { name: 'Employee PF Contribution', type: 'deduction', calculation: '12% of Basic (capped)', monthly: 1800 },
  { name: 'Professional Tax', type: 'deduction', calculation: 'State slab', monthly: 200 },
  { name: 'Employer PF Contribution', type: 'employer_contribution', calculation: '12% of Basic (capped)', monthly: 1800 },
  { name: 'Employer ESI Contribution', type: 'employer_contribution', calculation: '3.25% of Gross (if eligible)', monthly: 0 },
];

export interface PayrollRun {
  id: string;
  period: string;
  runType: 'regular' | 'off_cycle' | 'fnf';
  employeeCount: number;
  gross: number;
  net: number;
  status: 'draft' | 'calculating' | 'calculated' | 'under_review' | 'approved' | 'locked' | 'paid' | 'cancelled';
  createdBy: string;
}

export const payrollRuns: PayrollRun[] = [
  { id: 'run-2026-09', period: 'September 2026', runType: 'regular', employeeCount: 142, gross: 9842000, net: 8213400, status: 'under_review', createdBy: 'Ananya Rao' },
  { id: 'run-2026-08', period: 'August 2026', runType: 'regular', employeeCount: 140, gross: 9695000, net: 8095200, status: 'paid', createdBy: 'Ananya Rao' },
  { id: 'run-2026-07', period: 'July 2026', runType: 'regular', employeeCount: 139, gross: 9612000, net: 8034100, status: 'paid', createdBy: 'Ananya Rao' },
  { id: 'run-2026-06', period: 'June 2026', runType: 'regular', employeeCount: 138, gross: 9540500, net: 7981000, status: 'paid', createdBy: 'Rohan Mehta' },
  { id: 'run-2026-05-fnf', period: 'May 2026 · Off-cycle FnF', runType: 'fnf', employeeCount: 2, gross: 186000, net: 158400, status: 'locked', createdBy: 'Ananya Rao' },
];

export interface PayrollItem {
  employeeId: string;
  gross: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  otherDeductions: number;
  net: number;
  lopDays: number;
}

export const currentRunItems: PayrollItem[] = employees
  .filter((e) => e.status !== 'exited')
  .slice(0, 10)
  .map((e, i) => {
    const gross = 65000 + (i % 5) * 8500;
    const pf = Math.round(gross * 0.12 * 0.6);
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const pt = 200;
    const tds = i % 4 === 0 ? Math.round(gross * 0.05) : 0;
    const otherDeductions = i === 2 ? 4200 : 0;
    return {
      employeeId: e.id,
      gross,
      pf,
      esi,
      pt,
      tds,
      otherDeductions,
      net: gross - pf - esi - pt - tds - otherDeductions,
      lopDays: i === 4 ? 1 : 0,
    };
  });

export const auditLogEntries = [
  { id: 'al-1', time: '21 Sep 2026, 10:42 AM', actor: 'Ananya Rao', action: 'CALCULATED', entity: 'Payroll Run · September 2026', ip: '103.21.244.10' },
  { id: 'al-2', time: '21 Sep 2026, 09:58 AM', actor: 'Ananya Rao', action: 'CREATED', entity: 'Payroll Run · September 2026', ip: '103.21.244.10' },
  { id: 'al-3', time: '20 Sep 2026, 05:12 PM', actor: 'Rohan Mehta', action: 'APPROVED', entity: 'Leave Request · LR-2031 (Divya Reddy)', ip: '49.207.11.88' },
  { id: 'al-4', time: '20 Sep 2026, 03:40 PM', actor: 'Karan Verma', action: 'UPDATED', entity: 'Bank Details · EMP-0004 (Sneha Iyer)', ip: '117.192.4.2' },
  { id: 'al-5', time: '18 Sep 2026, 11:20 AM', actor: 'Ananya Rao', action: 'LOCKED', entity: 'Payroll Run · May 2026 (FnF)', ip: '103.21.244.10' },
  { id: 'al-6', time: '17 Sep 2026, 02:05 PM', actor: 'System', action: 'GENERATED', entity: 'Payslip · EMP-0012 (Suresh Pillai)', ip: '—' },
  { id: 'al-7', time: '15 Sep 2026, 09:30 AM', actor: 'Ananya Rao', action: 'PAID', entity: 'Payroll Run · August 2026', ip: '103.21.244.10' },
];

export const reportCatalog = [
  { title: 'Payroll Summary', description: 'Gross, deductions and net payable by pay period.' },
  { title: 'Attendance Report', description: 'Present/absent/LOP days by employee and department.' },
  { title: 'Leave Report', description: 'Leave taken, balances and encashment by employee.' },
  { title: 'Statutory Report', description: 'PF, ESI, Professional Tax and TDS filings by period.' },
  { title: 'Department Payroll Cost', description: 'Cost distribution across departments and branches.' },
  { title: 'Payroll Variance', description: 'Month-over-month change in gross and net payroll cost.' },
  { title: 'Reimbursement Report', description: 'Claims submitted, approved and paid by category.' },
];

export const notifications = [
  { id: 'n-1', title: 'Payslip ready', body: 'Your August 2026 payslip is now available.', time: '2d ago' },
  { id: 'n-2', title: 'Leave approved', body: 'Your Sick Leave for Sep 5–6 was approved by Rohan Mehta.', time: '5d ago' },
  { id: 'n-3', title: 'Holiday reminder', body: 'Gandhi Jayanti (Oct 2) is a company holiday.', time: '1w ago' },
];
