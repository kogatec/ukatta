// 入試までの残り日数から週次テストの規模を決める（設計: docs/learning-cycle.md §2.2）
// 「本番と同じ形式」は常に守り、「本番と同じ量」は直前期にだけ課す。

import type { ExamStage, StageProfile } from "./types";

const STAGE_PROFILES: Record<ExamStage, StageProfile> = {
  light: {
    stage: "light",
    subjectCount: 1,
    timeLimitMinRange: [30, 30],
    dailyMinutes: 10,
    monthlyFullSimulation: false,
  },
  standard: {
    stage: "standard",
    subjectCount: 2,
    timeLimitMinRange: [45, 60],
    dailyMinutes: 15,
    monthlyFullSimulation: false,
  },
  intensive: {
    stage: "intensive",
    subjectCount: 2,
    timeLimitMinRange: [60, 90],
    dailyMinutes: 20,
    monthlyFullSimulation: false,
  },
  final: {
    stage: "final",
    // 直前期は本番同一構成。科目数は呼び出し側で「受験科目全数」を渡す想定のため、
    // ここでは目安の下限だけを示す（実際の選出は selectWeeklySubjects 側で全科目を対象にする）。
    subjectCount: 99,
    timeLimitMinRange: [60, 120],
    dailyMinutes: 30,
    monthlyFullSimulation: true,
  },
};

/**
 * 入試までの残り日数から段階を判定する。
 * 境界値は「〜365日」を含む側に倒す（365日超のみ light）。
 */
export function examStageFromDaysLeft(daysLeft: number): ExamStage {
  if (daysLeft > 365) return "light";
  if (daysLeft > 180) return "standard";
  if (daysLeft > 90) return "intensive";
  return "final";
}

export function stageProfile(stage: ExamStage): StageProfile {
  return STAGE_PROFILES[stage];
}
