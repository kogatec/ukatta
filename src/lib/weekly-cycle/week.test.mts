import { test } from "node:test";
import assert from "node:assert/strict";
import { weekStartOf } from "./week.ts";

test("月曜日はそのまま月曜日を返す", () => {
  assert.equal(weekStartOf(new Date("2026-08-03T12:00:00Z")), "2026-08-03");
});

test("週の途中（木曜）はその週の月曜日を返す", () => {
  assert.equal(weekStartOf(new Date("2026-08-06T12:00:00Z")), "2026-08-03");
});

test("日曜日は前の月曜日を返す（週の最終日扱い）", () => {
  assert.equal(weekStartOf(new Date("2026-08-09T12:00:00Z")), "2026-08-03");
});

test("月をまたぐ週も正しく計算する", () => {
  // 2026-08-31は月曜日
  assert.equal(weekStartOf(new Date("2026-09-02T12:00:00Z")), "2026-08-31");
});
