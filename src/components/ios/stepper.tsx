"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Big +/- stepper. Tap targets are 44pt so it works with sweaty thumbs
 * mid-set; the number itself is the widest element so it never reflows.
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  decimals = 0,
  className,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  decimals?: number;
  className?: string;
  label?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label={label ? `Decrease ${label}` : "Decrease"}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="press surface flex size-11 items-center justify-center rounded-l-xl border-r-0 text-foreground disabled:opacity-30"
      >
        <Minus className="size-5" />
      </button>

      <div className="surface flex h-11 min-w-[4.5rem] items-center justify-center rounded-none border-x-0 px-2 text-[17px] font-semibold">
        {value.toFixed(decimals)}
        {suffix ? (
          <span className="ml-0.5 text-[13px] font-normal text-muted-foreground">{suffix}</span>
        ) : null}
      </div>

      <button
        type="button"
        aria-label={label ? `Increase ${label}` : "Increase"}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="press surface flex size-11 items-center justify-center rounded-r-xl border-l-0 text-foreground disabled:opacity-30"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
