# SpareFinder

**AI-powered industrial spare parts identification.** Upload a photo or use keyword search to identify manufacturing spares, retrieve specifications, pricing, and trusted suppliers in seconds.

---

## Overview

SpareFinder is an enterprise-ready SaaS platform that reduces engineering and procurement time by combining computer vision (GPT-4o), a dedicated analysis backend (CrewAI), and integrated billing and user management. The frontend is a single-page application built with React and Vite; the analysis pipeline runs as a separate Python service.

| Layer        | Technology |
|-------------|------------|
| Frontend    | React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI / shadcn/ui, Framer Motion |
| Auth        | Clerk (SSO, email/password, OAuth) |
| Backend DB | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Billing     | Stripe (subscriptions, webhooks) |
| AI / ML     | OpenAI GPT-4o Vision, CrewAI (Python service) |
| Deployment  | Static frontend (Netlify/Vercel/Render), Render (API), Supabase Cloud |

---

## Features

- **Dual input** — Image upload and/or keyword search for part identification.
- **AI analysis** — GPT-4o Vision and CrewAI for part recognition, specs, and alternatives.
- **Procurement** — Pricing and supplier information with optional sharing and reporting.
- **Subscriptions** — Free, Pro, and Enterprise tiers via Stripe; usage and credits.
- **Dashboard** — History, profile, settings, notifications, and (optional) onboarding.
- **Admin** — User and plan management, system analytics, audit logs, AI model config, payments, email/SMTP.
- **PWA** — Installable app and offline-ready shell (Workbox).
- **Responsive** — Mobile-first UI with dark mode and accessibility considerations.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended; see `.nvmrc` if using nvm)
- **npm** or **pnpm**
- **Supabase** project (database, auth, storage)
- **Clerk** application (auth)
- **Stripe** account (products and webhooks)
- **Python 3.10+** (for `ai-analysis-crew` service)
- **OpenAI** API key (for GPT-4o Vision)

---

## Quick Start

### 1. Clone and install

```bash
git clone <repository-url>
cd SpareFinder.org
npm install
```

### 2. Environment

Copy the example env and set required variables:

```bash
cp .env.example .env
```

Edit `.env` and configure at least:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_AI_CREW_API_URL` (e.g. `http://localhost:8000` for local crew service)
- `VITE_API_URL` if using a separate backend API

See `.env.example` and `env.template` for all supported keys (Stripe, OAuth, etc.).

### 3. Run frontend

```bash
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`).

### 4. Run AI analysis service (optional, for full flow)

See `ai-analysis-crew/` for Python env setup and running the CrewAI + GPT-4o Vision service (e.g. on port 8000). Point `VITE_AI_CREW_API_URL` to that URL.

---

## Scripts

| Command              | Description                |
|----------------------|----------------------------|
| `npm run dev`        | Start Vite dev server      |
| `npm run build`      | Production build           |
| `npm run build:dev`  | Build in development mode  |
| `npm run preview`    | Preview production build   |
| `npm run lint`       | Run ESLint                 |
| `npm run test`       | Run Jest tests             |
| `npm run test:watch` | Jest in watch mode         |
| `npm run test:coverage` | Jest with coverage    |

---

## Project Structure

```
├── src/
│   ├── App.tsx              # Root app, routing, providers
│   ├── main.tsx
│   ├── components/          # Shared UI (Header, Footer, layouts, admin, billing, etc.)
│   ├── contexts/            # Auth, theme, subscription, dashboard layout
│   ├── hooks/               # useFileUpload, useAuthGuard, useProfileData, etc.
│   ├── lib/                 # API client, Supabase, config, utils
│   ├── pages/               # Route-level pages (Landing, Dashboard, Upload, History, Billing, Admin, …)
│   ├── services/            # AI crew client, analysis jobs, keepAlive
│   ├── styles/              # Global CSS, variables, overrides
│   └── types/
├── public/                  # Static assets, favicon, manifest, illustrations
├── ai-analysis-crew/        # Python CrewAI + FastAPI service (part analysis, WebSocket)
├── docs/                    # Setup guides, deployment, Supabase
├── supabase/                # Supabase config
├── netlify/                 # Netlify redirects/functions if used
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── env.template
└── README.md
```

- **Frontend** lives in `src/`; entry is `index.html` + `src/main.tsx`.
- **AI pipeline** and API are in `ai-analysis-crew/` (separate repo/service in production).
- **Database migrations and one-off SQL** are in repo root and `docs/`; for production, prefer a migration strategy (e.g. Supabase migrations or versioned SQL in a single place).

---

## Deployment

- **Frontend:** Build with `npm run build`; deploy the `dist/` output to Netlify, Vercel, or Render static. Set env vars in the host’s dashboard.
- **AI service:** Deploy `ai-analysis-crew/` (e.g. Render, Docker) and set `VITE_AI_CREW_API_URL` (and WS URL) in the frontend env.
- **Stripe:** Configure webhook endpoint for your production API; use Stripe CLI for local testing.
- **Clerk:** Set production redirect URLs and keys in Clerk and in `.env`.
- See `docs/`, `DEPLOYMENT_GUIDE.md`, and `RENDER_DEPLOYMENT_GUIDE.md` for host-specific steps.

---

## Security and Compliance

- **Secrets:** Never commit `.env`; use `.env.example` / `env.template` as references. Rotate API keys and webhook secrets per environment.
- **Auth:** Clerk handles sign-in and sessions; protect admin routes with `AdminProtectedRoute` and role checks.
- **API:** Run AI and any BFF behind HTTPS; restrict CORS and rate limits in production.
- **Data:** Supabase RLS and policies govern access to user and admin data; review and audit regularly.

---

## Documentation

- **Setup:** `docs/supabase-setup-guide.md`, `docs/supabase-setup.md`, `README-BACKEND-SETUP.md`
- **Deployment:** `DEPLOYMENT_GUIDE.md`, `RENDER_DEPLOYMENT_GUIDE.md`, `deploy.md`
- **AI / Crew:** `AI_CREW_INTEGRATION_GUIDE.md`, `CREW_ANALYSIS_QUICKSTART.md`, `QUICKSTART_AI_CREW.md`
- **Admin:** `ADMIN_ACCESS_GUIDE.md`, `ADMIN_DASHBOARD_IMPLEMENTATION.md`, `ADMIN_LOGIN_SYSTEM.md`

---

## License

MIT. Use and adapt for internal or commercial projects; comply with third-party licenses (Clerk, Stripe, OpenAI, etc.).

---

## Support

For bugs, feature requests, or deployment help, open an issue in the repository or contact the maintainers.
