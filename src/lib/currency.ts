/** Currency display and conversion for supplier pricing. */

const RATES_FROM_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.53,
  NZD: 1.67,
  JPY: 149,
  INR: 83,
  ZAR: 18.5,
  AED: 3.67,
  SAR: 3.75,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.9,
  SGD: 1.34,
  HKD: 7.82,
  MXN: 17,
  BRL: 5,
  KES: 129,
  NGN: 1550,
  GHS: 15.5,
};

const SYMBOL_TO_CODE: Record<string, string> = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
  "₹": "INR",
  R: "ZAR",
};

export function getCurrencySymbol(code: string): string {
  const upper = (code || "GBP").toUpperCase();
  const symbols: Record<string, string> = {
    GBP: "£",
    USD: "$",
    EUR: "€",
    JPY: "¥",
    INR: "₹",
    ZAR: "R",
    KES: "KSh",
    NGN: "₦",
    CAD: "C$",
    AUD: "A$",
  };
  return symbols[upper] ?? `${upper} `;
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const src = (fromCurrency || "USD").toUpperCase();
  const dst = (toCurrency || "GBP").toUpperCase();
  if (src === dst) return amount;
  const srcRate = RATES_FROM_USD[src] ?? 1;
  const dstRate = RATES_FROM_USD[dst] ?? 1;
  const usd = amount / srcRate;
  return usd * dstRate;
}

function detectSourceCurrency(text: string): string {
  if (/£/.test(text)) return "GBP";
  if (/€/.test(text)) return "EUR";
  if (/₹/.test(text)) return "INR";
  if (/¥/.test(text)) return "JPY";
  if (/\bUSD\b/i.test(text)) return "USD";
  if (/\bGBP\b/i.test(text)) return "GBP";
  if (/\bEUR\b/i.test(text)) return "EUR";
  if (/KSh/.test(text) || /\bKES\b/i.test(text)) return "KES";
  if (/\$/.test(text)) return "USD";
  return "USD";
}

function formatConvertedAmount(amount: number, targetCurrency: string): string {
  const code = targetCurrency.toUpperCase();
  if (code === "JPY" || code === "INR" || code === "KES" || code === "NGN") {
    return `${getCurrencySymbol(code)}${Math.round(amount).toLocaleString()}`;
  }
  return `${getCurrencySymbol(code)}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** Convert price text like "$1,800 - $2,600" to the user's currency. */
export function convertPriceText(
  text: string | undefined | null,
  targetCurrency: string
): string {
  if (!text?.trim()) return text ?? "";
  const target = (targetCurrency || "GBP").toUpperCase();
  const source = detectSourceCurrency(text);
  if (source === target) return text;

  const amountPattern = /([£$€₹¥]|R\s?)?([\d,]+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  let result = text;
  const replacements: Array<{ from: string; to: string }> = [];

  while ((match = amountPattern.exec(text)) !== null) {
    const raw = match[0];
    const numeric = parseFloat(match[2].replace(/,/g, ""));
    if (Number.isNaN(numeric)) continue;
    const converted = convertAmount(numeric, source, target);
    replacements.push({
      from: raw,
      to: formatConvertedAmount(converted, target),
    });
  }

  for (const { from, to } of replacements) {
    result = result.replace(from, to);
  }

  if (result !== text && !/\b[A-Z]{3}\b/.test(result)) {
    result = `${result.trim()} (${target})`;
  }
  return result;
}

/** Resolve target currency from report metadata or SEARCH REGION block. */
export function resolveReportCurrency(
  reportText: string,
  searchCurrency?: string | null
): string {
  if (searchCurrency?.trim()) return searchCurrency.trim().toUpperCase();
  const match = reportText.match(/\*\*Currency:\*\*\s*([A-Z]{3})/i);
  if (match) return match[1].toUpperCase();
  const regionMatch = reportText.match(/\*\*Region searched:\*\*\s*([^,\n]+)/i);
  if (regionMatch) {
    const country = regionMatch[1].trim().toLowerCase();
    if (country.includes("kenya")) return "KES";
    if (country.includes("united kingdom") || country === "uk") return "GBP";
    if (country.includes("united states") || country === "usa") return "USD";
  }
  return "GBP";
}

/** Convert all prices in a full analysis report markdown string. */
export function convertReportPrices(
  reportText: string,
  targetCurrency: string
): string {
  if (!reportText?.trim() || !targetCurrency) return reportText;

  const target = targetCurrency.toUpperCase();
  let text = reportText.replace(
    /\*\*Currency:\*\*\s*[A-Z]{3}/gi,
    `**Currency:** ${target}`
  );

  text = text
    .split("\n")
    .map((line) => {
      if (/[£$€₹]|KSh|\b(GBP|USD|EUR|KES)\b/i.test(line)) {
        return convertPriceText(line, target);
      }
      return line;
    })
    .join("\n");

  return text;
}

export function formatPriceRange(
  price: { min: number; max: number; currency: string } | null | undefined,
  targetCurrency?: string
): string {
  if (!price || price.min == null || price.max == null) {
    return "Price not available";
  }
  const target = (targetCurrency || price.currency || "GBP").toUpperCase();
  const min =
    price.currency.toUpperCase() === target
      ? price.min
      : convertAmount(price.min, price.currency, target);
  const max =
    price.currency.toUpperCase() === target
      ? price.max
      : convertAmount(price.max, price.currency, target);
  const sym = getCurrencySymbol(target);
  return `${sym}${Math.round(min).toLocaleString()} - ${sym}${Math.round(max).toLocaleString()}`;
}
