"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Subject {
  id: string;
  name: string;
}

interface MarkChoicesPublic {
  options: { key: string; text: string }[];
}
interface NumericSlotsPublic {
  slots: { label: string; kind?: string }[];
}

type MarkAnswerRaw = { type: "mark"; key: string | null };
type NumericAnswerRaw = { type: "numeric"; inputs: Record<string, string> };

interface PracticeQuestion {
  subject_id: string;
  subject_name: string;
  skill_tag_name: string;
  question_id: string;
  format: "mark" | "numeric";
  body_md: string;
  est_time_sec: number;
  choices: MarkChoicesPublic | NumericSlotsPublic;
}

interface AttemptResult {
  correct: boolean;
  explanation_md: string;
  why_ja: string | null;
}

export default function PracticeRunner({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ answered: 0, correct: 0 });

  async function fetchNext(chosenSubjectId: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/practice/next?subject_id=${encodeURIComponent(chosenSubjectId)}`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(
        res.status === 404
          ? `${json.subject_name ?? ""}の問題がまだありません。他の科目をお試しください。`
          : "問題の取得に失敗しました。"
      );
      setQuestion(null);
      setLoading(false);
      return;
    }
    const json: PracticeQuestion = await res.json();
    setQuestion(json);
    setLoading(false);
  }

  function handleSelectSubject(id: string) {
    setSubjectId(id);
    setStats({ answered: 0, correct: 0 });
    fetchNext(id);
  }

  function handleAnswered(correct: boolean) {
    setStats((prev) => ({ answered: prev.answered + 1, correct: prev.correct + (correct ? 1 : 0) }));
  }

  function handleNext() {
    if (subjectId) fetchNext(subjectId);
  }

  if (!subjectId) {
    return (
      <div className="flex flex-1 flex-col items-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="text-xs text-muted underline underline-offset-2">
            ← ホーム
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-foreground">演習する科目を選ぶ</h1>
          <p className="mt-1 text-sm text-muted">好きなだけ解けます。何度でもどうぞ。</p>

          <button
            type="button"
            onClick={() => handleSelectSubject("auto")}
            className="mt-6 block w-full rounded-md bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-500"
          >
            おまかせ（苦手な科目を優先）
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSubject(s.id)}
                className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:border-brand-600"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSubjectId(null);
              setQuestion(null);
            }}
            className="text-xs text-muted underline underline-offset-2"
          >
            ← 科目を変える
          </button>
          <p className="text-xs text-muted">
            {stats.correct}/{stats.answered} 問正解
          </p>
        </div>

        {loading && <p className="mt-8 text-center text-sm text-muted">読み込み中…</p>}

        {!loading && error && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => {
                setSubjectId(null);
                setQuestion(null);
              }}
              className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
            >
              科目を選び直す
            </button>
          </div>
        )}

        {!loading && !error && question && (
          <>
            <p className="mt-4 text-xs font-mono tracking-widest text-brand-600">
              {question.subject_name} ・ {question.skill_tag_name}
            </p>
            <PracticeQuestionCard key={question.question_id} question={question} onAnswered={handleAnswered} onNext={handleNext} />
          </>
        )}

        <Link
          href="/"
          className="mt-8 block text-center text-sm text-muted underline underline-offset-2"
        >
          終わってホームへ戻る
        </Link>
      </div>
    </div>
  );
}

function PracticeQuestionCard({
  question,
  onAnswered,
  onNext,
}: {
  question: PracticeQuestion;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
}) {
  const [numericInputs, setNumericInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AttemptResult | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  async function submitAnswer(answer: MarkAnswerRaw | NumericAnswerRaw, respondedAt: number) {
    if (feedback || submitting) return;
    setSubmitting(true);
    const timeSpentSec = Math.max(0, Math.round((respondedAt - startRef.current) / 1000));

    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: question.question_id,
        context: "drill",
        answer,
        time_spent_sec: timeSpentSec,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      setFeedback({ correct: json.correct, explanation_md: json.explanation_md, why_ja: json.why_ja });
      onAnswered(json.correct);
    }
    setSubmitting(false);
  }

  return (
    <>
      <div className="mt-2 rounded-md border border-line bg-surface p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{question.body_md}</p>

        {question.format === "mark" ? (
          <div className="mt-5 space-y-2">
            {(question.choices as MarkChoicesPublic).options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                disabled={!!feedback || submitting}
                onClick={() => submitAnswer({ type: "mark", key: opt.key }, Date.now())}
                className="block w-full rounded-md border border-line bg-surface px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:border-brand-600 disabled:opacity-60"
              >
                {opt.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {(question.choices as NumericSlotsPublic).slots.map((slot) => (
              <div key={slot.label} className="flex items-center gap-3">
                <label className="w-16 shrink-0 text-sm text-muted">{slot.label}</label>
                <input
                  value={numericInputs[slot.label] ?? ""}
                  disabled={!!feedback}
                  onChange={(e) => setNumericInputs((prev) => ({ ...prev, [slot.label]: e.target.value }))}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 disabled:opacity-60"
                  placeholder={slot.kind === "fraction" ? "例: 3/4" : "例: -1"}
                />
              </div>
            ))}
            {!feedback && (
              <button
                type="button"
                disabled={submitting}
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
            次の問題
          </button>
        </div>
      )}
    </>
  );
}
