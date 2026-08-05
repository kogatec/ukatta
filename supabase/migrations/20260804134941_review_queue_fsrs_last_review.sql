-- FSRS本実装（ts-fsrs）は次回スケジュール計算に前回復習日時（last_review）を必要とする。
-- stability・difficultyは既存カラムをそのままFSRSの本来の意味で使う
-- （暫定実装ではstabilityを「直前の間隔（日数）」として流用していたが、そこから正しい意味に戻す）。
alter table review_queue add column last_review_at timestamptz;
