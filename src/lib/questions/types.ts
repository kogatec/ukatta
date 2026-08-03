// 出題形式の型定義（設計: docs/question-format.md）

/** MVPで配信する形式。short/essay/proof はスキーマ上残すが配信しない。 */
export type QuestionFormat = "mark" | "numeric";

/** DESIGN.md §6.1 の誤答タイプ。error_tag からこの6分類に写像する。 */
export type ErrorType =
  | "knowledge_gap"
  | "procedure"
  | "calculation"
  | "misread"
  | "timeout"
  | "careless";

// ---------------------------------------------------------
// mark（5択）
// ---------------------------------------------------------

export interface MarkOption {
  /** 表示位置とは独立した安定ID。シャッフルしても同一性が保たれる。 */
  key: string;
  text: string;
  correct: boolean;
  /** 誤答のみ必須（DBのCHECK制約で強制） */
  error_tag?: string;
  /** 遡って復習すべき前提スキル */
  root_skill_id?: string | null;
  /** 生徒に見せる「なぜこれを選んでしまうか」の説明 */
  why_ja?: string;
}

export interface MarkChoices {
  options: MarkOption[];
}

export interface MarkAnswer {
  type: "mark";
  key: string;
}

// ---------------------------------------------------------
// numeric（数値マーク・共通テスト型）
// ---------------------------------------------------------

export type NumericSlotKind = "integer" | "fraction" | "decimal";

export interface NumericSlot {
  /** 共通テストの「アイ」「ウ/エ」に相当する枠のラベル */
  label: string;
  value: string;
  kind?: NumericSlotKind;
}

export interface NumericAnswer {
  type: "numeric";
  slots: NumericSlot[];
}

/** 誤答値マッピング。生徒の入力がここに一致すれば誤答タイプが確定する。 */
export interface NumericDistractor {
  slot: string;
  value: string;
  error_tag: string;
  root_skill_id?: string | null;
  why_ja?: string;
}

// ---------------------------------------------------------
// 採点結果
// ---------------------------------------------------------

export interface GradeResult {
  correct: boolean;
  /** numeric はスロット単位の部分点があるため小数になりうる */
  awardedPoints: number;
  /** 誤答値・誤答選択肢から確定した誤答タグ。判別できなければ null（AI分類にフォールバック） */
  errorTag: string | null;
  /** 生徒に見せる説明 */
  whyJa: string | null;
  rootSkillId: string | null;
}
