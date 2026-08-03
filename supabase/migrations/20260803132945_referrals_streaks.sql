-- 友達紹介
create table referrals (
  id         uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references users(id) on delete cascade,
  code       text unique not null,                    -- 8桁 base32
  created_at timestamptz not null default now()
);
create index on referrals (inviter_id);

create table referral_redemptions (
  id             uuid primary key default gen_random_uuid(),
  referral_id    uuid not null references referrals(id),
  invitee_id     uuid unique references users(id),     -- 1人1回のみ
  status         text not null default 'pending' check (status in ('pending','qualified','rewarded','rejected')),
  signup_ip_hash text,
  device_hash    text,
  fraud_score    numeric(3,2),
  qualified_at   timestamptz,
  rewarded_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index on referral_redemptions (referral_id);

create table streaks (
  user_id     uuid primary key references users(id) on delete cascade,
  current     integer not null default 0,
  longest     integer not null default 0,
  last_active date
);
