import { cn } from "@/lib/utils";

/** Three small numbers under the check-in ring. */
export function StatRow({
  stats,
}: {
  stats: { label: string; value: string; sub?: string; accent?: boolean }[];
}) {
  return (
    <div className="surface grid grid-cols-3 rounded-2xl">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            "px-3 py-3.5 text-center",
            i > 0 && "border-l border-hairline",
          )}
        >
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {stat.label}
          </p>
          <p
            className={cn(
              "mt-1 text-[22px] leading-none font-semibold",
              stat.accent && "text-primary",
            )}
          >
            {stat.value}
          </p>
          {stat.sub ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{stat.sub}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
