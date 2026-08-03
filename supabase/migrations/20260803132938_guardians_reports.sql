-- 保護者
create table guardians (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  email             text not null,
  relation          text check (relation in ('母','父','その他')),
  verify_token      text unique,
  verified_at       timestamptz,                     -- ダブルオプトイン完了
  consent_at        timestamptz,                      -- 未成年の個人情報取扱同意
  unsubscribe_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  report_enabled    boolean not null default true,
  report_hour       smallint not null default 21 check (report_hour between 0 and 23),
  report_weekdays   smallint[] not null default '{1,2,3,4,5,6,0}',
  bounced_at        timestamptz,
  created_at        timestamptz not null default now(),
  unique (user_id, email)
);
create index on guardians (user_id);

create table daily_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  report_date  date not null,
  stats        jsonb not null,                        -- 学習時間/問題数/正答率/伸びた単元
  summary_ja   text not null,                          -- AI生成の保護者向け文面
  email_status text check (email_status in ('sent','skipped','bounced','failed')),
  sent_at      timestamptz,
  unique (user_id, report_date)
);
