import { Quote as QuoteIcon } from "lucide-react";
import { randomQuote } from "@/lib/quotes";
import { cn } from "@/lib/utils";

/** A new quote on every load. */
export function QuoteCard({ className }: { className?: string }) {
  const quote = randomQuote();

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
