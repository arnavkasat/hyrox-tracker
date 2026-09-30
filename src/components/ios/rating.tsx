"use client";

import { motion } from "motion/react";

import { SLIDE_SPRING, PRESS_SPRING, TAP_MEDIUM } from "@/components/ios/motion";
import { cn } from "@/lib/utils";
import type { ScalePoint } from "@/lib/scales";

/**
 * Segmented 1-5 picker showing words instead of numbers.
 *
 * The selected fill is one shared element, so moving between options slides
 * it across rather than blinking it from one segment to the next. Each group
 * needs its own layout id or energy and soreness would animate into each
 * other.
 */
export function Rating({
  value,
  onChange,
  label,
  scale,
  layoutId,
}: {
  value: number | null;
  onChange: (n: number) => void;
  label: string;
  scale: ScalePoint[];
  /** Unique per picker on the screen. */
  layoutId: string;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[17px]">{label}</span>

      <div className="flex gap-1.5">
        {scale.map((point) => {
          const active = value === point.value;

          return (
            <motion.button
              key={point.value}
              type="button"
              aria-label={`${label}: ${point.description}`}
              aria-pressed={active}
              onClick={() => onChange(point.value)}
              whileTap={TAP_MEDIUM}
              transition={PRESS_SPRING}
              className={cn(
                "surface relative h-13 flex-1 rounded-xl px-0.5 text-[11px] font-semibold tracking-tight",
                active ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={layoutId}
                  transition={SLIDE_SPRING}
                  className="brand-fill absolute inset-0 rounded-xl shadow-[0_6px_18px_-8px_rgb(76_180_255/70%)]"
                />
              ) : null}
              <span className="relative">{point.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
