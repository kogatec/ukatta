"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface MarkChoicesPublic {
  options: { key: string; text: string }[];
}
interface NumericSlotsPublic {
  slots: { label: string; kind?: string }[];
}

type MarkAnswerRaw = { type: "mark"; key: string | null };
type NumericAnswerRaw = { type: "numeric"; inputs: Record<string, string> };

interface DiagItem {
  order_no: number;
  question_id: string;
  format: "mark" | "numeric";
  body_md: string;
  choices: MarkChoicesPublic | NumericSlotsPublic;
  answered: boolean;
  your_answer: MarkAnswerRaw | NumericAnswerRaw | null;
}

interface DiagSubject {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  items: DiagItem[];
  answered_count: number;
  correct_count: number;
}

interface DiagData {
  subjects: DiagSubject[];
  total_items: number;
  total_answered: number;
  completed: boolean;
}

export default function DiagnosticRunner() {
  const router = useRouter();
  const [data, setData] = useState<DiagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/diagnostic");
      if (!res.ok) {
        setError("診断テストの取得に失敗しました。");
        setLoading(false);
        return;
      }
      const json: DiagData = await res.json();
      setData(json);
      // 最初の未回答教科・設問を探して再開位置にする
      outer: for (let si = 0; si < json.subjects.length; si++) {
        for (let ii = 0; ii < json.subjects[si].items.length; ii++) {
          if (!json.subjects[si].items[ii].answered) {
            setSubjectIndex(si);
            setItemIndex(ii);
            break outer;
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const currentSubject = data?.subjects[subjectIndex] ?? null;
  const currentItem = currentSubject?.items[itemIndex] ?? null;

  async function recordAnswer(item: DiagItem, answer: MarkAnswerRaw | NumericAnswerRaw, timeSpentSec: number) {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: item.question_id,
        context: "diagnostic",
        answer,
        time_spent_sec: timeSpentSec,
      }),
    });
    if (!res.ok) return;
    const json = await res.json();

    setData((prev) => {
      if (!prev) return prev;
      const subjects = prev.subjects.map((s) => {
        if (s.subject_id !== currentSubject?.subject_id) return s;
        return {
          ...s,
          items: s.items.map((i) => (i.question_id === item.question_id ? { ...i, answered: true, your_answer: answer } : i)),
          answered_count: s.answered_count + 1,
          correct_count: s.correct_count + (json.correct ? 1 : 0),
        };
      });
      const totalAnswered = prev.total_answered + 1;
      return { ...prev, subjects, total_answered: totalAnswered, completed: totalAnswered === prev.total_items };
    });

    // 次の設問へ（教科をまたぐ場合は教科indexも進める）
    if (currentSubject && itemIndex < currentSubject.items.length - 1) {
      setItemIndex(itemIndex + 1);
    } else if (data && subjectIndex < data.subjects.length - 1) {
      setSubjectIndex(subjectIndex + 1);
      setItemIndex(0);
    }
  }

  const totalItems = data?.total_items ?? 0;
  const totalAnswered = data?.total_answered ?? 0;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted">読み込み中…</div>;
  }
  if (error) {
    return <div className="flex flex-1 items-center justify-center text-sm text-red-700">{error}</div>;
  }
  if (!data) return null;

  if (data.completed) {
    return <DiagnosticResults data={data} onFinish={() => router.push("/")} />;
  }

  if (totalItems === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted">まだ診断テストに使える問題がありません。準備が整い次第お知らせします。</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
        >
          ホームへ
        </button>
      </div>
    );
  }

  if (!currentSubject || !currentItem) return null;

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-8">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs tracking-widest text-brand-600">はじめての実力診断</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-lg font-bold text-foreground">{currentSubject.subject_name}</p>
          <p className="text-xs text-muted">全体 {totalAnswered}/{totalItems} 問</p>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-sky">
          <div
            className="h-1.5 rounded-full bg-brand-600 transition-all"
            style={{ width: `${totalItems > 0 ? (totalAnswered / totalItems) * 100 : 0}%` }}
          />
        </div>

        <DiagnosticQuestionCard
          key={currentItem.question_id}
          item={currentItem}
          onSubmit={(answer, timeSpentSec) => recordAnswer(currentItem, answer, timeSpentSec)}
        />
      </div>
    </div>
  );
}

function DiagnosticQuestionCard({
  item,
  onSubmit,
}: {
  item: DiagItem;
  onSubmit: (answer: MarkAnswerRaw | NumericAnswerRaw, timeSpentSec: number) => Promise<void>;
}) {
  const [numericInputs, setNumericInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  async function handleSubmit(answer: MarkAnswerRaw | NumericAnswerRaw, respondedAt: number) {
    if (submitting) return;
    setSubmitting(true);
    const timeSpentSec = Math.max(0, Math.round((respondedAt - startRef.current) / 1000));
    await onSubmit(answer, timeSpentSec);
    setSubmitting(false);
  }

  return (
    <div className="mt-6 rounded-md border border-line bg-surface p-6">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.body_md}</p>

      {item.format === "mark" ? (
        <div className="mt-5 space-y-2">
          {(item.choices as MarkChoicesPublic).options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit({ type: "mark", key: opt.key }, Date.now())}
              className="block w-full rounded-md border border-line bg-surface px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:border-brand-600 disabled:opacity-60"
            >
              {opt.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {(item.choices as NumericSlotsPublic).slots.map((slot) => (
            <div key={slot.label} className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm text-muted">{slot.label}</label>
              <input
                value={numericInputs[slot.label] ?? ""}
                onChange={(e) => setNumericInputs((prev) => ({ ...prev, [slot.label]: e.target.value }))}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600"
                placeholder={slot.kind === "fraction" ? "例: 3/4" : "例: -1"}
              />
            </div>
          ))}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit({ type: "numeric", inputs: numericInputs }, Date.now())}
            className="mt-2 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
          >
            この解答で確定
          </button>
        </div>
      )}
    </div>
  );
}

function DiagnosticResults({ data, onFinish }: { data: DiagData; onFinish: () => void }) {
  const totalCorrect = useMemo(() => data.subjects.reduce((sum, s) => sum + s.correct_count, 0), [data]);

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs tracking-widest text-brand-600">診断結果</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">お疲れさまでした</h1>
        <p className="mt-4 text-4xl font-bold text-brand-600">
          {totalCorrect}/{data.total_items}
        </p>
        <p className="mt-1 text-sm text-muted">総合正解数</p>

        <div className="mt-8 rounded-md border border-line bg-surface p-6">
          <ul className="space-y-3">
            {data.subjects.map((s) => {
              const pct = s.items.length > 0 ? Math.round((s.correct_count / s.items.length) * 100) : 0;
              return (
                <li key={s.subject_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{s.subject_name}</span>
                    <span className="text-muted">
                      {s.correct_count}/{s.items.length}問（{pct}%）
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-sky">
                    <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-4 text-sm text-muted">
          この結果をもとに、今日から取り組む内容を決めました。ホームから始められます。
        </p>

        <button
          type="button"
          onClick={onFinish}
          className="mt-6 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
        >
          ホームへ
        </button>
      </div>
    </div>
  );
}
