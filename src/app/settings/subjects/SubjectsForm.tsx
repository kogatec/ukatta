"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Subject {
  id: string;
  name: string;
}

interface ExamSubject {
  subject_id: string;
  weight_points: number;
}

export default function SubjectsForm({
  targetId,
  subjects,
  initialExamSubjects,
}: {
  targetId: string;
  subjects: Subject[];
  initialExamSubjects: ExamSubject[];
}) {
  const router = useRouter();
  const initial = new Map(initialExamSubjects.map((s) => [s.subject_id, s.weight_points]));

  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(subjects.map((s) => [s.id, initial.has(s.id)]))
  );
  const [points, setPoints] = useState<Record<string, string>>(
    Object.fromEntries(subjects.map((s) => [s.id, String(initial.get(s.id) ?? 100)]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = Object.values(selected).filter(Boolean).length;

  async function handleSubmit() {
    const examSubjects: ExamSubject[] = subjects
      .filter((s) => selected[s.id])
      .map((s) => ({ subject_id: s.id, weight_points: Number(points[s.id]) || 100 }));

    if (examSubjects.length === 0) {
      setError("1科目以上選んでください。");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/user-targets/${targetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam_subjects: examSubjects }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(typeof json.error === "string" ? json.error : "保存に失敗しました。");
      setSubmitting(false);
      return;
    }

    router.push("/weekly");
    router.refresh();
  }

  return (
    <div className="mt-8">
      <ul className="space-y-2">
        {subjects.map((s) => (
          <li
            key={s.id}
            className={`flex items-center justify-between rounded-md border px-4 py-3 ${
              selected[s.id] ? "border-brand-600 bg-sky" : "border-line bg-surface"
            }`}
          >
            <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                checked={selected[s.id] ?? false}
                onChange={(e) => setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                className="h-4 w-4"
              />
              {s.name}
            </label>
            {selected[s.id] && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={points[s.id]}
                  onChange={(e) => setPoints((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  className="w-20 rounded-md border border-line bg-surface px-2 py-1 text-right text-sm outline-none focus:border-brand-600"
                />
                <span className="text-xs text-muted">点</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        disabled={selectedCount === 0 || submitting}
        onClick={handleSubmit}
        className="mt-6 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "保存中…" : "保存する"}
      </button>
    </div>
  );
}
