"use client";

import { cn } from "@/lib/utils";
import type { ScalePoint } from "@/lib/scales";

/** Segmented 1-5 picker that shows words instead of numbers. */
export function Rating({
  value,
  onChange,
  label,
  scale,
}: {
  value: number | null;
  onChange: (n: number) => void;
  label: string;
  scale: ScalePoint[];
}) {
  return (
    <div className="space-y-2">
      <span className="text-[17px]">{label}</span>

      <div className="flex gap-1.5">
        {scale.map((point) => {
          const active = value === point.value;
          return (
            <button
              key={point.value}
              type="button"
              aria-label={`${label}: ${point.description}`}
              aria-pressed={active}
              onClick={() => onChange(point.value)}
              className={cn(
                "press h-13 flex-1 rounded-xl px-0.5 text-[11px] font-semibold tracking-tight",
                active
                  ? "ember text-primary-foreground shadow-[0_6px_18px_-8px_rgb(255_122_61/70%)]"
                  : "surface text-muted-foreground",
              )}
            >
              {point.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
