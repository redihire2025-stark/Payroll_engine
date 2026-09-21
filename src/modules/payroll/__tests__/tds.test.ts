import { describe, it, expect } from 'vitest';
import { calculateTds, type TdsConfig } from '../rules/tds';

const config: TdsConfig = {
  regime: 'new',
  standardDeduction: 50000,
  cessPercent: 4,
  slabs: [
    { upTo: 300000, rate: 0 },
    { upTo: 600000, rate: 5 },
    { upTo: 900000, rate: 10 },
    { upTo: 1200000, rate: 15 },
    { upTo: 1500000, rate: 20 },
    { upTo: null, rate: 30 },
  ],
};

describe('calculateTds', () => {
  it('deducts nothing when taxable income stays within the nil slab', () => {
    const result = calculateTds(
      { projectedAnnualTaxableIncome: 320000, monthsRemainingInYear: 12, tdsAlreadyDeductedThisYear: 0 },
      config
    );
    expect(result.employeeAmount).toBe(0);
  });

  it('computes marginal slab tax plus cess and spreads it across remaining months', () => {
    // 750000 - 50000 SD = 700000 taxable: 300k@0 + 300k@5%=15000 + 100k@10%=10000 => 25000 base, 4% cess = 1000 => 26000/yr
    const result = calculateTds(
      { projectedAnnualTaxableIncome: 750000, monthsRemainingInYear: 12, tdsAlreadyDeductedThisYear: 0 },
      config
    );
    expect(result.trace.annualTax).toBe(26000);
    expect(result.employeeAmount).toBe(Math.round(26000 / 12));
  });

  it('reduces the monthly deduction by tax already withheld earlier in the year', () => {
    const result = calculateTds(
      { projectedAnnualTaxableIncome: 750000, monthsRemainingInYear: 6, tdsAlreadyDeductedThisYear: 13000 },
      config
    );
    // remaining liability = 26000 - 13000 = 13000, spread over 6 months
    expect(result.employeeAmount).toBe(Math.round(13000 / 6));
  });

  it('never returns negative TDS when already-deducted exceeds recomputed annual liability', () => {
    const result = calculateTds(
      { projectedAnnualTaxableIncome: 320000, monthsRemainingInYear: 3, tdsAlreadyDeductedThisYear: 5000 },
      config
    );
    expect(result.employeeAmount).toBe(0);
  });
});
