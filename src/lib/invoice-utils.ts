export type RawInvoice = {
  id: string;
  amount?: number;
  total?: number;
  status?: string;
  currency?: string;
  created_at?: string;
  created?: string;
  invoice_url?: string;
  hosted_invoice_url?: string;
  description?: string;
};

export type NormalizedInvoice = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  invoiceUrl: string;
  description: string;
};

export function isValidInvoiceUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

export function formatInvoiceDate(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function normalizeInvoice(inv: RawInvoice): NormalizedInvoice | null {
  const invoiceUrl = (inv.invoice_url || inv.hosted_invoice_url || "").trim();
  if (!isValidInvoiceUrl(invoiceUrl)) return null;

  const rawDate = inv.created_at || inv.created || "";
  return {
    id: inv.id,
    amount: Number(inv.amount ?? inv.total ?? 0),
    currency: String(inv.currency || "GBP").toUpperCase(),
    status: inv.status || "paid",
    date: formatInvoiceDate(rawDate) || rawDate,
    invoiceUrl,
    description: inv.description?.trim() || `Invoice ${inv.id}`,
  };
}

export function normalizeInvoices(invoices: RawInvoice[]): NormalizedInvoice[] {
  return invoices
    .map((inv) => normalizeInvoice(inv))
    .filter((inv): inv is NormalizedInvoice => inv !== null);
}
