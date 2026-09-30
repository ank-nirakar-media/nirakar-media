-- Nirakar Media client portal schema. Idempotent: safe to run on every boot.

CREATE TABLE IF NOT EXISTS clients (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  plan          TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'pro')),
  languages     TEXT NOT NULL DEFAULT 'English',
  lead_key      TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  client_id       INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  password_hash   TEXT,
  invite_hash     TEXT,
  invite_expires  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL
);

-- One row per connected social account. Tokens are AES-256-GCM encrypted.
CREATE TABLE IF NOT EXISTS connections (
  id               SERIAL PRIMARY KEY,
  client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'facebook')),
  account_id       TEXT NOT NULL,
  account_name     TEXT NOT NULL DEFAULT '',
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'active',
  last_error       TEXT,
  last_synced_at   TIMESTAMPTZ,
  UNIQUE (client_id, platform, account_id)
);

CREATE TABLE IF NOT EXISTS videos (
  id            SERIAL PRIMARY KEY,
  client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,
  external_id   TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT '',
  topic         TEXT,
  language      TEXT,
  format        TEXT NOT NULL DEFAULT 'short',
  url           TEXT,
  published_at  TIMESTAMPTZ NOT NULL,
  UNIQUE (client_id, platform, external_id)
);

-- Cumulative lifetime counters, one snapshot per video per day.
-- Period numbers are the difference between snapshots.
CREATE TABLE IF NOT EXISTS video_snapshots (
  video_id  INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  day       DATE NOT NULL,
  views     BIGINT NOT NULL DEFAULT 0,
  likes     BIGINT NOT NULL DEFAULT 0,
  comments  BIGINT NOT NULL DEFAULT 0,
  shares    BIGINT NOT NULL DEFAULT 0,
  saves     BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (video_id, day)
);

-- Account-level numbers per day: follower total (cumulative) and search views (daily).
CREATE TABLE IF NOT EXISTS channel_days (
  client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,
  day              DATE NOT NULL,
  followers_total  BIGINT,
  search_views     BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, platform, day)
);

-- Tracked links put in captions and bios. Each click is a lead.
CREATE TABLE IF NOT EXISTS links (
  code        TEXT PRIMARY KEY,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  video_id    INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  label       TEXT NOT NULL,
  target_url  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  video_id    INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  source      TEXT NOT NULL,
  visitor     TEXT,
  day         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, source, visitor, day)
);

-- Written by the growth team; clients only see published ones.
CREATE TABLE IF NOT EXISTS opportunities (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  signal      TEXT NOT NULL,
  location    TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  published   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_client ON videos (client_id, published_at);
CREATE INDEX IF NOT EXISTS leads_client ON leads (client_id, day);

-- Brand Brain (lib/brand.ts): one profile per client, answers stored as JSON so
-- questions can change without migrations. Filled by onboarding and editable later.
CREATE TABLE IF NOT EXISTS brand_profiles (
  client_id        INTEGER PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  data             JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_step  INTEGER NOT NULL DEFAULT 1,
  onboarded_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by       TEXT NOT NULL DEFAULT ''
);

-- Content pipeline (lib/pipeline.ts): one row per piece of content, from idea to published.
-- review is what the client is being asked to approve right now ('script' or 'video'), or NULL.
CREATE TABLE IF NOT EXISTS content_items (
  id                   SERIAL PRIMARY KEY,
  client_id            INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  format               TEXT NOT NULL DEFAULT 'short',
  platform             TEXT NOT NULL DEFAULT '',
  language             TEXT NOT NULL DEFAULT '',
  stage                TEXT NOT NULL DEFAULT 'idea',
  brief                TEXT NOT NULL DEFAULT '',
  script               TEXT NOT NULL DEFAULT '',
  video_url            TEXT NOT NULL DEFAULT '',
  published_url        TEXT NOT NULL DEFAULT '',
  internal_notes       TEXT NOT NULL DEFAULT '',
  due_date             DATE,
  publish_on           DATE,
  review               TEXT,
  review_requested_at  TIMESTAMPTZ,
  changes_requested    TEXT NOT NULL DEFAULT '',
  script_approved_at   TIMESTAMPTZ,
  video_approved_at    TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- History of each item. Clients see everything except internal entries.
CREATE TABLE IF NOT EXISTS content_events (
  id          SERIAL PRIMARY KEY,
  item_id     INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  actor       TEXT NOT NULL,
  kind        TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  internal    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_items_client ON content_items (client_id, stage);
CREATE INDEX IF NOT EXISTS content_events_item ON content_events (item_id, created_at);

-- When the client was last reminded about the approval they are waiting on (lib/notify.ts).
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;

-- Every email the portal sends or tries to send, shown in Admin > Emails.
CREATE TABLE IF NOT EXISTS email_log (
  id          SERIAL PRIMARY KEY,
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  kind        TEXT NOT NULL,
  item_id     INTEGER REFERENCES content_items(id) ON DELETE SET NULL,
  status      TEXT NOT NULL,
  error       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
