"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AnalyzeButton({ weeklyPlanId }: { weeklyPlanId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/weekly-plan/${weeklyPlanId}/analyze`, { method: "POST" });
    if (!res.ok && res.status !== 409) {
      const json = await res.json().catch(() => ({}));
      setError(typeof json.error === "string" ? json.error : "分析に失敗しました。");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "分析中…" : "分析して来週の目標を決める"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
