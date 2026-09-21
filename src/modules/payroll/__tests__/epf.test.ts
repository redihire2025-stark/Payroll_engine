import { describe, it, expect } from 'vitest';
import { calculateEpf } from '../rules/epf';

describe('calculateEpf', () => {
  const baseConfig = { employeePercent: 12, employerPercent: 12, wageCeiling: 15000, applyCeiling: true };

  it('computes 12% of basic when basic is below the wage ceiling', () => {
    const result = calculateEpf({ basicPlusDa: 12000 }, baseConfig);
    expect(result.employeeAmount).toBe(1440);
    expect(result.employerAmount).toBe(1440);
  });

  it('caps PF wage at the ceiling when basic exceeds it and applyCeiling is true', () => {
    const result = calculateEpf({ basicPlusDa: 40000 }, baseConfig);
    expect(result.trace.pfWage).toBe(15000);
    expect(result.employeeAmount).toBe(1800); // 12% of 15000
  });

  it('uses full basic (no ceiling) when applyCeiling is false — e.g. company opted for higher PF', () => {
    const result = calculateEpf({ basicPlusDa: 40000 }, { ...baseConfig, applyCeiling: false });
    expect(result.employeeAmount).toBe(4800); // 12% of 40000
  });

  it('handles zero basic without throwing', () => {
    const result = calculateEpf({ basicPlusDa: 0 }, baseConfig);
    expect(result.employeeAmount).toBe(0);
    expect(result.employerAmount).toBe(0);
  });

  it('rounds to the nearest rupee', () => {
    const result = calculateEpf({ basicPlusDa: 12345 }, baseConfig);
    expect(result.employeeAmount).toBe(Math.round(12345 * 0.12));
  });
});
