// 復習キューのスケジューラ（ts-fsrs による本実装）。
//
// FSRS（Free Spaced Repetition Scheduler）は記憶を stability（安定性）・difficulty（難易度）の
// 2変数でモデル化し、想起確率から次回復習日を計算する。本アプリは日次サイクルでしか
// 復習を提示しない（1日に何度も出題し直すことはない）ため、FSRSの短期学習ステップ
// （分単位での再提示を前提にした機能）は無効化し、長期スケジューリングのみを使う
// （有効にすると「10分後に再提示」のような、実際には来ないタイミングの間隔が
//   計算されてしまい、かえって精度が落ちる）。
//
// 採点は決定論的な正誤のみのため、FSRSの4段階評価（Again/Hard/Good/Easy）は
// 正解→Good、誤答→Again の2値に単純化する。

import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card, type CardInput } from "ts-fsrs";

const scheduler = fsrs(generatorParameters({ enable_short_term: false, enable_fuzz: false }));

export type ReviewState = "new" | "learning" | "review" | "relearning" | "suspended";

export interface ReviewQueueState {
  dueAt: Date;
  state: ReviewState;
  /** FSRSの安定性（想起確率90%を保てる日数の目安）。新規時は0。 */
  stability: number;
  /** FSRSの難易度（1〜10、値が大きいほど覚えにくい）。新規時は0。 */
  difficulty: number;
  reps: number;
  lapses: number;
  lastReviewAt: Date | null;
}

const TO_APP_STATE: Record<number, ReviewState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

const TO_FSRS_STATE: Record<Exclude<ReviewState, "suspended">, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

function toCardInput(current: ReviewQueueState): CardInput {
  return {
    due: current.dueAt,
    stability: current.stability,
    difficulty: current.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: current.reps,
    lapses: current.lapses,
    // "suspended" はアプリ側の運用状態（出題対象から外す）であり、FSRS自体には無い概念。
    // 記憶モデルとしては直前の実効状態を "review" として引き継ぐ。
    state: TO_FSRS_STATE[current.state === "suspended" ? "review" : current.state],
    last_review: current.lastReviewAt ?? undefined,
  };
}

/**
 * 解答結果から次回の復習キュー状態を計算する。
 * @param current 既存のキュー状態。まだキューに無ければ null。
 * @param correct 正誤（正解→Good、誤答→Again として扱う）
 * @param now 基準時刻（テスト容易性のため注入可能にする）
 */
export function nextReviewState(
  current: ReviewQueueState | null,
  correct: boolean,
  now: Date = new Date()
): ReviewQueueState {
  const card: CardInput | Card = current ? toCardInput(current) : createEmptyCard(now);
  const grade = correct ? Rating.Good : Rating.Again;
  const { card: nextCard } = scheduler.next(card, now, grade);

  return {
    dueAt: nextCard.due,
    state: TO_APP_STATE[nextCard.state],
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    lastReviewAt: nextCard.last_review ?? now,
  };
}

/**
 * DESIGN.md §7.2: 入試までの残り日数が少ないほど、復習間隔の上限を圧縮する。
 *   残り30日を切った単元: 間隔上限を7日にクランプ
 *   残り7日: 毎日1問総ざらい（呼び出し側でdue_at<=todayを強制する）
 */
export function compressIntervalForExamProximity(intervalDays: number, daysUntilExam: number): number {
  if (daysUntilExam <= 7) return 1;
  if (daysUntilExam <= 30) return Math.min(intervalDays, 7);
  return intervalDays;
}

/**
 * compressIntervalForExamProximity を dueAt に適用するヘルパー。
 * FSRSが計算した本来の間隔（記憶の安定性に基づく最適な復習日）とは独立に、
 * 「試験が近いから早めに復習させる」という運用上の上書きとして日付だけを縮める
 * （stability/difficulty自体は書き換えない＝記憶モデルの推定精度は保つ）。
 */
export function applyExamProximityCompression(dueAt: Date, now: Date, daysUntilExam: number | null): Date {
  if (daysUntilExam === null) return dueAt;
  const intervalDays = Math.max(0, Math.round((dueAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  const compressed = compressIntervalForExamProximity(intervalDays, daysUntilExam);
  if (compressed >= intervalDays) return dueAt;
  const result = new Date(now);
  result.setDate(result.getDate() + compressed);
  return result;
}
