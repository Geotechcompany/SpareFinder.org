# 🔧 SparePart AI – Identify Auto Parts Using AI + Web Intelligence

![SparePart AI Banner](https://your-cdn.com/banner.png)

> Upload a picture of any auto spare part and get accurate details powered by AI and real-time web scraping.

SparePart AI is a modern SaaS platform that allows users to identify and learn about Manufacturing spare parts using image uploads. It combines OpenAI’s GPT-4 vision capabilities with live web scraping and a user-friendly dashboard. Subscriptions are handled via Stripe, with a modern, minimalist UX design.

---

## 🚀 Features

- 🔍 **Image Upload** – Upload photos of auto parts for instant analysis
- 🤖 **AI-Powered Recognition** – OpenAI GPT-4o for intelligent part description, manufacturer, and use cases
- 🌐 **Web Scraping Fallback** – Augment AI results with real-time scraping from part suppliers
- 💳 **Stripe Integration** – Subscription-based access (Free, Pro, Enterprise tiers)
- 👤 **User Dashboard** – Track uploads, view AI results, manage your plan
- 🛠 **Admin Panel** – Manage users, monitor usage, and audit AI output
- 📱 **Mobile-Responsive UI** – Minimalist and premium design optimized for all devices

---

## 🧠 Tech Stack

| Layer      | Tech                                       |
|------------|--------------------------------------------|
| Frontend   | Next.js 14 (App Router), TailwindCSS, shadcn/ui |
| Backend    | Prisma + PostgreSQL, NextAuth.js, Stripe Webhooks |
| AI         | OpenAI GPT-4o Vision API                    |
| Uploads    | UploadThing or Vercel Blob                 |
| Scraping   | Cheerio + Axios / ScraperAPI               |
| UI/UX      | Framer Motion, React Hot Toast, SEO        |
| Hosting    | Vercel (Frontend + Serverless Functions)   |
| Database   | Neon.tech or Railway                       |

---

## 📂 Project Structure

🧱 Project Directory Structure
bash
CopyEdit
spare-part-ai/
├── app/
│   ├── layout.tsx                  # Global layout
│   ├── page.tsx                    # Landing page
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx             # User dashboard layout
│   │   ├── page.tsx               # Dashboard home
│   │   ├── upload/page.tsx
│   │   ├── history/page.tsx
│   │   └── billing/page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx               # Admin dashboard
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── stripe/webhook/route.ts
│       ├── upload/route.ts
│       └── identify/route.ts     # OpenAI + scraping logic
│
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── UploadForm.tsx
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   └── AuthForm.tsx
│
├── lib/
│   ├── auth.ts                    # NextAuth config
│   ├── prisma.ts
│   ├── stripe.ts
│   ├── openai.ts
│   └── scraper.ts
│
├── prisma/
│   └── schema.prisma              # DB models
│
├── public/
│   └── logo.png
│
├── styles/
│   └── globals.css
│
├── .env.local                     # API keys, Stripe secrets
├── middleware.ts                 # Role-based routing
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── next.config.js
├── package.json
└── README.md
2. Install dependencies
bash
Copy
Edit
pnpm install
# or
npm install
3. Set up environment variables
Create a .env.local file and configure:

env
Copy
Edit
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
UPLOADTHING_SECRET=your_uploadthing_key
4. Setup Prisma & DB
bash
Copy
Edit
npx prisma migrate dev --name init
npx prisma generate
5. Run locally
bash
Copy
Edit
pnpm dev
# or
npm run dev
🧪 Testing Stripe Webhooks (optional)
Use Stripe CLI to test locally:

bash
Copy
Edit
stripe listen --forward-to localhost:3000/api/webhooks/stripe
🌐 Live Demo
Coming soon! Deployed on Vercel

🛡 License
MIT License. Feel free to use and customize for personal/commercial projects.

💡 Future Features
PDF report generation from results

Parts inventory management

Team/Org accounts

AI confidence scoring + explainability

Marketplace integration (Amazon/eBay)

🧠 Powered By
Next.js

OpenAI GPT-4o

Stripe

Prisma

UploadThing

ScraperAPI
