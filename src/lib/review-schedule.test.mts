import { test } from "node:test";
import assert from "node:assert/strict";
import { nextReviewState, compressIntervalForExamProximity } from "./review-schedule.ts";

const NOW = new Date("2026-08-04T00:00:00Z");

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

test("新規で正解: 1日後に learning", () => {
  const r = nextReviewState(null, true, NOW);
  assert.equal(r.state, "learning");
  assert.equal(r.reps, 1);
  assert.equal(daysBetween(NOW, r.dueAt), 1);
});

test("新規で不正解: 1日後に relearning、lapsesが増える", () => {
  const r = nextReviewState(null, false, NOW);
  assert.equal(r.state, "relearning");
  assert.equal(r.lapses, 1);
  assert.equal(daysBetween(NOW, r.dueAt), 1);
});

test("正解が続くと間隔が倍々に伸びる", () => {
  let state = nextReviewState(null, true, NOW); // interval=1
  const intervals: number[] = [state.lastIntervalDays!];
  for (let i = 0; i < 4; i++) {
    state = nextReviewState(state, true, NOW);
    intervals.push(state.lastIntervalDays!);
  }
  // 1, 2, 4, 8, 16
  assert.deepEqual(intervals, [1, 2, 4, 8, 16]);
});

test("間隔は上限30日でクランプされる", () => {
  let state = nextReviewState(null, true, NOW);
  for (let i = 0; i < 10; i++) {
    state = nextReviewState(state, true, NOW);
  }
  assert.ok(state.lastIntervalDays! <= 30);
});

test("2回連続正解でstateがreviewに上がる", () => {
  const first = nextReviewState(null, true, NOW);
  assert.equal(first.state, "learning");
  const second = nextReviewState(first, true, NOW);
  assert.equal(second.state, "review");
});

test("復習中に間違えると relearning に戻り、間隔がリセットされる", () => {
  let state = nextReviewState(null, true, NOW);
  state = nextReviewState(state, true, NOW); // interval=2, review
  state = nextReviewState(state, false, NOW); // 不正解
  assert.equal(state.state, "relearning");
  assert.equal(state.lastIntervalDays, 1);
  assert.equal(state.lapses, 1);
});

test("残り30日以内は間隔を7日にクランプする", () => {
  assert.equal(compressIntervalForExamProximity(14, 20), 7);
  assert.equal(compressIntervalForExamProximity(3, 20), 3); // 元々7日未満ならそのまま
});

test("残り7日以内は毎日（1日）にクランプする", () => {
  assert.equal(compressIntervalForExamProximity(20, 5), 1);
});

test("残り30日超は圧縮しない", () => {
  assert.equal(compressIntervalForExamProximity(20, 100), 20);
});
