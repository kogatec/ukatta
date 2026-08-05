import type { NextConfig } from "next";

// 成績・志望校という要配慮性の高い情報を、大半が未成年の利用者について扱う（DESIGN.md §13）。
// 最低限のセキュリティヘッダを全レスポンスに付ける。
const securityHeaders = [
  // HTTPSへの固定。Vercelは常時HTTPSなので副作用がない。
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // 他サイトのiframeに埋め込ませない（クリックジャッキング対策）
  { key: "X-Frame-Options", value: "DENY" },
  // Content-Typeの推測を禁止
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 外部サイトへ遷移する際に、URLのパス（志望校IDなどを含みうる）を渡さない
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 使わない端末機能は明示的に閉じる
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
