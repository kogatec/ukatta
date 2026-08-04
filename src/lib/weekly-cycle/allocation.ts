// 日次ミッションの配分ロジック（設計: docs/learning-cycle.md §4）
//
// 「バランス」= 全科目均等ではない。志望校の配点比率に対する最適配分である。
// 配点比率を土台に、弱点度で傾け、3層構成に分け、最後にハードガードで補正する。

import type { SubjectAllocation } from "./types";

// ---------------------------------------------------------
// §4.1 科目配分: 配点比率 × (1 + λ × 弱点度)
// ---------------------------------------------------------

/** λ（弱点への傾斜係数） */
export const LAMBDA = {
  default: 1.0,
  weaknessFocusMode: 1.5,
  finalStage: 0.5,
} as const;

export interface SubjectWeightInput {
  subjectId: string;
  weightPoints: number;
  /** 0〜1 */
  weaknessLevel: number;
}

/** 科目ごとの目標配分（合計 targetShare = 1.0）を計算する。 */
export function computeSubjectAllocation(
  subjects: SubjectWeightInput[],
  lambda: number = LAMBDA.default
): SubjectAllocation[] {
  if (subjects.length === 0) return [];

  const raw = subjects.map((s) => ({
    subjectId: s.subjectId,
    raw: s.weightPoints * (1 + lambda * s.weaknessLevel),
  }));
  const total = raw.reduce((sum, r) => sum + r.raw, 0) || 1;

  return raw.map((r) => ({ subjectId: r.subjectId, targetShare: r.raw / total }));
}

// ---------------------------------------------------------
// §4.2 出題3層構成: 復習期限40% / 今週の重点40% / 維持20%
// ---------------------------------------------------------

export const LAYER_SHARE = {
  review: 0.4,
  focus: 0.4,
  maintenance: 0.2,
} as const;

export interface LayerAllocation {
  review: number;
  focus: number;
  maintenance: number;
}

/**
 * 1日の総問題数を3層に配分する。
 * 復習期限のタスクが目標に満たない日は、その不足分を「今週の重点」に寄せる。
 */
export function computeLayerAllocation(
  totalQuestions: number,
  reviewDueCount: number
): LayerAllocation {
  if (totalQuestions <= 0) return { review: 0, focus: 0, maintenance: 0 };

  const reviewTarget = Math.round(totalQuestions * LAYER_SHARE.review);
  const review = Math.min(reviewDueCount, reviewTarget);
  const shortfall = reviewTarget - review;

  const focus = Math.round(totalQuestions * LAYER_SHARE.focus) + shortfall;
  const maintenance = Math.max(totalQuestions - review - focus, 0);

  return { review, focus, maintenance };
}

// ---------------------------------------------------------
// 最大剰余法（Largest Remainder Method）
// 合計を厳密に total に一致させながら比例配分する。
// ---------------------------------------------------------

export function largestRemainderAllocate(
  shares: SubjectAllocation[],
  total: number
): Map<string, number> {
  if (total <= 0 || shares.length === 0) {
    return new Map(shares.map((s) => [s.subjectId, 0]));
  }

  const parts = shares.map((s) => {
    const exact = s.targetShare * total;
    const floor = Math.floor(exact);
    return { subjectId: s.subjectId, floor, remainder: exact - floor };
  });

  const allocated = parts.reduce((sum, p) => sum + p.floor, 0);
  const remaining = total - allocated;

  const result = new Map(parts.map((p) => [p.subjectId, p.floor]));
  const byRemainderDesc = [...parts].sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remaining; i++) {
    const target = byRemainderDesc[i % byRemainderDesc.length];
    result.set(target.subjectId, (result.get(target.subjectId) ?? 0) + 1);
  }

  return result;
}

// ---------------------------------------------------------
// §4.3 バランスのハードガード
// ---------------------------------------------------------

export const BALANCE_GUARD = {
  minSubjectsPerDay: 2,
  minTotalForMultiSubject: 5,
  maxZeroStreakDays: 4,
} as const;

export interface DailySubjectPlan {
  subjectId: string;
  questionCount: number;
}

export interface BalanceGuardInput {
  targetShares: SubjectAllocation[];
  totalQuestionsToday: number;
  /** 科目ごとの直近連続ゼロ日数（今日を含まない） */
  zeroStreakDays: Record<string, number>;
}

/**
 * その日の科目別出題数を決める。
 * 1. 目標配分を最大剰余法で total に一致するよう配分
 * 2. 4日以上連続ゼロの科目は最低1問を確保（最大配分科目から回す）
 * 3. 総量5問以上なら最低2科目にまたがるよう補正
 */
export function planDailySubjects(input: BalanceGuardInput): DailySubjectPlan[] {
  const { targetShares, totalQuestionsToday, zeroStreakDays } = input;
  if (totalQuestionsToday <= 0 || targetShares.length === 0) return [];

  const counts = largestRemainderAllocate(targetShares, totalQuestionsToday);

  const takeFromLargest = (excludeId: string): boolean => {
    let largestId: string | null = null;
    let largestCount = 0;
    for (const [id, c] of counts) {
      if (id === excludeId) continue;
      if (c > largestCount) {
        largestCount = c;
        largestId = id;
      }
    }
    if (largestId && largestCount > 0) {
      counts.set(largestId, largestCount - 1);
      return true;
    }
    return false;
  };

  // ハードガード1: 4日以上連続ゼロの科目は最低1問
  for (const subjectId of Object.keys(zeroStreakDays)) {
    if (zeroStreakDays[subjectId] < BALANCE_GUARD.maxZeroStreakDays) continue;
    if (!counts.has(subjectId)) continue;
    if ((counts.get(subjectId) ?? 0) > 0) continue;
    if (takeFromLargest(subjectId)) {
      counts.set(subjectId, 1);
    }
  }

  // ハードガード2: 総量5問以上なら最低2科目にまたがる
  if (totalQuestionsToday >= BALANCE_GUARD.minTotalForMultiSubject && targetShares.length >= 2) {
    const nonZero = [...counts.values()].filter((c) => c > 0).length;
    if (nonZero < BALANCE_GUARD.minSubjectsPerDay) {
      const zeroCandidate = [...targetShares]
        .filter((t) => (counts.get(t.subjectId) ?? 0) === 0)
        .sort((a, b) => b.targetShare - a.targetShare)[0];
      if (zeroCandidate && takeFromLargest(zeroCandidate.subjectId)) {
        counts.set(zeroCandidate.subjectId, 1);
      }
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([subjectId, questionCount]) => ({ subjectId, questionCount }));
}

// ---------------------------------------------------------
// §4.3 週単位の乖離チェック（±50%以内）
// ---------------------------------------------------------

export interface WeeklyDeviationInput {
  subjectId: string;
  targetShare: number;
  actualCount: number;
  weeklyTotal: number;
}

export interface WeeklyDeviationResult {
  subjectId: string;
  /** 実績シェア / 目標シェア。1.0が完全一致。0.5未満・1.5超で許容範囲外。 */
  ratio: number;
  withinRange: boolean;
}

const DEVIATION_TOLERANCE = 0.5;

/** 週の累積実績が目標配分の ±50% に収まっているかを判定する。 */
export function checkWeeklyDeviation(inputs: WeeklyDeviationInput[]): WeeklyDeviationResult[] {
  return inputs.map((i) => {
    if (i.weeklyTotal <= 0 || i.targetShare <= 0) {
      return { subjectId: i.subjectId, ratio: 1, withinRange: true };
    }
    const actualShare = i.actualCount / i.weeklyTotal;
    const ratio = actualShare / i.targetShare;
    const withinRange = ratio >= 1 - DEVIATION_TOLERANCE && ratio <= 1 + DEVIATION_TOLERANCE;
    return { subjectId: i.subjectId, ratio, withinRange };
  });
}

/** 乖離が大きい順に科目IDを返す（その日の配分で優先的に埋めるため）。 */
export function rankByDeviation(results: WeeklyDeviationResult[]): string[] {
  return [...results]
    .filter((r) => !r.withinRange)
    .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1))
    .map((r) => r.subjectId);
}
