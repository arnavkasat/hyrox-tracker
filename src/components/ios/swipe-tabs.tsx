"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useMotionValue, animate } from "motion/react";

import { RELEASE_SPRING } from "@/components/ios/motion";
import { TAB_ORDER, directionType, tabIndexFor } from "@/lib/tabs";

/** Horizontal travel before we decide the gesture is a swipe, not a scroll. */
const LOCK_THRESHOLD = 12;
/** How much more horizontal than vertical the movement has to be. */
const AXIS_RATIO = 1.3;
/** Fraction of the screen that commits the swipe. */
const COMMIT_FRACTION = 0.22;
/** A flick commits regardless of distance, in px per ms. */
const COMMIT_VELOCITY = 0.45;
/** The page only follows the finger this far — the rest is the page slide. */
const MAX_PULL = 44;

/**
 * Swipe sideways to change tabs.
 *
 * The page follows your finger a short way, with resistance, so the gesture
 * is acknowledged immediately. The actual travel is the View Transition that
 * runs on commit — trying to drag a whole route across would mean rendering
 * every tab at once, which is a lot of work for five screens you mostly
 * aren't looking at.
 *
 * Vertical movement is left alone so the page still scrolls, and a gesture
 * that starts inside something horizontally scrollable is ignored.
 */
export function SwipeTabs({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const x = useMotionValue(0);

  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const axis = useRef<"undecided" | "horizontal" | "vertical">("undecided");

  const index = tabIndexFor(pathname);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    if (index === -1) return;

    // Don't hijack a swipe meant for a horizontal scroller (the exercise
    // category row, for instance).
    let node = event.target as HTMLElement | null;
    while (node && node !== event.currentTarget) {
      if (node.scrollWidth > node.clientWidth + 4) return;
      node = node.parentElement;
    }

    start.current = { x: event.clientX, y: event.clientY, t: performance.now() };
    axis.current = "undecided";
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const from = start.current;
    if (!from) return;

    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;

    if (axis.current === "undecided") {
      if (Math.abs(dy) > LOCK_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        axis.current = "vertical";
        start.current = null;
        return;
      }
      if (Math.abs(dx) > LOCK_THRESHOLD && Math.abs(dx) > Math.abs(dy) * AXIS_RATIO) {
        axis.current = "horizontal";
        } else {
        return;
      }
    }

    if (axis.current !== "horizontal") return;

    // Resistance, and none at all past the first or last tab.
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === TAB_ORDER.length - 1);
    const pull = MAX_PULL * (atEdge ? 0.35 : 1);
    x.set(pull * Math.tanh(dx / (MAX_PULL * 2.4)));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const from = start.current;
    start.current = null;

    if (!from || axis.current !== "horizontal") {
      void animate(x, 0, RELEASE_SPRING);
      return;
    }

    const dx = event.clientX - from.x;
    const elapsed = Math.max(1, performance.now() - from.t);
    const velocity = Math.abs(dx) / elapsed;

    const width = event.currentTarget.clientWidth || 390;
    const committed = Math.abs(dx) > width * COMMIT_FRACTION || velocity > COMMIT_VELOCITY;
    const next = dx < 0 ? index + 1 : index - 1;

    if (committed && next >= 0 && next < TAB_ORDER.length) {
      // Snap back with no animation: the page slide takes over from here.
      x.jump(0);
      router.push(TAB_ORDER[next], {
        transitionTypes: [directionType(index, next)],
      });
      return;
    }

    void animate(x, 0, RELEASE_SPRING);
  }

  return (
    <motion.div
      style={{ x, touchAction: "pan-y", height: "100%" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </motion.div>
  );
}
