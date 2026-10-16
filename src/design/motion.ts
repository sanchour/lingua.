// Motion presets. Every animation in Lingua uses one of these so the app moves with one "feel".
// Only transform and opacity are animated (see docs/PERFORMANCE.md).

export const spring = {
  /** Small controls: pills, toggles, indicators. */
  snappy: { type: 'spring', stiffness: 560, damping: 42, mass: 0.8 },
  /** Page content and cards entering. */
  soft: { type: 'spring', stiffness: 320, damping: 34 },
  /** Drawers and bottom sheets. */
  sheet: { type: 'spring', stiffness: 400, damping: 40, mass: 0.9 },
  /** Larger, slower moves (onboarding steps). */
  gentle: { type: 'spring', stiffness: 200, damping: 28 },
  /** Full motion: long, liquid settles for pages and reordering lists. */
  fluid: { type: 'spring', stiffness: 210, damping: 26, mass: 1 },
} as const;

export const fade = { duration: 0.16, ease: [0.2, 0, 0, 1] } as const;

export const pageEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: spring.soft,
} as const;

/** Full motion: pages rise a little further and settle on a softer spring. */
export const pageEnterFull = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: spring.fluid,
} as const;
