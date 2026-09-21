import { describe, it, expect } from 'vitest';
import { calculateEsi } from '../rules/esi';

describe('calculateEsi', () => {
  const config = { employeePercent: 0.75, employerPercent: 3.25, eligibilityCeiling: 21000 };

  it('applies ESI when gross wage is at the eligibility ceiling boundary (inclusive)', () => {
    const result = calculateEsi({ grossWage: 21000 }, config);
    expect(result.trace.eligible).toBe(true);
    expect(result.employeeAmount).toBe(Math.round(21000 * 0.0075));
  });

  it('does not apply ESI just above the eligibility ceiling', () => {
    const result = calculateEsi({ grossWage: 21001 }, config);
    expect(result.trace.eligible).toBe(false);
    expect(result.employeeAmount).toBe(0);
    expect(result.employerAmount).toBe(0);
  });

  it('computes employee and employer shares independently below the ceiling', () => {
    const result = calculateEsi({ grossWage: 18000 }, config);
    expect(result.employeeAmount).toBe(Math.round(18000 * 0.0075));
    expect(result.employerAmount).toBe(Math.round(18000 * 0.0325));
  });
});
