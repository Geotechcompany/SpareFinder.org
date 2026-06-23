export const IMPERSONATION_STORAGE_KEY = "sparefinder_impersonation";

export type ImpersonationMeta = {
  targetEmail?: string;
  targetName?: string;
  returnUrl: string;
};

export type ImpersonationSignIn = {
  create: (params: {
    strategy: "ticket";
    ticket: string;
  }) => Promise<{
    status: string | null;
    createdSessionId?: string | null;
  }>;
};

export type ImpersonationSessionDeps = {
  signOut: () => Promise<unknown>;
  signIn: ImpersonationSignIn;
  setActive: (params: { session: string }) => Promise<unknown>;
};

export function readImpersonationMeta(): ImpersonationMeta | null {
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImpersonationMeta;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      returnUrl: parsed.returnUrl || "/admin/users",
      targetEmail: parsed.targetEmail,
      targetName: parsed.targetName,
    };
  } catch {
    return null;
  }
}

export function writeImpersonationMeta(meta: ImpersonationMeta): void {
  sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(meta));
}

export function clearImpersonationMeta(): void {
  sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
}

export function extractTicketFromRedirectUrl(redirectUrl?: string | null): string | null {
  if (!redirectUrl?.trim()) return null;
  try {
    const parsed = new URL(redirectUrl, window.location.origin);
    for (const key of ["__clerk_ticket", "ticket"]) {
      const value = parsed.searchParams.get(key)?.trim();
      if (value) return value;
    }
  } catch {
    return null;
  }
  return null;
}

export function buildImpersonationLoginUrl(ticket: string, nextPath = "/dashboard"): string {
  const params = new URLSearchParams();
  params.set("__clerk_ticket", ticket);
  params.set("next", nextPath);
  return `/login?${params.toString()}`;
}

export async function consumeImpersonationTicket(
  deps: ImpersonationSessionDeps,
  ticket: string
): Promise<string> {
  const trimmed = ticket.trim();
  if (!trimmed) {
    throw new Error("Missing impersonation ticket.");
  }

  try {
    await deps.signOut();
  } catch {
    // Continue — actor tokens expect a clean sign-in even if sign-out fails.
  }

  const attempt = await deps.signIn.create({
    strategy: "ticket",
    ticket: trimmed,
  });

  if (attempt.status !== "complete" || !attempt.createdSessionId) {
    throw new Error("Impersonation sign-in did not complete. Try again from User Management.");
  }

  await deps.setActive({ session: attempt.createdSessionId });
  return attempt.createdSessionId;
}

export function startImpersonationSession(
  session: { token?: string | null; redirectUrl?: string | null },
  meta: ImpersonationMeta
): void {
  writeImpersonationMeta(meta);

  const ticket =
    session.token?.trim() || extractTicketFromRedirectUrl(session.redirectUrl) || null;

  if (ticket) {
    window.location.href = buildImpersonationLoginUrl(ticket, "/dashboard");
    return;
  }

  const redirectUrl = session.redirectUrl?.trim();
  if (redirectUrl) {
    window.location.href = redirectUrl;
    return;
  }

  throw new Error("No impersonation ticket returned from the server.");
}

/** @deprecated Use startImpersonationSession */
export function startImpersonationRedirect(token: string, meta: ImpersonationMeta): void {
  startImpersonationSession({ token }, meta);
}

export function readImpersonationTicketFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get("__clerk_ticket")?.trim() || params.get("ticket")?.trim() || null;
}
