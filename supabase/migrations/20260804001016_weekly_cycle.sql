-- 週次テスト×日次ドリルの学習サイクル（設計: docs/learning-cycle.md）
--
-- 週次テストは「実力を測る場」、日次ドリルは「実力を上げる場」として役割を分ける。
-- 出題形式はどちらもマーク式で同じ（docs/question-format.md）。異なるのは測定条件
-- （本番同様の構成・時間で通しかどうか、範囲を事前に知っているか）のみ。

-- ==========================================================
-- 1. 週次計画
-- ==========================================================

-- 週次テストの1週間分の状態。「週の開始日」で一意に定まる。
create table weekly_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  target_id    uuid references user_targets(id),
  week_start   date not null,                        -- その週の月曜日
  status       text not null default 'pending' check (status in ('pending','tested','skipped')),
  skip_streak  smallint not null default 0,           -- 連続未受験週数（§2.4のスキップ対応の判定に使う）
  created_at   timestamptz not null default now(),
  unique (user_id, week_start)
);
create index on weekly_plans (user_id, week_start desc);

-- その週にローテーションで選ばれた科目と、生成された週次テスト本体への参照。
-- 週次テストは科目ごとに1本のmock_examとして生成する（既存のmock_examsをそのまま使う）。
create table weekly_plan_subjects (
  id               uuid primary key default gen_random_uuid(),
  weekly_plan_id   uuid not null references weekly_plans(id) on delete cascade,
  subject_id       uuid not null references subjects(id),
  time_limit_min   smallint not null,
  selection_score  numeric(8,4),                      -- §2.3 選択スコア（監査・デバッグ用に保持）
  mock_exam_id     uuid references mock_exams(id),
  unique (weekly_plan_id, subject_id)
);
create index on weekly_plan_subjects (weekly_plan_id);

-- 週次テストの分析結果として決まる、翌週の重点単元（§3）。
create table weekly_plan_units (
  id               uuid primary key default gen_random_uuid(),
  weekly_plan_id   uuid not null references weekly_plans(id) on delete cascade,
  skill_tag_id     uuid not null references skill_tags(id),
  priority_score   numeric(10,4) not null,             -- (1-習熟度)×出題頻度×配点
  target_mastery   numeric(4,3) not null default 0.8,
  achieved         boolean not null default false,
  achieved_at      timestamptz,
  unique (weekly_plan_id, skill_tag_id)
);
create index on weekly_plan_units (weekly_plan_id);

-- 科目ローテーションの状態。「最後にいつ週次テストで出したか」だけを持ち、
-- 選択スコアの経過週数項はこの値から都度計算する。
create table subject_rotation_state (
  user_id           uuid not null references users(id) on delete cascade,
  subject_id        uuid not null references subjects(id),
  last_tested_week  date,                              -- null = 一度も出していない（優先的に選出）
  primary key (user_id, subject_id)
);

-- ==========================================================
-- 2. 日次ミッション
-- ==========================================================

create table daily_missions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  mission_date       date not null,
  weekly_plan_id     uuid references weekly_plans(id),  -- どの週の重点単元に基づくか
  status             text not null default 'pending' check (status in ('pending','in_progress','completed')),
  estimated_minutes  smallint not null,
  created_at         timestamptz not null default now(),
  unique (user_id, mission_date)
);

create table daily_mission_items (
  id                uuid primary key default gen_random_uuid(),
  daily_mission_id  uuid not null references daily_missions(id) on delete cascade,
  question_id       uuid not null references questions(id),
  subject_id        uuid not null references subjects(id),   -- 配分集計を軽くするための非正規化
  layer             text not null check (layer in ('review','focus','maintenance')), -- §4.2
  order_no          smallint not null,
  attempt_id        uuid references attempts(id),
  unique (daily_mission_id, order_no)
);
create index on daily_mission_items (daily_mission_id);

-- ==========================================================
-- 3. 既存テーブルへの追加
-- ==========================================================

-- 模試の種別。週次テストも既存のmock_examsをそのまま使う。
alter table mock_exams add column kind text not null default 'adhoc'
  check (kind in ('weekly','monthly_full','adhoc'));

-- 測定条件の重み（§5）。難易度重み・新しさ重みとは独立に、習熟度更新時にこの値を掛ける。
-- 計算済みの値をスナップショットで保存し、後で重みの定義を変えても過去データの意味を変えない。
alter table attempts add column condition_weight numeric(3,2) not null default 1.0;

-- 週次テストの実施曜日・開始時刻（既定は土曜 21:00 相当は使わず、後で本人が変更する前提の初期値）
alter table notification_prefs add column weekly_test_weekday smallint not null default 6
  check (weekly_test_weekday between 0 and 6);          -- 0=日曜 .. 6=土曜
alter table notification_prefs add column weekly_test_time time not null default '10:00';

-- ==========================================================
-- 4. RLS
-- ==========================================================

alter table weekly_plans enable row level security;
create policy "weekly_plans_owner_select" on weekly_plans for select using (user_id = public.current_user_id());
create policy "weekly_plans_owner_insert" on weekly_plans for insert with check (user_id = public.current_user_id());

alter table weekly_plan_subjects enable row level security;
create policy "weekly_plan_subjects_owner_select" on weekly_plan_subjects for select using (
  weekly_plan_id in (select id from weekly_plans where user_id = public.current_user_id())
);

alter table weekly_plan_units enable row level security;
create policy "weekly_plan_units_owner_select" on weekly_plan_units for select using (
  weekly_plan_id in (select id from weekly_plans where user_id = public.current_user_id())
);

alter table subject_rotation_state enable row level security;
create policy "subject_rotation_state_owner_select" on subject_rotation_state for select using (user_id = public.current_user_id());

alter table daily_missions enable row level security;
create policy "daily_missions_owner_select" on daily_missions for select using (user_id = public.current_user_id());

alter table daily_mission_items enable row level security;
create policy "daily_mission_items_owner_select" on daily_mission_items for select using (
  daily_mission_id in (select id from daily_missions where user_id = public.current_user_id())
);
