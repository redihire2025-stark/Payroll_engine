export interface SalaryComponentInput {
  code: string;
  name: string;
  type: 'earning' | 'deduction';
  amount: number; // monthly, already resolved (percentage components pre-computed)
  isTaxable: boolean;
}

export interface AttendanceInput {
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  lopDays: number;
}

export interface RuleConfig {
  ruleKey: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface PayrollCalculationInput {
  employeeId: string;
  salaryComponents: SalaryComponentInput[];
  attendance: AttendanceInput;
  ruleSets: RuleConfig[];
  otherDeductions: { code: string; label: string; amount: number }[];
  /** Annual sum of the employee's *verified* tax declaration exemptions, subtracted before the TDS slab calculation. */
  declaredExemptions?: number;
}

export interface RuleResult {
  ruleKey: string;
  employeeAmount: number;
  employerAmount: number;
  trace: Record<string, number | boolean | string>;
}

export interface PayrollCalculationResult {
  employeeId: string;
  earnings: { code: string; name: string; amount: number }[];
  grossEarnings: number;
  statutory: RuleResult[];
  statutoryEmployeeTotal: number;
  statutoryEmployerTotal: number;
  otherDeductionsTotal: number;
  netPay: number;
  lopDays: number;
  trace: PayrollCalculationLog[];
}

export interface PayrollCalculationLog {
  ruleKey: string;
  input: unknown;
  output: unknown;
}
