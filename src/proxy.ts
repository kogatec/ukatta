import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 で `middleware.ts` は `proxy.ts` にリネームされた。
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // offline.html はService Workerがオフライン時に出す静的ページなので、
    // 認証ガードを通すと（/loginへリダイレクトされて）キャッシュできない。
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
