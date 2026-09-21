import type { RuleResult } from '../engine/types';

export interface TdsSlab {
  upTo: number | null;
  rate: number; // percent, applied to the portion of income within this slab
}

export interface TdsConfig {
  regime: 'new' | 'old';
  standardDeduction: number;
  cessPercent: number; // e.g. 4
  slabs: TdsSlab[]; // ascending, cumulative-bracket style
}

export interface TdsContext {
  projectedAnnualTaxableIncome: number; // gross annualized, minus declared exemptions upstream
  monthsRemainingInYear: number; // for spreading remaining liability across remaining pay cycles
  tdsAlreadyDeductedThisYear: number;
}

function slabTax(income: number, slabs: TdsSlab[]): number {
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    const upper = slab.upTo ?? Infinity;
    if (income > lower) {
      const taxableInSlab = Math.min(income, upper) - lower;
      tax += taxableInSlab * (slab.rate / 100);
    }
    lower = upper;
    if (income <= upper) break;
  }
  return tax;
}

export function calculateTds(ctx: TdsContext, config: TdsConfig): RuleResult {
  const taxableIncome = Math.max(0, ctx.projectedAnnualTaxableIncome - config.standardDeduction);
  const baseTax = slabTax(taxableIncome, config.slabs);
  const cess = baseTax * (config.cessPercent / 100);
  const annualTax = Math.round(baseTax + cess);
  const remainingTax = Math.max(0, annualTax - ctx.tdsAlreadyDeductedThisYear);
  const monthlyTds = ctx.monthsRemainingInYear > 0 ? Math.round(remainingTax / ctx.monthsRemainingInYear) : 0;
  return {
    ruleKey: 'tds',
    employeeAmount: monthlyTds,
    employerAmount: 0,
    trace: { taxableIncome, baseTax: Math.round(baseTax), cess: Math.round(cess), annualTax, monthlyTds },
  };
}
