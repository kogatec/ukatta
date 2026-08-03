import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service role key を使う、RLSをバイパスするサーバー専用クライアント。
// 模試生成パイプライン・採点・通知Cron・保護者トークン照合など、
// 生徒本人以外(サーバー側ジョブ)がデータを書き込む処理でのみ使用する。
// ブラウザや Route Handler のレスポンス経路に絶対に鍵を露出させないこと。
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
