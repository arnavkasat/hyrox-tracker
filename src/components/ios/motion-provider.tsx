"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * `reducedMotion="user"` makes every Framer Motion animation in the app
 * respect the system setting: transforms stop, opacity still cross-fades.
 * Without it, the springs would keep running for someone who has asked
 * their phone to stop moving things.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
