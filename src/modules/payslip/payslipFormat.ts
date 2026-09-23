/**
 * Shared formatting rules for the payslip document, so the stored PDF
 * (generatePayslipPdf.ts, what employees download) and the in-app HTML
 * preview (PayslipDocument.tsx) render identically instead of drifting
 * apart. Modeled on Redihire's real reference payslip format — see
 * supabase/migrations/0006_company_letterhead.sql.
 */

/** Known statutory/salary component codes mapped to the labels payslips conventionally use, rather than the raw DB code (e.g. "SPECIAL_ALLOWANCE" -> "Special Allowance"). */
const COMPONENT_LABELS: Record<string, string> = {
  BASIC: 'Basic Salary',
  HRA: 'House Rent Allowance',
  SPECIAL_ALLOWANCE: 'Special Allowance',
  CONVEYANCE: 'Conveyance Allowance',
  PERFORMANCE_BONUS: 'Performance Bonus',
  epf: 'Provident Fund',
  esi: 'ESI',
  professional_tax: 'Professional Tax',
  tds: 'Income Tax (TDS)',
};

export function componentLabel(code: string): string {
  if (COMPONENT_LABELS[code]) return COMPONENT_LABELS[code];
  return code
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function isBonus(code: string): boolean {
  return /bonus|incentive/i.test(code);
}

/** The 4 statutory deductions every rule set always evaluates — shown explicitly at ₹0 when not deducted, matching how the reference payslip states "Provident Fund ₹0.00" rather than omitting the line. */
export const STATUTORY_DEDUCTION_CODES = ['epf', 'esi', 'professional_tax', 'tds'];

export function withStatutoryZeroLines(deductions: { code: string; amount: number }[]): { code: string; amount: number }[] {
  const present = new Map(deductions.map((d) => [d.code, d.amount]));
  const statutoryRows = STATUTORY_DEDUCTION_CODES.map((code) => ({ code, amount: present.get(code) ?? 0 }));
  const otherRows = deductions.filter((d) => !STATUTORY_DEDUCTION_CODES.includes(d.code));
  return [...statutoryRows, ...otherRows];
}

/** "SALARY SLIP For the Month of July'2025" for a full calendar month (the reference format); falls back to a plain date range for off-cycle/partial periods. */
export function formatSalarySlipTitle(periodStart: string, periodEnd: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const isFullCalendarMonth = start.getDate() === 1 && end.getDate() === daysInMonth && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (isFullCalendarMonth) {
    const month = start.toLocaleDateString('en-IN', { month: 'long' });
    return `SALARY SLIP For the Month of ${month}'${start.getFullYear()}`;
  }
  return `SALARY SLIP for ${periodStart} to ${periodEnd}`;
}

/** The exact "IMPORTANT NOTES" wording from Redihire's reference payslip, made data-driven so it stays true for any employee/month (e.g. a month where PF actually was deducted doesn't falsely claim it wasn't). */
export function buildImportantNotes(input: {
  state: string | null;
  professionalTax: number;
  epf: number;
  esi: number;
  tds: number;
  lopDays: number;
}): string[] {
  const notes: string[] = [];
  if (input.professionalTax > 0) {
    notes.push(`Professional Tax of ₹${input.professionalTax} is as per ${input.state ?? 'the applicable'} State rules.`);
  }
  if (input.epf === 0 && input.esi === 0) {
    notes.push('PF and ESI deductions are not applicable as per the current salary structure.');
  }
  if (input.tds === 0) {
    notes.push('No Income Tax deduction as annual income is below taxable limit.');
  }
  if (input.lopDays > 0) {
    notes.push(`${input.lopDays} day(s) of loss-of-pay adjusted for this period.`);
  }
  notes.push('This payslip is computer generated and does not require signature.');
  return notes;
}
