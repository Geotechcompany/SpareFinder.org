import { Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { supabase } from "../server";
import { AuthRequest } from "../types/auth";
import {
  fetchClerkUser,
  verifyClerkSessionToken,
} from "../services/clerk-auth";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const shouldUpdateStringField = (current: unknown, incoming: string | null) => {
  if (!incoming) return false;
  if (typeof current !== "string") return true;
  const trimmed = current.trim();
  if (trimmed.length === 0) return true;
  return trimmed !== incoming;
};

const parseEmailAllowlist = (raw: string | undefined) => {
  const list = (raw ?? "")
    .split(/[,;\n]/g)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list);
};

type AppRole = "user" | "admin" | "super_admin";
const roleRank: Record<AppRole, number> = {
  user: 0,
  admin: 1,
  super_admin: 2,
};

const resolveDesiredRole = (args: {
  currentRole: unknown;
  metadataRole: AppRole | null;
  isEmailAllowlisted: boolean;
}): { desiredRole: AppRole; shouldUpdate: boolean } => {
  const current =
    args.currentRole === "admin" ||
    args.currentRole === "super_admin" ||
    args.currentRole === "user"
      ? (args.currentRole as AppRole)
      : "user";

  // Only ever upgrade automatically (never downgrade on login).
  const fromAllowlist: AppRole = args.isEmailAllowlisted ? "admin" : "user";
  const fromMetadata: AppRole = args.metadataRole ?? "user";

  const desired: AppRole =
    roleRank[fromMetadata] >= roleRank[fromAllowlist] ? fromMetadata : fromAllowlist;

  const shouldUpdate = roleRank[desired] > roleRank[current];
  return { desiredRole: desired, shouldUpdate };
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth Check - Token Present:', !!token);

    if (!token) {
      console.warn('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Authentication token is required'
      });
    }

    // 1) Try Clerk session token first (new auth)
    // Important: do NOT require Clerk REST API access just to validate a request.
    // We can authenticate using the Clerk JWT `sub` (clerk user id) and map to our profile.
    try {
      const verified = await verifyClerkSessionToken(token);
      if (verified?.clerkUserId) {
        const clerkUserId = verified.clerkUserId;

        // Find existing profile by clerk_user_id (no Clerk API call needed)
        const { data: byClerk, error: byClerkError } = await supabase
          .from("profiles")
          .select("*")
          .eq("clerk_user_id", clerkUserId)
          .single();

        if (!byClerkError && byClerk) {
          req.user = {
            userId: byClerk.id,
            email: (byClerk.email as string) || "",
            role: byClerk.role || "user",
            clerkUserId,
          };

          console.log("🎉 User Successfully Authenticated (Clerk):", req.user);
          return next();
        }

        if (byClerkError && byClerkError.code !== "PGRST116") {
          console.error("❌ Clerk profile lookup error:", byClerkError);
          return res.status(500).json({
            success: false,
            error: "Profile fetch failed",
            message: "Failed to retrieve user profile",
          });
        }

        // If we didn't find a profile by clerk_user_id, we need email to link/create.
        // That requires Clerk REST API; if CLERK_SECRET_KEY is missing/mismatched, fail closed with a clear error.
        const secretKey = (process.env.CLERK_SECRET_KEY || "").trim();
        if (!secretKey) {
          return res.status(401).json({
            success: false,
            error: "clerk_not_configured",
            message:
              "Authentication token is valid, but the server is not configured to link your account. Please contact support.",
          });
        }

        const clerkUser = await fetchClerkUser(clerkUserId);
        const desiredEmail = normalizeEmail(clerkUser.primaryEmail);
        const desiredFullName =
          clerkUser.fullName || desiredEmail.split("@")[0] || null;
        const desiredAvatarUrl = clerkUser.avatarUrl ?? null;
        const emailAllowlist = parseEmailAllowlist(process.env.ADMIN_WHITELIST_EMAILS);
        const isEmailAllowlisted = emailAllowlist.has(desiredEmail);

        // Link existing profile by email (one-time migration)
        const { data: byEmail, error: byEmailError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", desiredEmail)
          .single();

        if (!byEmailError && byEmail) {
          // If profile is already linked to a different Clerk user, block to prevent account takeovers.
          if (
            byEmail.clerk_user_id &&
            byEmail.clerk_user_id !== clerkUser.clerkUserId
          ) {
            return res.status(409).json({
              success: false,
              error: "Account conflict",
              message:
                "This email is already linked to a different account. Please contact support.",
            });
          }

          // Link + sync (safe, does not overwrite populated fields unless changed)
          const patch: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          if (!byEmail.clerk_user_id) patch.clerk_user_id = clerkUser.clerkUserId;
          if (shouldUpdateStringField(byEmail.full_name, desiredFullName)) {
            patch.full_name = desiredFullName;
          }
          if (shouldUpdateStringField(byEmail.avatar_url, desiredAvatarUrl)) {
            patch.avatar_url = desiredAvatarUrl;
          }

          const { desiredRole, shouldUpdate: shouldUpdateRole } = resolveDesiredRole({
            currentRole: byEmail.role,
            metadataRole: clerkUser.roleFromMetadata,
            isEmailAllowlisted,
          });
          if (shouldUpdateRole) patch.role = desiredRole;

          const { data: linked, error: linkError } = await supabase
            .from("profiles")
            .update(patch)
            .eq("id", byEmail.id)
            .select("*")
            .single();

          if (linkError) {
            console.error("❌ Failed to link/sync Clerk user to profile:", linkError);
            return res.status(500).json({
              success: false,
              error: "Profile update failed",
              message: "Failed to link your account. Please contact support.",
            });
          }

          req.user = {
            userId: linked.id,
            email: (linked.email as string) || desiredEmail,
            role: linked.role || "user",
            clerkUserId: clerkUser.clerkUserId,
          };

          console.log("🎉 User Successfully Authenticated (Clerk linked/synced):", req.user);
          return next();
        }

        if (byEmailError && byEmailError.code !== "PGRST116") {
          console.error("❌ Email profile lookup error:", byEmailError);
          return res.status(500).json({
            success: false,
            error: "Profile fetch failed",
            message: "Failed to retrieve user profile",
          });
        }

        // No existing profile: create a Supabase Auth user (to satisfy FK profiles.id -> auth.users.id),
        // then create the profile row mapped to Clerk.
        const nowIso = new Date().toISOString();
        const { desiredRole } = resolveDesiredRole({
          currentRole: "user",
          metadataRole: clerkUser.roleFromMetadata,
          isEmailAllowlisted,
        });

        const randomPassword = randomBytes(24).toString("base64url");
        const { data: authCreated, error: authCreateError } =
          await supabase.auth.admin.createUser({
            email: desiredEmail,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
              full_name: desiredFullName,
              avatar_url: desiredAvatarUrl,
              clerk_user_id: clerkUser.clerkUserId,
            },
          });

        const authUserId = authCreated?.user?.id ?? null;
        if (authCreateError || !authUserId) {
          console.error("❌ Supabase auth user creation failed:", authCreateError);
          return res.status(500).json({
            success: false,
            error: "Account creation failed",
            message:
              "Failed to create user account. Please contact support.",
          });
        }

        const { data: created, error: createError } = await supabase
          .from("profiles")
          .insert([
            {
              id: authUserId,
              email: desiredEmail,
              full_name: desiredFullName || "User",
              avatar_url: desiredAvatarUrl,
              role: desiredRole,
              clerk_user_id: clerkUser.clerkUserId,
              created_at: nowIso,
              updated_at: nowIso,
            },
          ])
          .select("*")
          .single();

        if (createError) {
          console.error("❌ Clerk profile creation error:", createError);
          // Best-effort cleanup so we don't leave orphaned auth users behind.
          await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
          return res.status(500).json({
            success: false,
            error: "Profile creation failed",
            message: "Failed to create user profile. Please contact support.",
          });
        }

        req.user = {
          userId: created.id,
          email: (created.email as string) || desiredEmail,
          role: created.role || "user",
          clerkUserId: clerkUser.clerkUserId,
        };

        console.log("🎉 User Successfully Authenticated (Clerk new profile):", req.user);
        return next();
      }
    } catch (clerkError) {
      // If this looks like a Clerk token, don't fall back to Supabase (it will always fail
      // and you'll get confusing "Invalid token" errors).
      const looksLikeClerkToken = (() => {
        try {
          const parts = String(token).split(".");
          if (parts.length !== 3) return false;
          const payloadJson = JSON.parse(
            Buffer.from(parts[1], "base64").toString("utf8")
          ) as any;
          const iss = payloadJson?.iss as string | undefined;
          const sub = payloadJson?.sub as string | undefined;
          return (
            (typeof iss === "string" && iss.toLowerCase().includes("clerk")) ||
            (typeof sub === "string" && sub.startsWith("user_"))
          );
        } catch {
          return false;
        }
      })();

      if (looksLikeClerkToken) {
        console.warn("⚠️ Clerk token verification failed (likely key/instance mismatch):", clerkError);
        return res.status(401).json({
          success: false,
          error: "clerk_token_invalid",
          message:
            "Clerk authentication token could not be verified by the server. Ensure frontend and backend use the SAME Clerk instance (pk_test/sk_test or pk_live/sk_live) and that CLERK_JWT_PUBLIC_KEY matches that instance.",
        });
      }

      // Otherwise, fall back to legacy Supabase auth below.
      console.warn("⚠️ Clerk token verification failed, falling back to Supabase:", clerkError);
    }

    // 2) Legacy path: Supabase Auth access token (existing auth)
    console.log("🔍 Verifying token with Supabase...");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
          
    if (authError || !user) {
      console.warn("❌ Supabase token verification failed:", authError?.message);
      return res.status(401).json({
        success: false,
        error: "Invalid token",
        message:
          "Authentication token is invalid or expired. Please log in again.",
      });
    }

          console.log('✅ Supabase User Verified:', {
            id: user.id,
      email: user.email
          });

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('🆕 Creating profile for user:', user.email);
      
      // Use service role directly (bypasses RLS automatically)
      // The service role key is already configured in the supabase client
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          company: user.user_metadata?.company || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          role: 'user', // Default role for new users
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

            if (createError) {
        console.error('❌ Profile creation error:', createError);
        return res.status(500).json({
          success: false,
          error: 'Profile creation failed',
          message: 'Failed to create user profile. Please contact support.',
          details: createError.message
        });
          }

      req.user = {
            userId: user.id,
            email: user.email || '',
        role: newProfile.role || 'user'
          };
    } else if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return res.status(500).json({
        success: false,
        error: 'Profile fetch failed',
        message: 'Failed to retrieve user profile'
      });
    } else {
      req.user = {
        userId: user.id,
        email: user.email || '',
        role: profile.role || 'user'
      };
        }

    console.log('🎉 User Successfully Authenticated:', req.user);
        return next();

  } catch (error) {
    console.error('🚨 Unexpected Authentication Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Please log in first",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        message: "You do not have permission to access this resource",
      });
    }

    return next();
  };
};

export const requireAdmin = requireRole(["admin", "super_admin"]);
export const requireSuperAdmin = requireRole(["super_admin"]);

// Middleware specifically for admin console access
export const requireAdminLogin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "Please log in first",
    });
  }

  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({
      error: "Insufficient permissions",
      message: "Admin privileges required",
    });
  }

  return next();
}; 