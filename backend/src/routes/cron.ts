import { Router, Request, Response } from "express";
import { supabase } from "../server";
import { emailService } from "../services/email-service";

const router = Router();
const ADMIN_SUMMARY_EMAIL = "arthurbreck417@gmail.com";

/**
 * Lightweight cron endpoint for external schedulers (e.g. cron-job.org).
 *
 * Usage examples:
 *   - Onboarding nudge (e.g. daily):
 *       GET /api/cron/reminders?type=onboarding&days_after_signup=3&token=YOUR_SECRET
 *   - Re-engagement (e.g. weekly):
 *       GET /api/cron/reminders?type=reengagement&inactive_days=14&token=YOUR_SECRET
 *
 * This endpoint is intentionally simple and public – it can be called directly
 * from cron-job.org or a browser without any secret keys.
 */
router.get("/reminders", async (req: Request, res: Response) => {
  try {
    // This endpoint is public by design (for cronjobs.org).
    // Do NOT put secrets in the URL unless you explicitly decide to protect it.

    // Safe test mode: send a single test email without querying/sending to users.
    // Example:
    //   GET /api/cron/reminders?test_email=arthurbreck417@gmail.com&token=...
    const testEmail = String(req.query.test_email || "").trim();
    if (testEmail) {
      const testTemplate = String(req.query.test_template || "generic").trim();
      const testName = String(req.query.test_name || "").trim();
      const nameFromEmail = testEmail.split("@")[0] ?? "there";
      const userName = testName || nameFromEmail;

      let ok = false;

      if (testTemplate === "reengagement") {
        ok = await emailService.sendReengagementEmail({
          userEmail: testEmail,
          userName,
        });
      } else if (testTemplate === "onboarding") {
        ok = await emailService.sendOnboardingNudgeEmail({
          userEmail: testEmail,
          userName,
        });
      } else {
        ok = await emailService.sendEmail({
          to: testEmail,
          subject: "SpareFinder cron test email",
          html: `<p>This is a <strong>test email</strong> from the SpareFinder cron endpoint.</p>
                 <p>Run at: ${new Date().toISOString()}</p>`,
          text: `This is a test email from the SpareFinder cron endpoint.\nRun at: ${new Date().toISOString()}`,
        });
      }

      return res.json({
        success: ok,
        type: "test",
        template: testTemplate,
        processed: ok ? 1 : 0,
        message: ok ? "Test email sent" : "Failed to send test email",
      });
    }

    const type =
      (req.query.type as "onboarding" | "reengagement" | undefined) ||
      "onboarding";

    const now = new Date();

    if (type === "onboarding") {
      // Default: nudge users ~3 days after signup
      const daysAfterSignup = Number(req.query.days_after_signup) || 3;
      const cutoffStart = new Date(now);
      cutoffStart.setDate(now.getDate() - (daysAfterSignup + 1));
      const cutoffEnd = new Date(now);
      cutoffEnd.setDate(now.getDate() - daysAfterSignup);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .gte("created_at", cutoffStart.toISOString())
        .lte("created_at", cutoffEnd.toISOString())
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) {
        console.error("Cron onboarding query failed:", error);
        return res.status(500).json({
          success: false,
          error: "query_failed",
          message: "Failed to fetch profiles for onboarding reminders",
        });
      }

      if (!profiles || profiles.length === 0) {
        return res.json({
          success: true,
          type,
          processed: 0,
          message: "No users matched onboarding reminder window",
        });
      }

      // Send emails in the background so the cron HTTP call returns quickly
      (async () => {
        let sent = 0;
        let failed = 0;
        const copy = await emailService.getAiReminderCopy("onboarding");

        for (const profile of profiles) {
          const email = profile.email as string | null;
          if (!email) continue;

          try {
            const ok = await emailService.sendOnboardingNudgeEmail({
              userEmail: email,
              userName:
                (profile.full_name as string | null) ||
                (email.split("@")[0] ?? "there"),
              copy: copy || undefined,
            });
            if (ok) sent += 1;
            else failed += 1;
          } catch (e) {
            failed += 1;
            console.error("Failed to send onboarding nudge:", e);
          }
        }

        const summary = {
          type,
          mode: "onboarding",
          processed: profiles.length,
          sent,
          failed,
          window: {
            from: cutoffStart.toISOString(),
            to: cutoffEnd.toISOString(),
          },
          runAt: now.toISOString(),
        };

        console.log("Cron onboarding reminders completed:", summary);

        await emailService.sendEmail({
          to: ADMIN_SUMMARY_EMAIL,
          subject: `SpareFinder cron – onboarding reminders (${sent}/${profiles.length})`,
          html: `<p>Cron job <strong>onboarding reminders</strong> finished.</p>
                 <p>Processed: ${profiles.length}<br/>
                 Sent: ${sent}<br/>
                 Failed: ${failed}</p>
                 <p>Window: ${cutoffStart.toISOString()} → ${cutoffEnd.toISOString()}<br/>
                 Run at: ${now.toISOString()}</p>`,
          text: `SpareFinder onboarding cron finished.
Processed: ${profiles.length}
Sent: ${sent}
Failed: ${failed}
Window: ${cutoffStart.toISOString()} -> ${cutoffEnd.toISOString()}
Run at: ${now.toISOString()}`,
        });
      })().catch((err) => {
        console.error("Cron onboarding background task failed:", err);
      });

      return res.json({
        success: true,
        type,
        processed: profiles.length,
        queued: true,
      });
    }

    // Re-engagement flow
    const inactiveDays = Number(req.query.inactive_days) || 14;

    // Optional: send re-engagement to ALL users (high risk).
    // Public by default, but gated behind an explicit env flag + confirm query param to prevent accidents.
    //
    // To enable:
    //   Set ALLOW_PUBLIC_MASS_EMAIL=true on the backend service
    //
    // Usage (no secret/token):
    //   GET /api/cron/reminders?type=reengagement&all=true&confirm=send_all&limit=200
    const sendToAll = String(req.query.all || "").toLowerCase() === "true";
    const confirm = String(req.query.confirm || "");
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 2000);
    if (type === "reengagement" && sendToAll) {
      const allowPublicMassEmail =
        String(process.env.ALLOW_PUBLIC_MASS_EMAIL || "").toLowerCase() === "true";
      if (!allowPublicMassEmail) {
        return res.status(400).json({
          success: false,
          error: "mass_email_disabled",
          message:
            "Mass email is disabled. Set ALLOW_PUBLIC_MASS_EMAIL=true to enable all=true.",
        });
      }
      if (confirm !== "send_all") {
        return res.status(400).json({
          success: false,
          error: "confirm_required",
          message:
            "To send to ALL users, you must add confirm=send_all (mass email protection).",
        });
      }

      // Send emails in the background so the cron HTTP call returns quickly
      (async () => {
        let sent = 0;
        let failed = 0;
        const copy = await emailService.getAiReminderCopy("reengagement");

        // Fetch in pages to avoid pulling too many rows at once
        const pageSize = 200;
        let offset = 0;
        const maxToProcess = limit;

        while (offset < maxToProcess) {
          const end = Math.min(offset + pageSize - 1, maxToProcess - 1);
          const { data: profiles, error } = await supabase
            .from("profiles")
            .select("id, email, full_name, updated_at")
            .not("email", "is", null)
            .order("updated_at", { ascending: true })
            .range(offset, end);

          if (error) {
            console.error("Cron reengagement(all) query failed:", error);
            break;
          }
          if (!profiles || profiles.length === 0) break;

          for (const profile of profiles) {
            const email = profile.email as string | null;
            if (!email) continue;
            try {
              const ok = await emailService.sendReengagementEmail({
                userEmail: email,
                userName:
                  (profile.full_name as string | null) ||
                  (email.split("@")[0] ?? "there"),
                copy: copy || undefined,
              });
              if (ok) sent += 1;
              else failed += 1;
            } catch (e) {
              failed += 1;
              console.error("Failed to send reengagement email (all):", e);
            }
          }

          offset += profiles.length;
          if (profiles.length < pageSize) break;
        }

        const summary = {
          type,
          mode: "reengagement_all",
          processed: Math.min(offset, maxToProcess),
          sent,
          failed,
          limit: maxToProcess,
          runAt: now.toISOString(),
        };

        console.log("Cron reengagement (all users) completed:", summary);

        await emailService.sendEmail({
          to: ADMIN_SUMMARY_EMAIL,
          subject: `SpareFinder cron – reengagement (ALL) (${sent}/${Math.min(
            offset,
            maxToProcess
          )})`,
          html: `<p>Cron job <strong>reengagement (ALL users)</strong> finished.</p>
                 <p>Processed: ${Math.min(offset, maxToProcess)}<br/>
                 Sent: ${sent}<br/>
                 Failed: ${failed}</p>
                 <p>Limit: ${maxToProcess}<br/>
                 Run at: ${now.toISOString()}</p>`,
          text: `SpareFinder reengagement (ALL users) cron finished.
Processed: ${Math.min(offset, maxToProcess)}
Sent: ${sent}
Failed: ${failed}
Limit: ${maxToProcess}
Run at: ${now.toISOString()}`,
        });
      })().catch((err) => {
        console.error("Cron reengagement(all) background task failed:", err);
      });

      return res.json({
        success: true,
        type,
        mode: "reengagement_all",
        processed: limit,
        queued: true,
        message:
          "Queued reengagement emails to ALL users (bounded by limit). Check admin summary email for results.",
      });
    }
    const inactiveCutoff = new Date(now);
    inactiveCutoff.setDate(now.getDate() - inactiveDays);

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, updated_at")
      .lte("updated_at", inactiveCutoff.toISOString())
      .order("updated_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("Cron reengagement query failed:", error);
      return res.status(500).json({
        success: false,
        error: "query_failed",
        message: "Failed to fetch profiles for reengagement reminders",
      });
    }

    if (!profiles || profiles.length === 0) {
      return res.json({
        success: true,
        type,
        processed: 0,
        message: "No users matched reengagement criteria",
      });
    }

    // Send emails in the background so the cron HTTP call returns quickly
    (async () => {
      let sent = 0;
      let failed = 0;
      const copy = await emailService.getAiReminderCopy("reengagement");

      for (const profile of profiles) {
        const email = profile.email as string | null;
        if (!email) continue;

        try {
          const ok = await emailService.sendReengagementEmail({
            userEmail: email,
            userName:
              (profile.full_name as string | null) ||
              (email.split("@")[0] ?? "there"),
            copy: copy || undefined,
          });
          if (ok) sent += 1;
          else failed += 1;
        } catch (e) {
          failed += 1;
          console.error("Failed to send reengagement email:", e);
        }
      }

      const summary = {
        type,
        mode: "reengagement",
        processed: profiles.length,
        sent,
        failed,
        inactiveDays,
        cutoff: inactiveCutoff.toISOString(),
        runAt: now.toISOString(),
      };

      console.log("Cron reengagement reminders completed:", summary);

      await emailService.sendEmail({
        to: ADMIN_SUMMARY_EMAIL,
        subject: `SpareFinder cron – reengagement reminders (${sent}/${profiles.length})`,
        html: `<p>Cron job <strong>reengagement reminders</strong> finished.</p>
               <p>Processed: ${profiles.length}<br/>
               Sent: ${sent}<br/>
               Failed: ${failed}</p>
               <p>Inactive days threshold: ${inactiveDays}<br/>
               Cutoff before: ${inactiveCutoff.toISOString()}<br/>
               Run at: ${now.toISOString()}</p>`,
        text: `SpareFinder reengagement cron finished.
Processed: ${profiles.length}
Sent: ${sent}
Failed: ${failed}
Inactive days: ${inactiveDays}
Cutoff before: ${inactiveCutoff.toISOString()}
Run at: ${now.toISOString()}`,
      });
    })().catch((err) => {
      console.error("Cron reengagement background task failed:", err);
    });

    return res.json({
      success: true,
      type,
      processed: profiles.length,
      queued: true,
    });
  } catch (error) {
    console.error("Cron reminders handler failed:", error);
    return res.status(500).json({
      success: false,
      error: "internal_error",
      message: "Unexpected error in cron reminders endpoint",
    });
  }
});

export default router;


