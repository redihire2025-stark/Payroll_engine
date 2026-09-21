import { describe, it, expect } from 'vitest';
import { calculatePayrollItem, prorateForLop, computeGross } from '../engine/pipeline';
import type { PayrollCalculationInput, SalaryComponentInput } from '../engine/types';

const components: SalaryComponentInput[] = [
  { code: 'BASIC', name: 'Basic', type: 'earning', amount: 30000, isTaxable: true },
  { code: 'HRA', name: 'HRA', type: 'earning', amount: 12000, isTaxable: true },
  { code: 'SPECIAL', name: 'Special Allowance', type: 'earning', amount: 8000, isTaxable: true },
];

const ruleSets: PayrollCalculationInput['ruleSets'] = [
  { ruleKey: 'epf', enabled: true, config: { employeePercent: 12, employerPercent: 12, wageCeiling: 15000, applyCeiling: true } },
  { ruleKey: 'esi', enabled: true, config: { employeePercent: 0.75, employerPercent: 3.25, eligibilityCeiling: 21000 } },
  { ruleKey: 'professional_tax', enabled: true, config: { state: 'Karnataka', slabs: [{ upTo: 15000, amount: 0 }, { upTo: null, amount: 200 }] } },
];

describe('prorateForLop', () => {
  it('leaves earnings unchanged when there is no LOP', () => {
    const result = prorateForLop(components, 26, 0);
    expect(computeGross(result)).toBe(computeGross(components));
  });

  it('prorates earnings proportionally to LOP days out of working days', () => {
    // 2 LOP days out of 26 working days => 24/26 factor
    const result = prorateForLop(components, 26, 2);
    const factor = 24 / 26;
    expect(result[0].amount).toBe(Math.round(30000 * factor));
  });

  it('zeroes out earnings entirely on a full-LOP month', () => {
    const result = prorateForLop(components, 26, 26);
    expect(computeGross(result)).toBe(0);
  });

  it('never produces a negative factor if lopDays somehow exceeds workingDays', () => {
    const result = prorateForLop(components, 26, 30);
    expect(computeGross(result)).toBe(0);
  });
});

describe('calculatePayrollItem — end to end', () => {
  const baseInput: PayrollCalculationInput = {
    employeeId: 'emp-1',
    salaryComponents: components,
    attendance: { workingDays: 26, presentDays: 26, paidLeaveDays: 0, lopDays: 0 },
    ruleSets,
    otherDeductions: [],
  };

  it('computes gross, statutory deductions and net pay for a full-attendance month', () => {
    const result = calculatePayrollItem(baseInput);
    expect(result.grossEarnings).toBe(50000);
    // ESI not eligible above 21000 gross
    const esi = result.statutory.find((r) => r.ruleKey === 'esi')!;
    expect(esi.employeeAmount).toBe(0);
    // PF: 12% of basic capped at 15000 ceiling => 1800
    const pf = result.statutory.find((r) => r.ruleKey === 'epf')!;
    expect(pf.employeeAmount).toBe(1800);
    expect(result.netPay).toBe(result.grossEarnings - result.statutoryEmployeeTotal - result.otherDeductionsTotal);
  });

  it('reduces net pay correctly for a mid-month joiner with LOP days', () => {
    const midMonthInput: PayrollCalculationInput = {
      ...baseInput,
      attendance: { workingDays: 26, presentDays: 13, paidLeaveDays: 0, lopDays: 13 },
    };
    const result = calculatePayrollItem(midMonthInput);
    expect(result.grossEarnings).toBe(Math.round(50000 * (13 / 26)));
    expect(result.lopDays).toBe(13);
  });

  it('subtracts other deductions (loan EMI, advance recovery) from net pay', () => {
    const withLoan: PayrollCalculationInput = {
      ...baseInput,
      otherDeductions: [{ code: 'LOAN_EMI', label: 'Loan EMI', amount: 5000 }],
    };
    const withoutLoan = calculatePayrollItem(baseInput);
    const result = calculatePayrollItem(withLoan);
    expect(result.netPay).toBe(withoutLoan.netPay - 5000);
  });

  it('never lets net pay computation silently drop a statutory deduction from the trace', () => {
    const result = calculatePayrollItem(baseInput);
    expect(result.trace.length).toBe(result.statutory.length);
    expect(result.trace.map((t) => t.ruleKey).sort()).toEqual(result.statutory.map((r) => r.ruleKey).sort());
  });
});
