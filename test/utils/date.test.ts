import { beforeEach, describe, expect, it } from 'vitest';
import {
  hoursToMinutes,
  initializeTimezone,
  isSameDay,
  isWeekend,
  isWorkingDay,
  minutesToHours,
  toIsoDateString,
} from '../../src/utils/date.js';

// Pin the module-level `currentTimezone` to UTC for every test in this file.
// `toIsoDateString` parses input in `currentTimezone` but then formats via
// `DateTime.fromMillis(...)` without an explicit zone, which falls back to
// the *system* timezone. When the two differ (e.g. dev box on Europe/Moscow,
// GitHub runners on UTC), the round-trip silently shifts the calendar day.
// Pinning to UTC here makes the tests deterministic across environments.
beforeEach(() => {
  initializeTimezone('UTC');
});

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
  it('returns true for two values that resolve to the same calendar day in UTC', () => {
    // Both points sit inside 2026-05-07 UTC (the timezone pinned in beforeEach).
    const morning = Date.UTC(2026, 4, 7, 1, 0, 0);
    const evening = Date.UTC(2026, 4, 7, 22, 0, 0);

    expect(isSameDay(morning, evening)).toBe(true);
  });

  it('returns false for two different calendar days', () => {
    expect(isSameDay('2026-05-07', '2026-05-08')).toBe(false);
  });
});
