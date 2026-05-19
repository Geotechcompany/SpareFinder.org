export const IMPERSONATION_STORAGE_KEY = "sparefinder_impersonation";

export type ImpersonationMeta = {
  targetEmail?: string;
  targetName?: string;
  returnUrl: string;
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

export function startImpersonationSession(
  session: { token?: string | null; redirectUrl?: string | null },
  meta: ImpersonationMeta
): void {
  writeImpersonationMeta(meta);

  const redirectUrl = session.redirectUrl?.trim();
  if (redirectUrl) {
    window.location.href = redirectUrl;
    return;
  }

  const token = session.token?.trim();
  if (token) {
    const ticket = encodeURIComponent(token);
    window.location.href = `${window.location.origin}/dashboard?__clerk_ticket=${ticket}`;
    return;
  }

  throw new Error("No impersonation ticket returned from the server.");
}

/** @deprecated Use startImpersonationSession */
export function startImpersonationRedirect(token: string, meta: ImpersonationMeta): void {
  startImpersonationSession({ token }, meta);
}
