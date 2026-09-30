import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** iOS grouped-inset list section. */
export function InsetGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title ? (
        <h2 className="px-4 pb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
      ) : null}
      <div
        className={cn(
          "surface overflow-hidden rounded-2xl",
          // Hairline separators between rows, inset from the left like iOS.
          "[&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:inset-x-0 [&>*+*]:before:top-0",
          "[&>*+*]:before:ml-4 [&>*+*]:before:h-px [&>*+*]:before:bg-hairline",
        )}
      >
        {children}
      </div>
      {footer ? (
        <p className="px-4 pt-2 text-[13px] leading-snug text-muted-foreground">{footer}</p>
      ) : null}
    </section>
  );
}

/** A single row. `value` sits right-aligned, iOS settings style. */
export function InsetRow({
  label,
  value,
  sublabel,
  children,
  className,
}: {
  label?: ReactNode;
  value?: ReactNode;
  sublabel?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  if (children && !label) {
    return <div className={cn("px-4 py-3", className)}>{children}</div>;
  }

  return (
    <div className={cn("flex min-h-[44px] items-center gap-3 px-4 py-2.5", className)}>
      <div className="min-w-0 flex-1">
        <div className="text-[17px] leading-tight">{label}</div>
        {sublabel ? (
          <div className="mt-0.5 text-[13px] text-muted-foreground">{sublabel}</div>
        ) : null}
      </div>
      {value !== undefined ? (
        <div className="shrink-0 text-[17px] text-muted-foreground">{value}</div>
      ) : null}
      {children}
    </div>
  );
}
