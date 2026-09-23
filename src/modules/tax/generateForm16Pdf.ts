import type jsPDFType from 'jspdf';

export interface Form16PdfInput {
  companyName: string;
  companyRegOffice: string | null;
  employeeName: string;
  employeeCode: string;
  financialYear: string;
  grossSalary: number;
  standardDeduction: number;
  exemptionsClaimed: number;
  taxableIncome: number;
  taxDeducted: number;
}

const inr = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-IN')}`;

/** A computer-generated annual tax summary in the shape of Form 16 Part B — not a statutory TRACES-issued Form 16. */
export function buildForm16Pdf(doc: jsPDFType, input: Form16PdfInput): jsPDFType {
  const marginX = 18;
  let y = 20;

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(input.companyName, marginX, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (input.companyRegOffice) {
    doc.text(input.companyRegOffice, marginX, y);
    y += 6;
  }

  y += 4;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Annual Tax Statement — Financial Year ${input.financialYear}`, marginX, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.text('Computer-generated summary for reference. Not a statutory Form 16 issued via TRACES.', marginX, y);
  y += 10;

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee: ${input.employeeName} (${input.employeeCode})`, marginX, y);
  y += 10;

  const rows: [string, string][] = [
    ['Gross Salary', inr(input.grossSalary)],
    ['Standard Deduction', inr(input.standardDeduction)],
    ['Exemptions Claimed (verified)', inr(input.exemptionsClaimed)],
    ['Taxable Income', inr(input.taxableIncome)],
    ['Tax Deducted at Source (deposited)', inr(input.taxDeducted)],
  ];
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 140, y);
    y += 8;
  }

  return doc;
}
