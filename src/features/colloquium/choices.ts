// Sermo's choices, remembered on this device (5.2-6), and when an AI was last opened from it (Home asks).

export interface SermoChoices {
  mode: 'voice' | 'text';
  correct: 'live' | 'end' | 'off';
  help: boolean;
  slow?: boolean;
  minutes: 5 | 10 | 20;
}

const KEY = 'lingua-sermo';
const OPENED = 'lingua-sermo-opened';

export const DEFAULT_CHOICES: SermoChoices = { mode: 'voice', correct: 'live', help: true, minutes: 10 };

export function loadChoices(): SermoChoices {
  try {
    return { ...DEFAULT_CHOICES, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<SermoChoices>) };
  } catch {
    return DEFAULT_CHOICES;
  }
}

export function saveChoices(c: SermoChoices): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // Not remembered; the choices still work for now.
  }
}

/** Notes that the learner opened an AI to talk. */
export function markTalked(): void {
  try {
    localStorage.setItem(OPENED, String(Date.now()));
  } catch {
    // Home just suggests talking again.
  }
}

/** When the learner last opened an AI from Sermo (0: never, or not on this device). */
export function lastTalked(): number {
  try {
    return Number(localStorage.getItem(OPENED)) || 0;
  } catch {
    return 0;
  }
}
