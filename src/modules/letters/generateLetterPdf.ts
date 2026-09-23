import type jsPDFType from 'jspdf';

export interface LetterPdfInput {
  companyName: string;
  title: string;
  date: string;
  body: string;
}

/** Plain jsPDF text/line drawing — no html2canvas — so it works identically in a batch run as in a single-letter generation. */
export function buildLetterPdf(doc: jsPDFType, input: LetterPdfInput): jsPDFType {
  const marginX = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginX * 2;
  let y = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(input.companyName, marginX, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(input.date, marginX, y);
  y += 10;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(input.title, marginX, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const paragraphs = input.body.split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    const lines: string[] = doc.splitTextToSize(paragraph.trim(), contentWidth);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += 6;
    }
    y += 4;
  }

  return doc;
}
