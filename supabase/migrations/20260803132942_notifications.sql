-- 通知
create table notification_prefs (
  user_id        uuid primary key references users(id) on delete cascade,
  morning_time   time not null default '07:00',
  evening_time   time not null default '21:00',
  push_enabled   boolean not null default true,
  email_enabled  boolean not null default false,
  quiet_weekdays smallint[] not null default '{}',
  auto_tune      boolean not null default true        -- 通知時刻の自動最適化
);

create table push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  endpoint        text unique not null,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  failure_count   smallint not null default 0,
  last_success_at timestamptz,
  created_at      timestamptz not null default now()
);
create index on push_subscriptions (user_id);

create table notification_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  channel       text not null check (channel in ('push','email')),
  kind          text not null check (kind in ('morning','evening','streak','guardian_report')),
  scheduled_for timestamptz not null,
  sent_at       timestamptz,
  opened_at     timestamptz,
  unique (user_id, kind, scheduled_for)               -- 二重送信の防止
);
create index on notification_logs (user_id, kind);
