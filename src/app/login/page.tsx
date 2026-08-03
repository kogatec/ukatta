import Link from "next/link";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs tracking-widest text-brand-600">UKATTA</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">ログイン</h1>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <form action={signIn} className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          <div>
            <label className="block text-sm text-muted" htmlFor="email">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600"
            />
          </div>
          <div>
            <label className="block text-sm text-muted" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            ログイン
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="text-brand-600 underline underline-offset-2">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
