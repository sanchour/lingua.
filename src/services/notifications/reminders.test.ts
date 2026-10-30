import { describe, expect, it } from 'vitest';
import {
  createStudyCalendarIcs,
  isInsideQuietHours,
  shouldTriggerReminder,
} from './reminders';

describe('isInsideQuietHours', () => {
  it('detects overnight quiet hours (e.g. 22:00 to 08:00)', () => {
    const quiet = { enabled: true, start: '22:00', end: '08:00' };
    expect(isInsideQuietHours('23:30', quiet)).toBe(true);
    expect(isInsideQuietHours('07:15', quiet)).toBe(true);
    expect(isInsideQuietHours('14:00', quiet)).toBe(false);
    expect(isInsideQuietHours('21:59', quiet)).toBe(false);
  });

  it('detects intra-day quiet hours (e.g. 13:00 to 15:00)', () => {
    const quiet = { enabled: true, start: '13:00', end: '15:00' };
    expect(isInsideQuietHours('14:30', quiet)).toBe(true);
    expect(isInsideQuietHours('12:59', quiet)).toBe(false);
    expect(isInsideQuietHours('15:01', quiet)).toBe(false);
  });

  it('returns false when quiet hours are disabled', () => {
    const quiet = { enabled: false, start: '22:00', end: '08:00' };
    expect(isInsideQuietHours('23:30', quiet)).toBe(false);
  });
});

describe('shouldTriggerReminder', () => {
  it('triggers when current time matches reminder time and not in quiet hours', () => {
    const now = new Date('2026-10-30T19:30:00');
    const reminders = {
      enabled: true,
      times: ['09:00', '19:30'],
      quietHours: { enabled: true, start: '22:00', end: '08:00' },
    };
    expect(shouldTriggerReminder(reminders, now)).toBe(true);
  });

  it('suppresses trigger if inside quiet hours', () => {
    const now = new Date('2026-10-30T23:00:00');
    const reminders = {
      enabled: true,
      times: ['23:00'],
      quietHours: { enabled: true, start: '22:00', end: '08:00' },
    };
    expect(shouldTriggerReminder(reminders, now)).toBe(false);
  });
});

describe('createStudyCalendarIcs', () => {
  it('produces valid RFC 5545 iCalendar content with recurrence and daily target', () => {
    const ics = createStudyCalendarIcs({
      languageName: 'Spanish',
      reminderTimes: ['19:30'],
      restDays: [0, 6],
      weeklyTargetMinutes: 150,
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('Spanish Study Schedule');
    expect(ics).toContain('Spanish Study Routine (30 min)');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('END:VCALENDAR');
  });
});
