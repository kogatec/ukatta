-- 出題形式の設計を反映する（詳細: docs/question-format.md）
--   mark    : 5択（英語・国語・理科・社会）
--   numeric : 数値マーク（数学。共通テスト型。逆算と複数正解事故を封じる）
-- 誤答の選択肢・誤答値そのものに診断タグを埋め込み、誤答タイプ分類をAIなしで確定させる。

-- ==========================================================
-- 1. 誤答タグのマスタ
--    細分類(tag) → DESIGN.md §6.1 の6分類(error_type) への写像。
--    タグの追加でアプリのデプロイが要らないようDBで管理する。
-- ==========================================================
create table error_tags (
  tag           text primary key,
  error_type    text not null check (error_type in ('knowledge_gap','procedure','calculation','misread','timeout','careless')),
  subject_scope text,                                -- 'math'|'english'|'japanese' / null = 全科目共通
  label_ja      text not null,
  sort          smallint not null default 0
);

alter table error_tags enable row level security;
create policy "error_tags_public_read" on error_tags for select using (true);

insert into error_tags (tag, error_type, subject_scope, label_ja, sort) values
  -- 数学
  ('sign_error',         'calculation',   'math',     '符号ミス',                      10),
  ('arithmetic',         'calculation',   'math',     '計算間違い',                    11),
  ('unit_error',         'calculation',   'math',     '単位・桁の誤り',                12),
  ('formula_confusion',  'knowledge_gap', 'math',     '公式の取り違え',                13),
  ('formula_unknown',    'knowledge_gap', 'math',     '公式・定理を覚えていない',      14),
  ('case_omission',      'procedure',     'math',     '場合分けの見落とし',            15),
  ('domain_ignored',     'procedure',     'math',     '定義域・条件の無視',            16),
  ('partial_stop',       'procedure',     'math',     '途中の値で止めた',              17),
  ('wrong_target',       'misread',       'math',     '問われているものの取り違え',    18),
  -- 英語
  ('example_as_claim',   'misread',       'english',  '具体例を筆者の主張と取り違え',  30),
  ('concession_misread', 'misread',       'english',  '譲歩構文の読み落とし',          31),
  ('overgeneralization', 'misread',       'english',  '過度の一般化',                  32),
  ('outside_knowledge',  'misread',       'english',  '本文に根拠のない常識判断',      33),
  ('scope_partial',      'misread',       'english',  '一部だけ正しい選択肢を選択',    34),
  ('reference_miss',     'misread',       'english',  '指示語・照応の取り違え',        35),
  ('word_sense',         'knowledge_gap', 'english',  '語義の混同',                    36),
  ('collocation',        'knowledge_gap', 'english',  'コロケーションの誤り',          37),
  ('grammar_scope',      'knowledge_gap', 'english',  '文法規則の適用範囲の誤り',      38),
  ('verb_pattern',       'knowledge_gap', 'english',  '語法（自動詞・他動詞など）の誤り', 39),
  -- 国語（読解系タグは英語と共有し、固有のものだけ追加）
  ('opposite_polarity',  'misread',       'japanese', '肯定・否定の取り違え',          50),
  -- 全科目共通
  ('careless_select',    'careless',      null,       'マークミス・見間違い',          90),
  ('unanswered',         'timeout',       null,       '未解答',                        91);

-- ==========================================================
-- 2. questions: numeric形式の追加と、誤答値マッピング用カラム
-- ==========================================================
alter table questions drop constraint questions_format_check;
alter table questions add constraint questions_format_check
  check (format in ('mark','numeric','short','essay','proof'));

-- numeric形式の誤答値マッピング。
-- [{slot, value, error_tag, root_skill_id?, why_ja}]
alter table questions add column distractors jsonb;

-- ----------------------------------------------------------
-- CHECK制約はサブクエリを含められないため、検証はIMMUTABLE関数に切り出す
-- ----------------------------------------------------------

-- mark形式: ちょうど5つの選択肢、正答ちょうど1つ、誤答は全てerror_tagを持つ、keyは相異なる
create or replace function public.mark_choices_valid(c jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(c -> 'options') = 'array'
    and jsonb_array_length(c -> 'options') = 5
    and (
      select count(*) = 1
      from jsonb_array_elements(c -> 'options') o
      where (o ->> 'correct')::boolean is true
    )
    and (
      select count(*) = 4
      from jsonb_array_elements(c -> 'options') o
      where (o ->> 'correct')::boolean is distinct from true
        and coalesce(o ->> 'error_tag', '') <> ''
    )
    and (
      select count(distinct o ->> 'key') = 5
      from jsonb_array_elements(c -> 'options') o
    )
$$;

-- numeric形式: slotsが1つ以上あり、各slotにlabelとvalueがある
create or replace function public.numeric_answer_valid(a jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(a -> 'slots') = 'array'
    and jsonb_array_length(a -> 'slots') >= 1
    and (
      select bool_and(coalesce(s ->> 'label', '') <> '' and s ? 'value')
      from jsonb_array_elements(a -> 'slots') s
    )
$$;

alter table questions add constraint mark_requires_five_choices
  check (format <> 'mark' or public.mark_choices_valid(choices));

alter table questions add constraint numeric_requires_slots
  check (format <> 'numeric' or public.numeric_answer_valid(answer));

-- 配信可能な問題はMVPの2形式に限る（記述系が誤って配信されるのを防ぐ）
alter table questions add constraint deliverable_requires_auto_gradable_format
  check (license_status <> 'deliverable' or format in ('mark','numeric'));

-- ==========================================================
-- 3. mock_exam_items: 選択肢の表示順を模試ごとに固定する
--    AIは正答を特定の位置に置く癖があるため配信時にシャッフルするが、
--    途中保存・復帰で選択がずれないよう順序を永続化しておく。
-- ==========================================================
alter table mock_exam_items add column choice_order text[];

-- ==========================================================
-- 4. attempts: 判定済みの誤答タグを保持する
--    選択肢／誤答値から決定論的に引けるため、AI分類(attempt_diagnoses)は
--    どのパターンにも一致しなかった場合のフォールバックとして残す。
-- ==========================================================
alter table attempts add column error_tag text references error_tags(tag);
create index on attempts (error_tag) where error_tag is not null;
