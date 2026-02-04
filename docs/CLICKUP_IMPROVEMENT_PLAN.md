# SpareFinder – ClickUp Improvement Plan

Use this to populate ClickUp with future tasks. Copy sections into ClickUp as **Lists** or **Folders**, and each bullet as a **Task**. Adjust priority, assignees, and due dates as needed.

---

## 1. Admin & Operations

- [ ] **Admin: Bulk edit plans** – Add multi-select and bulk activate/deactivate or bulk price update for plans.
- [ ] **Admin: Plan audit log** – Log who changed which plan field and when (for compliance and support).
- [ ] **Admin: Export plans to CSV/JSON** – Allow admins to export current plans for backup or reporting.
- [ ] **Admin: Add new plan from UI** – Support creating a new plan (tier) from the admin panel, not only editing existing ones.
- [ ] **Admin: Dashboard revenue by plan** – Show revenue or subscriber count broken down by plan (Starter / Pro / Enterprise).
- [ ] **Admin: Role-based admin access** – Optional: restrict “Pricing plans” to super_admin only if needed.

---

## 2. Billing & Subscriptions

- [ ] **Billing: Annual plan toggle on landing** – Let users choose monthly vs annual on pricing section and reflect discount.
- [ ] **Billing: Usage-based caps** – Enforce “X searches per month” from DB plan limits and show usage in billing UI.
- [ ] **Billing: Proration on plan change** – When upgrading/downgrading, calculate and show prorated amount (Stripe).
- [ ] **Billing: Invoice PDF download** – Ensure “Download Invoice” uses Stripe invoice PDF or generate from DB.
- [ ] **Billing: Plan change flow** – Dedicated flow to upgrade/downgrade with confirmation and success message.
- [ ] **Credits: Purchase add-on credits** – Complete “Purchase additional recognitions” flow and deduct from balance.
- [ ] **Credits: Reset monthly allowance** – Cron or webhook to reset/refresh monthly search count from plan limits.

---

## 3. UX & Frontend

- [ ] **Landing: A/B test pricing copy** – Structure copy so you can test headlines or CTA text (feature flag or CMS later).
- [ ] **Landing: Pricing FAQ** – Add a short FAQ under pricing (e.g. “What counts as a search?”, “Can I change plan?”).
- [ ] **Billing: Clear “current plan” badge** – Make it obvious which plan is selected on billing and in sidebar.
- [ ] **Mobile: Test pricing table on small screens** – Ensure plans stack or scroll nicely on mobile.
- [ ] **Accessibility: Pricing cards** – Check contrast, focus order, and screen reader labels for plan cards and CTAs.
- [ ] **Loading: Skeleton for plans** – Show skeleton while plans load from API instead of empty or static flash.

---

## 4. Performance & Reliability

- [ ] **API: Cache GET /api/plans** – Short TTL cache (e.g. 1–5 min) so landing/billing don’t hit DB on every load.
- [ ] **API: Health check includes DB** – Health endpoint verifies Supabase (and optionally Redis) connectivity.
- [ ] **Frontend: Preload plans on app init** – Fetch plans once after auth and reuse on landing and billing where possible.
- [ ] **Backend: Retry Supabase on 5xx** – Retry failed Supabase calls (e.g. plans, credits) with backoff before failing.
- [ ] **Admin: Optimistic update on plan save** – After saving a plan, update table immediately and refetch in background.

---

## 5. Security & Compliance

- [ ] **Admin: Audit log for plan changes** – Log plan edits (who, when, old/new values) in audit_logs or dedicated table.
- [ ] **API: Rate limit GET /api/plans** – Optional rate limit to avoid abuse (e.g. per IP or per user).
- [ ] **Billing: Validate plan IDs at checkout** – Ensure checkout only uses plan IDs/tiers that exist and are active in DB.
- [ ] **Env: Document all required env vars** – Single checklist (e.g. in README or .env.example) for Clerk, Stripe, Supabase, etc.

---

## 6. DevOps & Deployment

- [ ] **DB: Migration for plans table** – Ensure 024_create_plans_table is in migration history and documented for new envs.
- [ ] **Backend: Feature flag for DB plans** – Optional kill switch to fall back to static plans if DB/API fails.
- [ ] **Monitoring: Alert on plan API errors** – If GET /api/plans or admin plan update fails repeatedly, trigger alert.
- [ ] **Docs: Runbook for “Plans not updating”** – Short runbook: check Supabase, RLS, admin auth, and frontend cache.

---

## 7. Analytics & Reporting

- [ ] **Admin: Plan performance** – Count of active subscriptions per plan (from subscriptions table).
- [ ] **Admin: Revenue by plan (MRR)** – Simple MRR view by plan for dashboard or report.
- [ ] **Billing: Usage vs limit** – Show “X of Y searches used this month” on billing and optionally in header.

---

## 8. Nice-to-Have / Backlog

- [ ] **Plans: Multi-currency** – Store and display prices in more than GBP (e.g. USD, EUR) from DB.
- [ ] **Plans: Trial length per plan** – Make trial_days editable per plan and show “Y-day trial” on landing.
- [ ] **Plans: “Most popular” badge** – Use `popular` from DB to show a badge on the right plan on landing.
- [ ] **Admin: Duplicate plan** – “Duplicate plan” to clone an existing plan and then edit (e.g. for A/B test).
- [ ] **Frontend: Plan comparison table** – Optional comparison view (e.g. modal or page) for all plans side by side.

---

## Suggested ClickUp Structure

- **Space / Folder:** SpareFinder Improvements  
- **Lists:**  
  - Admin & Operations  
  - Billing & Subscriptions  
  - UX & Frontend  
  - Performance & Reliability  
  - Security & Compliance  
  - DevOps & Deployment  
  - Analytics & Reporting  
  - Backlog  

- **Custom fields (optional):** Priority, Phase (e.g. “Next sprint” / “Later”), Effort (S/M/L), Module (Admin / Billing / Frontend / Backend).

- **Templates:** Use a single “Improvement task” template with: Description, Acceptance criteria, Tech notes (file/API), and Link to this doc.

---

*Generated for SpareFinder. Adjust list names and tasks to match your ClickUp workspace.*
