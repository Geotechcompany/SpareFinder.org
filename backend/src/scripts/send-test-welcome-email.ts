import dotenv from "dotenv";
import { emailService } from "../services/email-service";

dotenv.config();

async function main() {
  const userEmail = "arthurbreck417@gmail.com";
  const userName = "Arthur";

  console.log("📧 Sending test welcome email to:", userEmail);

  const ok = await emailService.sendReengagementEmail({
    userEmail,
    userName,
  });

  if (!ok) {
    console.error("❌ Failed to send welcome email. Check SMTP configuration.");
    process.exit(1);
  }

  console.log("✅ Welcome email sent successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error while sending test welcome email:", err);
  process.exit(1);
});


