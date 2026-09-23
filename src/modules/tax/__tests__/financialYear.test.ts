import { describe, it, expect } from 'vitest';
import { financialYearFor, financialYearRange } from '../financialYear';

describe('financialYearFor', () => {
  it('assigns a January date to the FY that started the previous April', () => {
    expect(financialYearFor('2026-01-15')).toBe('2025-26');
  });

  it('assigns an April date to the FY starting that same April', () => {
    expect(financialYearFor('2026-04-01')).toBe('2026-27');
  });

  it('assigns a March date to the FY that started the previous April', () => {
    expect(financialYearFor('2026-03-31')).toBe('2025-26');
  });
});

describe('financialYearRange', () => {
  it('returns April 1 to March 31 for a given FY label', () => {
    expect(financialYearRange('2025-26')).toEqual(['2025-04-01', '2026-03-31']);
  });
});
