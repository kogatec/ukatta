import { test } from "node:test";
import assert from "node:assert/strict";
import {
  selectWeeklySubjects,
  DEFAULT_SELECTION_WEIGHTS,
  ROTATION_GUARD_WEEKS,
} from "./subjectSelection.ts";
import type { SubjectCandidate } from "./types.ts";

const CURRENT_WEEK = "2026-08-03"; // 月曜

test("弱点度が高い科目ほどスコアが高い（他条件が同じとき）", () => {
  const candidates: SubjectCandidate[] = [
    { subjectId: "weak", weaknessLevel: 0.9, weightPoints: 100, lastTestedWeek: CURRENT_WEEK },
    { subjectId: "strong", weaknessLevel: 0.1, weightPoints: 100, lastTestedWeek: CURRENT_WEEK },
  ];
  const result = selectWeeklySubjects(candidates, CURRENT_WEEK, 2);
  const weak = result.find((r) => r.subjectId === "weak")!;
  const strong = result.find((r) => r.subjectId === "strong")!;
  assert.ok(weak.score > strong.score);
});

test("配点比率が高い科目ほどスコアが高い（他条件が同じとき）", () => {
  const candidates: SubjectCandidate[] = [
    { subjectId: "heavy", weaknessLevel: 0.5, weightPoints: 200, lastTestedWeek: CURRENT_WEEK },
    { subjectId: "light", weaknessLevel: 0.5, weightPoints: 50, lastTestedWeek: CURRENT_WEEK },
  ];
  const result = selectWeeklySubjects(candidates, CURRENT_WEEK, 2);
  const heavy = result.find((r) => r.subjectId === "heavy")!;
  const light = result.find((r) => r.subjectId === "light")!;
  assert.ok(heavy.score > light.score);
});

test("一度も受けていない科目は無条件で選出される", () => {
  const candidates: SubjectCandidate[] = [
    { subjectId: "never", weaknessLevel: 0.1, weightPoints: 10, lastTestedWeek: null },
    { subjectId: "a", weaknessLevel: 0.5, weightPoints: 100, lastTestedWeek: CURRENT_WEEK },
    { subjectId: "b", weaknessLevel: 0.5, weightPoints: 100, lastTestedWeek: CURRENT_WEEK },
    { subjectId: "c", weaknessLevel: 0.5, weightPoints: 100, lastTestedWeek: CURRENT_WEEK },
  ];
  // subjectCount=1 でも、一度も受けていない科目は必ず含まれる
  const result = selectWeeklySubjects(candidates, CURRENT_WEEK, 1);
  assert.ok(result.some((r) => r.subjectId === "never" && r.forcedByRotationGuard));
});

test(`${ROTATION_GUARD_WEEKS}週間受験していない科目はハードガードで強制選出される`, () => {
  const staleWeek = "2026-07-06"; // CURRENT_WEEKの4週前
  const candidates: SubjectCandidate[] = [
    { subjectId: "stale", weaknessLevel: 0.1, weightPoints: 10, lastTestedWeek: staleWeek },
    { subjectId: "a", weaknessLevel: 0.9, weightPoints: 300, lastTestedWeek: CURRENT_WEEK },
  ];
  const result = selectWeeklySubjects(candidates, CURRENT_WEEK, 1);
  const stale = result.find((r) => r.subjectId === "stale");
  assert.ok(stale, "stale科目が結果に含まれていない");
  assert.equal(stale!.forcedByRotationGuard, true);
});

test("3週間しか経っていない科目はハードガード対象にならない", () => {
  const recentWeek = "2026-07-13"; // 3週前
  const candidates: SubjectCandidate[] = [
    { subjectId: "recent", weaknessLevel: 0.9, weightPoints: 300, lastTestedWeek: recentWeek },
  ];
  const result = selectWeeklySubjects(candidates, CURRENT_WEEK, 1);
  assert.equal(result[0].forcedByRotationGuard, false);
});

test("空の候補リストは空を返す", () => {
  assert.deepEqual(selectWeeklySubjects([], CURRENT_WEEK, 2), []);
});

test("既定の重みは弱点度が最も重い", () => {
  assert.ok(DEFAULT_SELECTION_WEIGHTS.weakness >= DEFAULT_SELECTION_WEIGHTS.elapsed);
  assert.ok(DEFAULT_SELECTION_WEIGHTS.weakness >= DEFAULT_SELECTION_WEIGHTS.allocation);
});
