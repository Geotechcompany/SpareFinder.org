import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format processing time (seconds) for display; cap absurd values so overview stays accurate. */
export function formatProcessingDisplay(seconds: number): string {
  const s = Math.max(0, Number(seconds));
  if (s > 7200) return ">2h";
  if (s >= 3600) return `${Math.round(s / 3600)}h`;
  if (s >= 60) return `${Math.round(s / 60)}m`;
  return `${Math.round(s)}s`;
}
