import type jsPDFType from 'jspdf';
import { formatINR2, numberToWordsINR } from '@/shared/lib/format';
import { componentLabel, isBonus, withStatutoryZeroLines, formatSalarySlipTitle, buildImportantNotes } from './payslipFormat';
import { usePayslipFont } from './payslipPdfFonts';

export interface PayslipPdfInput {
  companyName: string;
  companyLegalName: string;
  companyRegOffice: string | null;
  companyCin: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  companyEmail: string | null;
  companyState: string | null;
  brandAccentColor: string;
  nameAccentPrefixLength: number;
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

const GREEN = '#5CB85C';
const RED = '#E2574C';
const ORANGE = '#F0A500';
const BLUE = '#2B6CB0';
const GRAY_FILL: [number, number, number] = [245, 245, 245];
const BORDER_GRAY: [number, number, number] = [210, 210, 210];

/**
 * Builds the payslip PDF with plain jsPDF text/shape drawing — no
 * html2canvas, no DOM snapshot, so it works identically whether triggered
 * from a browser tab or a batch "Generate Payslips" run over many
 * employees. Layout mirrors Redihire's real reference payslip
 * (letterhead corner accent, boxed employee-info grid, colored
 * Regular Earnings / Deductions / Bonus section bars, a full-width NET
 * PAY banner, Important Notes, letterhead footer) but is driven entirely
 * by the company's own branding fields (brandAccentColor,
 * nameAccentPrefixLength, logo-less wordmark) so a new tenant gets the
 * same page just by setting their own colors/name in Admin → Company.
 */
export async function buildPayslipPdf(doc: jsPDFType, input: PayslipPdfInput): Promise<jsPDFType> {
  await usePayslipFont(doc);

  const marginX = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginX * 2;
  let y = 16;

  // ---- Letterhead corner accent (top-right diagonal wedge) ----
  doc.setFillColor(input.brandAccentColor);
  doc.triangle(pageWidth - 60, 0, pageWidth, 0, pageWidth, 45, 'F');

  // ---- Company wordmark (accent-colored prefix + rest, e.g. "REDI" + "HIRE...") ----
  const upperName = input.companyName.toUpperCase();
  const accentPart = upperName.slice(0, input.nameAccentPrefixLength);
  const restPart = upperName.slice(input.nameAccentPrefixLength);
  doc.setFont('PayslipSans', 'bold');
  doc.setFontSize(13);
  const fullWidth = doc.getTextWidth(accentPart) + doc.getTextWidth(restPart);
  let titleX = (pageWidth - fullWidth) / 2;
  if (accentPart) {
    doc.setTextColor(input.brandAccentColor);
    doc.text(accentPart, titleX, y);
    titleX += doc.getTextWidth(accentPart);
  }
  doc.setTextColor(20, 20, 20);
  doc.text(restPart, titleX, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('PayslipSans', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(formatSalarySlipTitle(input.periodStart, input.periodEnd), pageWidth / 2, y, { align: 'center' });
  y += 10;

  // ---- Employee info grid (2 columns x 3 rows, gray label cells) ----
  const dojLabel = input.dateOfJoining
    ? new Date(`${input.dateOfJoining}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const leftRows: [string, string][] = [
    ['Employee Name:', input.employeeName],
    ['Department:', input.department ?? '—'],
    ['Date of Joining:', dojLabel],
  ];
  const rightRows: [string, string][] = [
    ['Employee ID:', input.employeeCode],
    ['Designation:', input.designation ?? '—'],
    ['Working Days:', String(input.workingDays)],
  ];
  const rowH = 7;
  const colW = contentWidth / 2 - 1;
  const labelW = colW * 0.42;
  doc.setFontSize(9);
  for (let i = 0; i < 3; i++) {
    const rowY = y + i * rowH;
    for (const [colX, [label, value]] of [
      [marginX, leftRows[i]],
      [marginX + colW + 2, rightRows[i]],
    ] as [number, [string, string]][]) {
      doc.setFillColor(...GRAY_FILL);
      doc.setDrawColor(...BORDER_GRAY);
      doc.rect(colX, rowY, labelW, rowH, 'FD');
      doc.rect(colX + labelW, rowY, colW - labelW, rowH, 'D');
      doc.setFont('PayslipSans', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(label, colX + 2, rowY + rowH / 2 + 1.2);
      doc.setFont('PayslipSans', 'normal');
      doc.text(value, colX + labelW + 2, rowY + rowH / 2 + 1.2);
    }
  }
  y += 3 * rowH + 6;

  // ---- Two-column section table (used for Regular Earnings / Deductions) ----
  function drawSectionTable(x: number, width: number, title: string, headerColor: string, rows: { code: string; amount: number }[], totalLabel: string, total: number): number {
    let ty = y;
    doc.setFillColor(headerColor);
    doc.rect(x, ty, width, 7, 'F');
    doc.setFont('PayslipSans', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), x + width / 2, ty + 4.8, { align: 'center' });
    ty += 7;

    doc.setTextColor(20, 20, 20);
    doc.setDrawColor(...BORDER_GRAY);
    for (const row of rows) {
      doc.rect(x, ty, width, 6.5, 'D');
      doc.setFont('PayslipSans', 'normal');
      doc.text(componentLabel(row.code), x + 2, ty + 4.5);
      doc.text(formatINR2(row.amount), x + width - 2, ty + 4.5, { align: 'right' });
      ty += 6.5;
    }

    doc.setFillColor(...GRAY_FILL);
    doc.rect(x, ty, width, 7, 'FD');
    doc.setFont('PayslipSans', 'bold');
    doc.text(totalLabel, x + 2, ty + 4.8);
    doc.text(formatINR2(total), x + width - 2, ty + 4.8, { align: 'right' });
    ty += 7;
    return ty;
  }

  const regularEarnings = input.earnings.filter((e) => !isBonus(e.code));
  const bonusEarnings = input.earnings.filter((e) => isBonus(e.code));
  const regularEarningsTotal = regularEarnings.reduce((s, e) => s + e.amount, 0);
  const bonusTotal = bonusEarnings.reduce((s, e) => s + e.amount, 0);
  const deductionsWithStatutoryZeroLines = withStatutoryZeroLines(input.deductions);

  const leftBottom = drawSectionTable(marginX, colW, 'Regular Earnings', GREEN, regularEarnings, 'TOTAL EARNINGS', regularEarningsTotal);
  const rightBottom = drawSectionTable(marginX + colW + 2, colW, 'Deductions', RED, deductionsWithStatutoryZeroLines, 'TOTAL DEDUCTIONS', input.totalDeductions);
  y = Math.max(leftBottom, rightBottom) + 6;

  if (bonusEarnings.length > 0) {
    y = drawSectionTable(marginX, contentWidth, 'Bonus / Incentives', ORANGE, bonusEarnings, 'TOTAL BONUS', bonusTotal) + 6;
  }

  if (input.contributions.length > 0) {
    const contributionsTotal = input.contributions.reduce((s, c) => s + c.amount, 0);
    y = drawSectionTable(marginX, contentWidth, 'Employer Contributions (not deducted from net pay)', '#607D8B', input.contributions, 'TOTAL', contributionsTotal) + 6;
  }

  // ---- NET PAY banner (brand accent color, full width) ----
  doc.setFillColor(input.brandAccentColor);
  doc.rect(marginX, y, contentWidth, 10, 'F');
  doc.setFontSize(10.5);
  doc.setFont('PayslipSans', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`NET PAY: ${formatINR2(input.netPay)} (Rupees ${numberToWordsINR(input.netPay)} Only)`, marginX + 3, y + 6.5);
  y += 16;

  // ---- Important Notes ----
  const pt = input.deductions.find((d) => d.code === 'professional_tax')?.amount ?? 0;
  const epf = input.deductions.find((d) => d.code === 'epf')?.amount ?? 0;
  const esi = input.deductions.find((d) => d.code === 'esi')?.amount ?? 0;
  const tds = input.deductions.find((d) => d.code === 'tds')?.amount ?? 0;
  const notes = buildImportantNotes({ state: input.companyState, professionalTax: pt, epf, esi, tds, lopDays: input.lopDays });

  doc.setFontSize(9);
  doc.setFont('PayslipSans', 'bold');
  doc.setTextColor(BLUE);
  doc.text('IMPORTANT NOTES', marginX, y);
  y += 5;

  doc.setFont('PayslipSans', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  for (const note of notes) {
    doc.text(`•  ${note}`, marginX, y);
    y += 4.5;
  }
  y += 6;

  // ---- Footer (letterhead) ----
  doc.setDrawColor(...BORDER_GRAY);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  // bottom-left diamond decoration echoing the corner accent
  doc.setFillColor(input.brandAccentColor);
  for (let i = 0; i < 4; i++) {
    const size = 9 - i * 1.8;
    const cx = marginX - 4 + i * 6;
    const cy = 293 - i * 1.5;
    doc.triangle(cx - size / 2, cy, cx, cy - size / 2, cx + size / 2, cy, 'F');
    doc.triangle(cx - size / 2, cy, cx, cy + size / 2, cx + size / 2, cy, 'F');
  }

  doc.setFontSize(8.5);
  doc.setFont('PayslipSans', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(input.companyLegalName, pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('PayslipSans', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  if (input.companyRegOffice) {
    doc.text(`REG OFF: ${input.companyRegOffice}`, pageWidth / 2, y, { align: 'center' });
    y += 3.8;
  }
  const contactLine = [input.companyPhone && `T: ${input.companyPhone}`, input.companyWebsite && `W: ${input.companyWebsite}`, input.companyEmail && `E: ${input.companyEmail}`]
    .filter(Boolean)
    .join(' | ');
  if (contactLine) {
    doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
    y += 3.8;
  }
  if (input.companyCin) {
    doc.text(`CIN No: ${input.companyCin}`, pageWidth / 2, y, { align: 'center' });
  }

  return doc;
}
