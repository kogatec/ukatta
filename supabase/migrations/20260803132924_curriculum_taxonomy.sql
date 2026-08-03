-- 単元タグ階層: subjects > units > skill_tags
create table subjects (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  name       text not null,
  exam_track text not null check (exam_track in ('highschool','university'))
);

create table units (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  parent_id  uuid references units(id) on delete cascade,
  name       text not null,
  grade_from text,
  sort       smallint not null default 0
);
create index on units (subject_id);
create index on units (parent_id);

create table skill_tags (
  id      uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  name    text not null                             -- 例:「二次関数の場合分けによる最大最小」
);
create index on skill_tags (unit_id);
