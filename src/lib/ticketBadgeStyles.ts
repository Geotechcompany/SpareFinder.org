import { cn } from "@/lib/utils";

export type TicketStatusKey = "open" | "in_progress" | "answered" | "closed";
export type TicketPriorityKey = "low" | "medium" | "high";

/** Badge chips for ticket status (semantic urgency / pipeline). */
export function ticketStatusBadgeClass(status: string): string {
  const s = (status || "").toLowerCase() as TicketStatusKey;
  const map: Record<TicketStatusKey, string> = {
    open: "border-sky-500/35 bg-sky-500/[0.14] text-sky-950 shadow-none dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-50",
    in_progress:
      "border-amber-500/40 bg-amber-500/[0.14] text-amber-950 shadow-none dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-50",
    answered:
      "border-emerald-500/35 bg-emerald-500/[0.14] text-emerald-950 shadow-none dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-50",
    closed:
      "border-border bg-muted/90 text-muted-foreground shadow-none dark:bg-muted/60 dark:text-muted-foreground",
  };
  return map[s] ?? "border-border bg-muted text-muted-foreground";
}

/** Badge chips for priority (severity). */
export function ticketPriorityBadgeClass(priority: string): string {
  const p = (priority || "").toLowerCase() as TicketPriorityKey;
  const map: Record<TicketPriorityKey, string> = {
    low: "border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-50",
    medium:
      "border-amber-500/45 bg-amber-500/[0.16] text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/18 dark:text-amber-50",
    high: "border-rose-500/45 bg-rose-500/[0.16] text-rose-950 dark:border-rose-400/40 dark:bg-rose-950/35 dark:text-rose-50",
  };
  return map[p] ?? "border-border bg-muted text-muted-foreground";
}

/** Icon / compact control tint for status (e.g. toolbar). */
export function ticketStatusIconClass(status: string): string {
  const s = (status || "").toLowerCase() as TicketStatusKey;
  const map: Record<TicketStatusKey, string> = {
    open: "text-sky-600 dark:text-sky-400",
    in_progress: "text-amber-600 dark:text-amber-400",
    answered: "text-emerald-600 dark:text-emerald-400",
    closed: "text-muted-foreground",
  };
  return map[s] ?? "text-muted-foreground";
}

export function ticketStatusBadgeCn(status: string, extra?: string): string {
  return cn(
    "shrink-0 rounded-md border font-medium shadow-none",
    ticketStatusBadgeClass(status),
    extra
  );
}

export function ticketPriorityBadgeCn(priority: string, extra?: string): string {
  return cn(
    "shrink-0 rounded-md border font-medium capitalize shadow-none",
    ticketPriorityBadgeClass(priority),
    extra
  );
}
