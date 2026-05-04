import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

function isSafeImageSrc(src: string): boolean {
  if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/png") || src.startsWith("data:image/gif") || src.startsWith("data:image/webp")) {
    return true;
  }
  return /^https:\/\//i.test(src.trim());
}

type TicketMessageRichBodyProps = {
  body: string;
  className?: string;
  /** Admin bubble (violet) — images get a light border */
  variant?: "default" | "admin";
};

export function TicketMessageRichBody({ body, className, variant = "default" }: TicketMessageRichBodyProps) {
  const nodes = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    const re = new RegExp(IMG_RE.source, "g");
    while ((m = re.exec(body)) !== null) {
      if (m.index > last) {
        parts.push(
          <span key={`t-${last}`} className="whitespace-pre-wrap">
            {body.slice(last, m.index)}
          </span>
        );
      }
      const alt = m[1] || "attachment";
      const src = m[2];
      const safe = isSafeImageSrc(src);
      parts.push(
        safe ? (
          <img
            key={`i-${m.index}`}
            src={src}
            alt={alt}
            className={cn(
              "my-2 max-h-72 max-w-full rounded-lg border object-contain shadow-sm",
              variant === "admin" ? "border-white/25 bg-black/10" : "border-border/60 bg-muted/30"
            )}
          />
        ) : (
          <span key={`b-${m.index}`} className="text-xs opacity-70">
            [Unsupported image link]
          </span>
        )
      );
      last = re.lastIndex;
    }
    if (last < body.length) {
      parts.push(
        <span key={`t-end`} className="whitespace-pre-wrap">
          {body.slice(last)}
        </span>
      );
    }
    return parts.length > 0 ? parts : [<span key="all" className="whitespace-pre-wrap">{body}</span>];
  }, [body, variant]);

  return <div className={cn("min-w-0 break-words", className)}>{nodes}</div>;
}
