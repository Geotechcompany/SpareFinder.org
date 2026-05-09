/** ISO 3166-1 alpha-2 for SerpAPI `gl` + lead tagging. Value "" = global (no bias). */
export const MARKETING_SERP_COUNTRIES: { value: string; label: string }[] = [
  { value: "", label: "Global (no country bias)" },
  { value: "ng", label: "Nigeria" },
  { value: "ke", label: "Kenya" },
  { value: "za", label: "South Africa" },
  { value: "gh", label: "Ghana" },
  { value: "eg", label: "Egypt" },
  { value: "ma", label: "Morocco" },
  { value: "gb", label: "United Kingdom" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "nl", label: "Netherlands" },
  { value: "be", label: "Belgium" },
  { value: "it", label: "Italy" },
  { value: "es", label: "Spain" },
  { value: "pl", label: "Poland" },
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "mx", label: "Mexico" },
  { value: "br", label: "Brazil" },
  { value: "in", label: "India" },
  { value: "ae", label: "United Arab Emirates" },
  { value: "sa", label: "Saudi Arabia" },
  { value: "au", label: "Australia" },
];

export function marketingCountryLabel(code: string): string {
  const c = (code || "").toLowerCase();
  return MARKETING_SERP_COUNTRIES.find((x) => x.value === c)?.label || (c ? c.toUpperCase() : "—");
}
