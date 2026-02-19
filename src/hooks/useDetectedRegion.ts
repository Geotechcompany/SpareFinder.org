import { useState, useEffect } from "react";
import { api } from "@/lib/api";

/** Response from ip-api.com (fields we use). */
interface IpApiResponse {
  city?: string;
  regionName?: string;
  country?: string;
  countryCode?: string;
  status?: string;
  message?: string;
}

export interface DetectedRegionState {
  /** Human-readable label e.g. "London, United Kingdom" */
  regionLabel: string | null;
  /** City if available */
  city: string | null;
  /** Country if available */
  country: string | null;
  isLoading: boolean;
  error: boolean;
}

const IP_API_URL =
  "https://ip-api.com/json/?fields=status,city,regionName,country,countryCode";

/**
 * Detects the user's approximate region via IP geolocation (no permission required).
 * Similar to how Uber/Bolt show "You're in [location]" for context.
 */
export function useDetectedRegion(): DetectedRegionState {
  const [state, setState] = useState<DetectedRegionState>({
    regionLabel: null,
    city: null,
    country: null,
    isLoading: true,
    error: false,
  });

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timeout = 8000;

    const t = setTimeout(() => {
      controller.abort();
    }, timeout);

    const detect = async () => {
      // 1) Try stored region preference (Supplier region settings)
      try {
        const regionRes = await api.user.getRegionPreference();
        const data: any = (regionRes as any)?.data ?? regionRes;
        const useRegional = data?.useRegionalSuppliers;
        const userCountry = (data?.userCountry ?? "").trim();
        const userRegion = (data?.userRegion ?? "").trim();
        if (mounted && useRegional && (userCountry || userRegion)) {
          const label = [userCountry || null, userRegion || null]
            .filter(Boolean)
            .join(", ");
          setState({
            regionLabel: label || null,
            city: null,
            country: null,
            isLoading: false,
            error: false,
          });
          clearTimeout(t);
          return;
        }
      } catch {
        // Ignore preference failures and fall back to IP lookup
      }

      // 2) Fallback: approximate region via IP geolocation
      fetch(IP_API_URL, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: IpApiResponse) => {
          if (!mounted) return;
          if (data.status !== "success" || data.message) {
            setState((s) => ({ ...s, isLoading: false, error: true }));
            return;
          }
          const city = data.city?.trim() || data.regionName?.trim() || null;
          const country = data.country?.trim() || null;
          const parts = [city, country].filter(Boolean);
          const regionLabel = parts.length > 0 ? parts.join(", ") : null;
          setState({
            regionLabel,
            city: city || null,
            country: country || null,
            isLoading: false,
            error: false,
          });
        })
        .catch(() => {
          if (mounted) {
            setState((s) => ({ ...s, isLoading: false, error: true }));
          }
        })
        .finally(() => {
          clearTimeout(t);
        });
    };

    void detect();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return state;
}
