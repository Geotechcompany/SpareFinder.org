import React from "react";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin } from "lucide-react";
import { flagEmoji, resolveUserLocation } from "@/lib/country-flags";

interface AdminUserLocationProps {
  user: Record<string, unknown>;
  compact?: boolean;
}

export function AdminUserLocation({ user, compact = false }: AdminUserLocationProps) {
  const loc = resolveUserLocation(user);

  if (!loc.locationLabel) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Globe className="h-4 w-4 shrink-0 opacity-60" />
        <span>Not set</span>
      </div>
    );
  }

  const flag = flagEmoji(loc.countryCode);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm" title={loc.locationLabel}>
        <span className="text-base leading-none" aria-hidden>
          {flag}
        </span>
        <span className="truncate max-w-[140px] text-foreground dark:text-gray-200">
          {loc.country || loc.locationLabel}
        </span>
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none" aria-hidden>
          {flag}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground dark:text-white truncate">
            {loc.locationLabel}
          </p>
          {loc.countryCode && (
            <p className="text-xs text-muted-foreground">{loc.countryCode}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {loc.useRegional && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
          >
            <MapPin className="h-3 w-3 mr-0.5" />
            Regional
          </Badge>
        )}
        {loc.currency && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {loc.currency}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface LocationSummaryChipProps {
  country: string;
  countryCode?: string | null;
  count: number;
  onClick?: () => void;
  active?: boolean;
}

export function LocationSummaryChip({
  country,
  countryCode,
  count,
  onClick,
  active,
}: LocationSummaryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background/80 text-muted-foreground hover:bg-muted dark:border-white/10 dark:bg-white/5"
      }`}
    >
      <span aria-hidden>{flagEmoji(countryCode)}</span>
      <span>{country}</span>
      <span className="opacity-70">({count})</span>
    </button>
  );
}
