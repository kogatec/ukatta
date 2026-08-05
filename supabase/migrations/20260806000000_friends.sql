-- フレンド機能（軽量版・2026-08-06の合意事項）
--
-- 「ユーザー名で友達を追加し、承諾後は連続学習日数を見合える」機能を追加する。
-- 未成年ユーザーの成績は要配慮性が高い（DESIGN.md §13）ため:
--   - 相互承認制（片方向で見えることは絶対にない）
--   - 見せる情報は最小限（連続学習日数と表示名だけ。得点・志望校は見せない）
--   - 検索は「完全一致のusernameを指定した場合だけ返す」（総当たり収集を許さない）

-- ============================================================
-- 1. users にフレンド用の識別子(username)を追加
-- ============================================================
-- 既存ユーザーは NULL 可（後から /settings で設定できる）。新規はオンボで必須にする。
-- 記号・空白の混入を防ぎ、パスの一部として使っても事故らない形式に限定。
alter table users add column username text unique;
alter table users add constraint users_username_format
  check (username is null or username ~ '^[a-zA-Z0-9_]{3,20}$');
-- 大文字小文字を無視した一意性のためのfunctional index
create unique index users_username_lower_uniq on users (lower(username)) where username is not null;

-- ============================================================
-- 2. friendships テーブル
-- ============================================================
-- (user_a_id, user_b_id) は常に UUID の小さい方をAに正規化して保存する。
-- こうすると (A→B) と (B→A) の重複、および「片方向だけ承諾」というありえない状態を
-- 構造的に持てない。DBだけ見て「AとBは友達か」が一意に判定できる。
create table friendships (
  id                    uuid primary key default gen_random_uuid(),
  user_a_id             uuid not null references users(id) on delete cascade,
  user_b_id             uuid not null references users(id) on delete cascade,
  requested_by_user_id  uuid not null references users(id) on delete cascade,
  status                text not null default 'pending'
                        check (status in ('pending','accepted','declined')),
  requested_at          timestamptz not null default now(),
  responded_at          timestamptz,
  check (user_a_id < user_b_id),
  check (requested_by_user_id in (user_a_id, user_b_id)),
  unique (user_a_id, user_b_id)
);
create index on friendships (user_a_id, status);
create index on friendships (user_b_id, status);

-- ============================================================
-- 3. RLS
-- ============================================================
alter table friendships enable row level security;

-- 自分が関わるレコードだけ見える
create policy "friendships_participant_select" on friendships
  for select using (
    user_a_id = public.current_user_id() or user_b_id = public.current_user_id()
  );

-- 申請の作成は「自分が申請者である」場合のみ許可
-- （UUID大小の正規化はサーバー側でやる。ここでは requested_by = 本人 だけ担保）
create policy "friendships_requester_insert" on friendships
  for insert with check (
    requested_by_user_id = public.current_user_id()
    and (user_a_id = public.current_user_id() or user_b_id = public.current_user_id())
  );

-- 承諾/拒否できるのは「相手側」のみ（自分が出した申請を自分で承諾できない）
create policy "friendships_respondent_update" on friendships
  for update using (
    (user_a_id = public.current_user_id() or user_b_id = public.current_user_id())
    and requested_by_user_id <> public.current_user_id()
  ) with check (
    (user_a_id = public.current_user_id() or user_b_id = public.current_user_id())
    and requested_by_user_id <> public.current_user_id()
  );

-- 削除（＝フレンド解除・申請取り下げ）は当事者いずれか
create policy "friendships_participant_delete" on friendships
  for delete using (
    user_a_id = public.current_user_id() or user_b_id = public.current_user_id()
  );

-- ============================================================
-- 4. 承諾済みフレンドの限定的な公開
-- ============================================================
-- 承諾済みフレンドの users 行（display_name, username 等の識別に必要な列だけ）を
-- 読み取れるようにする。RLSは列単位で絞れないため、users全列が見えてしまう点は
-- 割り切る（grade_level, exam_track, exam_date, is_minor が見える）。
-- 得点・志望校リスト・弱点などの本丸データは別テーブルで管理されており、
-- そちらのRLSは owner-only のまま変更しない。
create policy "users_friend_select" on users
  for select using (
    id in (
      select case
        when user_a_id = public.current_user_id() then user_b_id
        else user_a_id
      end
      from friendships
      where status = 'accepted'
        and (user_a_id = public.current_user_id() or user_b_id = public.current_user_id())
    )
  );

-- 承諾済みフレンドの streaks（連続学習日数）だけ見えるようにする。
-- 追加ポリシーはOR結合になるため、owner_selectはそのまま残しておいてよい。
create policy "streaks_friend_select" on streaks
  for select using (
    user_id in (
      select case
        when user_a_id = public.current_user_id() then user_b_id
        else user_a_id
      end
      from friendships
      where status = 'accepted'
        and (user_a_id = public.current_user_id() or user_b_id = public.current_user_id())
    )
  );
