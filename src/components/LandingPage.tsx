import Link from "next/link";

const PRIMARY = "#1A56DB";
const ACCENT = "#00B8D9";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M7 12.5l3 3 7-7" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor" />
    </svg>
  );
}

function IconBook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5v-13z"
        fill="currentColor"
        opacity="0.85"
      />
      <path
        d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5v-13z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.2" fill="currentColor" />
      <circle cx="16.5" cy="10" r="2.6" fill="currentColor" opacity="0.6" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="currentColor" />
      <path d="M14.5 14.3c2.6.4 4.5 2.5 4.5 5.2v.5h-3" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: IconSparkle,
    title: "AI完全個別カリキュラム",
    body: "志望校と現在の学力を分析。あなただけの「今日やるべきこと」を毎日自動で生成します。",
  },
  {
    icon: IconBolt,
    title: "アプリ不要のサクサクWeb設計",
    body: "スマホブラウザからサクサク動くWebベース。ホーム画面に追加すれば、アプリのようにワンタップで起動できます。",
  },
  {
    icon: IconBook,
    title: "良問厳選ドリル",
    body: "過去の入試データを徹底解析。出題率の高い問題だけに絞り込み、無駄な勉強時間を大幅に削減します。",
  },
  {
    icon: IconUsers,
    title: "保護者見守り機能",
    body: "保護者用のアカウントから、日々の学習履歴や達成度をチェック可能。頑張りを共有し、家族全員で合格をサポートします。",
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1 bg-white text-gray-800 antialiased">
      {/* ヘッダー */}
      <header className="fixed z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-2xl font-black tracking-tighter" style={{ color: PRIMARY }}>
            <LogoMark className="h-6 w-6" />
            UKATTA
          </div>
          <div className="hidden gap-6 text-sm font-bold text-gray-600 md:flex">
            <a href="#features" className="transition hover:text-[#1A56DB]">
              特徴
            </a>
            <a href="#voice" className="transition hover:text-[#1A56DB]">
              合格者の声
            </a>
          </div>
          <Link
            href="/signup"
            className="rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
          >
            無料ではじめる
          </Link>
        </div>
      </header>

      {/* ヒーロー */}
      <section
        className="px-4 pb-20 pt-32"
        style={{ background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 md:flex-row">
          <div className="flex-1 text-center md:text-left">
            <span
              className="mb-4 inline-block rounded-full px-3 py-1 text-sm font-bold"
              style={{ backgroundColor: "#dbeafe", color: PRIMARY }}
            >
              高校生向け 大学入試特化型Webアプリ
            </span>
            <h1 className="mb-6 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
              君の<span style={{ color: PRIMARY }}>「受かった！」</span>を、
              <br />
              最短距離で。
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-gray-600">
              ストア審査なしですぐに使えるWebサービス。
              <br />
              過去問の出題傾向とAIが、あなただけの学習カリキュラムを自動生成。
              <br />
              スマホのホーム画面に追加して、今すぐ勉強をスタートしよう。
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
              <Link
                href="/signup"
                className="rounded-full px-8 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5"
                style={{ backgroundColor: PRIMARY }}
              >
                無料ではじめる
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 px-8 py-4 text-center text-lg font-bold text-gray-700 shadow transition hover:border-[#1A56DB]"
              >
                すでにアカウントをお持ちの方
              </Link>
            </div>
          </div>

          <div className="relative w-full flex-1">
            <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[2.5rem] border-8 border-gray-100 bg-white shadow-2xl">
              <div className="flex h-8 items-center justify-center border-b bg-gray-100">
                <div className="h-1.5 w-16 rounded-full bg-gray-300" />
              </div>
              <div className="h-[450px] overflow-y-auto bg-blue-50 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold" style={{ color: PRIMARY }}>
                    今日のタスク
                  </h3>
                  <span
                    className="rounded-full px-2 py-1 text-xs font-bold"
                    style={{ backgroundColor: "#dbeafe", color: PRIMARY }}
                  >
                    達成度 80%
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border-l-4 bg-white p-4 shadow-sm" style={{ borderColor: PRIMARY }}>
                    <p className="mb-1 text-xs text-gray-500">英語</p>
                    <p className="text-sm font-bold">長文読解ドリル Level.4</p>
                  </div>
                  <div className="rounded-xl border-l-4 bg-white p-4 shadow-sm" style={{ borderColor: PRIMARY }}>
                    <p className="mb-1 text-xs text-gray-500">数学</p>
                    <p className="text-sm font-bold">微分積分 基礎固め</p>
                  </div>
                  <div className="rounded-xl border-l-4 border-gray-300 bg-gray-100 p-4 opacity-60 shadow-sm">
                    <p className="mb-1 text-xs text-gray-500">古文</p>
                    <p className="text-sm font-bold text-gray-400 line-through">単語テスト 50問</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 flex w-full justify-around border-t bg-white py-3 text-xs text-gray-400">
                <div className="flex flex-col items-center" style={{ color: PRIMARY }}>
                  ホーム
                </div>
                <div className="flex flex-col items-center">レポート</div>
                <div className="flex flex-col items-center">マイページ</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴 */}
      <section id="features" className="bg-white px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-black md:text-4xl">
              UKATTAが選ばれる<span style={{ color: PRIMARY }}>4つ</span>の理由
            </h2>
            <p className="text-gray-600">入試を突破するための機能がすべてWebで完結します。</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-gray-50 p-8 transition duration-300 hover:shadow-lg">
                <div
                  className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "#dbeafe", color: PRIMARY }}
                >
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 text-xl font-bold">{f.title}</h3>
                <p className="text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 合格者の声 */}
      <section id="voice" className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-black">先輩たちの「受かった！」の声</h2>
          <p className="mb-12 text-xs text-gray-400">※ サービスの利用イメージを伝えるための例です</p>
          <div className="relative rounded-2xl bg-white p-8 text-left shadow-sm">
            <p className="relative z-10 pl-6 pt-4 text-lg leading-relaxed text-gray-700">
              「UKATTAのおかげで、迷うことなく勉強に集中できました。学習履歴がグラフで見えるのでモチベーションが続きましたし、親も進捗を見て応援してくれたのが嬉しかったです。」
            </p>
            <div className="mt-6 pl-6 text-sm font-bold text-gray-500">高校3年生・UKATTA体験ユーザーの声（例）</div>
          </div>
        </div>
      </section>

      {/* 最終CTA */}
      <section id="cta" className="px-4 py-20 text-center text-white" style={{ backgroundColor: PRIMARY }}>
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-black md:text-5xl">さあ、次はあなたの番です。</h2>
          <p className="mb-10 text-lg text-blue-100">メールアドレスとパスワードだけで、今すぐ無料ではじめられます。</p>
          <Link
            href="/signup"
            className="inline-block rounded-full px-12 py-4 text-xl font-black shadow-xl transition hover:scale-105"
            style={{ backgroundColor: "#ffffff", color: PRIMARY }}
          >
            今すぐ無料ではじめる
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 px-4 py-10 text-center text-sm text-gray-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter text-white">
            <LogoMark className="h-5 w-5" />
            UKATTA
          </div>
          <p>中学生・高校生・既卒生向け受験対策アプリ</p>
        </div>
      </footer>
    </div>
  );
}
