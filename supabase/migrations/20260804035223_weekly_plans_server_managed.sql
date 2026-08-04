-- weekly_plansの生成は常にサーバー側ロジック（科目ローテーション・週次分析）が担うため、
-- weekly_plan_subjects等の他テーブルと同様に「本人insert不可・select読み取りのみ」に揃える。
drop policy "weekly_plans_owner_insert" on weekly_plans;
