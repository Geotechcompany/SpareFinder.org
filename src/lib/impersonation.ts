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

export function startImpersonationRedirect(token: string, meta: ImpersonationMeta): void {
  writeImpersonationMeta(meta);
  const ticket = encodeURIComponent(token);
  window.location.href = `${window.location.origin}/dashboard?__clerk_ticket=${ticket}`;
}
