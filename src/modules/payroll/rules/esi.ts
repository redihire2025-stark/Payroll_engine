import type { RuleResult } from '../engine/types';

export interface EsiConfig {
  employeePercent: number; // e.g. 0.75
  employerPercent: number; // e.g. 3.25
  eligibilityCeiling: number; // e.g. 21000 — gross above this is not ESI-eligible
}

export interface EsiContext {
  grossWage: number;
}

export function calculateEsi(ctx: EsiContext, config: EsiConfig): RuleResult {
  const eligible = ctx.grossWage <= config.eligibilityCeiling;
  const employeeAmount = eligible ? Math.round(ctx.grossWage * (config.employeePercent / 100)) : 0;
  const employerAmount = eligible ? Math.round(ctx.grossWage * (config.employerPercent / 100)) : 0;
  return {
    ruleKey: 'esi',
    employeeAmount,
    employerAmount,
    trace: { eligible, grossWage: ctx.grossWage, eligibilityCeiling: config.eligibilityCeiling },
  };
}
