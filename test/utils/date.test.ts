import { describe, expect, it } from 'vitest';
import {
  hoursToMinutes,
  isSameDay,
  isWeekend,
  isWorkingDay,
  minutesToHours,
  toIsoDateString,
} from '../../src/utils/date.js';

describe('minutesToHours / hoursToMinutes', () => {
  it('converts minutes to fractional hours rounded to 2 decimals', () => {
    expect(minutesToHours(60)).toBe(1);
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(45)).toBe(0.75);
  });

  it('converts fractional hours back to whole minutes', () => {
    expect(hoursToMinutes(1)).toBe(60);
    expect(hoursToMinutes(1.5)).toBe(90);
    expect(hoursToMinutes(0.75)).toBe(45);
  });
});

describe('toIsoDateString', () => {
  it('formats numeric epoch into yyyy-MM-dd', () => {
    const epoch = Date.UTC(2026, 4, 7, 12, 0, 0);

    expect(toIsoDateString(epoch)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isWeekend / isWorkingDay', () => {
  it('treats Saturday and Sunday as weekend', () => {
    // 2026-05-09 is Saturday, 2026-05-10 is Sunday
    expect(isWeekend('2026-05-09')).toBe(true);
    expect(isWeekend('2026-05-10')).toBe(true);
  });

  it('treats Monday through Friday as working days', () => {
    expect(isWorkingDay('2026-05-04')).toBe(true);
    expect(isWorkingDay('2026-05-08')).toBe(true);
  });
});

describe('isSameDay', () => {
  it('returns true for two values that resolve to the same calendar day', () => {
    // Both points sit inside 2026-05-07 in Europe/Moscow (the default zone),
    // even though the second is late evening and the first is early morning.
    const morning = Date.UTC(2026, 4, 7, 6, 0, 0); // 09:00 Moscow
    const evening = Date.UTC(2026, 4, 7, 18, 0, 0); // 21:00 Moscow

    expect(isSameDay(morning, evening)).toBe(true);
  });

  it('returns false for two different calendar days', () => {
    expect(isSameDay('2026-05-07', '2026-05-08')).toBe(false);
  });
});
