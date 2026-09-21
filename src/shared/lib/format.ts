export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

/** Payslips print two decimal places (₹12,000.00), unlike the compact whole-rupee tables elsewhere in the app. */
export function formatINR2(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function threeDigitWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return (hundred ? ONES[hundred] + ' Hundred' + (rest ? ' ' : '') : '') + (rest ? twoDigitWords(rest) : '');
}

/** Converts a rupee amount to words using Indian numbering (Crore/Lakh/Thousand), e.g. 24800 -> "Twenty Four Thousand Eight Hundred". */
export function numberToWordsINR(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(threeDigitWords(crore) + ' Crore');
  if (lakh) parts.push(threeDigitWords(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigitWords(thousand) + ' Thousand');
  if (hundred) parts.push(threeDigitWords(hundred));
  return parts.join(' ');
}
