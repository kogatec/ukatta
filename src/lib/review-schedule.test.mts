import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextReviewState,
  compressIntervalForExamProximity,
  applyExamProximityCompression,
  type ReviewQueueState,
} from "./review-schedule.ts";

const NOW = new Date("2026-08-04T00:00:00Z");

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

test("新規で正解: due が未来になり、reps=1・stabilityが正の値になる", () => {
  const r = nextReviewState(null, true, NOW);
  assert.equal(r.reps, 1);
  assert.equal(r.lapses, 0);
  assert.ok(r.dueAt.getTime() > NOW.getTime());
  assert.ok(r.stability > 0);
});

test("新規で不正解: reps=1になり、次回間隔は短い（lapsesは「一度覚えた後に忘れた回数」なのでまだ0）", () => {
  const r = nextReviewState(null, false, NOW);
  assert.equal(r.reps, 1);
  assert.equal(r.lapses, 0);
  assert.ok(daysBetween(NOW, r.dueAt) <= 3, "誤答直後の間隔は数日以内に収まる");
});

test("正解が続くほど次回までの間隔（安定性）が伸びていく", () => {
  let state = nextReviewState(null, true, NOW);
  let t = NOW;
  const intervals: number[] = [];
  for (let i = 0; i < 4; i++) {
    intervals.push(daysBetween(t, state.dueAt));
    t = state.dueAt;
    state = nextReviewState(state, true, t);
  }
  for (let i = 1; i < intervals.length; i++) {
    assert.ok(intervals[i] > intervals[i - 1], `interval[${i}]=${intervals[i]} should exceed interval[${i - 1}]=${intervals[i - 1]}`);
  }
});

test("復習を重ねたあとに間違えると、stabilityが下がりlapsesが増える", () => {
  let state = nextReviewState(null, true, NOW);
  state = nextReviewState(state, true, state.dueAt);
  state = nextReviewState(state, true, state.dueAt);
  const stabilityBeforeLapse = state.stability;

  const afterLapse = nextReviewState(state, false, state.dueAt);
  assert.equal(afterLapse.lapses, 1);
  assert.ok(afterLapse.stability < stabilityBeforeLapse, "誤答後はstabilityが下がる");
});

test("同じ入力なら同じ結果になる（決定論的）", () => {
  const a = nextReviewState(null, true, NOW);
  const b = nextReviewState(null, true, NOW);
  assert.deepEqual(a, b);
});

test("既存状態を引き継いだ場合、lastReviewAtが今回の解答時刻に更新される", () => {
  const first = nextReviewState(null, true, NOW);
  const second = nextReviewState(first, true, first.dueAt);
  assert.equal(second.lastReviewAt?.getTime(), first.dueAt.getTime());
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

test("applyExamProximityCompression: 試験日未設定ならdueAtをそのまま返す", () => {
  const dueAt = new Date("2026-09-01T00:00:00Z");
  assert.equal(applyExamProximityCompression(dueAt, NOW, null).getTime(), dueAt.getTime());
});

test("applyExamProximityCompression: 残り日数が少なければdueAtを早める", () => {
  const dueAt = new Date("2026-09-01T00:00:00Z"); // NOWから約28日後
  const compressed = applyExamProximityCompression(dueAt, NOW, 5); // 残り5日→毎日
  assert.equal(daysBetween(NOW, compressed), 1);
});

test("applyExamProximityCompression: 圧縮の必要が無ければdueAtをそのまま返す", () => {
  const dueAt = new Date("2026-08-05T00:00:00Z"); // NOWから1日後
  const result = applyExamProximityCompression(dueAt, NOW, 5);
  assert.equal(result.getTime(), dueAt.getTime());
});

test("型: ReviewQueueStateは stability/difficulty/lastReviewAt を持つ", () => {
  const r: ReviewQueueState = nextReviewState(null, true, NOW);
  assert.equal(typeof r.stability, "number");
  assert.equal(typeof r.difficulty, "number");
  assert.ok(r.lastReviewAt instanceof Date);
});
