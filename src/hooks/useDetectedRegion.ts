import { useRegionPreference } from "@/hooks/useRegionPreference";

export type { RegionPreference } from "@/lib/region-preference";

export interface DetectedRegionState {
  regionLabel: string | null;
  city: string | null;
  country: string | null;
  userCurrency: string | null;
  isLoading: boolean;
  error: boolean;
}

/** Reads the same DB preference as Settings → Supplier region. */
export function useDetectedRegion(): DetectedRegionState {
  const {
    regionLabel,
    userCountry,
    userCurrency,
    isLoading,
    error,
  } = useRegionPreference();

  return {
    regionLabel: regionLabel ?? null,
    city: null,
    country: userCountry || null,
    userCurrency: userCurrency || null,
    isLoading,
    error,
  };
}
