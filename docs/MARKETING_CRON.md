# Marketing engine — public cron URLs

These FastAPI routes are **intentionally unauthenticated** (no `CRON_TOKEN`). Protect them at your reverse proxy or hosting layer (IP allowlist, WAF, private network) if the API is on the public internet.

Base URL: your AI API origin (e.g. `https://<your-render-service>.onrender.com`).

## In-process automation (single API instance)

If you run **one** web worker (typical small Render plan), you can skip an external scheduler: the API starts background loops that call the same code as `GET /api/cron/marketing-discover` and `GET /api/cron/marketing-send`.

### Admin UI (recommended)

In **Admin → Email campaigns → Find on Google**, set **Google discovery interval** and **Batch send interval** (and optional max queries / batch size), then **Save discovery settings**. Values are stored in Supabase `marketing_settings.defaults` (`scheduled_discover_interval_sec`, `scheduled_send_interval_sec`, etc.). The server re-reads them about every 60 seconds, so changes apply without redeploy.

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

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cron/marketing-send` | GET | Batch send pending leads for **active** (unpaused) campaigns. Query: `limit` (1–200, default 20). |
| `/api/cron/marketing-digest` | GET | Email admins yesterday’s UTC digest (new leads, sends, failures, unsubscribes). Uses `ADMIN_NOTIFY_EMAIL` / admin profiles. |
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
| `MARKETING_LINK_BASE_URL` or `API_PUBLIC_URL` | Base URL for `/unsubscribe/marketing` links in emails (defaults to `FRONTEND_URL` if unset) |
| `ADMIN_NOTIFY_EMAIL` | Fallback recipient for digest if no admin profiles |

### Delivery tracking

SMTP sends log attempts in `marketing_sends`. Inbox delivery / async bounces require ESP webhooks — stub: `POST /api/webhooks/email/esp`.
