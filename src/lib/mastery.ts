// 習熟度（ベータ分布）の更新（設計: docs/question-format.md §6、DESIGN.md §6.1）
//
// 素朴に「正答 α+=w / 誤答 β+=w」とすると、5択では何も分かっていない生徒の
// mastery が 0 ではなく推測確率 0.2 に収束し、弱点ランキングが静かに歪む。
// そこで「正答したが、まぐれだったかもしれない」分を割り引いて計上する。

import type { QuestionFormat } from "./questions/types";
import type { MeasurementContext } from "./weekly-cycle/types";

export interface MasteryState {
  alpha: number;
  beta: number;
}

export interface MasteryUpdateInput {
  correct: boolean;
  format: QuestionFormat;
  /** 自己申告の確信度 1〜4。未申告は null */
  selfConfidence: number | null;
  /** 難易度重み × 新しさ重み（DESIGN.md §6.1 の w） */
  weight?: number;
  /**
   * 週次テスト・日次ドリル・復習セッションのどれで得た結果か（learning-cycle.md §5）。
   * 省略時は条件重み 1.0（daily_drill 相当）として扱う。
   */
  measurementContext?: MeasurementContext;
}

/**
 * 測定条件による重み（learning-cycle.md §5）。
 * 週次テストは「何が出るか分からない状態・本番の時間制約」で解くため最も信頼できる。
 * 復習セッションは解説直後の再テストで短期記憶が効くため、実力を過大評価しやすい。
 */
export const CONDITION_WEIGHT: Record<MeasurementContext, number> = {
  weekly_test: 1.5,
  daily_drill: 1.0,
  review_session: 0.5,
};

export function conditionWeight(context: MeasurementContext | undefined): number {
  return context ? CONDITION_WEIGHT[context] : 1.0;
}

/** 5択の素の推測確率 */
const BASE_GUESS_RATE = 0.2;

/**
 * 確信度で推測確率を調整する。
 * 「自信がない」と申告した上での正解は、まぐれである確率が高い。
 */
function guessRate(format: QuestionFormat, selfConfidence: number | null): number {
  // 数値マークは選択肢が無いため、まぐれ当たりは実質起きない
  if (format === "numeric") return 0;

  switch (selfConfidence) {
    case 1:
      return 0.8;
    case 2:
      return 0.5;
    case 3:
      return 0.3;
    default:
      return BASE_GUESS_RATE;
  }
}

export function masteryOf(state: MasteryState): number {
  return state.alpha / (state.alpha + state.beta);
}

/**
 * 誤答 × 高確信は「間違って覚えている」状態（誤概念）であり、
 * 単なる知識不足より危険で放置されやすいため、より強く減点する。
 */
export function isMisconception(input: MasteryUpdateInput): boolean {
  return !input.correct && (input.selfConfidence ?? 0) >= 3;
}

const MISCONCEPTION_PENALTY = 1.5;

export function updateMastery(
  state: MasteryState,
  input: MasteryUpdateInput
): MasteryState {
  const w = (input.weight ?? 1) * conditionWeight(input.measurementContext);
  const c = guessRate(input.format, input.selfConfidence);

  if (!input.correct) {
    const penalty = isMisconception(input) ? MISCONCEPTION_PENALTY : 1;
    return { alpha: state.alpha, beta: state.beta + w * penalty };
  }

  // 現在の推定値を θ とみなし、正答が「理解によるもの」である事後確率を求める。
  //   P(正答)        = θ + (1-θ)·c
  //   P(理解 | 正答) = θ / (θ + (1-θ)·c)
  const theta = masteryOf(state);
  const pKnew = c === 0 ? 1 : theta / (theta + (1 - theta) * c);

  return {
    alpha: state.alpha + w * pKnew,
    // まぐれ当たりだった分は「理解していない証拠」として計上する。
    // これが無いと、知識ゼロの生徒の mastery が c に収束してしまう。
    beta: state.beta + w * (1 - pKnew),
  };
}
