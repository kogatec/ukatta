-- 模試
create table mock_exams (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  target_id      uuid references user_targets(id),
  subject_id     uuid not null references subjects(id),
  title          text not null,
  blueprint      jsonb not null,                    -- 出題設計図（過去問メタデータの集計結果）
  status         text not null default 'generating' check (status in ('generating','ready','in_progress','submitted','graded','failed')),
  time_limit_min smallint not null,
  total_points   smallint not null,
  started_at     timestamptz,
  submitted_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index on mock_exams (user_id, status);

create table mock_exam_items (
  id           uuid primary key default gen_random_uuid(),
  mock_exam_id uuid not null references mock_exams(id) on delete cascade,
  order_no     smallint not null,
  question_id  uuid not null references questions(id),
  points       smallint not null,
  unique (mock_exam_id, order_no)
);
create index on mock_exam_items (mock_exam_id);

-- 解答
create table attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  question_id     uuid not null references questions(id),
  mock_item_id    uuid references mock_exam_items(id),
  context         text not null check (context in ('mock','review','drill','diagnostic')),
  answer_raw      jsonb not null,
  is_correct      boolean,
  awarded_points  numeric(5,2),
  time_spent_sec  integer not null,
  self_confidence smallint check (self_confidence between 1 and 4),
  created_at      timestamptz not null default now()
);
create index on attempts (user_id, created_at desc);
create index on attempts (question_id);

-- 誤答タイプ診断（AI）
create table attempt_diagnoses (
  attempt_id    uuid primary key references attempts(id) on delete cascade,
  error_type    text not null check (error_type in ('knowledge_gap','procedure','calculation','misread','timeout','careless')),
  root_skill_id uuid references skill_tags(id),      -- 真の原因となる前提スキル
  comment_ja    text not null,
  model         text not null,
  created_at    timestamptz not null default now()
);
