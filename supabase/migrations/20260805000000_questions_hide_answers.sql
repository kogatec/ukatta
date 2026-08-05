-- 問題の正答が誰でも読めてしまう穴を塞ぐ。
--
-- 旧ポリシー questions_deliverable_read は「license_status = 'deliverable' の行は全員select可」
-- としていたが、RLSは行単位でしか効かないため answer / explanation_md / choices(correct付き) /
-- distractors といった列まで公開されていた。
-- anon key はブラウザに配布される公開鍵なので、未ログインでも
--   GET /rest/v1/questions?select=answer&license_status=eq.deliverable
-- で全問の正答が抜けてしまう（実測で確認済み）。
--
-- アプリ側は publicView.ts で正答を落としてから返しているが、DBを直接叩かれると
-- その防御は迂回される。「週次テストで実力を測る」という前提が崩れるため、
-- questions への直接読み取りは廃止し、サーバー(service role)経由に一本化する。
--
-- 参照側は以下に修正済み（いずれもサーバー実行で、正答は publicChoices で落としてから返す）:
--   - src/app/api/attempts/route.ts        採点
--   - src/app/api/mock-exams/[id]/route.ts 受験画面
--   - src/lib/diagnostic.ts                 診断テストの進捗判定
--   （daily-mission / practice / weekly-plan / diagnostic のAPIは元からservice role）
--
-- service role は RLS をバイパスするため、ポリシーを消しても上記は動作する。

drop policy if exists "questions_deliverable_read" on questions;

-- RLS有効かつselectポリシー無し = anon / authenticated は1行も読めない。
-- 将来「問題文だけは公開したい」となった場合も、answer列を含むこのテーブルを直接開けず、
-- 必要な列だけのビューを作って公開すること。
