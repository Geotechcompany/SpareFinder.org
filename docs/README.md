# Documentation

All project documentation lives in this folder. The root [README.md](../README.md) has quick start and architecture.

## Setup & deployment

| Doc | Description |
|-----|-------------|
| [FRONTEND_SETUP.md](FRONTEND_SETUP.md) | Frontend dev environment |
| [README-BACKEND-SETUP.md](README-BACKEND-SETUP.md) | Backend / API setup |
| [supabase-setup.md](supabase-setup.md) | Supabase project setup |
| [supabase-setup-guide.md](supabase-setup-guide.md) | Supabase setup guide |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | General deployment |
| [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md) | Deploy on Render |
| [deploy.md](deploy.md) | Deploy notes |

## AI / Crew analysis

| Doc | Description |
|-----|-------------|
| [AI_CREW_INTEGRATION_GUIDE.md](AI_CREW_INTEGRATION_GUIDE.md) | CrewAI integration |
| [QUICKSTART_AI_CREW.md](QUICKSTART_AI_CREW.md) | AI Crew quick start |
| [CREW_ANALYSIS_QUICKSTART.md](CREW_ANALYSIS_QUICKSTART.md) | Crew analysis quick start |
| [CREW_ANALYSIS_REALTIME_IMPLEMENTATION.md](CREW_ANALYSIS_REALTIME_IMPLEMENTATION.md) | Realtime implementation |
| [AI_CREW_DATABASE_INTEGRATION.md](AI_CREW_DATABASE_INTEGRATION.md) | DB integration for Crew |
| [AI_CREW_SETUP_COMPLETE.md](AI_CREW_SETUP_COMPLETE.md) | Setup completion notes |

## Admin

| Doc | Description |
|-----|-------------|
| [ADMIN_ACCESS_GUIDE.md](ADMIN_ACCESS_GUIDE.md) | Admin access |
| [ADMIN_LOGIN_SYSTEM.md](ADMIN_LOGIN_SYSTEM.md) | Admin login |
| [ADMIN_DASHBOARD_IMPLEMENTATION.md](ADMIN_DASHBOARD_IMPLEMENTATION.md) | Dashboard implementation |
| [ADMIN_IMPLEMENTATION_SUMMARY.md](ADMIN_IMPLEMENTATION_SUMMARY.md) | Implementation summary |

## Database & storage

| Doc | Description |
|-----|-------------|
| [DATABASE_INTEGRATION_SUMMARY.md](DATABASE_INTEGRATION_SUMMARY.md) | DB integration summary |
| [STORAGE_BUCKET_SETUP_GUIDE.md](STORAGE_BUCKET_SETUP_GUIDE.md) | Storage bucket setup |
| [IMAGE_STORAGE_IMPLEMENTATION.md](IMAGE_STORAGE_IMPLEMENTATION.md) | Image storage |
| [MIGRATION_INSTRUCTIONS.md](MIGRATION_INSTRUCTIONS.md) | Data migration |
| [sql/](sql/) | SQL scripts (migrations, fixes, setup) |

## Features & implementation notes

| Doc | Description |
|-----|-------------|
| [CREDITS_SYSTEM_IMPLEMENTATION.md](CREDITS_SYSTEM_IMPLEMENTATION.md) | Credits system |
| [EMAIL_NOTIFICATIONS_IMPLEMENTATION.md](EMAIL_NOTIFICATIONS_IMPLEMENTATION.md) | Email notifications |
| [SEO_IMPLEMENTATION.md](SEO_IMPLEMENTATION.md) | SEO |
| [STATS_IMPLEMENTATION_SUMMARY.md](STATS_IMPLEMENTATION_SUMMARY.md) | Stats |
| [QUERY_OPTIMIZATION_SUMMARY.md](QUERY_OPTIMIZATION_SUMMARY.md) | Query optimization |
| [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md) | Technical report |

## Fixes & historical notes

Implementation fix and completion notes (kept for reference):

- AUTH_REDIRECT_FIX.md, CHROMEDRIVER_VERSION_FIX.md, CORS_FIX_COMPLETE.md
- CREW_ANALYSIS_UUID_FIX.md, DEPLOYMENT_FIX_COMPLETE.md, DOCKER_FIX_SUMMARY.md
- EVENT_LOOP_FIX_COMPLETE.md, METHOD_COMPATIBILITY_FIX.md, MIGRATION_COMPLETE.md
- NUMPY_COMPATIBILITY_FIX.md, SCRAPER_FIXES_SUMMARY.md, SCRAPER_STATUS_UPDATE.md
- phase-3-completion-summary.md, phase-4-completion-summary.md
- CLICKUP_IMPROVEMENT_PLAN.md, WEBSOCKET_TESTING.md

## SQL scripts (`sql/`)

Database setup, migrations, and one-off fixes. Run against your Supabase (or Postgres) project as needed. Prefer versioned migrations in production.

- **Setup:** database-setup.sql, supabase-setup.sql, database-crew-analysis-jobs.sql, storage-bucket-setup.sql
- **Fixes / RLS:** fix-*.sql, comprehensive-database-fix.sql, safe-database-migration.sql
- **Admin / data:** make-admin.sql, create_user_achievements_table.sql, create-sample-notifications.sql, update-stripe-database.sql
