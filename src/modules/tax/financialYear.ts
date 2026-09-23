// Pure financial-year helpers (India: April–March), directly unit-testable.

export function financialYearFor(dateStr: string): string {
  const [yearStr, monthStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function currentFinancialYear(): string {
  return financialYearFor(new Date().toISOString().slice(0, 10));
}

/** [start, end] as ISO dates for a "YYYY-YY" financial year label, e.g. "2025-26" -> ["2025-04-01", "2026-03-31"]. */
export function financialYearRange(financialYear: string): [string, string] {
  const startYear = Number(financialYear.split('-')[0]);
  return [`${startYear}-04-01`, `${startYear + 1}-03-31`];
}
