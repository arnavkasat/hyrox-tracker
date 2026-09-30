/**
 * Shared motion settings, so every control in the app springs the same way.
 *
 * Springs rather than durations: a spring keeps its velocity when it's
 * interrupted, which is why iOS controls feel like objects instead of
 * animations. Tapping twice quickly should never look like a queue.
 */

/** Sliding highlights: tab bar, segmented pickers. */
export const SLIDE_SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.7,
} as const;

/** The squash when a control is held down. */
export const PRESS_SPRING = {
  type: "spring",
  stiffness: 700,
  damping: 26,
  mass: 0.5,
} as const;

/** The release, deliberately softer than the press. */
export const RELEASE_SPRING = {
  type: "spring",
  stiffness: 380,
  damping: 22,
  mass: 0.6,
} as const;

export const TAP_SMALL = { scale: 0.86 } as const;
export const TAP_MEDIUM = { scale: 0.93 } as const;
export const TAP_LARGE = { scale: 0.965 } as const;
