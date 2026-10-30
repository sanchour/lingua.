// Desktop notifications, reminder schedules, quiet hours and study calendar integration (6-17, F1161, F1162, F1163, F1510, F1525).
import { scheduleToIcs } from '@/services/export';
import type { CalendarEventInput } from '@/services/export';

/**
 * Checks whether a given HH:mm time falls inside the configured quiet hours window.
 * Handles both intra-day (e.g. 13:00 to 15:00) and overnight (e.g. 22:00 to 08:00) ranges.
 */
export function isInsideQuietHours(
  timeStr: string,
  quiet: { enabled: boolean; start: string; end: string },
): boolean {
  if (!quiet.enabled || !quiet.start || !quiet.end) return false;

  const toMins = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const current = toMins(timeStr);
  const start = toMins(quiet.start);
  const end = toMins(quiet.end);

  if (start < end) {
    // Intra-day (e.g. 12:00 to 14:00)
    return current >= start && current < end;
  } else {
    // Overnight (e.g. 22:00 to 08:00)
    return current >= start || current < end;
  }
}

/**
 * Checks whether any configured reminder should trigger right now, respecting quiet hours.
 */
export function shouldTriggerReminder(
  reminders: {
    enabled: boolean;
    times: string[];
    quietHours: { enabled: boolean; start: string; end: string };
  },
  now = new Date(),
): boolean {
  if (!reminders.enabled || !reminders.times.length) return false;

  const pad = (n: number) => String(n).padStart(2, '0');
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  if (isInsideQuietHours(currentTime, reminders.quietHours)) {
    return false;
  }

  return reminders.times.includes(currentTime);
}

/**
 * Requests Notification permission from the browser / desktop shell.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Sends a desktop notification if permitted and outside quiet hours.
 */
export function sendStudyNotification(
  title: string,
  body: string,
  quietHours: { enabled: boolean; start: string; end: string },
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  if (isInsideQuietHours(currentTime, quietHours)) {
    return false;
  }

  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      silent: false,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates an RFC 5545 iCalendar (.ics) file content for the learner's recurring study schedule (F1510).
 */
export function createStudyCalendarIcs(opts: {
  languageName: string;
  reminderTimes: string[];
  restDays: number[];
  weeklyTargetMinutes: number;
}): string {
  const { languageName, reminderTimes, restDays, weeklyTargetMinutes } = opts;
  const activeDaysCount = 7 - restDays.length;
  const targetPerDay = Math.round(weeklyTargetMinutes / Math.max(1, activeDaysCount));

  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const events: CalendarEventInput[] = reminderTimes.map((time, idx) => {
    const [h] = time.split(':').map(Number);

    return {
      id: `study-reminder-${idx}`,
      title: `${languageName} Study Routine (${targetPerDay} min)`,
      description: `Daily focused study in Lingua: vocabulary, reading, and listening. Rest days: ${restDays.length ? 'honoured' : 'none'}.`,
      date: dateStr,
      hour: h ?? 9,
      durationMinutes: targetPerDay,
      rrule: 'FREQ=DAILY',
    };
  });

  return scheduleToIcs(events, `${languageName} Study Schedule`);
}
