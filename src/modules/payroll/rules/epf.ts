import type { RuleResult } from '../engine/types';

export interface EpfConfig {
  employeePercent: number; // e.g. 12
  employerPercent: number; // e.g. 12
  wageCeiling: number; // e.g. 15000 — PF is computed on min(basic, ceiling) unless employee opted for higher PF
  applyCeiling: boolean;
}

export interface EpfContext {
  basicPlusDa: number;
}

export function calculateEpf(ctx: EpfContext, config: EpfConfig): RuleResult {
  const pfWage = config.applyCeiling ? Math.min(ctx.basicPlusDa, config.wageCeiling) : ctx.basicPlusDa;
  const employeeAmount = Math.round(pfWage * (config.employeePercent / 100));
  const employerAmount = Math.round(pfWage * (config.employerPercent / 100));
  return {
    ruleKey: 'epf',
    employeeAmount,
    employerAmount,
    trace: { pfWage, employeePercent: config.employeePercent, employerPercent: config.employerPercent, applyCeiling: config.applyCeiling },
  };
}
