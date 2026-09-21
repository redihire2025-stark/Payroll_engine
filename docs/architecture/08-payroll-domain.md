# 8. Payroll Domain Architecture

The payroll engine is a **pure TypeScript domain module** (`src/modules/payroll/engine/`),
independent of React, calling out to data (via repository functions) and to a
pluggable **rule engine** for statutory calculations. It is invoked exclusively from
the `payroll-calculate` Edge Function (server-side) — never from a component.

## 8.1 Calculation Pipeline

```
Employee
  → Salary Structure (active assignment as of period)
  → Attendance summary (present/LOP days for the period)
  → Leave (approved leave mapped to paid/unpaid per policy)
  → Variable Inputs (bonus, arrears, one-off reimbursement payouts, manual adjustments)
  → Earnings computation (apply salary_structure_components, prorate by LOP)
  → Gross Salary
  → Statutory Rule Engine (PF, ESI, PT, LWF, TDS, ... — versioned, effective-dated)
  → Other Deductions (loan EMIs due, advance recovery)
  → Net Salary
  → PayrollItem (+ PayrollEarnings/Deductions/Contributions rows)
  → PayrollCalculationLog (full input/output snapshot per rule, per employee)
  → Payslip (generated only after LOCKED)
```

Each stage is a pure function: `(input) => output`, individually unit-testable, with
no hidden state. The pipeline function composes them:

```ts
function calculatePayrollItem(input: PayrollCalculationInput): PayrollCalculationResult {
  const attendance = summarizeAttendance(input.attendanceRecords, input.policy);
  const earnings = computeEarnings(input.salaryStructureSnapshot, attendance);
  const gross = sumEarnings(earnings);
  const statutory = applyRuleSets(input.ruleSets, { gross, earnings, employeeContext: input.employee });
  const otherDeductions = computeOtherDeductions(input.loanEmis, input.advanceRecoveries, input.adjustments);
  const net = gross - statutory.totalDeductions - otherDeductions.total;
  return { earnings, gross, statutory, otherDeductions, net, trace: buildTrace(...) };
}
```

## 8.2 Statutory Rule Engine (configurable, not hard-coded)

Statutory rules are stored as data in `payroll_rule_sets`
(`rule_key`, `country_code`, `version`, `effective_from/to`, `config jsonb`) and
interpreted by a small set of **rule handlers**, one per `rule_key`:

```
src/modules/payroll/rules/
  epf.ts        Reads config (employee %, employer %, wage ceiling) → computes PF
  esi.ts        Reads config (eligibility ceiling, employee/employer %) → computes ESI
  professional_tax.ts   Reads config (slab table per state) → computes PT
  lwf.ts         Reads config (slab/frequency) → computes LWF
  tds.ts         Reads config (regime slabs, cess) → computes TDS from annualized income
  gratuity.ts    (FnF only) reads config (formula, eligibility years) → computes gratuity
```

A rule handler's signature is uniform:
```ts
type RuleHandler = (context: RuleContext, config: unknown) => RuleResult;
```
`applyRuleSets` looks up the active (effective-dated) `payroll_rule_sets` row for
each `rule_key` enabled in the company's payroll policy, and calls the matching
handler. **Adding a new statutory rule, or a new country, means writing one new
handler + inserting config rows — it never means touching the pipeline or other
rules.** A company that doesn't apply a given rule (e.g., ESI not applicable because
all employees are above the wage ceiling, or a country with no PF equivalent) simply
has no enabled rule set for it — the engine does not assume any rule is mandatory.

## 8.3 Payroll State Machine

```
DRAFT → CALCULATING → CALCULATED → UNDER_REVIEW → APPROVED → LOCKED → PAID
                                        ↓
                                    CANCELLED (only from DRAFT/CALCULATING/CALCULATED/UNDER_REVIEW)
```

Rules:
- Transitions are enforced in one place: a `canTransition(from, to, actor)` guard
  called by the `payroll-calculate`/`payroll-lock` Edge Functions. No UI or
  service-layer code writes `payroll_runs.status` directly.
- `CALCULATED → UNDER_REVIEW → APPROVED` requires at least one `approval_requests`
  record resolved as `approved`, by a user with `hr_admin`/`company_admin`/
  `company_owner`, per the segregation-of-duties rule in
  [03-roles-matrix](./03-roles-matrix.md).
- `APPROVED → LOCKED` is the point of no silent modification: once `LOCKED`,
  `payroll_items`/`payroll_earnings`/`payroll_deductions`/`payroll_contributions`
  become effectively immutable (enforced by RLS deny-update + a DB trigger that
  rejects updates when the parent run is `LOCKED`).
- `LOCKED → PAID` is a `finance` action recording payment reference info, not a
  recalculation.
- **Corrections after LOCKED**: never edit locked rows. Create a new
  `payroll_adjustments` record (and, if material, a follow-up off-cycle
  `payroll_run` of `run_type = 'correction'`) that references the original run/item.
  The original stays as the historical record of what was actually paid/calculated
  at the time.

## 8.4 Auditability

Per calculation, `payroll_calculation_logs` stores, per employee per rule applied:
`input_snapshot`, `output_snapshot`, `rule_version`, timestamp. Per run,
`payroll_runs` stores who calculated / approved / locked and when. Per item,
`payroll_items.salary_structure_snapshot` freezes the structure **as it was at
calculation time** (a later edit to the live `salary_structures` table must never
change history). This directly answers "why did this employee receive this net
salary" without recomputation — the trace is stored, not derived on demand.

## 8.5 Testing Strategy (see also [12](./12-development-phases.md) Phase 5)

Every rule handler ships with table-driven test cases before it's considered done:
given employee inputs (basic/HRA/allowances, attendance/LOP), assert exact
gross/deductions/net, including edge cases (mid-month joiner/exit, full LOP month,
wage-ceiling boundary for PF/ESI, negative/zero net edge case handling). No rule
handler is merged without tests — this is a hard gate, not a suggestion, given
payroll correctness is the product's core trust requirement.
