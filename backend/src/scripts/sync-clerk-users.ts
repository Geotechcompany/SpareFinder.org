import dotenv from "dotenv";
dotenv.config();

import { supabase } from "../server";
import {
  createClerkInvitation,
  findClerkUserIdByEmail,
} from "../services/clerk-auth";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const parseArgs = () => {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has("--dry-run"),
    inviteMissing: args.has("--invite-missing"),
  };
};

const main = async () => {
  const { dryRun, inviteMissing } = parseArgs();

  const redirectUrl =
    process.env.FRONTEND_URL?.replace(/\/$/, "") + "/login" ||
    "http://localhost:3000/login";

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id,email,clerk_user_id")
    .not("email", "is", null);

  if (error) throw error;

  const rows = (profiles ?? []) as Array<{
    id: string;
    email: string | null;
    clerk_user_id: string | null;
  }>;

  const candidates = rows.filter((p) => !!p.email && !p.clerk_user_id);

  let linked = 0;
  let missing = 0;
  let invited = 0;
  let failed = 0;

  for (const profile of candidates) {
    const email = normalizeEmail(profile.email!);
    try {
      const clerkUserId = await findClerkUserIdByEmail(email);
      if (clerkUserId) {
        if (!dryRun) {
          const { error: updateErr } = await supabase
            .from("profiles")
            .update({ clerk_user_id: clerkUserId, updated_at: new Date().toISOString() })
            .eq("id", profile.id);
          if (updateErr) throw updateErr;
        }
        linked++;
        continue;
      }

      missing++;
      if (inviteMissing) {
        if (!dryRun) {
          await createClerkInvitation({ email, redirectUrl });
        }
        invited++;
      }
    } catch (e) {
      failed++;
      console.error(`[sync-clerk-users] Failed for ${email}:`, e);
    }
  }

  console.log(
    JSON.stringify(
      {
        scannedProfiles: rows.length,
        candidates: candidates.length,
        linked,
        missing,
        invited,
        failed,
        dryRun,
      },
      null,
      2
    )
  );
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[sync-clerk-users] Fatal:", e);
    process.exit(1);
  });


