"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GenerateTestButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSubjects, setNeedsSubjects] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setNeedsSubjects(false);
    const res = await fetch("/api/weekly-plan/generate", { method: "POST" });
    if (!res.ok && res.status !== 409) {
      const json = await res.json().catch(() => ({}));
      const message = typeof json.error === "string" ? json.error : "テストの生成に失敗しました。";
      if (message === "target has no exam subjects" || message === "no target school registered") {
        setNeedsSubjects(true);
      } else {
        setError(message);
      }
      setLoading(false);
      return;
    }
    router.refresh();
  }

  if (needsSubjects) {
    return (
      <div>
        <p className="text-sm text-muted">受験科目がまだ設定されていません。</p>
        <Link
          href="/settings/subjects"
          className="mt-3 block w-full rounded-md bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-500"
        >
          受験科目を設定する
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "作成中…" : "今週のテストをつくる"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
