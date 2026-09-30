import type { ReactNode } from "react";

/** A chart, its title, and an empty state for when there's nothing yet. */
export function ChartCard({
  title,
  caption,
  empty,
  children,
}: {
  title: string;
  caption?: string;
  /** When set, the card explains itself instead of drawing an empty plot. */
  empty?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface rounded-2xl p-4">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {caption ? (
        <p className="mt-0.5 text-[13px] text-muted-foreground">{caption}</p>
      ) : null}

      <div className="mt-3">
        {empty ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
