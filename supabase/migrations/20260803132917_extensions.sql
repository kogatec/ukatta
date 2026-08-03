-- 必要な拡張機能を有効化
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- 学校名のあいまい検索
create extension if not exists vector;     -- questions.embedding の類題検索
