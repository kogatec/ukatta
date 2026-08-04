-- review_queue は「ユーザー×スキルタグごとに1行」であるべきだが、
-- 元のmigrationにはunique制約が無かった（upsertができず、実装時に発覚）。
alter table review_queue add constraint review_queue_user_skill_unique unique (user_id, skill_tag_id);
