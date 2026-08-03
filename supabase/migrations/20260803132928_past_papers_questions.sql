-- ▼ 層A: 過去問メタデータ（本文を持たない）
create table past_papers (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references schools(id) on delete cascade,
  department_id  uuid references school_departments(id),
  year           smallint not null,
  subject_id     uuid not null references subjects(id),
  time_limit_min smallint not null,
  total_points   smallint not null,
  notes          text                               -- 「大問4題・全記述」等
);
create index on past_papers (school_id, subject_id, year);

create table past_paper_items (
  id           uuid primary key default gen_random_uuid(),
  paper_id     uuid not null references past_papers(id) on delete cascade,
  item_no      text not null,                       -- '大問2(1)'
  unit_ids     uuid[] not null,                      -- 出題単元（アプリ層で units.id との整合性を保証）
  format       text not null check (format in ('mark','short','essay','proof')),
  points       smallint not null,
  difficulty   smallint not null check (difficulty between 1 and 10),
  est_time_sec integer
);
create index on past_paper_items (paper_id);
create index past_paper_items_unit_ids_idx on past_paper_items using gin (unit_ids);
-- ※ 本文カラムは意図的に存在しない（過去問の著作権リスクを回避するため）

-- ▼ 層B: 配信する問題プール
create table questions (
  id             uuid primary key default gen_random_uuid(),
  source_type    text not null check (source_type in ('ai_generated','self_authored','official_open','licensed')),
  license_status text not null default 'blocked' check (license_status in ('deliverable','blocked','review_pending')),
  license_note   text,
  subject_id     uuid not null references subjects(id),
  difficulty     smallint not null check (difficulty between 1 and 10),
  format         text not null check (format in ('mark','short','essay','proof')),
  body_md        text not null,
  choices        jsonb,                              -- 選択式のみ
  answer         jsonb not null,
  explanation_md text not null,
  rubric         jsonb,                              -- 記述式の採点基準
  est_time_sec   integer not null,
  embedding      vector(1536),                        -- 類題検索
  quality_score  numeric(3,2),                        -- 検証スコア
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  -- 配信可能なのは権利確認済みのみ（DB レベルで事故を防ぐ）
  constraint deliverable_requires_license
    check (license_status <> 'deliverable' or source_type in ('ai_generated','self_authored','official_open','licensed'))
);
create index on questions (subject_id, license_status);
create index questions_embedding_idx on questions using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 問題 × スキルタグ（多対多）
create table question_tags (
  question_id  uuid not null references questions(id) on delete cascade,
  skill_tag_id uuid not null references skill_tags(id) on delete cascade,
  primary key (question_id, skill_tag_id)
);
create index on question_tags (skill_tag_id);
