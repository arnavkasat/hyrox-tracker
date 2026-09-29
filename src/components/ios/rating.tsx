"use client";

import { cn } from "@/lib/utils";

/** 1-5 segmented picker for energy and soreness. */
export function Rating({
  value,
  onChange,
  label,
  lowLabel,
  highLabel,
}: {
  value: number | null;
  onChange: (n: number) => void;
  label: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[17px]">{label}</span>
        {lowLabel && highLabel ? (
          <span className="text-[13px] text-muted-foreground">
            {lowLabel} → {highLabel}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n} of 5`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "h-12 flex-1 rounded-lg text-[17px] font-semibold transition active:scale-95",
              value === n
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
