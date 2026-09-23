import type jsPDFType from 'jspdf';
import { formatINR2, numberToWordsINR } from '@/shared/lib/format';

export interface PayslipPdfInput {
  companyName: string;
  companyRegOffice: string | null;
  companyCin: string | null;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  designation: string | null;
  dateOfJoining: string | null;
  workingDays: number;
  periodStart: string;
  periodEnd: string;
  earnings: { code: string; amount: number }[];
  deductions: { code: string; amount: number }[];
  contributions: { code: string; amount: number }[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  lopDays: number;
}

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

function componentLabel(code: string): string {
  if (COMPONENT_LABELS[code]) return COMPONENT_LABELS[code];
  return code
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isBonus(code: string): boolean {
  return /bonus|incentive/i.test(code);
}

/** The 4 statutory deductions every rule set always evaluates — shown explicitly at ₹0 when not deducted, matching how a real payslip states "Provident Fund ₹0.00" rather than omitting the line. */
const STATUTORY_DEDUCTION_CODES = ['epf', 'esi', 'professional_tax', 'tds'];

function withStatutoryZeroLines(deductions: { code: string; amount: number }[]): { code: string; amount: number }[] {
  const present = new Map(deductions.map((d) => [d.code, d.amount]));
  const statutoryRows = STATUTORY_DEDUCTION_CODES.map((code) => ({ code, amount: present.get(code) ?? 0 }));
  const otherRows = deductions.filter((d) => !STATUTORY_DEDUCTION_CODES.includes(d.code));
  return [...statutoryRows, ...otherRows];
}

function formatPeriodLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const isFullCalendarMonth = start.getDate() === 1 && end.getDate() === daysInMonth && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (isFullCalendarMonth) {
    return `Salary Slip for ${start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
  }
  return `Payslip for ${periodStart} to ${periodEnd}`;
}

/** Builds a payslip PDF with plain jsPDF text/line drawing — no html2canvas, no DOM snapshot, so it works identically whether triggered from a browser tab or a batch "Generate Payslips" run over many employees. */
export function buildPayslipPdf(doc: jsPDFType, input: PayslipPdfInput): jsPDFType {
  const marginX = 15;
  const pageWidth = 210;
  let y = 18;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(input.companyName, marginX, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (input.companyRegOffice) {
    doc.text(input.companyRegOffice, marginX, y);
    y += 5;
  }
  if (input.companyCin) {
    doc.text(`CIN: ${input.companyCin}`, marginX, y);
    y += 5;
  }

  y += 3;
  doc.setDrawColor(200);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPeriodLabel(input.periodStart, input.periodEnd), marginX, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dojLabel = input.dateOfJoining
    ? new Date(`${input.dateOfJoining}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const infoLines: [string, string][] = [
    ['Employee Name', input.employeeName],
    ['Employee Code', input.employeeCode],
    ['Department', input.department ?? '—'],
    ['Designation', input.designation ?? '—'],
    ['Date of Joining', dojLabel],
    ['Working Days', String(input.workingDays)],
  ];
  for (const [label, value] of infoLines) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, marginX + 45, y);
    y += 6;
  }
  if (input.lopDays > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Loss of Pay Days:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(input.lopDays), marginX + 45, y);
    y += 6;
  }

  y += 4;

  function drawTable(title: string, rows: { code: string; amount: number }[], total: number) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(marginX, y, pageWidth - marginX * 2, 7, 'F');
    doc.text(title, marginX + 2, y + 5);
    doc.text('Amount', pageWidth - marginX - 25, y + 5);
    y += 9;

    doc.setFont('helvetica', 'normal');
    for (const row of rows) {
      doc.text(componentLabel(row.code), marginX + 2, y);
      doc.text(formatINR2(row.amount), pageWidth - marginX - 2, y, { align: 'right' });
      y += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 5;
    doc.text('Total', marginX + 2, y);
    doc.text(formatINR2(total), pageWidth - marginX - 2, y, { align: 'right' });
    y += 10;
  }

  const regularEarnings = input.earnings.filter((e) => !isBonus(e.code));
  const bonusEarnings = input.earnings.filter((e) => isBonus(e.code));
  const regularEarningsTotal = regularEarnings.reduce((s, e) => s + e.amount, 0);
  const bonusTotal = bonusEarnings.reduce((s, e) => s + e.amount, 0);
  const deductionsWithStatutoryZeroLines = withStatutoryZeroLines(input.deductions);

  drawTable('Regular Earnings', regularEarnings, regularEarningsTotal);
  drawTable('Deductions', deductionsWithStatutoryZeroLines, input.totalDeductions);
  if (bonusEarnings.length > 0) {
    drawTable('Bonus / Incentives', bonusEarnings, bonusTotal);
  }
  if (input.contributions.length > 0) {
    const contributionsTotal = input.contributions.reduce((s, c) => s + c.amount, 0);
    drawTable('Employer Contributions (not deducted from net pay)', input.contributions, contributionsTotal);
  }

  doc.setFillColor(11, 93, 69);
  doc.setTextColor(255, 255, 255);
  doc.rect(marginX, y, pageWidth - marginX * 2, 14, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', marginX + 3, y + 9);
  doc.text(formatINR2(input.netPay), pageWidth - marginX - 3, y + 9, { align: 'right' });
  y += 20;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Amount in words: ${numberToWordsINR(input.netPay)} Rupees Only`, marginX, y);
  y += 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This payslip is computer generated and does not require a signature.', marginX, y);

  return doc;
}
