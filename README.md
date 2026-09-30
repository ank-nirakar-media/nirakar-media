# Nirakar Media website

Next.js 15 (App Router) site for Nirakar Media: AI-powered Content Growth as a Service.
Dark violet and deep-blue theme, no client-side JavaScript needed for any page.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Home: hero, services, audiences, process, pricing, FAQ |
| `/services` | The content engine stages (Discover, Plan, Produce, Distribute, Learn), tagged AI / Human |
| `/how-it-works` | Five-step process |
| `/pricing` | Starter ₹4,999, Growth ₹14,999, Pro ₹34,999, extra-language add-ons, stage-by-plan table |
| `/dashboard` | Public demo of the client dashboard (example data, Pro plan) |
| `/login`, `/portal`, `/admin` | Client portal: per-client outcome dashboards, connected accounts, admin area (see below) |
| `/faq`, `/contact` | FAQ and lead form |
| `/checkout/pay`, `/checkout/success`, `/checkout/cancel` | Razorpay checkout and return pages |
| `/legal/*` | Terms, privacy, cancellation and refunds (templates: have a lawyer review) |

Edit plan volumes and highlights in `lib/plans.ts`. Engine stages, and which tiers run each one, live in `engine` in `lib/content.ts`; the pricing table is generated from it.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the keys you have
npm run dev                  # http://localhost:3000
```

Without Razorpay keys the site still works: "Subscribe" sends visitors to the
contact form, which says a payment link will be emailed.

## Payments (Razorpay Subscriptions, INR)

1. Sign up at razorpay.com, finish KYC, and ask Razorpay to enable **Subscriptions** on your account.
2. Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the env (test keys first).
3. Add a webhook (Account & Settings > Webhooks) to `https://YOUR-DOMAIN/api/webhooks/razorpay`
   with the `subscription.*` and `payment.failed` events, and put its secret in `RAZORPAY_WEBHOOK_SECRET`.

How it works:
- Plan buttons POST to `/api/checkout`, which finds or creates the Razorpay plan for that tier plus
  extra languages (named e.g. "Nirakar Media Growth + 2 extra languages"), creates a monthly
  subscription (120 cycles, or until cancelled), and redirects to `/checkout/pay`.
- `/checkout/pay` opens Razorpay Checkout. After the customer authorises the mandate, Razorpay posts to
  `/api/checkout/verify`, which checks the signature before showing the success page.
- `/api/webhooks/razorpay` verifies the webhook signature and sends activations, failed payments and
  cancellations to `CONTACT_WEBHOOK_URL`.
- Changing a price in `lib/plans.ts` creates new Razorpay plans on the next purchase; existing
  subscribers stay on their old plan until you move them in the Razorpay Dashboard.
- RBI e-mandate rules: charges above ₹15,000 (Pro, and Growth with add-ons) need the customer to approve
  each renewal. Razorpay sends them the approval request.

## Client portal

Each client logs in to their own outcome dashboard at `/login`. Setup steps for Google, Meta and the
database are in `docs/client-portal.md`.

- **Admin** (`/admin`): create clients, set plan and languages, create invite links for client users,
  add conversion opportunities (publish when checked), create tracked links, tag videos with topics and
  languages, and sync now.
- **Client** (`/portal/c/<slug>`): Content published, views, engagement, subscriber growth, search views,
  leads, best topics and conversion opportunities for 7, 30 or 90 days, compared with the previous period.
  What they see follows their plan (`planFeatures` in `lib/portal.ts`).
- **Connected accounts**: clients (or you, as admin) connect YouTube and Instagram with read-only
  OAuth. Tokens are encrypted with `ENCRYPTION_KEY`.
- **Daily sync**: Vercel Cron calls `/api/cron/sync` at 01:30 UTC (7:00 IST) with `CRON_SECRET`.
  Each sync stores a cumulative snapshot per video, and the dashboard shows the change over the period.
  Numbers start on the day an account is connected: older lifetime views are not counted as new.
- **Leads**: tracked links `/l/<code>` redirect to the destination and count one lead per visitor per day.
  A website form can also POST `{ "key": "<client lead key>", "source": "form" }` to `/api/leads`.

```bash
npm run seed    # creates the database tables, your admin login and a demo client
```

The seed prints the admin password if `ADMIN_PASSWORD` is unset. The demo client is
`demo@glowstudio.example` / `demo-glow-2026` (delete it in production, or change the password).

Without `DATABASE_URL`, the portal uses an embedded Postgres in `./.data/pglite`. That is fine on your
laptop but not on Vercel, where the filesystem is temporary: set `DATABASE_URL` for production.

## Contact form

`POST /api/contact` forwards leads as JSON to `CONTACT_WEBHOOK_URL` (Zapier, Make,
Slack incoming webhook, Google Apps Script...). Without it, leads are only written to the server log.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. vercel.com > Add New Project > import the repo (framework: Next.js, defaults are fine).
3. Add the env vars from `.env.example` in Project Settings > Environment Variables, including
   `DATABASE_URL`, `ENCRYPTION_KEY` and `CRON_SECRET`.
4. After the first deploy, open `https://YOUR-DOMAIN/setup`, enter your `CRON_SECRET` as the setup key, and create
   your admin login. The tables are created automatically on first use. The page locks once an admin exists.
   (`npm run seed` also works from a laptop, and adds a demo client.)
5. Project Settings > Domains > add `nirakarmedia.com` and `www.nirakarmedia.com`,
   then set the DNS records Vercel shows at your domain registrar.
6. Set `SITE_URL=https://www.nirakarmedia.com` and redeploy.

## Architecture

`docs/architecture.md` maps every box in the target architecture diagram to what is built, partial or later, and gives the build order.

## Brand

Logo concepts are in `brand/`. The site uses concept B (open ring with play button),
also at `public/icon.svg`. The SVG wordmarks use live text; before printing or
registering the logo, have a designer convert the text to outlines in the final typeface.
