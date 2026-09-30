/** The tab order, shared by the tab bar and the swipe handler. */

export const TAB_ORDER = ["/today", "/plan", "/train", "/progress", "/review"] as const;

export type TabHref = (typeof TAB_ORDER)[number];

/** Which tab a path belongs to, or -1 for anything outside the tab bar. */
export function tabIndexFor(pathname: string): number {
  return TAB_ORDER.findIndex((href) => pathname === href || pathname.startsWith(`${href}/`));
}

/**
 * Moving right through the tabs reads as going forward, left as going back —
 * the same convention as page turns, so the slide matches the gesture.
 */
export function directionType(from: number, to: number): "nav-forward" | "nav-back" {
  return to > from ? "nav-forward" : "nav-back";
}
