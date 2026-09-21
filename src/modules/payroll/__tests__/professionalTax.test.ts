import { describe, it, expect } from 'vitest';
import { calculateProfessionalTax } from '../rules/professionalTax';

describe('calculateProfessionalTax', () => {
  const config = {
    state: 'Karnataka',
    slabs: [
      { upTo: 15000, amount: 0 },
      { upTo: 24999, amount: 200 },
      { upTo: null, amount: 200 },
    ],
  };

  it('applies no tax below the exempt slab', () => {
    expect(calculateProfessionalTax({ grossWage: 12000 }, config).employeeAmount).toBe(0);
  });

  it('applies the mid slab amount', () => {
    expect(calculateProfessionalTax({ grossWage: 20000 }, config).employeeAmount).toBe(200);
  });

  it('applies the top open-ended slab for high earners', () => {
    expect(calculateProfessionalTax({ grossWage: 150000 }, config).employeeAmount).toBe(200);
  });

  it('never applies an employer share — PT is employee-only', () => {
    expect(calculateProfessionalTax({ grossWage: 150000 }, config).employerAmount).toBe(0);
  });
});
