import { z } from "zod";

// z.string().uuid() はRFC4122のバージョン/バリアントビットまで検証するが、
// Postgresのuuid型自体はその意味的検証をしない（開発用の連番シードIDも通したい）。
export const uuidLike = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "invalid uuid");

/**
 * ログイン後・メール確認後の遷移先(`?next=`)を、自サイト内のパスだけに限定する。
 *
 * 検証せずに redirect(next) すると、`/login?next=https://evil.example` のようなURLを
 * 踏ませることで、正規ドメインのログイン画面を経由して任意のサイトへ飛ばせてしまう
 * （オープンリダイレクト。フィッシングの踏み台にされる）。
 *
 * `//evil.example` や `/\evil.example` はブラウザがプロトコル相対URLとして
 * 外部ホストに解釈するため、先頭が `/` であることだけでは不十分。
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
