"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface MarkChoicesPublic {
  options: { key: string; text: string }[];
}
interface NumericSlotsPublic {
  slots: { label: string; kind?: string }[];
}

type MarkAnswerRaw = { type: "mark"; key: string | null };
type NumericAnswerRaw = { type: "numeric"; inputs: Record<string, string> };

interface MissionItem {
  id: string;
  order_no: number;
  layer: "review" | "focus" | "maintenance";
  subject_id: string;
  question_id: string;
  format: "mark" | "numeric";
  body_md: string;
  choices: MarkChoicesPublic | NumericSlotsPublic;
  explanation_md?: string;
  answered: boolean;
  correct: boolean | null;
}

interface MissionData {
  daily_mission_id: string;
  status: "pending" | "in_progress" | "completed";
  estimated_minutes: number;
  items: MissionItem[];
}

const LAYER_LABEL: Record<MissionItem["layer"], string> = {
  review: "復習",
  focus: "今週の重点",
  maintenance: "維持",
};

interface AttemptResult {
  correct: boolean;
  explanation_md: string;
  why_ja: string | null;
}

export default function DailyMissionRunner() {
  const [mission, setMission] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/daily-mission/today");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(typeof json.error === "string" ? json.error : "今日のミッションの取得に失敗しました。");
        setLoading(false);
        return;
      }
      const json: MissionData = await res.json();
      setMission(json);
      const firstUnanswered = json.items.findIndex((i) => !i.answered);
      setIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
      setLoading(false);
    })();
  }, []);

  const currentItem = mission?.items[index] ?? null;
  const answeredCount = useMemo(() => mission?.items.filter((i) => i.answered).length ?? 0, [mission]);
  const correctCount = useMemo(() => mission?.items.filter((i) => i.correct === true).length ?? 0, [mission]);

  function handleAnswered(itemId: string, correct: boolean) {
    setMission((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, answered: true, correct } : i)) }
        : prev
    );
  }

  function goNext() {
    if (!mission) return;
    if (index < mission.items.length - 1) {
      setIndex(index + 1);
    } else {
      setMission((prev) => (prev ? { ...prev, status: "completed" } : prev));
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted">読み込み中…</div>;
  }
  if (error === "target has no exam subjects" || error === "no target school registered") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted">受験科目がまだ設定されていません。</p>
        <Link
          href="/settings/subjects"
          className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
        >
          受験科目を設定する
        </Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Link href="/" className="text-sm text-brand-600 underline underline-offset-2">
          ホームへ戻る
        </Link>
      </div>
    );
  }
  if (!mission) return null;

  if (mission.items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted">
          今日は出題できる問題がまだありません。準備が整い次第お知らせします。
        </p>
        <Link href="/" className="text-sm text-brand-600 underline underline-offset-2">
          ホームへ戻る
        </Link>
      </div>
    );
  }

  if (mission.status === "completed") {
    return (
      <div className="flex flex-1 flex-col items-center bg-background px-6 py-16 text-center">
        <div className="w-full max-w-md">
          <p className="font-mono text-xs tracking-widest text-brand-600">MISSION COMPLETE</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">お疲れさまでした</h1>
          <p className="mt-4 text-4xl font-bold text-brand-600">
            {correctCount}/{mission.items.length}
          </p>
          <p className="mt-1 text-sm text-muted">正解</p>
          <Link
            href="/practice"
            className="mt-8 block w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
          >
            もっと解く
          </Link>
          <Link
            href="/"
            className="mt-3 block text-sm text-muted underline underline-offset-2"
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono tracking-widest text-brand-600">{LAYER_LABEL[currentItem.layer]}</p>
          <p className="text-xs text-muted">
            {answeredCount}/{mission.items.length} 問
          </p>
        </div>

        <QuestionCard key={currentItem.id} item={currentItem} onAnswered={handleAnswered} onNext={goNext} />
      </div>
    </div>
  );
}

function QuestionCard({
  item,
  onAnswered,
  onNext,
}: {
  item: MissionItem;
  onAnswered: (itemId: string, correct: boolean) => void;
  onNext: () => void;
}) {
  const [numericInputs, setNumericInputs] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState(false);
  const [feedback, setFeedback] = useState<AttemptResult | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  async function submitAnswer(answer: MarkAnswerRaw | NumericAnswerRaw, respondedAt: number) {
    if (item.answered || answering) return;
    setAnswering(true);
    const timeSpentSec = Math.max(0, Math.round((respondedAt - startRef.current) / 1000));

    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: item.question_id,
        daily_mission_item_id: item.id,
        context: "drill",
        answer,
        time_spent_sec: timeSpentSec,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      setFeedback({ correct: json.correct, explanation_md: json.explanation_md, why_ja: json.why_ja });
      onAnswered(item.id, json.correct);
    }
    setAnswering(false);
  }

  return (
    <>
      <div className="mt-4 rounded-md border border-line bg-surface p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.body_md}</p>

        {item.format === "mark" ? (
          <div className="mt-5 space-y-2">
            {(item.choices as MarkChoicesPublic).options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={item.answered || answering}
                onClick={() => submitAnswer({ type: "mark", key: opt.key }, Date.now())}
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
                disabled={answering}
                onClick={() => submitAnswer({ type: "numeric", inputs: numericInputs }, Date.now())}
                className="mt-2 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
              >
                この解答で確定
              </button>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-md border p-4 text-sm ${
            feedback.correct ? "border-brand-600 bg-sky text-brand-600" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <p className="font-semibold">{feedback.correct ? "正解" : "不正解"}</p>
          {feedback.why_ja && <p className="mt-1 text-foreground">{feedback.why_ja}</p>}
          <p className="mt-2 whitespace-pre-wrap text-foreground">{feedback.explanation_md}</p>
          <button
            type="button"
            onClick={onNext}
            className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            次へ
          </button>
        </div>
      )}
    </>
  );
}
