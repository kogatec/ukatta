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
    // 「本番同一構成」が指すのは通常の週次ローテーションの規模（1回あたりの長さ・構成）。
    // 「全科目通し」は月1回の別枠シミュレーション（monthlyFullSimulation）であり、
    // 毎週のローテーション科目数を全科目にするという意味ではない。
    subjectCount: 2,
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
