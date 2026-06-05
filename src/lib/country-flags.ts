/** Country name → ISO2 and flag emoji helpers for admin location display. */

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  "united states": "US",
  usa: "US",
  us: "US",
  canada: "CA",
  australia: "AU",
  "new zealand": "NZ",
  ireland: "IE",
  france: "FR",
  germany: "DE",
  spain: "ES",
  italy: "IT",
  netherlands: "NL",
  belgium: "BE",
  portugal: "PT",
  india: "IN",
  japan: "JP",
  "south africa": "ZA",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  switzerland: "CH",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  singapore: "SG",
  "hong kong": "HK",
  mexico: "MX",
  brazil: "BR",
  kenya: "KE",
  nigeria: "NG",
  ghana: "GH",
  tanzania: "TZ",
  uganda: "UG",
  egypt: "EG",
  china: "CN",
  "south korea": "KR",
  thailand: "TH",
  malaysia: "MY",
  philippines: "PH",
  pakistan: "PK",
  poland: "PL",
  "czech republic": "CZ",
  czechia: "CZ",
};

export function countryToIso2(country: string | null | undefined): string | null {
  const key = (country ?? "").trim().toLowerCase();
  if (!key) return null;
  if (COUNTRY_NAME_TO_ISO2[key]) return COUNTRY_NAME_TO_ISO2[key];
  if (key.length === 2 && /^[a-z]{2}$/i.test(key)) return key.toUpperCase();
  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_ISO2)) {
    if (key.includes(name) || name.includes(key)) return code;
  }
  return null;
}

/** ISO 3166-1 alpha-2 → flag emoji (e.g. KE → 🇰🇪). */
export function flagEmoji(iso2: string | null | undefined): string {
  const code = (iso2 ?? "").trim().toUpperCase();
  if (code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code.split("").map((char) => 0x1f1e6 - 65 + char.charCodeAt(0))
  );
}

export interface UserLocationDisplay {
  country?: string | null;
  region?: string | null;
  countryCode?: string | null;
  locationLabel?: string | null;
  currency?: string | null;
  useRegional?: boolean;
}

export function resolveUserLocation(user: Record<string, unknown>): UserLocationDisplay {
  const country = String(
    user.user_country ?? user.userCountry ?? ""
  ).trim();
  const region = String(user.user_region ?? user.userRegion ?? "").trim();
  const countryCode =
    String(user.country_code ?? "").trim().toUpperCase() ||
    countryToIso2(country);
  const locationLabel =
    String(user.location_label ?? "").trim() ||
    [country, region].filter(Boolean).join(", ") ||
    null;
  const currency = String(user.user_currency ?? user.userCurrency ?? "").trim();
  const useRegional = Boolean(
    user.use_regional_suppliers ?? user.useRegionalSuppliers
  );

  return {
    country: country || null,
    region: region || null,
    countryCode: countryCode || null,
    locationLabel,
    currency: currency || null,
    useRegional,
  };
}
