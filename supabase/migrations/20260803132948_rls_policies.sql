-- auth.uid() -> users.id を引くヘルパー（各ポリシーの重複を避ける）
create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from users where auth_id = auth.uid()
$$;

-- =========================================================
-- 公開マスタ（誰でも読み取り可、書き込みはサーバー(service role)のみ）
-- =========================================================
alter table schools enable row level security;
alter table school_departments enable row level security;
alter table subjects enable row level security;
alter table units enable row level security;
alter table skill_tags enable row level security;
alter table past_papers enable row level security;
alter table past_paper_items enable row level security;
alter table question_tags enable row level security;

create policy "schools_public_read" on schools for select using (true);
create policy "school_departments_public_read" on school_departments for select using (true);
create policy "subjects_public_read" on subjects for select using (true);
create policy "units_public_read" on units for select using (true);
create policy "skill_tags_public_read" on skill_tags for select using (true);
create policy "past_papers_public_read" on past_papers for select using (true);
create policy "past_paper_items_public_read" on past_paper_items for select using (true);
create policy "question_tags_public_read" on question_tags for select using (true);

-- questions は配信可能なもの（license_status = 'deliverable'）のみ全員に公開
alter table questions enable row level security;
create policy "questions_deliverable_read" on questions
  for select using (license_status = 'deliverable');

-- =========================================================
-- users: 自分の行のみ
-- =========================================================
alter table users enable row level security;

create policy "users_select_own" on users
  for select using (auth_id = auth.uid());
create policy "users_insert_own" on users
  for insert with check (auth_id = auth.uid());
create policy "users_update_own" on users
  for update using (auth_id = auth.uid()) with check (auth_id = auth.uid());

-- =========================================================
-- 生徒本人が読み書きするテーブル
-- =========================================================
alter table user_targets enable row level security;
create policy "user_targets_owner_select" on user_targets for select using (user_id = public.current_user_id());
create policy "user_targets_owner_insert" on user_targets for insert with check (user_id = public.current_user_id());
create policy "user_targets_owner_update" on user_targets for update using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy "user_targets_owner_delete" on user_targets for delete using (user_id = public.current_user_id());

alter table guardians enable row level security;
create policy "guardians_owner_select" on guardians for select using (user_id = public.current_user_id());
create policy "guardians_owner_insert" on guardians for insert with check (user_id = public.current_user_id());
create policy "guardians_owner_update" on guardians for update using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy "guardians_owner_delete" on guardians for delete using (user_id = public.current_user_id());

alter table notification_prefs enable row level security;
create policy "notification_prefs_owner_select" on notification_prefs for select using (user_id = public.current_user_id());
create policy "notification_prefs_owner_insert" on notification_prefs for insert with check (user_id = public.current_user_id());
create policy "notification_prefs_owner_update" on notification_prefs for update using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());

alter table push_subscriptions enable row level security;
create policy "push_subscriptions_owner_select" on push_subscriptions for select using (user_id = public.current_user_id());
create policy "push_subscriptions_owner_insert" on push_subscriptions for insert with check (user_id = public.current_user_id());
create policy "push_subscriptions_owner_delete" on push_subscriptions for delete using (user_id = public.current_user_id());

alter table referrals enable row level security;
create policy "referrals_owner_select" on referrals for select using (inviter_id = public.current_user_id());
create policy "referrals_owner_insert" on referrals for insert with check (inviter_id = public.current_user_id());

-- =========================================================
-- 生徒本人は読み取りのみ（判定・採点・生成はサーバー(service role)が書き込む）
-- =========================================================
alter table mock_exams enable row level security;
create policy "mock_exams_owner_select" on mock_exams for select using (user_id = public.current_user_id());
create policy "mock_exams_owner_insert" on mock_exams for insert with check (user_id = public.current_user_id());

alter table mock_exam_items enable row level security;
create policy "mock_exam_items_owner_select" on mock_exam_items for select using (
  mock_exam_id in (select id from mock_exams where user_id = public.current_user_id())
);

alter table attempts enable row level security;
create policy "attempts_owner_select" on attempts for select using (user_id = public.current_user_id());
create policy "attempts_owner_insert" on attempts for insert with check (user_id = public.current_user_id());

alter table attempt_diagnoses enable row level security;
create policy "attempt_diagnoses_owner_select" on attempt_diagnoses for select using (
  attempt_id in (select id from attempts where user_id = public.current_user_id())
);

alter table mastery enable row level security;
create policy "mastery_owner_select" on mastery for select using (user_id = public.current_user_id());

alter table review_queue enable row level security;
create policy "review_queue_owner_select" on review_queue for select using (user_id = public.current_user_id());

alter table daily_reports enable row level security;
create policy "daily_reports_owner_select" on daily_reports for select using (user_id = public.current_user_id());

alter table notification_logs enable row level security;
create policy "notification_logs_owner_select" on notification_logs for select using (user_id = public.current_user_id());

alter table referral_redemptions enable row level security;
create policy "referral_redemptions_related_select" on referral_redemptions for select using (
  invitee_id = public.current_user_id()
  or referral_id in (select id from referrals where inviter_id = public.current_user_id())
);

alter table streaks enable row level security;
create policy "streaks_owner_select" on streaks for select using (user_id = public.current_user_id());
