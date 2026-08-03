import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeMark, gradeNumeric, shuffleChoiceKeys } from "./grade.ts";
import { normalizeNumericValue } from "./normalize.ts";
import type { MarkChoices, NumericAnswer, NumericDistractor } from "./types.ts";

const choices: MarkChoices = {
  options: [
    { key: "a", text: "-1", correct: true },
    { key: "b", text: "3", correct: false, error_tag: "case_omission", why_ja: "端だけ見ています" },
    { key: "c", text: "0", correct: false, error_tag: "domain_ignored" },
    { key: "d", text: "2", correct: false, error_tag: "wrong_target", root_skill_id: "skill-1" },
    { key: "e", text: "-4", correct: false, error_tag: "sign_error" },
  ],
};

test("mark: 正答は満点、誤答タグは付かない", () => {
  const r = gradeMark(choices, "a", 10);
  assert.equal(r.correct, true);
  assert.equal(r.awardedPoints, 10);
  assert.equal(r.errorTag, null);
});

test("mark: 誤答は選択肢に埋め込んだタグをそのまま返す", () => {
  const r = gradeMark(choices, "b", 10);
  assert.equal(r.correct, false);
  assert.equal(r.awardedPoints, 0);
  assert.equal(r.errorTag, "case_omission");
  assert.equal(r.whyJa, "端だけ見ています");
});

test("mark: 遡るべき前提スキルを引ける", () => {
  assert.equal(gradeMark(choices, "d", 10).rootSkillId, "skill-1");
});

test("mark: 未解答は timeout として扱う", () => {
  assert.equal(gradeMark(choices, null, 10).errorTag, "unanswered");
});

test("mark: 存在しないkeyは誤答扱いにし、タグは付けない", () => {
  const r = gradeMark(choices, "z", 10);
  assert.equal(r.correct, false);
  assert.equal(r.errorTag, null);
});

test("mark: シャッフルしても選択肢は5つとも保たれる", () => {
  const keys = shuffleChoiceKeys(choices, () => 0.42);
  assert.deepEqual([...keys].sort(), ["a", "b", "c", "d", "e"]);
});

// ---------------------------------------------------------

test("normalize: 全角・空白・約分・-0を吸収する", () => {
  assert.equal(normalizeNumericValue("１２"), "12");
  assert.equal(normalizeNumericValue(" -1 "), "-1");
  assert.equal(normalizeNumericValue("−1"), "-1"); // 全角マイナス
  assert.equal(normalizeNumericValue("6/8"), "3/4");
  assert.equal(normalizeNumericValue("3/-4"), "-3/4");
  assert.equal(normalizeNumericValue("4/2"), "2");
  assert.equal(normalizeNumericValue("-0"), "0");
  assert.equal(normalizeNumericValue("1.50"), "1.5");
});

const numericAnswer: NumericAnswer = {
  type: "numeric",
  slots: [
    { label: "アイ", value: "-1", kind: "integer" },
    { label: "ウ/エ", value: "3/4", kind: "fraction" },
  ],
};

const distractors: NumericDistractor[] = [
  { slot: "アイ", value: "-4", error_tag: "sign_error", why_ja: "平方完成の符号ミス" },
  { slot: "アイ", value: "3", error_tag: "case_omission" },
];

test("numeric: 全スロット一致で満点", () => {
  const r = gradeNumeric(numericAnswer, distractors, { "アイ": "-1", "ウ/エ": "3/4" }, 10);
  assert.equal(r.correct, true);
  assert.equal(r.awardedPoints, 10);
});

test("numeric: 表記ゆれがあっても正答と判定する", () => {
  const r = gradeNumeric(numericAnswer, distractors, { "アイ": "−１", "ウ/エ": "6/8" }, 10);
  assert.equal(r.correct, true);
});

test("numeric: スロット単位の部分点が出る", () => {
  const r = gradeNumeric(numericAnswer, distractors, { "アイ": "-1", "ウ/エ": "1/2" }, 10);
  assert.equal(r.correct, false);
  assert.equal(r.awardedPoints, 5);
});

test("numeric: 誤答値マッピングに一致すれば誤答タイプが確定する", () => {
  const r = gradeNumeric(numericAnswer, distractors, { "アイ": "-4", "ウ/エ": "3/4" }, 10);
  assert.equal(r.errorTag, "sign_error");
  assert.equal(r.whyJa, "平方完成の符号ミス");
});

test("numeric: どのパターンにも一致しなければ null（AI分類へ回す）", () => {
  const r = gradeNumeric(numericAnswer, distractors, { "アイ": "99", "ウ/エ": "3/4" }, 10);
  assert.equal(r.errorTag, null);
});

test("numeric: 全スロット白紙は未解答", () => {
  const r = gradeNumeric(numericAnswer, distractors, { "アイ": "", "ウ/エ": "" }, 10);
  assert.equal(r.errorTag, "unanswered");
  assert.equal(r.awardedPoints, 0);
});
