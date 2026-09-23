// Wires the tested calculation engine (engine/pipeline.ts + rules/*) into a
// real payroll run: pulls eligible employees + their current salary
// structure + attendance-derived LOP for the period, runs the pipeline,
// and writes payroll_items/earnings/deductions/contributions/logs.
//
// Runs client-side (not a Netlify Function) — the calculation itself is
// pure and side-effect-free, and every write here is already covered by
// the payroll_admin/company_admin/company_owner RLS policies from
// 0008_extended_rls_policies.sql, so no service-role escalation is needed.

import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';
import { getCurrentSalaryAssignment, getStructureComponents } from '@/modules/salary/salaryService';
import { calculatePayrollItem } from './engine/pipeline';
import type { PayrollCalculationInput, RuleConfig, SalaryComponentInput } from './engine/types';
import { getVerifiedExemptionsTotal } from '@/modules/tax/taxService';
import { financialYearFor } from '@/modules/tax/financialYear';
import { runAsJob } from '@/modules/jobs/jobService';

// Sensible Indian statutory defaults, used whenever a company hasn't
// configured its own payroll_rule_sets yet — a run should never silently
// skip statutory deductions just because nobody has filled in a config
// screen. A company can still override any of these via payroll_rule_sets.
const DEFAULT_RULE_SETS: RuleConfig[] = [
  { ruleKey: 'epf', enabled: true, config: { employeePercent: 12, employerPercent: 12, wageCeiling: 15000, applyCeiling: true } },
  { ruleKey: 'esi', enabled: true, config: { employeePercent: 0.75, employerPercent: 3.25, eligibilityCeiling: 21000 } },
  {
    ruleKey: 'professional_tax',
    enabled: true,
    config: {
      state: 'KA',
      slabs: [
        { upTo: 15000, amount: 0 },
        { upTo: null, amount: 200 },
      ],
    },
  },
  {
    ruleKey: 'tds',
    enabled: true,
    config: {
      regime: 'new',
      standardDeduction: 75000,
      cessPercent: 4,
      slabs: [
        { upTo: 300000, rate: 0 },
        { upTo: 700000, rate: 5 },
        { upTo: 1000000, rate: 10 },
        { upTo: 1200000, rate: 15 },
        { upTo: 1500000, rate: 20 },
        { upTo: null, rate: 30 },
      ],
    },
  },
];

async function loadRuleSets(companyId: string, periodEnd: string): Promise<RuleConfig[]> {
  const { data, error } = await supabase
    .from('payroll_rule_sets')
    .select('rule_key, config, effective_from, effective_to')
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .lte('effective_from', periodEnd)
    .or(`effective_to.is.null,effective_to.gte.${periodEnd}`);
  if (error) throw error;

  const configured = new Map((data ?? []).map((r) => [r.rule_key as string, { ruleKey: r.rule_key as string, enabled: true, config: r.config as Record<string, unknown> }]));
  return DEFAULT_RULE_SETS.map((fallback) => configured.get(fallback.ruleKey) ?? fallback);
}

function daysInclusive(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

async function loadSalaryComponents(structureId: string): Promise<SalaryComponentInput[]> {
  const rows = await getStructureComponents(structureId);
  const resolved = new Map<string, number>();

  // Fixed 'amount' components resolve first, so 'percentage' components that
  // reference them (e.g. HRA = 40% of Basic) have a value to read.
  for (const c of rows.filter((r) => r.valueType === 'amount')) resolved.set(c.salaryComponentId, c.value);
  for (const c of rows.filter((r) => r.valueType === 'percentage')) {
    const base = c.percentageOfComponentId ? (resolved.get(c.percentageOfComponentId) ?? 0) : 0;
    resolved.set(c.salaryComponentId, Math.round(base * (c.value / 100)));
  }

  return rows
    .filter((r) => !r.isStatutory && (r.type === 'earning' || r.type === 'deduction'))
    .map((r) => ({
      code: r.code,
      name: r.name,
      type: r.type as 'earning' | 'deduction',
      amount: resolved.get(r.salaryComponentId) ?? 0,
      isTaxable: r.isTaxable,
    }));
}

async function countAbsentDays(employeeId: string, periodStart: string, periodEnd: string): Promise<number> {
  const { count, error } = await supabase
    .from('attendance_records')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .gte('work_date', periodStart)
    .lte('work_date', periodEnd)
    .eq('status', 'absent');
  if (error) throw error;
  return count ?? 0;
}

export interface CreatePayrollRunInput {
  companyId: string;
  periodStart: string;
  periodEnd: string;
  runType: 'regular' | 'off_cycle' | 'fnf';
  createdBy: string;
}

export async function createPayrollRun(input: CreatePayrollRunInput): Promise<string> {
  const { data, error } = await supabase
    .from('payroll_runs')
    .insert({
      company_id: input.companyId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      run_type: input.runType,
      status: 'draft',
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface ExecuteResult {
  processed: number;
  skipped: { employeeId: string; reason: string }[];
}

/** Runs the full calculation pipeline for every eligible employee and writes the results. Moves draft/calculating -> calculated. Tracked as a background_jobs row so a failed/slow run is admin-visible rather than an opaque browser-side promise. */
export async function executePayrollRun(runId: string, companyId: string, calculatedBy: string): Promise<ExecuteResult> {
  return runAsJob(companyId, 'payroll_run', { runId }, () => executePayrollRunInner(runId, companyId, calculatedBy));
}

async function executePayrollRunInner(runId: string, companyId: string, calculatedBy: string): Promise<ExecuteResult> {
  const { data: run, error: runErr } = await supabase.from('payroll_runs').select('period_start, period_end, status').eq('id', runId).single();
  if (runErr) throw runErr;
  if (run.status !== 'draft') throw new Error(`Cannot run a payroll already in "${run.status}" status.`);

  const { error: startErr } = await supabase.from('payroll_runs').update({ status: 'calculating' }).eq('id', runId);
  if (startErr) throw startErr;

  const periodStart = run.period_start as string;
  const periodEnd = run.period_end as string;
  const workingDays = daysInclusive(periodStart, periodEnd);

  const [employees, ruleSets] = await Promise.all([listEmployeesLite(companyId), loadRuleSets(companyId, periodEnd)]);

  const skipped: ExecuteResult['skipped'] = [];
  let processed = 0;

  for (const employee of employees) {
    const assignment = await getCurrentSalaryAssignment(employee.id, periodEnd);
    if (!assignment) {
      skipped.push({ employeeId: employee.id, reason: 'No salary structure assigned' });
      continue;
    }

    const [salaryComponents, lopDays, declaredExemptions] = await Promise.all([
      loadSalaryComponents(assignment.salaryStructureId),
      countAbsentDays(employee.id, periodStart, periodEnd),
      getVerifiedExemptionsTotal(employee.id, financialYearFor(periodEnd)),
    ]);
    if (salaryComponents.length === 0) {
      skipped.push({ employeeId: employee.id, reason: 'Salary structure has no components' });
      continue;
    }

    const input: PayrollCalculationInput = {
      employeeId: employee.id,
      salaryComponents,
      attendance: { workingDays, presentDays: workingDays - lopDays, paidLeaveDays: 0, lopDays },
      ruleSets,
      otherDeductions: [],
      declaredExemptions,
    };
    const result = calculatePayrollItem(input);

    const { data: item, error: itemErr } = await supabase
      .from('payroll_items')
      .insert({
        payroll_run_id: runId,
        employee_id: employee.id,
        salary_structure_snapshot: { structureId: assignment.salaryStructureId, annualCtc: assignment.annualCtc, components: salaryComponents },
        gross_earnings: result.grossEarnings,
        total_deductions: result.statutoryEmployeeTotal + result.otherDeductionsTotal,
        net_pay: result.netPay,
        lop_days: result.lopDays,
        status: 'calculated',
      })
      .select('id')
      .single();
    if (itemErr) throw itemErr;

    if (result.earnings.length > 0) {
      const { error } = await supabase.from('payroll_earnings').insert(
        result.earnings.map((e) => ({ payroll_item_id: item.id, component_code: e.code, amount: e.amount }))
      );
      if (error) throw error;
    }
    const employeeDeductions = result.statutory.filter((r) => r.employeeAmount > 0);
    if (employeeDeductions.length > 0) {
      const { error } = await supabase.from('payroll_deductions').insert(
        employeeDeductions.map((r) => ({ payroll_item_id: item.id, component_code: r.ruleKey, amount: r.employeeAmount }))
      );
      if (error) throw error;
    }
    const employerContributions = result.statutory.filter((r) => r.employerAmount > 0);
    if (employerContributions.length > 0) {
      const { error } = await supabase.from('payroll_contributions').insert(
        employerContributions.map((r) => ({ payroll_item_id: item.id, component_code: r.ruleKey, amount: r.employerAmount }))
      );
      if (error) throw error;
    }
    if (result.trace.length > 0) {
      const { error } = await supabase.from('payroll_calculation_logs').insert(
        result.trace.map((t) => ({
          payroll_run_id: runId,
          employee_id: employee.id,
          rule_key: t.ruleKey,
          input_snapshot: t.input as object,
          output_snapshot: t.output as object,
          rule_version: 'v1',
        }))
      );
      if (error) throw error;
    }

    processed += 1;
  }

  const { error: finishErr } = await supabase
    .from('payroll_runs')
    .update({ status: 'calculated', calculated_at: new Date().toISOString(), calculated_by: calculatedBy })
    .eq('id', runId);
  if (finishErr) throw finishErr;

  return { processed, skipped };
}

const NEXT_STATUS: Record<string, string> = {
  calculated: 'under_review',
  under_review: 'approved',
  approved: 'locked',
  locked: 'paid',
};

export async function advancePayrollRun(runId: string, currentStatus: string, approvedBy?: string): Promise<void> {
  const next = NEXT_STATUS[currentStatus];
  if (!next) throw new Error(`Cannot advance a run from "${currentStatus}".`);
  const patch: Record<string, unknown> = { status: next };
  if (next === 'approved') patch.approved_at = new Date().toISOString();
  if (next === 'approved' && approvedBy) patch.approved_by = approvedBy;
  if (next === 'locked') patch.locked_at = new Date().toISOString();
  if (next === 'paid') patch.paid_at = new Date().toISOString();
  const { error } = await supabase.from('payroll_runs').update(patch).eq('id', runId);
  if (error) throw error;
}

export async function sendBackToDraft(runId: string): Promise<void> {
  const { error } = await supabase.from('payroll_runs').update({ status: 'draft' }).eq('id', runId);
  if (error) throw error;
}
