/**
 * 確認メールのリンクなど、外部に出す絶対URLの基点。
 *
 * Hostヘッダから組み立てるのは避ける。攻撃者が `Host: evil.example` を送ると、
 * 確認トークン付きのリンクが攻撃者のドメインを指すメールを、正規の送信元から
 * 被害者に送れてしまうため（Host header injection）。
 *
 * 優先順位:
 *   1. NEXT_PUBLIC_APP_URL … 明示設定（本番ではこれを設定する）
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL … Vercelが注入する信頼できる値。
 *      独自ドメインを取る前でも *.vercel.app で正しく動くようにするための保険
 *   3. localhost … ローカル開発
 */
export function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return "http://localhost:3000";
}
