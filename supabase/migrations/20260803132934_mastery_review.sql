-- 習熟度（ベータ分布で保持）
create table mastery (
  user_id      uuid not null references users(id) on delete cascade,
  skill_tag_id uuid not null references skill_tags(id) on delete cascade,
  alpha        numeric(8,3) not null default 1,      -- 正答の擬似カウント
  beta         numeric(8,3) not null default 1,      -- 誤答の擬似カウント
  mastery      numeric(4,3) generated always as (alpha / (alpha + beta)) stored,
  sample_size  integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, skill_tag_id)
);

-- 復習キュー（FSRS 準拠）
create table review_queue (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  skill_tag_id uuid not null references skill_tags(id) on delete cascade,
  due_at       timestamptz not null,
  state        text not null default 'new' check (state in ('new','learning','review','relearning','suspended')),
  stability    numeric(8,3),
  difficulty   numeric(4,2),
  reps         smallint not null default 0,
  lapses       smallint not null default 0
);
create index on review_queue (user_id, due_at) where state <> 'suspended';
