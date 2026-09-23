import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../mergeFields';

describe('renderTemplate', () => {
  it('substitutes known merge fields', () => {
    const result = renderTemplate('Dear {{employee_name}}, welcome to {{company_name}}.', {
      employee_name: 'Asha Rao',
      company_name: 'Redihire',
    });
    expect(result).toBe('Dear Asha Rao, welcome to Redihire.');
  });

  it('leaves an unknown token in place rather than dropping it', () => {
    const result = renderTemplate('Your CTC is {{ctc}} as of {{unknown_field}}.', { ctc: '12,00,000' });
    expect(result).toBe('Your CTC is 12,00,000 as of {{unknown_field}}.');
  });

  it('substitutes the same field repeated multiple times', () => {
    const result = renderTemplate('{{name}} {{name}}', { name: 'X' });
    expect(result).toBe('X X');
  });

  it('tolerates extra whitespace inside the token braces', () => {
    const result = renderTemplate('{{  employee_name  }}', { employee_name: 'Priya' });
    expect(result).toBe('Priya');
  });
});
