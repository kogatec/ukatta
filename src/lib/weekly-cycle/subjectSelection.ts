// 週次テストの科目ローテーション（設計: docs/learning-cycle.md §2.3）
//
//   選択スコア = 経過週数 × w1 + 弱点度 × w2 + 志望校での配点比率 × w3
//
// 弱点科目は2週に1回、得意科目は3〜4週に1回のペースになることを狙う。
// 「4週間受験していない科目は無条件で選出」というハードガードで取りこぼしを防ぐ。

import type { SubjectCandidate, SubjectSelectionResult } from "./types";

export interface SelectionWeights {
  elapsed: number;
  weakness: number;
  allocation: number;
}

/**
 * 重みの既定値。設計書は数値を明示していないため、
 * 「苦手を最優先しつつ、ローテーションと配点も同程度に効かせる」方針で決めた。
 */
export const DEFAULT_SELECTION_WEIGHTS: SelectionWeights = {
  elapsed: 0.3,
  weakness: 0.4,
  allocation: 0.3,
};

/** この週数以上空くと無条件選出（§2.3 のハードガード） */
export const ROTATION_GUARD_WEEKS = 4;

/** 経過週数の正規化上限。これ以上は「十分に滞っている」として頭打ちにする。 */
const ELAPSED_WEEKS_CAP = 8;

function weeksBetween(fromDateStr: string, toDateStr: string): number {
  const from = new Date(fromDateStr).getTime();
  const to = new Date(toDateStr).getTime();
  return Math.round((to - from) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * その週に週次テストで扱う科目を選ぶ。
 *
 * @param candidates 受験科目の候補（弱点度・配点・最終受験週）
 * @param currentWeekStart 今週の開始日（月曜, YYYY-MM-DD）
 * @param subjectCount その段階（ExamStage）で選ぶ科目数の上限
 * @param weights スコアの重み。省略時は DEFAULT_SELECTION_WEIGHTS
 */
export function selectWeeklySubjects(
  candidates: SubjectCandidate[],
  currentWeekStart: string,
  subjectCount: number,
  weights: SelectionWeights = DEFAULT_SELECTION_WEIGHTS
): SubjectSelectionResult[] {
  if (candidates.length === 0) return [];

  const totalPoints = candidates.reduce((sum, c) => sum + c.weightPoints, 0) || 1;

  const scored = candidates.map((c) => {
    const elapsedWeeksRaw =
      c.lastTestedWeek === null
        ? ELAPSED_WEEKS_CAP
        : weeksBetween(c.lastTestedWeek, currentWeekStart);
    const elapsedWeeksClamped = Math.min(Math.max(elapsedWeeksRaw, 0), ELAPSED_WEEKS_CAP);
    const elapsedNorm = elapsedWeeksClamped / ELAPSED_WEEKS_CAP;
    const allocationNorm = c.weightPoints / totalPoints;

    const score =
      elapsedNorm * weights.elapsed +
      c.weaknessLevel * weights.weakness +
      allocationNorm * weights.allocation;

    const forcedByRotationGuard =
      c.lastTestedWeek === null || elapsedWeeksRaw >= ROTATION_GUARD_WEEKS;

    return { subjectId: c.subjectId, score, forcedByRotationGuard };
  });

  const forced = scored
    .filter((s) => s.forcedByRotationGuard)
    .sort((a, b) => b.score - a.score);
  const forcedIds = new Set(forced.map((s) => s.subjectId));
  const rest = scored
    .filter((s) => !forcedIds.has(s.subjectId))
    .sort((a, b) => b.score - a.score);

  // ハードガード対象は必ず含める（取りこぼし防止が枠数より優先）
  const selectedCount = Math.max(subjectCount, forced.length);
  return [...forced, ...rest].slice(0, selectedCount);
}
