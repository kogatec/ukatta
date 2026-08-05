// 受験中のクライアントに送ってよい問題情報だけを抜き出す（設計: docs/question-format.md）
//
// mark: 正誤(correct)・誤答タグ・why_jaは採点結果でしか渡さない。選択肢のtext/keyのみ返す。
// numeric: 正答値(value)を返すとその場で答えが割れるため、スロットのlabel/kindのみ返す。

import type { MarkChoices, NumericAnswer, QuestionFormat } from "./types";

export interface PublicMarkChoices {
  options: { key: string; text: string }[];
}

export interface PublicNumericSlots {
  slots: { label: string; kind?: string }[];
}

export function publicChoices(
  format: QuestionFormat,
  choices: unknown,
  answer: unknown
): PublicMarkChoices | PublicNumericSlots {
  if (format === "mark") {
    const c = choices as MarkChoices;
    return { options: c.options.map((o) => ({ key: o.key, text: o.text })) };
  }
  const a = answer as NumericAnswer;
  return { slots: a.slots.map((s) => ({ label: s.label, kind: s.kind })) };
}
