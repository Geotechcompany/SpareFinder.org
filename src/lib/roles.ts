/** Canonical app roles from Supabase / Clerk metadata. */

export type AppRole = "user" | "admin" | "super_admin";

export function normalizeAppRole(role?: string | null): AppRole {
  const r = (role || "user").trim().toLowerCase();
  if (r === "super_admin" || r === "superadmin" || r === "super-admin") {
    return "super_admin";
  }
  if (r === "admin" || r === "administrator") {
    return "admin";
  }
  return "user";
}

export function isAdminAppRole(role?: string | null): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === "admin" || normalized === "super_admin";
}

export function isSuperAdminAppRole(role?: string | null): boolean {
  return normalizeAppRole(role) === "super_admin";
}
