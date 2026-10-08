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
| Notification service | Partial | Email through Resend (`lib/email.ts`, `lib/notify.ts`): approval requests, 24-hour reminders, auto-approvals, messages and client replies, logged in Admin > Emails. WhatsApp is later. Contact and payment alerts still go to `CONTACT_WEBHOOK_URL` |
| CRM / lead service | Partial | Tracked links and `/api/leads` count leads. No contact records yet |

## 4. Workflow / orchestration engine

**Later.** The 12-step lifecycle (Discover to Optimize) is described on the site and run by the team by hand.
In the app, the first version would be a status field on each content item plus a daily cron. A queue
(for example Inngest or QStash) comes once there are enough clients to need it.

## 5. AI and automation layer

**Partial.** `lib/ai/claude.ts` is the single Claude connection (ANTHROPIC_API_KEY, optional AI_MODEL). It asks
for schema-checked JSON and logs every call with its cost to `ai_runs`. `lib/ai/studio.ts` uses it for:

- Topic ideas from the Brand Brain, added to a client's Idea column (Admin > Content > Suggest ideas with AI).
- Script, scene plan and post caption for an item, or a redraft from the client's change request.

Everything AI makes is a draft for the team; nothing reaches a client until it is sent for approval. Admin > AI
shows status, monthly cost and the call log. Voiceover, visuals and video rendering are the next part of this layer.

**Video engine.** A scene plan becomes a `VideoPlan` (`lib/video/plan.ts`, `lib/video/build.ts`): scenes,
caption word timings, brand colours, layout. One Remotion composition (`remotion/Short.tsx`) draws it, both
in the browser (Remotion Player, for the website demo and the admin preview) and as an MP4
(`npx tsx scripts/render.ts [plan.json] [out.mp4] [--stills]`). Fonts are Baloo 2 in `public/fonts`
(Latin and Devanagari). Captions are timed from the script and the audio length, because the planned
voice provider returns no word timestamps. Free sample requests from `/sample-video` land in
`sample_requests` and wait in Admin > Samples for a person to approve them.

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
| Claude API | Built | Ideas, scripts, scene plans, captions |
| Video engine: layouts, captions, browser preview, website demo, sample requests | Built | `lib/video/`, `remotion/`, `/sample-video`, `/admin/samples` |
| Voice API, stock footage, MP4 rendering job | Later | Needs Sarvam and Pexels keys and a renderer choice |
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
3. ~~Email notifications for approvals.~~ Built. WhatsApp (needs a Meta-approved business number and templates) and monthly report emails are still to do.
4. **AI layer.** Ideas, scripts, scene plans and captions are built (AI Studio). Next: voiceover, visuals and
   rendering a finished video, then monthly summaries and recommendations.
5. Publishing scheduler with platform upload APIs, then LinkedIn and blog outputs.
6. Team roles (strategist, editor, QA), audit logs, error tracking.
