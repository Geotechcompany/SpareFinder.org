// NOTE: `jose` is ESM-only. This backend currently compiles to CommonJS for Node.
// If we `import { ... } from "jose"` here, the emitted JS becomes `require("jose")`,
// which crashes at runtime with ERR_REQUIRE_ESM on Node 18.
//
// To stay on CommonJS without changing the whole backend build, we load `jose`
// using native dynamic import in a way TypeScript will not transform into `require()`.
type JWTPayload = Record<string, unknown> & { sub?: string; iss?: string };

type JoseModule = typeof import("jose");
let joseModule: JoseModule | null = null;

const loadJose = async (): Promise<JoseModule> => {
  if (joseModule) return joseModule;
  // `new Function()` prevents TypeScript from downleveling dynamic import to require().
  const importer = new Function('return import("jose")') as () => Promise<JoseModule>;
  joseModule = await importer();
  return joseModule;
};

type VerifiedClerkToken = {
  clerkUserId: string;
  issuer: string;
  payload: JWTPayload;
};

const isAllowedIssuerForRemoteJwks = (issuer: unknown): issuer is string => {
  if (typeof issuer !== "string" || issuer.length === 0) return false;
  // Remote JWKS fetching must be restricted to avoid accepting attacker-controlled issuers.
  // When CLERK_JWT_PUBLIC_KEY is set, we verify offline with our pinned key, which is safe
  // even if the issuer is a custom domain (e.g. https://clerk.yourdomain.com).
  return issuer.includes("clerk.accounts.");
};

const buildClerkJwksUrl = (issuer: string) => {
  // Ensure no trailing slash duplication
  const normalized = issuer.endsWith("/") ? issuer.slice(0, -1) : issuer;
  return new URL(`${normalized}/.well-known/jwks.json`);
};

const jwksByIssuer = new Map<string, any>();
let cachedSpkiKey: any | null = null;

const getSpkiKey = async () => {
  if (cachedSpkiKey) return cachedSpkiKey;

  const raw = process.env.CLERK_JWT_PUBLIC_KEY;
  if (!raw) return null;

  // Support either literal PEM or a single-line env value with \n escapes.
  const pem = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  const { importSPKI } = await loadJose();
  cachedSpkiKey = await importSPKI(pem, "RS256");
  return cachedSpkiKey;
};

export const verifyClerkSessionToken = async (token: string) => {
  const { decodeJwt, jwtVerify, createRemoteJWKSet } = await loadJose();

  const decoded = decodeJwt(token);
  const issuer = decoded.iss;
  if (typeof issuer !== "string" || issuer.length === 0) return null;

  // Prefer offline verification if CLERK_JWT_PUBLIC_KEY is configured.
  const spkiKey = await getSpkiKey();
  if (!spkiKey && !isAllowedIssuerForRemoteJwks(issuer)) return null;
  const { payload } = spkiKey
    ? await jwtVerify(token, spkiKey, { issuer })
    : await jwtVerify(
        token,
        jwksByIssuer.get(issuer) ??
          (() => {
            const jwks = createRemoteJWKSet(buildClerkJwksUrl(issuer), {
              // Default jose timeout can be too aggressive on some networks.
              timeoutDuration: 20_000,
              cooldownDuration: 60_000,
            });
            jwksByIssuer.set(issuer, jwks);
            return jwks;
          })(),
        { issuer }
      );

  const clerkUserId = payload.sub;
  if (!clerkUserId) {
    throw new Error("Clerk token missing subject (sub)");
  }

  return { clerkUserId, issuer, payload } satisfies VerifiedClerkToken;
};

export type ClerkUserSummary = {
  clerkUserId: string;
  primaryEmail: string;
  fullName: string | null;
  avatarUrl: string | null;
  roleFromMetadata: "user" | "admin" | "super_admin" | null;
};

type ClerkApiUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  public_metadata?: Record<string, unknown> | null;
  private_metadata?: Record<string, unknown> | null;
  email_addresses?: Array<{
    id: string;
    email_address: string;
  }>;
};

export const fetchClerkUser = async (clerkUserId: string) => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY");
  }

  const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch Clerk user (${res.status}): ${text || res.statusText}`
    );
  }

  const user = (await res.json()) as ClerkApiUser;

  const emailAddresses = user.email_addresses ?? [];
  const primaryEmail =
    emailAddresses.find((e) => e.id === user.primary_email_address_id)
      ?.email_address ??
    emailAddresses[0]?.email_address ??
    null;

  if (!primaryEmail) {
    throw new Error("Clerk user has no email address");
  }

  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || null;

  const rawRole =
    (user.public_metadata?.role ?? user.private_metadata?.role) as
      | "user"
      | "admin"
      | "super_admin"
      | string
      | undefined;

  const roleFromMetadata =
    rawRole === "admin" || rawRole === "super_admin" || rawRole === "user"
      ? rawRole
      : null;

  return {
    clerkUserId: user.id,
    primaryEmail,
    fullName,
    avatarUrl: user.image_url ?? null,
    roleFromMetadata,
  } satisfies ClerkUserSummary;
};

export const findClerkUserIdByEmail = async (email: string) => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY");
  }

  const url = new URL("https://api.clerk.com/v1/users");
  url.searchParams.set("email_address", email);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to query Clerk users (${res.status}): ${text || res.statusText}`
    );
  }

  const users = (await res.json()) as Array<{ id: string }>;
  return users?.[0]?.id ?? null;
};

export const createClerkInvitation = async (args: {
  email: string;
  redirectUrl: string;
}) => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY");
  }

  const res = await fetch("https://api.clerk.com/v1/invitations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: args.email,
      redirect_url: args.redirectUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to create Clerk invitation (${res.status}): ${text || res.statusText}`
    );
  }

  return (await res.json()) as unknown;
};


