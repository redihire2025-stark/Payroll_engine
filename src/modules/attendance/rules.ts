// Pure attendance rule evaluation — no I/O, so it's directly unit-testable.
// Overtime/half-day are derived from worked *duration* rather than comparing
// checkout wall-clock time to the shift's end wall-clock time, which lets
// night shifts (end_time < start_time) work without special-casing: the
// nominal shift duration still wraps past midnight correctly either way.

export interface ShiftDef {
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string;
  graceMinutes: number;
}

function toMinutesOfDay(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function shiftDurationMinutes(shift: ShiftDef): number {
  const start = toMinutesOfDay(shift.startTime);
  const end = toMinutesOfDay(shift.endTime);
  return end > start ? end - start : 24 * 60 - start + end;
}

export interface PunchInEvaluation {
  status: 'present' | 'late';
  lateMinutes: number;
}

export function evaluatePunchIn(shift: ShiftDef | null, checkInAt: Date): PunchInEvaluation {
  if (!shift) return { status: 'present', lateMinutes: 0 };
  const checkInMinutes = checkInAt.getHours() * 60 + checkInAt.getMinutes();
  const shiftStart = toMinutesOfDay(shift.startTime);
  const lateMinutes = Math.max(0, checkInMinutes - shiftStart - shift.graceMinutes);
  return { status: lateMinutes > 0 ? 'late' : 'present', lateMinutes };
}

export interface PunchOutEvaluation {
  status: 'present' | 'late' | 'half_day';
  overtimeMinutes: number;
}

export function evaluatePunchOut(shift: ShiftDef | null, checkInAt: Date, checkOutAt: Date, wasLate: boolean): PunchOutEvaluation {
  const workedMinutes = Math.max(0, (checkOutAt.getTime() - checkInAt.getTime()) / 60000);
  if (!shift) return { status: wasLate ? 'late' : 'present', overtimeMinutes: 0 };

  const duration = shiftDurationMinutes(shift);
  const overtimeMinutes = Math.max(0, Math.round(workedMinutes - duration));

  if (workedMinutes < duration / 2) return { status: 'half_day', overtimeMinutes: 0 };
  return { status: wasLate ? 'late' : 'present', overtimeMinutes };
}
