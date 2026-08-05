"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface MarkChoicesPublic {
  options: { key: string; text: string }[];
}
interface NumericSlotsPublic {
  slots: { label: string; kind?: string }[];
}

type MarkAnswerRaw = { type: "mark"; key: string | null };
type NumericAnswerRaw = { type: "numeric"; inputs: Record<string, string> };

interface ExamItem {
  id: string;
  order_no: number;
  question_id: string;
  points: number;
  format: "mark" | "numeric";
  body_md: string;
  choices: MarkChoicesPublic | NumericSlotsPublic;
  answered: boolean;
  your_answer: MarkAnswerRaw | NumericAnswerRaw | null;
}

interface ExamData {
  id: string;
  title: string;
  status: string;
  time_limit_min: number;
  started_at: string | null;
  submitted_at: string | null;
  items: ExamItem[];
}

function formatClock(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function TestRunner({ mockExamId }: { mockExamId: string }) {
  const router = useRouter();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/mock-exams/${mockExamId}`);
      if (cancelled) return;
      if (!res.ok) {
        setError("模試の取得に失敗しました。");
        setLoading(false);
        return;
      }
      const json: ExamData = await res.json();
      setExam(json);
      const firstUnanswered = json.items.findIndex((i) => !i.answered);
      setIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mockExamId]);

  const currentItem = exam?.items[index] ?? null;

  const finishExam = useCallback(
    async (current: ExamData) => {
      const unanswered = current.items.filter((i) => !i.answered);
      for (const item of unanswered) {
        const blankAnswer: MarkAnswerRaw | NumericAnswerRaw =
          item.format === "mark" ? { type: "mark", key: null } : { type: "numeric", inputs: {} };
        await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: item.question_id,
            mock_item_id: item.id,
            context: "mock",
            answer: blankAnswer,
            time_spent_sec: 0,
          }),
        }).catch(() => null);
      }

      const res = await fetch(`/api/mock-exams/${mockExamId}/submit`, { method: "POST" });
      if (res.ok || res.status === 409) {
        router.push("/weekly");
        return;
      }
      setFinishing(false);
      setError("提出に失敗しました。もう一度お試しください。");
    },
    [mockExamId, router]
  );

  const triggerFinish = useCallback(() => {
    if (!exam || finished) return;
    setFinished(true);
    setFinishing(true);
    finishExam(exam);
  }, [exam, finished, finishExam]);

  // タイマー: started_at + time_limit_min を締切に、毎秒残り時間を再計算する
  useEffect(() => {
    if (!exam?.started_at || exam.status === "graded" || exam.status === "submitted") return;
    const deadline = new Date(exam.started_at).getTime() + exam.time_limit_min * 60_000;

    const tick = () => {
      const sec = Math.round((deadline - Date.now()) / 1000);
      setRemainingSec(sec);
      if (sec <= 0) {
        triggerFinish();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [exam?.started_at, exam?.status, exam?.time_limit_min, triggerFinish]);

  const answeredCount = useMemo(() => exam?.items.filter((i) => i.answered).length ?? 0, [exam]);

  async function recordAnswer(item: ExamItem, answer: MarkAnswerRaw | NumericAnswerRaw, timeSpentSec: number) {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: item.question_id,
        mock_item_id: item.id,
        context: "mock",
        answer,
        time_spent_sec: timeSpentSec,
      }),
    });

    if (res.ok) {
      setExam((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) => (i.id === item.id ? { ...i, answered: true, your_answer: answer } : i)),
            }
          : prev
      );
    }
  }

  function handleFinishClick() {
    if (!exam || finished) return;
    const remaining = exam.items.filter((i) => !i.answered).length;
    if (remaining > 0) {
      const ok = window.confirm(`未回答が${remaining}問あります。このまま提出しますか？`);
      if (!ok) return;
    }
    triggerFinish();
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted">読み込み中…</div>;
  }
  if (error && !exam) {
    return <div className="flex flex-1 items-center justify-center text-sm text-red-700">{error}</div>;
  }
  if (!exam) return null;

  if (exam.status === "graded" || exam.status === "submitted") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-16 text-center">
        <p className="text-sm text-muted">この科目は提出済みです。</p>
        <Link href="/weekly" className="mt-4 text-sm text-brand-600 underline underline-offset-2">
          今週の目標へ戻る
        </Link>
      </div>
    );
  }

  if (exam.items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted">この科目はまだ問題の準備ができていません。しばらくしてから開いてください。</p>
        <Link href="/weekly" className="text-sm text-brand-600 underline underline-offset-2">
          今週の目標へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{exam.title}</p>
          <p
            className={`font-mono text-sm font-bold ${
              remainingSec !== null && remainingSec < 60 ? "text-red-600" : "text-brand-600"
            }`}
          >
            {remainingSec !== null ? formatClock(remainingSec) : "--:--"}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted">
            {answeredCount}/{exam.items.length} 問回答済み
          </p>
          <button
            type="button"
            disabled={finishing}
            onClick={handleFinishClick}
            className="text-xs text-brand-600 underline underline-offset-2 disabled:opacity-40"
          >
            {finishing ? "提出中…" : "ここで提出する"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {exam.items.map((i, idx) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setIndex(idx)}
              className={`h-8 w-8 rounded-md text-xs font-semibold transition-colors ${
                idx === index
                  ? "border-2 border-brand-600 text-brand-600"
                  : i.answered
                    ? "bg-brand-600 text-white"
                    : "border border-line bg-surface text-muted"
              }`}
            >
              {i.order_no}
            </button>
          ))}
        </div>

        {currentItem && (
          <TestQuestionCard
            key={currentItem.id}
            item={currentItem}
            onSubmit={(answer, timeSpentSec) => recordAnswer(currentItem, answer, timeSpentSec)}
          />
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="flex-1 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-40"
          >
            前の問題
          </button>
          {index < exam.items.length - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(exam.items.length - 1, i + 1))}
              className="flex-1 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              次の問題
            </button>
          ) : (
            <button
              type="button"
              disabled={finishing}
              onClick={handleFinishClick}
              className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
            >
              {finishing ? "提出中…" : "提出する"}
            </button>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

function TestQuestionCard({
  item,
  onSubmit,
}: {
  item: ExamItem;
  onSubmit: (answer: MarkAnswerRaw | NumericAnswerRaw, timeSpentSec: number) => Promise<void>;
}) {
  const [numericInputs, setNumericInputs] = useState<Record<string, string>>(() =>
    item.your_answer?.type === "numeric" ? item.your_answer.inputs : {}
  );
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  async function handleSubmit(answer: MarkAnswerRaw | NumericAnswerRaw, respondedAt: number) {
    if (item.answered || submitting) return;
    setSubmitting(true);
    const timeSpentSec = Math.max(0, Math.round((respondedAt - startRef.current) / 1000));
    await onSubmit(answer, timeSpentSec);
    setSubmitting(false);
  }

  return (
    <div className="mt-6 rounded-md border border-line bg-surface p-6">
      <p className="text-xs font-mono tracking-widest text-muted">問{item.order_no}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.body_md}</p>

      {item.format === "mark" ? (
        <div className="mt-5 space-y-2">
          {(item.choices as MarkChoicesPublic).options.map((opt) => {
            const selected = item.your_answer?.type === "mark" && item.your_answer.key === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={item.answered || submitting}
                onClick={() => handleSubmit({ type: "mark", key: opt.key }, Date.now())}
                className={`block w-full rounded-md border px-4 py-2.5 text-left text-sm transition-colors ${
                  selected
                    ? "border-brand-600 bg-sky text-brand-600"
                    : "border-line bg-surface text-foreground disabled:opacity-60"
                } ${!item.answered && !submitting ? "hover:border-brand-600" : ""}`}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {(item.choices as NumericSlotsPublic).slots.map((slot) => (
            <div key={slot.label} className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm text-muted">{slot.label}</label>
              <input
                value={numericInputs[slot.label] ?? ""}
                disabled={item.answered}
                onChange={(e) => setNumericInputs((prev) => ({ ...prev, [slot.label]: e.target.value }))}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 disabled:opacity-60"
                placeholder={slot.kind === "fraction" ? "例: 3/4" : "例: -1"}
              />
            </div>
          ))}
          {!item.answered && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit({ type: "numeric", inputs: numericInputs }, Date.now())}
              className="mt-2 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
            >
              この解答で確定
            </button>
          )}
          {item.answered && <p className="text-xs text-muted">解答済みです</p>}
        </div>
      )}
    </div>
  );
}
