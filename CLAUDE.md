# Nirakar Media: working rules for Claude

Nirakar Media sells faceless-video content as a monthly service (India first). This repo is the
public site, the client portal, payments (Razorpay Subscriptions) and the AI Studio. Next.js 15
on Vercel, Postgres on Neon (PGlite locally). README.md and docs/ describe each part.

## Evidence over confidence

The owner relies on what Claude says to run a real business. So:

- **Every claim carries its evidence.** Name the file and line, paste the command output, link the
  page or PR, or quote the response you got. "It works" with nothing behind it is not a result.
- **Say how sure you are.** Mark anything you did not check as an inference or a guess, in those
  words. Never fill a gap with something that merely sounds right.
- **Outside services change faster than your training.** Prices, API fields, limits, test card
  numbers, dashboard menus and model names for Razorpay, Vercel, Neon, Resend, Google, Meta,
  Anthropic and others: check their current docs or a live response before stating them. If you
  can't check, say so and link where the owner can.
- **Prefer the system's own answer.** `/api/health`, a test run, a Razorpay or Vercel dashboard, or a
  direct API call beats reasoning about what should happen. If your tools can't reach something
  (some fetch tools return stale cached pages), say so and ask the owner to check it.
- **Report failures plainly.** A red test, a skipped step or a fix you could not verify is said as
  such, with the output.

## Before you push

Run the same checks CI runs (`.github/workflows/ci.yml`), and only push when they pass:

```bash
npm run typecheck
npm test        # node:test via tsx, each file gets its own temp PGlite database
npm run build
```

New behaviour gets a test in `tests/`. Business rules (prices, the 48-hour auto-approve, signature
checks) are pinned by tests on purpose: change the test only when the owner changed the rule.

## How the owner works

- Preview first: draft PR, Vercel preview, the owner tries it, then merge. Never merge or touch
  production without the owner's explicit go-ahead.
- Payments stay in Razorpay **test mode** until the owner says otherwise.
- Never commit, log or echo secrets. Env values live in Vercel only. `/api/health` may show
  whether a key is set, its public ID or its length, never its value.
- Plain language in replies; the owner is a founder, not a full-time engineer.

## Building AI features and agents

The same rules apply to the AI we build into the product:

- Prompts tell the model never to invent facts, prices, statistics or testimonials, and to leave
  `[placeholders]` when something is missing (see `SYSTEM` in `lib/ai/studio.ts`).
- Ground the model in stored data (Brand Brain, analytics, logs) rather than its own knowledge.
- Ask for JSON that matches a schema, validate it, and handle refusals and errors without throwing.
- Log every model call to `ai_runs` with its status and cost (`lib/ai/claude.ts`).
- Anything client-facing or money-related needs a human approval step before it goes out.

## Code conventions

- `db/schema.sql` runs on every start and is split on `;` at line ends: statements must be
  idempotent (`IF NOT EXISTS`) and comments must not contain semicolons.
- The site URL env var is `SITE_URL` (not `NEXT_PUBLIC_SITE_URL`).
- Plan prices and volumes live in `lib/plans.ts`; engine stages in `lib/content.ts`.
