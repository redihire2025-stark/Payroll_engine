import type { PayrollCalculationInput, PayrollCalculationResult, RuleResult, SalaryComponentInput } from './types';
import { calculateEpf, type EpfConfig } from '../rules/epf';
import { calculateEsi, type EsiConfig } from '../rules/esi';
import { calculateProfessionalTax, type ProfessionalTaxConfig } from '../rules/professionalTax';
import { calculateTds, type TdsConfig } from '../rules/tds';

/** Prorates earnings for LOP days against total working days in the period. No LOP => 1.0 (no change). */
export function prorateForLop(components: SalaryComponentInput[], workingDays: number, lopDays: number): SalaryComponentInput[] {
  if (lopDays <= 0 || workingDays <= 0) return components;
  const factor = Math.max(0, (workingDays - lopDays) / workingDays);
  return components.map((c) => (c.type === 'earning' ? { ...c, amount: Math.round(c.amount * factor) } : c));
}

export function computeGross(components: SalaryComponentInput[]): number {
  return components.filter((c) => c.type === 'earning').reduce((sum, c) => sum + c.amount, 0);
}

function findComponent(components: SalaryComponentInput[], code: string): number {
  return components.find((c) => c.code === code)?.amount ?? 0;
}

/**
 * Runs the enabled, configured rule sets for one employee's payroll item.
 * Each rule is a pure function; adding a new statutory rule means adding one
 * handler here and enabling it via config — never touching this pipeline.
 */
export function applyRuleSets(input: PayrollCalculationInput, prorated: SalaryComponentInput[]): RuleResult[] {
  const gross = computeGross(prorated);
  const basic = findComponent(prorated, 'BASIC');
  const results: RuleResult[] = [];

  for (const rule of input.ruleSets) {
    if (!rule.enabled) continue;
    if (rule.ruleKey === 'epf') {
      results.push(calculateEpf({ basicPlusDa: basic }, rule.config as unknown as EpfConfig));
    } else if (rule.ruleKey === 'esi') {
      results.push(calculateEsi({ grossWage: gross }, rule.config as unknown as EsiConfig));
    } else if (rule.ruleKey === 'professional_tax') {
      const cfg = rule.config as unknown as ProfessionalTaxConfig;
      results.push(calculateProfessionalTax({ grossWage: gross }, cfg));
    } else if (rule.ruleKey === 'tds') {
      const cfg = rule.config as unknown as TdsConfig;
      results.push(
        calculateTds(
          {
            projectedAnnualTaxableIncome: Math.max(0, gross * 12 - (input.declaredExemptions ?? 0)),
            monthsRemainingInYear: 12,
            tdsAlreadyDeductedThisYear: 0,
          },
          cfg
        )
      );
    }
  }
  return results;
}

export function calculatePayrollItem(input: PayrollCalculationInput): PayrollCalculationResult {
  const prorated = prorateForLop(input.salaryComponents, input.attendance.workingDays, input.attendance.lopDays);
  const grossEarnings = computeGross(prorated);
  const preExistingDeductions = prorated.filter((c) => c.type === 'deduction');
  const statutory = applyRuleSets(input, prorated);

  const statutoryEmployeeTotal = statutory.reduce((s, r) => s + r.employeeAmount, 0);
  const statutoryEmployerTotal = statutory.reduce((s, r) => s + r.employerAmount, 0);
  const preExistingDeductionsTotal = preExistingDeductions.reduce((s, c) => s + c.amount, 0);
  const otherDeductionsTotal = input.otherDeductions.reduce((s, d) => s + d.amount, 0) + preExistingDeductionsTotal;

  const netPay = grossEarnings - statutoryEmployeeTotal - otherDeductionsTotal;

  return {
    employeeId: input.employeeId,
    earnings: prorated.filter((c) => c.type === 'earning').map((c) => ({ code: c.code, name: c.name, amount: c.amount })),
    grossEarnings,
    statutory,
    statutoryEmployeeTotal,
    statutoryEmployerTotal,
    otherDeductionsTotal,
    netPay,
    lopDays: input.attendance.lopDays,
    trace: statutory.map((r) => ({ ruleKey: r.ruleKey, input: r.trace, output: { employeeAmount: r.employeeAmount, employerAmount: r.employerAmount } })),
  };
}
