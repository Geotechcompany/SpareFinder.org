# Marketing engine — public cron URLs

These FastAPI routes are **intentionally unauthenticated** (no `CRON_TOKEN`). Protect them at your reverse proxy or hosting layer (IP allowlist, WAF, private network) if the API is on the public internet.

Base URL: your AI API origin (e.g. `https://<your-render-service>.onrender.com`).

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
