import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

dotenv.config();

type DbReview = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  rating: number;
  title: string;
  message: string;
  published: boolean;
  verified: boolean;
  created_at: string;
};

type NewReview = Omit<DbReview, "id">;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment. Check backend/.env."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STOP_WORDS = new Set(
  [
    "the",
    "and",
    "a",
    "an",
    "to",
    "of",
    "in",
    "on",
    "for",
    "our",
    "we",
    "it",
    "is",
    "are",
    "was",
    "were",
    "with",
    "that",
    "this",
    "as",
    "at",
    "by",
    "from",
    "or",
    "be",
    "been",
    "into",
    "now",
    "really",
    "very",
    "has",
    "have",
    "had",
    "their",
    "they",
    "them",
    "its",
    "your",
    "you",
    "i",
    "me",
    "my",
    "us",
    "also",
    "can",
    "could",
    "would",
    "should",
    "minutes",
    "hour",
    "hours",
    "day",
    "days",
    "team",
    "platform",
    "tool",
    "sparefinder",
    "parts",
    "part",
    "identification",
    "identify",
    "recognition",
    "ai",
    "great",
    "exactly",
    "what",
    "got",
    "significantly",
    "outstanding",
    "excellent",
    "impressed",
    "remarkable",
    "unmatched",
    "game",
    "changer",
    "platforms",
    "work",
    "working",
    "workflow",
    "team",
  ].map((w) => w.toLowerCase())
);

const DOMAIN_HINTS = new Set(
  [
    "oem",
    "aftermarket",
    "vin",
    "catalog",
    "catalogs",
    "inventory",
    "procurement",
    "sourcing",
    "supplier",
    "suppliers",
    "compatibility",
    "spec",
    "specs",
    "returns",
    "orders",
    "misordered",
    "crosscheck",
    "crosschecking",
    "verification",
    "matches",
    "accuracy",
    "turnaround",
    "maintenance",
    "workshop",
    "workshops",
    "stores",
    "purchase",
  ].map((w) => w.toLowerCase())
);

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickOne<T>(arr: readonly T[]): T {
  return arr[crypto.randomInt(0, arr.length)];
}

function pickManyUnique<T>(arr: readonly T[], count: number): T[] {
  const chosen = new Set<number>();
  const result: T[] = [];

  while (result.length < count && chosen.size < arr.length) {
    const idx = crypto.randomInt(0, arr.length);
    if (chosen.has(idx)) continue;
    chosen.add(idx);
    result.push(arr[idx]!);
  }
  return result;
}

function extractKeywords(seedReviews: DbReview[]): string[] {
  const freq = new Map<string, number>();
  for (const r of seedReviews) {
    const text = `${r.title} ${r.message}`;
    const tokens = normalizeText(text).split(" ");
    for (const t of tokens) {
      if (t.length < 3) continue;
      if (STOP_WORDS.has(t)) continue;
      if (!/^[a-z][a-z0-9-]+$/i.test(t)) continue;
      // Prefer domain-relevant tokens; otherwise require they appear multiple times.
      const weight = DOMAIN_HINTS.has(t) ? 3 : 1;
      freq.set(t, (freq.get(t) || 0) + 1);
      // Apply weight by additional increments (keeps code simple).
      for (let i = 1; i < weight; i++) {
        freq.set(t, (freq.get(t) || 0) + 1);
      }
    }
  }

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

  const filtered = sorted
    .filter(([word, count]) => DOMAIN_HINTS.has(word) || count >= 2)
    .map(([word]) => word);

  const fallback = [
    "oem",
    "aftermarket",
    "catalog",
    "inventory",
    "procurement",
    "sourcing",
    "suppliers",
    "compatibility",
    "specs",
    "returns",
    "turnaround",
  ];

  const combined = [...filtered];
  for (const w of fallback) {
    if (!combined.includes(w)) combined.push(w);
  }

  return combined.slice(0, 24);
}

function buildExistingFingerprintSet(seedReviews: DbReview[]): Set<string> {
  const set = new Set<string>();
  for (const r of seedReviews) {
    set.add(`${normalizeText(r.title)}::${normalizeText(r.message)}`);
  }
  return set;
}

function generateCandidate(
  keywords: string[],
  emailSuffix: string
): Pick<NewReview, "name" | "email" | "company" | "rating" | "title" | "message" | "published" | "verified"> {
  const people = [
    { name: "Amina Otieno", company: "FleetCare Solutions" },
    { name: "James Mwangi", company: "Precision Auto & Parts" },
    { name: "Grace Njeri", company: "Industrial Supply Hub" },
    { name: "Daniel Kimani", company: "Workshop Pro Services" },
    { name: "Fatima Hassan", company: "Logistics & Maintenance Co." },
    { name: "Peter Ochieng", company: "Heavy Equipment Spares" },
    { name: "Linet Wambui", company: "OEM Parts Desk" },
    { name: "Brian Kibet", company: "Reliability Engineering Team" },
    { name: "Mercy Achieng", company: "Service Bay Network" },
    { name: "Kevin Odhiambo", company: "Procurement & Stores" },
  ] as const;

  const titleTemplates = [
    "Faster matching, fewer wrong orders",
    "Reliable results for OEM and aftermarket",
    "We cut turnaround time immediately",
    "Accurate matches even with partial info",
    "Procurement is smoother and more confident",
    "Great for workshops under pressure",
    "Strong accuracy across our catalog",
    "Helped us standardize part lookups",
    "A real boost for our stores team",
    "Less back-and-forth with suppliers",
  ] as const;

  const messageTemplates = [
    "We use it daily for {k1} and {k2}. The matches are consistent, and it has reduced mis-ordered items. Our team now confirms the right spec before placing purchase requests.",
    "What stood out is how quickly it surfaces likely matches for {k1}. Even when we only have partial details, we can narrow it down and keep jobs moving.",
    "It improved our workflow around {k1}. We spend less time cross-checking catalogs and more time actually serving customers. The accuracy feels dependable.",
    "We were skeptical at first, but it's been excellent for {k1} and {k2}. Fewer callbacks, fewer returns, and clearer confidence before ordering.",
    "For our {k1} requests, it’s a huge time saver. The suggestions are sensible and the UI makes it easy to compare options without getting lost.",
    "This is especially helpful when the pressure is on—{k1} comes in and we need an answer quickly. It's become part of our standard process.",
  ] as const;

  function keywordToTopicPhrase(keyword: string): string {
    const k = keyword.toLowerCase();
    const map: Record<string, string> = {
      oem: "OEM part numbers",
      aftermarket: "aftermarket alternatives",
      vin: "VIN-based lookups",
      catalog: "catalog matching",
      catalogs: "catalog matching",
      inventory: "inventory lookups",
      procurement: "procurement approvals",
      sourcing: "sourcing decisions",
      supplier: "supplier outreach",
      suppliers: "supplier outreach",
      compatibility: "compatibility checks",
      spec: "spec verification",
      specs: "spec verification",
      returns: "reducing returns",
      orders: "order accuracy",
      turnaround: "urgent part requests",
      maintenance: "maintenance parts triage",
      workshop: "workshop requests",
      workshops: "workshop requests",
      stores: "stores and inventory ops",
      purchase: "purchase requests",
      matches: "matching results",
      accuracy: "accuracy checks",
    };
    return map[k] || keyword;
  }

  const { name, company } = pickOne(people);
  const [k1Raw, k2Raw] = pickManyUnique(
    keywords.length ? keywords : ["inventory", "sourcing", "catalog", "compatibility"],
    2
  );
  const k1 = keywordToTopicPhrase(k1Raw ?? "inventory");
  const k2 = keywordToTopicPhrase(k2Raw ?? "sourcing");

  const title = pickOne(titleTemplates);
  const message = pickOne(messageTemplates)
    .replaceAll("{k1}", k1)
    .replaceAll("{k2}", k2);

  const first = normalizeText(name).split(" ")[0] || "user";
  const email = `${first}.${emailSuffix}@example.com`.toLowerCase();

  const rating = pickOne([5, 5, 5, 4]);

  return {
    name,
    email,
    company,
    rating,
    title,
    message,
    published: true,
    verified: true,
  };
}

function generateUniqueReviews(seedReviews: DbReview[], count: number): NewReview[] {
  const keywords = extractKeywords(seedReviews);
  const existing = buildExistingFingerprintSet(seedReviews);
  const results: NewReview[] = [];
  const usedNames = new Set<string>();

  const emailSuffixBase = `${Date.now()}`.slice(-8);
  let attempts = 0;

  while (results.length < count) {
    attempts += 1;
    if (attempts > 500) {
      throw new Error(
        "Unable to generate enough unique reviews after many attempts. Try increasing seed review count."
      );
    }

    const emailSuffix = `${emailSuffixBase}.${results.length + 1}`;
    const candidate = generateCandidate(keywords, emailSuffix);
    if (usedNames.has(candidate.name)) continue;
    const fingerprint = `${normalizeText(candidate.title)}::${normalizeText(
      candidate.message
    )}`;

    if (existing.has(fingerprint)) continue;
    if (
      results.some(
        (r) =>
          normalizeText(r.title) === normalizeText(candidate.title) ||
          normalizeText(r.message) === normalizeText(candidate.message)
      )
    ) {
      continue;
    }

    existing.add(fingerprint);
    usedNames.add(candidate.name);
    results.push({
      ...candidate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return results;
}

async function main() {
  const shouldApply = process.argv.includes("--apply");
  const limitArgIdx = process.argv.findIndex((a) => a === "--limit");
  const limit =
    limitArgIdx >= 0 ? Number(process.argv[limitArgIdx + 1]) || 100 : 100;

  console.log("🔎 Fetching seed reviews from DB...");
  const { data: seedReviews, error } = await supabase
    .from("reviews")
    .select("id,name,email,company,rating,title,message,published,verified,created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Failed to fetch existing reviews:", error);
    process.exit(1);
  }

  const seeds = (seedReviews || []) as DbReview[];
  if (seeds.length < 3) {
    console.warn(
      `⚠️ Only found ${seeds.length} published reviews. Generation still works, but uniqueness/style may be limited.`
    );
  }

  const newReviews = generateUniqueReviews(seeds, 5);

  console.log("\n🧾 Generated 5 new unique reviews:\n");
  console.log(JSON.stringify(newReviews, null, 2));

  if (!shouldApply) {
    console.log(
      "\nℹ️ Dry run only. Re-run with --apply to insert these reviews into the database."
    );
    process.exit(0);
  }

  console.log("\n⬆️ Inserting generated reviews into DB...");
  const { data: inserted, error: insertError } = await supabase
    .from("reviews")
    .insert(newReviews)
    .select("id,title,created_at");

  if (insertError) {
    console.error("❌ Failed to insert reviews:", insertError);
    process.exit(1);
  }

  console.log("✅ Inserted reviews:");
  console.log(JSON.stringify(inserted, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});


