# Architecture: how the build maps to the target design

The target is Ankit's "NirakarMedia Technical Architecture" diagram (2026-09-29). For the MVP it is built as
**one Next.js app on Vercel with one Postgres database**, not separate microservices. Each service in the
diagram is a module with its own folder, so any one of them can later move to its own service without
rewriting the others.

Rules that keep the modules separable:
- Pages and API routes call a module's exported functions. They don't write SQL for another module's tables.
- Each module owns its tables in `db/schema.sql`, marked with a comment.
- External APIs (Google, Meta, Razorpay, LLMs) are called only from `lib/connectors/*` or the module that owns them,
  with base URLs overridable by env for testing.
- Background work goes through `lib/sync.ts` today, and later through a job queue with the same function signatures.

Status: **Built**, **Partial** (works but narrower than the diagram), **Later** (not started).

## 1. Experience layer

| Box | Status | Where |
| --- | --- | --- |
| Marketing website | Built | `app/(site)` |
| Client dashboard | Built | `app/(portal)/(shell)/portal`, `components/portal` |
| Admin console | Built | `app/(portal)/(shell)/admin` |
| Mobile responsive portal | Built | Tested at 390px width |
| YouTube, Instagram | Partial | Read-only statistics. Publishing is done by the team outside the app |
| LinkedIn, TikTok, Blog / CMS | Later | TikTok is unavailable in India |

## 2. Access and identity

| Box | Status | Where |
| --- | --- | --- |
| Sign up / login, auth | Built | `lib/auth.ts`, invite links, scrypt passwords, session cookie |
| User roles | Partial | `admin` and `client`. Strategist, editor and QA roles are later |
| Team permissions | Later | |
| Client accounts | Built | `clients` table, several users per client |

## 3. API and application layer

| Box | Status | Where |
| --- | --- | --- |
| API gateway / backend API | Partial | Next.js route handlers and server actions |
| Onboarding service | Built | Razorpay checkout, then a 6-step setup at `/portal/c/<slug>/onboarding`: business, channels (YouTube and Instagram connect), audience and voice, brand assets, goals, plan review. Brand files are shared as links; file upload is later |
| Brand Brain service | Built | `lib/brand.ts` and `/portal/c/<slug>/brand`: business, audience, offerings, tone, competitors, pillars, CTAs, languages, compliance, goals, assets. Editable by the client and admin |
| Content pipeline service | Built | `lib/pipeline.ts`, `/admin/content` (board and calendar), `content_items`. Stages: idea, script, production, QA, client review, scheduled, published |
| Approval workflow service | Built | Clients approve the script and the final video or request changes at `/portal/c/<slug>/content`. Anything unanswered for 48 hours is approved automatically. No email or WhatsApp alerts yet |
| Publishing scheduler | Later | |
| Analytics service | Built | `lib/portal.ts`, `lib/sync.ts`, `lib/connectors` |
| Billing service | Partial | `lib/razorpay.ts`, webhooks. No billing page inside the portal yet |
| Notification service | Later | Contact and payment alerts go to `CONTACT_WEBHOOK_URL` for now |
| CRM / lead service | Partial | Tracked links and `/api/leads` count leads. No contact records yet |

## 4. Workflow / orchestration engine

**Later.** The 12-step lifecycle (Discover to Optimize) is described on the site and run by the team by hand.
In the app, the first version would be a status field on each content item plus a daily cron. A queue
(for example Inngest or QStash) comes once there are enough clients to need it.

## 5. AI and automation layer

**Later.** None of the AI boxes run inside the app yet. The team uses AI tools directly. When built, each
becomes a function in `lib/ai/*` that the pipeline calls, with an LLM provider behind an env var.

## 6. Human review / operations

**Partial.** The admin console is the team's workspace today: publishing opportunities, tagging videos and
managing links, plus the content pipeline board. Separate editor and QA logins come with team roles.

## 7. Data layer

| Box | Status | Where |
| --- | --- | --- |
| User DB | Built | `users`, `sessions`, `clients` |
| Brand Brain DB | Built | `brand_profiles` (answers as JSON, onboarding progress) |
| Content metadata DB | Partial | `content_items` (brief, script, video link, dates) and `content_events` (history), plus `videos` synced from platforms. Script versions are later |
| Asset storage | Later | Vercel Blob or S3 |
| Analytics warehouse | Partial | `video_snapshots`, `channel_days`, `leads` in Postgres. That's enough at this scale |
| Audit logs | Later | |

## 8. Integration layer

| Box | Status | Notes |
| --- | --- | --- |
| Social platform APIs | Partial | YouTube Data and Analytics, Instagram Graph. Read-only |
| Payment gateway | Built | Razorpay Subscriptions (Stripe is invite-only in India) |
| Email / WhatsApp / Slack | Partial | One outbound webhook |
| OpenAI / Claude LLM APIs, voice API, video tools | Later | |
| CRM (HubSpot etc.), CMS (WordPress etc.) | Later | |

## 9. Platform ops

| Box | Status | Notes |
| --- | --- | --- |
| Logs, monitoring | Partial | Vercel's built-in logs and analytics |
| Error tracking | Later | Sentry is the usual choice |
| Backups | Partial | Provided by the Postgres host (Neon or Supabase point-in-time restore) |
| Security | Partial | Encrypted OAuth tokens, hashed passwords and sessions, signed webhooks, per-client access checks |
| SOC 2 | Later | Not needed until enterprise clients ask |

## 10. Business outputs

Shorts and reels, YouTube videos, multi-language content, leads, reports (dashboard and print to PDF) and
growth insights are covered. LinkedIn posts and blogs are later. **Revenue impact** needs each client's sales
data from a CRM or store integration. Until then the dashboard shows leads, not revenue.

## Suggested build order

1. ~~Onboarding and the **Brand Brain** profile.~~ Built. Asset file upload (instead of links) is still to do.
2. ~~**Content pipeline**, calendar and **client approvals**.~~ Built. Videos are shared as links; uploads
   and automatic publishing come later.
3. Notifications (email and WhatsApp) for approvals and reports.
4. **AI layer** functions plugged into pipeline steps (research, scripting, summaries, recommendations).
5. Publishing scheduler with platform upload APIs, then LinkedIn and blog outputs.
6. Team roles (strategist, editor, QA), audit logs, error tracking.
