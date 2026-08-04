// 復習キューの簡易スケジューラ（暫定実装）。
//
// DESIGN.md §7.2 は FSRS（安定性・難易度から想起確率を計算する本格的な間隔反復）を
// 採用する設計だが、そのアルゴリズムはここでは実装していない。
// これは「正解のたびに間隔を倍にし、不正解でリセットする」単純な指数バックオフであり、
// FSRSの代替ではなく、review_queueを最低限動かすためのプレースホルダーである。
// FSRSを実装したら、このモジュールごと置き換える。

export interface ReviewQueueState {
  dueAt: Date;
  state: "new" | "learning" | "review" | "relearning" | "suspended";
  reps: number;
  lapses: number;
  /** 直前の間隔（日数）。新規時は undefined。 */
  lastIntervalDays?: number;
}

const FIRST_INTERVAL_DAYS = 1;
const RELEARNING_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 30;
const GROWTH_FACTOR = 2;

/**
 * 解答結果から次回の復習キュー状態を計算する。
 * @param current 既存のキュー状態。まだキューに無ければ null。
 * @param correct 正誤
 * @param now 基準時刻（テスト容易性のため注入可能にする）
 */
export function nextReviewState(
  current: ReviewQueueState | null,
  correct: boolean,
  now: Date = new Date()
): ReviewQueueState {
  if (!correct) {
    return {
      dueAt: addDays(now, RELEARNING_INTERVAL_DAYS),
      state: "relearning",
      reps: current?.reps ?? 0,
      lapses: (current?.lapses ?? 0) + 1,
      lastIntervalDays: RELEARNING_INTERVAL_DAYS,
    };
  }

  const reps = (current?.reps ?? 0) + 1;
  const prevInterval = current?.lastIntervalDays ?? FIRST_INTERVAL_DAYS;
  const nextInterval = current
    ? Math.min(prevInterval * GROWTH_FACTOR, MAX_INTERVAL_DAYS)
    : FIRST_INTERVAL_DAYS;

  return {
    dueAt: addDays(now, nextInterval),
    state: reps >= 2 ? "review" : "learning",
    reps,
    lapses: current?.lapses ?? 0,
    lastIntervalDays: nextInterval,
  };
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
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
