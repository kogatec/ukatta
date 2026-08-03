// マーク式・数値マークの決定論的採点（設計: docs/question-format.md）
// AIは一切使わない。誤答タイプも、事前に問題へ埋め込んだタグを引くだけで確定する。

import { normalizeNumericValue } from "./normalize.ts";
import type {
  GradeResult,
  MarkChoices,
  NumericAnswer,
  NumericDistractor,
} from "./types";

/**
 * 5択の採点。
 * 未解答（chosenKey が null）は timeout として扱う。
 */
export function gradeMark(
  choices: MarkChoices,
  chosenKey: string | null,
  points: number
): GradeResult {
  if (chosenKey === null) {
    return {
      correct: false,
      awardedPoints: 0,
      errorTag: "unanswered",
      whyJa: null,
      rootSkillId: null,
    };
  }

  const chosen = choices.options.find((o) => o.key === chosenKey);

  // 存在しないkeyが来るのは配信バグかクライアント改ざん。誤答扱いにし、タグは付けない。
  if (!chosen) {
    return {
      correct: false,
      awardedPoints: 0,
      errorTag: null,
      whyJa: null,
      rootSkillId: null,
    };
  }

  if (chosen.correct) {
    return {
      correct: true,
      awardedPoints: points,
      errorTag: null,
      whyJa: null,
      rootSkillId: null,
    };
  }

  return {
    correct: false,
    awardedPoints: 0,
    errorTag: chosen.error_tag ?? null,
    whyJa: chosen.why_ja ?? null,
    rootSkillId: chosen.root_skill_id ?? null,
  };
}

/**
 * 数値マークの採点。スロット単位で部分点を出す。
 * 誤答タグは、誤答値マッピングに一致したスロットから引く。
 * 複数スロットが誤りの場合は、最初に一致したタグを採用する。
 */
export function gradeNumeric(
  answer: NumericAnswer,
  distractors: NumericDistractor[] | null,
  inputs: Record<string, string | null>,
  points: number
): GradeResult {
  const slots = answer.slots;
  if (slots.length === 0) {
    return { correct: false, awardedPoints: 0, errorTag: null, whyJa: null, rootSkillId: null };
  }

  let correctSlots = 0;
  let answeredSlots = 0;
  let matched: NumericDistractor | null = null;

  for (const slot of slots) {
    const raw = inputs[slot.label];
    const input = normalizeNumericValue(raw ?? "");
    if (input !== "") answeredSlots++;

    if (input !== "" && input === normalizeNumericValue(slot.value)) {
      correctSlots++;
      continue;
    }

    if (!matched && input !== "" && distractors) {
      matched =
        distractors.find(
          (d) => d.slot === slot.label && normalizeNumericValue(d.value) === input
        ) ?? null;
    }
  }

  // 全スロット白紙は未解答として扱う（誤概念ではなく時間切れの可能性が高い）
  if (answeredSlots === 0) {
    return {
      correct: false,
      awardedPoints: 0,
      errorTag: "unanswered",
      whyJa: null,
      rootSkillId: null,
    };
  }

  const correct = correctSlots === slots.length;
  const awardedPoints = correct
    ? points
    : Math.round((points * correctSlots) / slots.length * 100) / 100;

  return {
    correct,
    awardedPoints,
    errorTag: correct ? null : matched?.error_tag ?? null,
    whyJa: correct ? null : matched?.why_ja ?? null,
    rootSkillId: correct ? null : matched?.root_skill_id ?? null,
  };
}

/**
 * 配信時の選択肢シャッフル。
 * 表示順は mock_exam_items.choice_order に保存し、途中保存・復帰でずれないようにする。
 */
export function shuffleChoiceKeys(choices: MarkChoices, random = Math.random): string[] {
  const keys = choices.options.map((o) => o.key);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}
