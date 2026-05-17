# Marketing engine — public cron URLs

These FastAPI routes are **intentionally unauthenticated** (no `CRON_TOKEN`). Protect them at your reverse proxy or hosting layer (IP allowlist, WAF, private network) if the API is on the public internet.

Base URL: your AI API origin (production: `https://aiagent-sparefinder-org.onrender.com`).

## In-process automation (single API instance)

If you run **one** web worker (typical small Render plan), you can skip an external scheduler: the API starts background loops that call the same code as `GET /api/cron/marketing-discover` and `GET /api/cron/marketing-send`.

### Admin UI (recommended)

In **Admin → Email campaigns → Find on Google**, set **Google discovery interval** and **Batch send interval** (and optional max queries / batch size), **Sanitize review batch** (how many “needs review” leads to re-run AI sanitization on each send/discover cron; default 25, `0` = off), then **Save discovery settings**. Values are stored in Supabase `marketing_settings.defaults` (`scheduled_discover_interval_sec`, `scheduled_send_interval_sec`, `sanitize_review_batch`, etc.). The server re-reads them about every 60 seconds, so changes apply without redeploy.

### Environment overrides (optional)

If an env var is **set to any non-empty string** (including `0`), it **overrides** the admin-saved value for that field only:

| Env variable | Effect |
|--------------|--------|
| `MARKETING_SCHEDULED_DISCOVER_INTERVAL_SEC` | Seconds between discovery runs (`0` = off). Example: `86400` = daily. |
| `MARKETING_SCHEDULED_DISCOVER_MAX_QUERIES` | Optional; max `10`. |
| `MARKETING_SCHEDULED_DISCOVER_INITIAL_DELAY_SEC` | Optional; default `120` — delay before the first discover run after enabling (capped by interval). |
| `MARKETING_SCHEDULED_SEND_INTERVAL_SEC` | Seconds between send runs (`0` = off). Example: `3600` = hourly. |
| `MARKETING_SCHEDULED_SEND_BATCH` | Optional; default `20`, max `200`. |
| `MARKETING_SCHEDULED_SEND_INITIAL_DELAY_SEC` | Optional; default `30`. |
| `MARKETING_SCHEDULED_IDLE_POLL_SEC` | Optional; default `60` — how often idle loops re-check settings when intervals are `0`. |

**Do not** use in-process automation on multiple replicas, or each instance will duplicate work. For horizontal scale, use the HTTP cron URLs below with one external scheduler instead.

## Open & click tracking (SMTP sends)

Run `docs/sql/marketing_sends_tracking.sql` on Supabase so `marketing_sends` stores `tracking_token`, `open_count`, `click_count`, and first-open / first-click timestamps. For each **sent** message, the API injects a **1×1 pixel** and rewrites **http(s)** anchor links to count clicks before redirecting.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/track/mopen/{token}` | GET, HEAD | Returns a 1×1 GIF and records an open for the send row with that `tracking_token`. |
| `/api/track/mclk/{token}?u={url}` | GET | Records a click, then **302** to `u` (`http`/`https` only). |

Use **`MARKETING_LINK_BASE_URL`** or **`API_PUBLIC_URL`** as the **public origin** for pixel and click URLs (same base as unsubscribe links).

### Netlify (sparefinder.org)

Marketing emails often use `https://sparefinder.org/api/track/...`. The static site must **proxy** `/api/*` and `/unsubscribe/*` to your Render FastAPI service — otherwise Netlify serves `index.html` and users see the **site 404 page** (opens/clicks are not recorded).

1. Set **`VITE_API_URL`** in `netlify.toml` (or Netlify UI) to your live **ai-analysis-crew** Render URL.
2. Build generates `dist/_redirects` via `scripts/generate-netlify-redirects.mjs` (runs in `npm run build`).
3. On Render, set **`MARKETING_LINK_BASE_URL=https://sparefinder.org`** (or leave default) so links stay on your domain; Netlify forwards them to the API.
4. Redeploy **both** Netlify and Render after adding tracking routes (`/api/track/mopen`, `/api/track/mclk`). Verify:
   - `curl -sI "https://sparefinder.org/api/track/mopen/test12345678"` → `image/gif` (not HTML)
   - `curl -sI "https://YOUR-RENDER-URL/api/track/mclk/test12345678?u=https%3A%2F%2Fsparefinder.org"` → `302` or `400` (not `404 Not Found` JSON from missing route)

If **`VITE_API_URL`** points at a dead or old Render service (no `/api/track/*` in OpenAPI), fix the deploy before expecting open/click stats.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cron/marketing-send` | GET | Batch send pending leads for **active** (unpaused) campaigns. Query: `limit` (1–200, default 20). |
| `/api/cron/marketing-digest` | GET | Email admins a digest (yesterday UTC + 7-day roll-up: leads, sends, failures, unsubscribes, **open/click engagement**). Uses `ADMIN_NOTIFY_EMAIL` / admin profiles. |
| `/api/cron/marketing-discover` | GET | Run SerpAPI Google discovery using saved query templates (`PATCH /api/admin/marketing/settings`). Query: `max_queries` (1–10). Requires `SERPAPI_KEY`. |

### Recommended scheduler (e.g. cron-job.org)

- **Send:** daily or hourly — `GET .../api/cron/marketing-send?limit=20`
- **Digest:** daily — `GET .../api/cron/marketing-digest`
- **Discover:** daily — `GET .../api/cron/marketing-discover?max_queries=3`

### Environment variables

| Variable | Purpose |
|----------|---------|
| `SERPAPI_KEY` | SerpAPI key for discovery |
| `OPENAI_API_KEY` | Lead sanitization + AI email bodies |
| `MARKETING_LINK_BASE_URL` or `API_PUBLIC_URL` | Public API base for `/unsubscribe/marketing`, **open pixel**, and **click redirects** (defaults to `FRONTEND_URL` if unset — often wrong for tracking; set to the AI API URL). |
| `MARKETING_TRACKING_ENABLED` | Default `1`. Set to `0` to disable open pixel and click link wrapping. |
| `ADMIN_NOTIFY_EMAIL` | Fallback recipient for digest if no admin profiles |

### Delivery & engagement tracking

SMTP sends log attempts in `marketing_sends`. **Opens** and **link clicks** are recorded when recipients hit `/api/track/mopen/...` and `/api/track/mclk/...` (see above). Inbox delivery / async bounces still require ESP webhooks — stub: `POST /api/webhooks/email/esp`.
