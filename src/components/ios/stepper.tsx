"use client";

import { motion } from "motion/react";
import { Minus, Plus } from "lucide-react";

import { PRESS_SPRING, RELEASE_SPRING, TAP_SMALL } from "@/components/ios/motion";
import { cn } from "@/lib/utils";

/**
 * Big +/- stepper. Tap targets stay 44pt so it works with sweaty thumbs
 * mid-set, and the number is the widest element so the row never reflows.
 *
 * Both the button and the number react: the button squashes under the
 * finger, the value gives a small kick in the direction it moved. Holding
 * repeats, accelerating, the way iOS steppers do.
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
      <StepButton
        direction={-1}
        ariaLabel={label ? `Decrease ${label}` : "Decrease"}
        disabled={value <= min}
        onStep={() => onChange(clamp(value - step))}
        className="rounded-l-xl border-r-0"
      >
        <Minus className="size-5" />
      </StepButton>

      <div className="surface flex h-11 min-w-[4.5rem] items-center justify-center overflow-hidden rounded-none border-x-0 px-2">
        <motion.span
          // Re-keyed on the value so each change animates from scratch.
          key={value}
          initial={{ y: 5, opacity: 0.4 }}
          animate={{ y: 0, opacity: 1 }}
          transition={RELEASE_SPRING}
          className="text-[17px] font-semibold"
        >
          {value.toFixed(decimals)}
          {suffix ? (
            <span className="ml-0.5 text-[13px] font-normal text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </motion.span>
      </div>

      <StepButton
        direction={1}
        ariaLabel={label ? `Increase ${label}` : "Increase"}
        disabled={value >= max}
        onStep={() => onChange(clamp(value + step))}
        className="rounded-r-xl border-l-0"
      >
        <Plus className="size-5" />
      </StepButton>
    </div>
  );
}

function StepButton({
  ariaLabel,
  disabled,
  onStep,
  className,
  children,
}: {
  direction: 1 | -1;
  ariaLabel: string;
  disabled: boolean;
  onStep: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onStep}
      disabled={disabled}
      whileTap={disabled ? undefined : TAP_SMALL}
      transition={PRESS_SPRING}
      className={cn(
        "surface flex size-11 items-center justify-center text-foreground disabled:opacity-30",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
