import { test } from "node:test";
import assert from "node:assert/strict";
import {
  updateMastery,
  masteryOf,
  isMisconception,
  conditionWeight,
  type MasteryState,
} from "./mastery.ts";

/** 再現性のある擬似乱数（テストを不安定にしないため） */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * 何も理解していない生徒（真の実力 0）が5択を解き続ける状況をシミュレートする。
 * 20%はまぐれで正解してしまう。
 */
function simulateCluelessStudent(useCorrection: boolean, trials = 400): number {
  const rand = seededRandom(12345);
  let state: MasteryState = { alpha: 1, beta: 1 };

  for (let i = 0; i < trials; i++) {
    const correct = rand() < 0.2; // まぐれ当たり

    if (useCorrection) {
      state = updateMastery(state, { correct, format: "mark", selfConfidence: null });
    } else {
      // 補正なしの素朴な更新（DESIGN.md §6.1 をそのまま実装した場合）
      state = correct
        ? { alpha: state.alpha + 1, beta: state.beta }
        : { alpha: state.alpha, beta: state.beta + 1 };
    }
  }
  return masteryOf(state);
}

test("補正なしだと、知識ゼロの生徒の習熟度が推測確率0.2付近に張り付く", () => {
  const m = simulateCluelessStudent(false);
  assert.ok(m > 0.15, `expected ~0.2, got ${m}`);
});

test("補正ありなら、知識ゼロの生徒の習熟度は0へ向かって下がり続ける", () => {
  const naive = simulateCluelessStudent(false, 400);
  const corrected = simulateCluelessStudent(true, 400);

  // 素朴な更新の半分以下まで下がっていること
  assert.ok(corrected < naive / 2, `corrected=${corrected}, naive=${naive}`);

  // 試行を増やすほど 0 に近づくこと（0.2 に張り付かない）
  const more = simulateCluelessStudent(true, 1600);
  assert.ok(more < corrected, `expected decline: 400→${corrected}, 1600→${more}`);
});

test("常に正答する生徒の習熟度は1に近づく", () => {
  let state: MasteryState = { alpha: 1, beta: 1 };
  for (let i = 0; i < 200; i++) {
    state = updateMastery(state, { correct: true, format: "mark", selfConfidence: 4 });
  }
  assert.ok(masteryOf(state) > 0.9, `got ${masteryOf(state)}`);
});

test("数値マークはまぐれ当たりが無いため、正答が満額計上される", () => {
  const before: MasteryState = { alpha: 1, beta: 1 };
  const after = updateMastery(before, { correct: true, format: "numeric", selfConfidence: null });
  assert.equal(after.alpha, 2);
  assert.equal(after.beta, 1);
});

test("自信なしの正解は、自信ありの正解より小さくしか加点されない", () => {
  const base: MasteryState = { alpha: 3, beta: 3 };
  const lowConfidence = updateMastery(base, { correct: true, format: "mark", selfConfidence: 1 });
  const highConfidence = updateMastery(base, { correct: true, format: "mark", selfConfidence: 4 });
  assert.ok(lowConfidence.alpha < highConfidence.alpha);
});

test("誤答×高確信は誤概念として検出され、より強く減点される", () => {
  const base: MasteryState = { alpha: 3, beta: 3 };
  const misconception = { correct: false, format: "mark" as const, selfConfidence: 4 };
  const plainMiss = { correct: false, format: "mark" as const, selfConfidence: 1 };

  assert.equal(isMisconception(misconception), true);
  assert.equal(isMisconception(plainMiss), false);
  assert.ok(updateMastery(base, misconception).beta > updateMastery(base, plainMiss).beta);
});

test("conditionWeight: 週次1.5・日次1.0・復習0.5、未指定は1.0（後方互換）", () => {
  assert.equal(conditionWeight("weekly_test"), 1.5);
  assert.equal(conditionWeight("daily_drill"), 1.0);
  assert.equal(conditionWeight("review_session"), 0.5);
  assert.equal(conditionWeight(undefined), 1.0);
});

test("測定条件により、同じ誤答でも減点幅が変わる（週次 > 日次 > 復習）", () => {
  const base: MasteryState = { alpha: 3, beta: 3 };
  const weekly = updateMastery(base, {
    correct: false,
    format: "mark",
    selfConfidence: null,
    measurementContext: "weekly_test",
  });
  const daily = updateMastery(base, {
    correct: false,
    format: "mark",
    selfConfidence: null,
    measurementContext: "daily_drill",
  });
  const review = updateMastery(base, {
    correct: false,
    format: "mark",
    selfConfidence: null,
    measurementContext: "review_session",
  });

  assert.ok(weekly.beta > daily.beta, `weekly=${weekly.beta}, daily=${daily.beta}`);
  assert.ok(daily.beta > review.beta, `daily=${daily.beta}, review=${review.beta}`);
});

test("measurementContext未指定はdaily_drill相当（既存呼び出しとの後方互換）", () => {
  const base: MasteryState = { alpha: 3, beta: 3 };
  const omitted = updateMastery(base, { correct: false, format: "mark", selfConfidence: null });
  const explicit = updateMastery(base, {
    correct: false,
    format: "mark",
    selfConfidence: null,
    measurementContext: "daily_drill",
  });
  assert.equal(omitted.beta, explicit.beta);
});

test("weight（難易度×新しさ）と条件重みは掛け合わされる", () => {
  const base: MasteryState = { alpha: 3, beta: 3 };
  const r = updateMastery(base, {
    correct: false,
    format: "mark",
    selfConfidence: null,
    weight: 2,
    measurementContext: "weekly_test",
  });
  // weight=2 × conditionWeight(weekly_test)=1.5 × penalty=1 = 3
  assert.equal(r.beta, base.beta + 3);
});
