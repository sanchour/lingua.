// The learner's motion preference (Settings → Preferences → Motion), readable outside React.
// Root mirrors it onto <html data-motion>, so CSS and imperative animations follow it too.

import type { MotionPref } from '@/data/settings';

export type { MotionPref };

/** True when animations should be minimal: chosen in Lingua, or asked for by the device. */
export function motionIsReduced(): boolean {
  const pref = document.documentElement.dataset.motion as MotionPref | undefined;
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True when the learner asked for the richest motion (high refresh rate, more transitions). */
export function motionIsFull(): boolean {
  return document.documentElement.dataset.motion === 'full';
}
