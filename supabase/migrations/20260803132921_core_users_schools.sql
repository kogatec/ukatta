-- ユーザー（生徒）
create table users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique not null references auth.users(id) on delete cascade,
  display_name  text not null,
  grade_level   text not null check (grade_level in ('jhs1','jhs2','jhs3','hs1','hs2','hs3','ronin')),
  exam_track    text not null check (exam_track in ('highschool','university')),
  exam_date     date,
  timezone      text not null default 'Asia/Tokyo',
  is_minor      boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on users (auth_id);

-- 学校マスタ（高校・大学）
create table schools (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('highschool','university')),
  name          text not null,
  name_kana     text not null,
  prefecture    text,
  is_national   boolean,
  deviation     numeric(4,1),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(name_kana,''))
  ) stored
);
create index schools_search_idx on schools using gin (search_vector);
create index schools_name_trgm_idx on schools using gin (name_kana gin_trgm_ops);

create table school_departments (                  -- 大学のみ: 学部・学科
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  faculty       text not null,                     -- 学部
  department    text,                              -- 学科
  admission_type text not null check (admission_type in ('一般','共テ利用','総合型','学校推薦'))
);
create index on school_departments (school_id);

-- 志望校（第1〜第3志望）
create table user_targets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  school_id     uuid not null references schools(id),
  department_id uuid references school_departments(id),
  priority      smallint not null check (priority between 1 and 3),
  exam_subjects jsonb not null,                    -- [{subject_id, weight_points}]
  unique (user_id, priority)
);
create index on user_targets (user_id);
