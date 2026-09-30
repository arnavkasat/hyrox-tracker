"use client";

import { ViewTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Slide direction comes from the navigation's transition type, set by the
 * tab bar and the swipe handler. Anything untyped — a refresh, browser
 * back, a Suspense reveal — gets no directional animation.
 */
const DIRECTIONAL = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
} as const;

/**
 * A full-height scroll view with an iOS large title that collapses into a
 * compact sticky header once you scroll past it.
 *
 * The view transition lives here rather than in a layout on purpose: layouts
 * persist across navigation, so enter and exit would never fire.
 */
export function Screen({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setCollapsed(el.scrollTop > 36);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      <div className="relative flex h-full flex-col">
        <header
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-20 pt-safe transition-opacity duration-200",
            collapsed ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="glass flex h-11 items-center justify-center border-b border-hairline px-4">
            <span className="text-[17px] font-semibold">{title}</span>
          </div>
        </header>

        <div
          ref={scroller}
          className={cn("h-full overflow-y-auto pt-safe pb-tabbar", className)}
        >
          <div className="flex items-end justify-between gap-3 px-4 pt-3 pb-1">
            <div className="min-w-0">
              <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.022em]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 text-[15px] text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {action ? <div className="shrink-0 pb-1.5">{action}</div> : null}
          </div>

          <div className="space-y-6 px-4 pt-3">{children}</div>
        </div>
      </div>
    </ViewTransition>
  );
}
