import { describe, it, expect } from 'vitest';
import { evaluatePunchIn, evaluatePunchOut, type ShiftDef } from '../rules';

const shift: ShiftDef = { startTime: '09:00', endTime: '18:00', graceMinutes: 10 };
const nightShift: ShiftDef = { startTime: '22:00', endTime: '06:00', graceMinutes: 10 };

function at(hh: number, mm: number, day = 1): Date {
  return new Date(2026, 0, day, hh, mm, 0);
}

describe('evaluatePunchIn', () => {
  it('marks present with no shift assigned', () => {
    expect(evaluatePunchIn(null, at(11, 0))).toEqual({ status: 'present', lateMinutes: 0 });
  });

  it('marks present within the grace window', () => {
    const result = evaluatePunchIn(shift, at(9, 8));
    expect(result.status).toBe('present');
    expect(result.lateMinutes).toBe(0);
  });

  it('marks late past the grace window and reports minutes late', () => {
    const result = evaluatePunchIn(shift, at(9, 25));
    expect(result.status).toBe('late');
    expect(result.lateMinutes).toBe(15);
  });

  it('marks present for an on-time check-in', () => {
    expect(evaluatePunchIn(shift, at(8, 55)).status).toBe('present');
  });
});

describe('evaluatePunchOut', () => {
  it('reports no overtime with no shift assigned', () => {
    const result = evaluatePunchOut(null, at(9, 0), at(18, 0), false);
    expect(result).toEqual({ status: 'present', overtimeMinutes: 0 });
  });

  it('marks half-day when worked time is under half the shift duration', () => {
    const result = evaluatePunchOut(shift, at(9, 0), at(12, 0), false);
    expect(result.status).toBe('half_day');
    expect(result.overtimeMinutes).toBe(0);
  });

  it('marks present with no overtime for a full, on-time shift', () => {
    const result = evaluatePunchOut(shift, at(9, 0), at(18, 0), false);
    expect(result.status).toBe('present');
    expect(result.overtimeMinutes).toBe(0);
  });

  it('computes overtime minutes worked past the shift duration', () => {
    const result = evaluatePunchOut(shift, at(9, 0), at(19, 30), false);
    expect(result.overtimeMinutes).toBe(90);
  });

  it('preserves a late status from check-in through to check-out', () => {
    const result = evaluatePunchOut(shift, at(9, 25), at(18, 0), true);
    expect(result.status).toBe('late');
  });

  it('handles an overnight shift duration without special-casing the wall-clock end time', () => {
    // 22:00 -> 06:00 is an 8-hour shift; working the full duration should show no overtime.
    const checkIn = new Date(2026, 0, 1, 22, 0, 0);
    const checkOut = new Date(2026, 0, 2, 6, 0, 0);
    const result = evaluatePunchOut(nightShift, checkIn, checkOut, false);
    expect(result.status).toBe('present');
    expect(result.overtimeMinutes).toBe(0);
  });
});
