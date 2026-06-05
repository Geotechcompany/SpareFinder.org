import { api } from "@/lib/api";

export interface RegionPreference {
  useRegionalSuppliers: boolean;
  userCountry: string;
  userRegion: string;
  userCurrency: string;
}

export const DEFAULT_REGION_PREFERENCE: RegionPreference = {
  useRegionalSuppliers: false,
  userCountry: "",
  userRegion: "",
  userCurrency: "",
};

/** Same label format as Settings → Supplier region. */
export function buildRegionLabel(country: string, region: string): string | null {
  const parts = [country.trim(), region.trim()].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export async function loadRegionPreference(): Promise<RegionPreference> {
  const regionRes = await api.user.getRegionPreference();
  const data = (regionRes as { data?: Record<string, unknown> })?.data ?? regionRes;
  const row = data as Record<string, unknown>;
  return {
    useRegionalSuppliers: !!row?.useRegionalSuppliers,
    userCountry: String(row?.userCountry ?? "").trim(),
    userRegion: String(row?.userRegion ?? "").trim(),
    userCurrency: String(row?.userCurrency ?? "").trim().toUpperCase(),
  };
}

export async function persistRegionPreference(
  prefs: Partial<RegionPreference>
): Promise<void> {
  await api.user.updateProfile({
    preferences: {
      useRegionalSuppliers: prefs.useRegionalSuppliers,
      userCountry: prefs.userCountry,
      userRegion: prefs.userRegion,
      userCurrency: prefs.userCurrency,
    },
  });
}

export async function detectLocation(): Promise<{
  country: string;
  region: string;
  ip: string;
  currency: string;
}> {
  let country = "";
  let region = "";
  let ip = "";
  let currency = "";

  try {
    const res = await api.user.detectRegion();
    const r = res as Record<string, unknown>;
    country = String(r?.country ?? (r?.data as Record<string, unknown>)?.country ?? "").trim();
    region = String(r?.region ?? (r?.data as Record<string, unknown>)?.region ?? "").trim();
    ip = String(r?.ip ?? (r?.data as Record<string, unknown>)?.ip ?? "").trim();
    currency = String(
      r?.currency ?? (r?.data as Record<string, unknown>)?.currency ?? ""
    ).trim();

    if (!country && !region) {
      const ipRes = await fetch("https://ipapi.co/json/");
      const data = await ipRes.json();
      country = String(data.country_name ?? "").trim();
      region = String(data.region ?? "").trim();
      ip = String(data.ip ?? "").trim();
      currency = String(data.currency_code ?? data.currency ?? "").trim();
    }
  } catch {
    const ipRes = await fetch("https://ipapi.co/json/");
    const data = await ipRes.json();
    country = String(data.country_name ?? "").trim();
    region = String(data.region ?? "").trim();
    ip = String(data.ip ?? "").trim();
    currency = String(data.currency_code ?? data.currency ?? "").trim();
  }

  return { country, region, ip, currency };
}
