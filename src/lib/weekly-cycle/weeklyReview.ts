// 週次テストの分析 → 翌週の重点単元決定（設計: docs/learning-cycle.md §3）
//
//   優先度 = (1 - 習熟度) × 志望校での出題頻度 × 配点
//
// 「苦手 × 出やすい × 配点が高い」順。苦手でも出ない単元を潰しても点は上がらない。

import type { UnitPriorityCandidate, UnitPriorityResult } from "./types";

export const TARGET_MASTERY = 0.8;
export const MIN_FOCUS_UNITS = 3;
export const MAX_FOCUS_UNITS = 5;

/** 優先度スコア順に単元をランキングする。 */
export function rankUnitsByPriority(candidates: UnitPriorityCandidate[]): UnitPriorityResult[] {
  return candidates
    .map((c) => ({
      skillTagId: c.skillTagId,
      priorityScore: (1 - c.mastery) * c.examFrequency * c.pointsShare,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * 翌週の重点単元を選ぶ（§3.2: 3〜5個。多いと散って、どれも終わらない）。
 * @param count 希望する個数。MIN_FOCUS_UNITS〜MAX_FOCUS_UNITS の範囲にクランプする。
 */
export function selectFocusUnits(
  candidates: UnitPriorityCandidate[],
  count: number = MAX_FOCUS_UNITS
): UnitPriorityResult[] {
  const ranked = rankUnitsByPriority(candidates);
  const n = Math.min(Math.max(count, MIN_FOCUS_UNITS), MAX_FOCUS_UNITS, ranked.length);
  return ranked.slice(0, n);
}

/** 目標習熟度に到達したか（§3.3: 「次のテストでこの単元が出たら取れる状態」）。 */
export function isUnitAchieved(mastery: number, targetMastery: number = TARGET_MASTERY): boolean {
  return mastery >= targetMastery;
}

export interface FocusUnitState {
  skillTagId: string;
  achieved: boolean;
}

/**
 * 週の途中で重点単元が目標習熟度に到達したとき、次点の単元を繰り上げる（§3.4）。
 * 「クリア」表示は呼び出し側の責務。ここでは繰り上げる単元のIDだけを返す。
 *
 * @returns 繰り上げる単元ID。候補が尽きていれば null（配分は残りの重点単元に再配分する）。
 */
export function promoteNextUnit(
  currentFocus: FocusUnitState[],
  candidates: UnitPriorityCandidate[]
): string | null {
  const currentIds = new Set(currentFocus.map((f) => f.skillTagId));
  const remaining = candidates.filter((c) => !currentIds.has(c.skillTagId));
  const ranked = rankUnitsByPriority(remaining);
  return ranked[0]?.skillTagId ?? null;
}
