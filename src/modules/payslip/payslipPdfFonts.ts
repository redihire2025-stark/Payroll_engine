import type jsPDFType from 'jspdf';

/**
 * jsPDF's built-in "helvetica" font has no glyph for ₹ (U+20B9) — it
 * silently substitutes a broken glyph that also corrupts the run of text
 * after it (numbers shifting into the next column). A subsetted DejaVu
 * Sans (regular + bold, ASCII + ₹ + a few typographic punctuation marks
 * only, ~10KB each — see public/fonts/) fixes both. Fetched once and
 * cached, since a batch "Generate Payslips" run creates one jsPDF
 * instance per employee and each needs the font re-registered.
 */
let cachedFonts: { regular: string; bold: string } | null = null;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadFontBase64(): Promise<{ regular: string; bold: string }> {
  if (cachedFonts) return cachedFonts;
  const [regularBuf, boldBuf] = await Promise.all([
    fetch('/fonts/DejaVuSans-Payslip.ttf').then((r) => r.arrayBuffer()),
    fetch('/fonts/DejaVuSans-Bold-Payslip.ttf').then((r) => r.arrayBuffer()),
  ]);
  cachedFonts = { regular: arrayBufferToBase64(regularBuf), bold: arrayBufferToBase64(boldBuf) };
  return cachedFonts;
}

/** Registers the "PayslipSans" family (normal + bold) on this jsPDF instance and selects it. */
export async function usePayslipFont(doc: jsPDFType): Promise<void> {
  const { regular, bold } = await loadFontBase64();
  doc.addFileToVFS('DejaVuSans-Payslip.ttf', regular);
  doc.addFont('DejaVuSans-Payslip.ttf', 'PayslipSans', 'normal');
  doc.addFileToVFS('DejaVuSans-Bold-Payslip.ttf', bold);
  doc.addFont('DejaVuSans-Bold-Payslip.ttf', 'PayslipSans', 'bold');
  doc.setFont('PayslipSans', 'normal');
}
