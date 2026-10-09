-- Aangan Call Desk: call log, qualified leads, running costs, and an action audit trail.
-- Runs on Supabase or Neon (plain Postgres 15+). Safe to re-run.

create extension if not exists pgcrypto;

-- One row per inbound phone call (or replayed transcript).
create table if not exists calls (
  id              uuid primary key default gen_random_uuid(),
  source          text not null default 'vaani' check (source in ('vaani', 'replay', 'simulator')),
  vaani_event_id  text unique,                 -- webhook envelope id (evt_...), makes retries idempotent
  vaani_call_id   text,
  caller_phone    text,
  start_time      timestamptz not null default now(),
  duration_sec    integer not null default 0 check (duration_sec >= 0),
  after_hours     boolean not null default false, -- outside 10:00-19:00 IST, when the front desk is closed
  transcript      jsonb not null default '[]',  -- [{ "speaker": "agent" | "caller", "text": "..." }]
  status          text not null default 'PROCESSING'
                  check (status in ('PROCESSING', 'QUALIFIED', 'NEEDS_INFO', 'DISQUALIFIED', 'ESCALATED', 'FAILED')),
  intent          text,
  linked_call_id  uuid references calls(id) on delete set null, -- a dropped call superseded by a call-back
  raw_payload     jsonb,
  error           text,
  created_at      timestamptz not null default now(),
  processed_at    timestamptz
);
create index if not exists calls_start_time_idx on calls (start_time desc);
create index if not exists calls_caller_phone_idx on calls (caller_phone);

-- What the AI extracted from the call, the rubric verdicts, and what happened next.
create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  call_id            uuid not null unique references calls(id) on delete cascade,
  caller_name        text,
  project_type       text,                    -- residential_full_home, commercial_office, ...
  scope              text,                    -- "Kitchen, 2 bedrooms, living room"
  location           text,
  zone               text check (zone in ('pune', 'pcmc', 'outside', 'unknown')),
  carpet_area        integer,
  timeline           text,
  needed_by          date,
  budget             text,                    -- only what the caller volunteered
  budget_max_inr     bigint,
  decision_maker     text,
  status             text not null check (status in ('QUALIFIED', 'NEEDS_INFO', 'DISQUALIFIED', 'ESCALATED')),
  priority           text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  criteria           jsonb not null,          -- { scope: { verdict, evidence, note }, area: ..., timeline: ..., budget: ..., decision_maker: ... }
  reasons            text[] not null default '{}',
  flags              text[] not null default '{}',
  extraction         jsonb,                   -- raw structured facts from Gemini, kept for audit
  handoff_summary    text,                    -- the note sent to the designer, as Markdown
  booking            jsonb,                   -- { provider, id, start, status }
  hubspot_deal_id    text,
  telegram_message_id bigint,
  handoff_sent_at    timestamptz,
  assigned_to        text,
  assigned_at        timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists leads_status_idx on leads (status);

-- What each call cost to handle, in INR. Vaani bills speech-to-text, text-to-speech and telephony
-- as one per-minute price, so stt_cost and tts_cost stay null and the bundle goes in voice_cost.
create table if not exists system_costs (
  id                 uuid primary key default gen_random_uuid(),
  call_id            uuid not null unique references calls(id) on delete cascade,
  stt_cost           numeric(10, 4),
  llm_cost           numeric(10, 4) not null default 0,
  tts_cost           numeric(10, 4),
  voice_cost         numeric(10, 4) not null default 0,
  total_cost         numeric(10, 4) not null default 0,
  currency           text not null default 'INR',
  llm_model          text,
  llm_input_tokens   integer not null default 0,
  llm_output_tokens  integer not null default 0,
  created_at         timestamptz not null default now()
);

-- Every side effect (Telegram, Cal.com, HubSpot, compliance checks), so failures are visible.
create table if not exists events (
  id       bigserial primary key,
  call_id  uuid references calls(id) on delete cascade,
  kind     text not null,
  ok       boolean not null default true,
  detail   jsonb not null default '{}',
  at       timestamptz not null default now()
);
create index if not exists events_call_idx on events (call_id, at);

-- The app talks to Postgres with the server-side connection string only; nothing is exposed
-- through the Supabase REST API.
alter table calls enable row level security;
alter table leads enable row level security;
alter table system_costs enable row level security;
alter table events enable row level security;
