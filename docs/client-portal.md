# Client portal: what's built and what you need to set up

The portal is built and tested against mock Google and Meta APIs. To use it with real
client accounts you need the accounts below. Everything else is in the code.

## What's built

| Part | Where |
| --- | --- |
| Email and password login, invite links (7 days, single use), admin and client roles | `/login`, `/set-password`, `lib/auth.ts` |
| Per-client outcome dashboard, 7/30/90 days vs previous period, gated by plan | `/portal/c/<slug>`, `lib/portal.ts` |
| Admin area: clients, plans, languages, invites, opportunities, tracked links, video tags | `/admin`, `/admin/c/<slug>` |
| YouTube connector: videos, views, likes, comments, subscribers, views from YouTube search | `lib/connectors/youtube.ts` |
| Instagram connector: Reels and posts, views, likes, comments, shares, saves, followers | `lib/connectors/instagram.ts` |
| Daily sync (Vercel Cron) and "Sync now" button | `/api/cron/sync`, `lib/sync.ts` |
| Lead tracking: tracked links and a form webhook | `/l/<code>`, `/api/leads` |
| Database schema (Postgres) | `db/schema.sql` |

### Where each metric comes from

| Metric | Source | Plan |
| --- | --- | --- |
| Content published | Videos found on connected accounts | All |
| Views, engagement | YouTube Data API, Instagram media insights | All |
| Subscriber growth | Daily follower and subscriber totals | All |
| Search views | YouTube Analytics, traffic source "YouTube search" | Growth, Pro |
| Leads generated | Tracked link clicks (one per visitor per day) and form posts | Growth, Pro |
| Best-performing topics | Topic tags you set in admin, ranked by leads then views | Growth, Pro |
| Conversion opportunities | Written by your growth manager in admin, shown when published | Pro |

### Not built yet

- Facebook Page, X and TikTok statistics. X's API has a paid tier; TikTok is not available in India.
- AI-drafted conversion opportunities. They are typed in by hand in admin for now.
- Search impressions. YouTube's API gives views from search, not impressions, so the site now says
  "search views". Google Search Console could add website impressions later.
- Password reset by email. An admin creates a fresh invite link instead.
- Automatic monthly PDF. Clients can print the dashboard page to PDF.

## What you need to set up

### 1. A Postgres database (15 minutes)

Create a free project at neon.tech or supabase.com (region: Mumbai / ap-south-1), copy the
connection string, and set it as `DATABASE_URL` in Vercel. Then run once from your laptop:

```bash
DATABASE_URL="postgres://..." ADMIN_EMAIL=you@nirakarmedia.com ADMIN_PASSWORD="a long password" npm run seed
```

### 2. Two secrets in Vercel (2 minutes)

- `ENCRYPTION_KEY`: output of `openssl rand -base64 32`. Keep a copy somewhere safe; changing it
  means every client has to reconnect.
- `CRON_SECRET`: any long random string. Vercel Cron sends it automatically.

### 3. Google Cloud, for YouTube (1 hour, then Google's review)

1. console.cloud.google.com > create a project "Nirakar Media".
2. APIs & Services > Library > enable **YouTube Data API v3** and **YouTube Analytics API**.
3. OAuth consent screen: External, app name, support email, logo, homepage
   `https://nirakarmedia.com`, privacy policy `https://nirakarmedia.com/legal/privacy`.
   Add the scopes `youtube.readonly` and `yt-analytics.readonly`.
4. Credentials > Create OAuth client ID > Web application. Authorised redirect URI:
   `https://nirakarmedia.com/api/connect/youtube/callback`
5. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. While the app is in "Testing", add each client's Google account as a test user (up to 100).
   To remove that limit and the "unverified app" warning, submit for verification. The YouTube
   scopes are sensitive, so Google asks for a demo video of the connect flow; allow a few weeks.
   You must also verify the nirakarmedia.com domain in Google Search Console.

### 4. Meta developer app, for Instagram (1 to 2 hours, then Meta's review)

1. developers.facebook.com > My Apps > Create app > type **Business**.
2. Add **Facebook Login for Business**. Valid OAuth redirect URI:
   `https://nirakarmedia.com/api/connect/instagram/callback`
3. Permissions used: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`,
   `pages_read_engagement`, `business_management`.
4. App settings > Basic: privacy policy URL, a data deletion instructions URL (the privacy page
   covers this), app icon, category.
5. Put the app ID and secret in `META_APP_ID` and `META_APP_SECRET`.
6. Complete **Business verification** in Meta Business Manager (needs business documents, e.g.
   GST or Udyam certificate), then submit the permissions for **App Review** with a screencast.
   Until approved, only people with a role on the app (add them under App roles) can connect.
7. Clients need an Instagram professional (Business or Creator) account linked to a Facebook Page.

### 5. Razorpay keys (already covered in the README)

## Day-to-day use

1. `/admin` > Add client (name, plan, languages).
2. On the client page > Create invite link > send it to the client on WhatsApp or email.
3. The client sets a password, opens Connected accounts and connects YouTube and Instagram.
4. Numbers appear after the first sync and update every morning at 7:00 IST.
5. Tag videos with topics, add tracked links to captions, and publish opportunities as you find them.
