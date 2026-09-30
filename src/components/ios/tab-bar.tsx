"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  ChartNoAxesColumn,
  Dumbbell,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/today", label: "Today", Icon: CalendarCheck },
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/train", label: "Train", Icon: Dumbbell },
  { href: "/progress", label: "Progress", Icon: ChartNoAxesColumn },
  { href: "/review", label: "Review", Icon: Sparkles },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-30 border-t border-hairline pb-safe">
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex h-[52px] flex-col items-center justify-center gap-1",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative flex items-center justify-center">
                  {active ? (
                    <span className="absolute -inset-x-3 -inset-y-1.5 rounded-full bg-primary/12" />
                  ) : null}
                  <Icon className="relative size-6" strokeWidth={active ? 2.5 : 1.9} />
                </span>
                <span className="text-[10px] leading-none font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
