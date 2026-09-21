import type { RuleResult } from '../engine/types';

export interface PtSlab {
  upTo: number | null; // null = no upper bound
  amount: number;
}

export interface ProfessionalTaxConfig {
  state: string;
  slabs: PtSlab[]; // ordered ascending by upTo
}

export interface ProfessionalTaxContext {
  grossWage: number;
}

// Example default: Karnataka-style slabs (illustrative; real slabs are state-specific and configured per company)
export function calculateProfessionalTax(ctx: ProfessionalTaxContext, config: ProfessionalTaxConfig): RuleResult {
  const slab = config.slabs.find((s) => s.upTo === null || ctx.grossWage <= s.upTo) ?? config.slabs[config.slabs.length - 1];
  const amount = slab ? slab.amount : 0;
  return {
    ruleKey: 'professional_tax',
    employeeAmount: amount,
    employerAmount: 0,
    trace: { state: config.state, grossWage: ctx.grossWage, slabAmount: amount },
  };
}
