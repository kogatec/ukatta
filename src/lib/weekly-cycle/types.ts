// 週次サイクルの型定義（設計: docs/learning-cycle.md）

/** learning-cycle.md §2.2 の4段階。入試までの残り日数で決まる。 */
export type ExamStage = "light" | "standard" | "intensive" | "final";

export interface StageProfile {
  stage: ExamStage;
  /** 週次テストで選ぶ科目数 */
  subjectCount: number;
  /** 各科目の制限時間（分）の範囲 */
  timeLimitMinRange: [number, number];
  /** 日次ミッションの目安時間（分） */
  dailyMinutes: number;
  /** 直前期のみ: 月1回、全科目通しの本番シミュレーションを行う */
  monthlyFullSimulation: boolean;
}

export interface SubjectCandidate {
  subjectId: string;
  /** その科目の弱点度（0〜1）。1 - 科目レベルの習熟度。 */
  weaknessLevel: number;
  /** 志望校の配点比率（正規化前の得点でよい。関数側で正規化する） */
  weightPoints: number;
  /** 直近で週次テストに出た週の開始日（月曜, YYYY-MM-DD）。一度も出ていなければ null */
  lastTestedWeek: string | null;
}

export interface SubjectSelectionResult {
  subjectId: string;
  score: number;
  /** §2.3 のハードガード（4週間受験していない）で強制選出されたか */
  forcedByRotationGuard: boolean;
}

/** §4.1 のバランス配分。科目ごとの目標配分比率（合計1.0）。 */
export interface SubjectAllocation {
  subjectId: string;
  targetShare: number;
}

/** §4.2 の出題3層 */
export type MissionLayer = "review" | "focus" | "maintenance";

export interface DailyMissionItem {
  subjectId: string;
  layer: MissionLayer;
}

/** §3.2 の重点単元選定に使う候補 */
export interface UnitPriorityCandidate {
  skillTagId: string;
  mastery: number;
  /** 志望校での出題頻度（0〜1に正規化したものを想定） */
  examFrequency: number;
  /** その単元が絡む設問の配点比率（0〜1に正規化したものを想定） */
  pointsShare: number;
}

export interface UnitPriorityResult {
  skillTagId: string;
  priorityScore: number;
}

/** §5 の測定条件 */
export type MeasurementContext = "weekly_test" | "daily_drill" | "review_session";
