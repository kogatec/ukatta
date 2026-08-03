import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Components / Route Handlers から使う、ユーザーセッション付きのSupabaseクライアント。
// RLSがそのまま効くため、生徒本人のデータ操作はこちらを優先して使う。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からは cookies を書き換えられない。
            // セッションのリフレッシュは proxy.ts が担当するためここでは無視する。
          }
        },
      },
    }
  );
}
