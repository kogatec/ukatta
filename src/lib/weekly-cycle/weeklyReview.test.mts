import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rankUnitsByPriority,
  selectFocusUnits,
  isUnitAchieved,
  promoteNextUnit,
  MIN_FOCUS_UNITS,
  MAX_FOCUS_UNITS,
  TARGET_MASTERY,
} from "./weeklyReview.ts";
import type { UnitPriorityCandidate } from "./types.ts";

test("優先度は (1-習熟度) × 出題頻度 × 配点 で計算される", () => {
  const [result] = rankUnitsByPriority([
    { skillTagId: "a", mastery: 0.3, examFrequency: 0.8, pointsShare: 0.5 },
  ]);
  assert.ok(Math.abs(result.priorityScore - (1 - 0.3) * 0.8 * 0.5) < 1e-9);
});

test("苦手×出やすい×高配点が最優先になる", () => {
  const candidates: UnitPriorityCandidate[] = [
    { skillTagId: "worst-for-student-but-rare", mastery: 0.1, examFrequency: 0.1, pointsShare: 0.1 },
    { skillTagId: "weak-frequent-heavy", mastery: 0.1, examFrequency: 0.9, pointsShare: 0.9 },
    { skillTagId: "already-good", mastery: 0.95, examFrequency: 0.9, pointsShare: 0.9 },
  ];
  const ranked = rankUnitsByPriority(candidates);
  assert.equal(ranked[0].skillTagId, "weak-frequent-heavy");
});

test("苦手でも出ない単元は優先度が低い", () => {
  const candidates: UnitPriorityCandidate[] = [
    { skillTagId: "weak-but-rare", mastery: 0.1, examFrequency: 0.05, pointsShare: 0.1 },
    { skillTagId: "moderate-and-common", mastery: 0.5, examFrequency: 0.9, pointsShare: 0.8 },
  ];
  const ranked = rankUnitsByPriority(candidates);
  assert.equal(ranked[0].skillTagId, "moderate-and-common");
});

test(`重点単元は${MIN_FOCUS_UNITS}〜${MAX_FOCUS_UNITS}個にクランプされる`, () => {
  const many: UnitPriorityCandidate[] = Array.from({ length: 10 }, (_, i) => ({
    skillTagId: `s${i}`,
    mastery: 0.2,
    examFrequency: 0.5,
    pointsShare: 0.5,
  }));
  assert.equal(selectFocusUnits(many, 10).length, MAX_FOCUS_UNITS);
  assert.equal(selectFocusUnits(many, 1).length, MIN_FOCUS_UNITS);
  assert.equal(selectFocusUnits(many, 4).length, 4);
});

test("候補が少なければ、その数に収まる", () => {
  const two: UnitPriorityCandidate[] = [
    { skillTagId: "a", mastery: 0.2, examFrequency: 0.5, pointsShare: 0.5 },
    { skillTagId: "b", mastery: 0.2, examFrequency: 0.5, pointsShare: 0.5 },
  ];
  assert.equal(selectFocusUnits(two).length, 2);
});

test(`目標習熟度${TARGET_MASTERY}に到達したかを判定する`, () => {
  assert.equal(isUnitAchieved(0.8), true);
  assert.equal(isUnitAchieved(0.79), false);
  assert.equal(isUnitAchieved(0.95), true);
});

test("達成した単元を除いた候補から次点を繰り上げる", () => {
  const candidates: UnitPriorityCandidate[] = [
    { skillTagId: "first", mastery: 0.1, examFrequency: 0.9, pointsShare: 0.9 },
    { skillTagId: "second", mastery: 0.3, examFrequency: 0.8, pointsShare: 0.8 },
    { skillTagId: "third", mastery: 0.5, examFrequency: 0.5, pointsShare: 0.5 },
  ];
  const currentFocus = [
    { skillTagId: "first", achieved: true },
    { skillTagId: "second", achieved: false },
  ];
  const promoted = promoteNextUnit(currentFocus, candidates);
  assert.equal(promoted, "third");
});

test("繰り上げる候補が尽きていればnull", () => {
  const candidates: UnitPriorityCandidate[] = [
    { skillTagId: "only", mastery: 0.1, examFrequency: 0.9, pointsShare: 0.9 },
  ];
  const currentFocus = [{ skillTagId: "only", achieved: true }];
  assert.equal(promoteNextUnit(currentFocus, candidates), null);
});
