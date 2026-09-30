import { Quote as QuoteIcon } from "lucide-react";
import { quoteForDate } from "@/lib/quotes";
import type { ISODate } from "@/lib/date";
import { cn } from "@/lib/utils";

/** The day's quote. Same one all day, new one tomorrow. */
export function QuoteCard({ date, className }: { date: ISODate; className?: string }) {
  const quote = quoteForDate(date);

  return (
    <figure className={cn("surface rounded-2xl p-5", className)}>
      <QuoteIcon className="size-4 text-primary/70" />
      <blockquote className="mt-2.5 text-[17px] leading-snug font-medium text-balance">
        {quote.text}
      </blockquote>
      {quote.author ? (
        <figcaption className="mt-2 text-[13px] text-muted-foreground">
          {quote.author}
        </figcaption>
      ) : null}
    </figure>
  );
}
