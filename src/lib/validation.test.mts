import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "./validation.ts";

// オープンリダイレクト対策。`?next=` は攻撃者が自由に指定できるため、
// 自サイト内のパス以外は必ず既定値へ落とす。
test("自サイト内のパスはそのまま通す", () => {
  assert.equal(safeNextPath("/weekly"), "/weekly");
  assert.equal(safeNextPath("/weekly/report/abc?tab=1"), "/weekly/report/abc?tab=1");
});

test("絶対URLは弾く", () => {
  assert.equal(safeNextPath("https://evil.example"), "/");
  assert.equal(safeNextPath("http://evil.example/path"), "/");
});

test("プロトコル相対URLは弾く（ブラウザは外部ホストとして解釈する）", () => {
  assert.equal(safeNextPath("//evil.example"), "/");
  assert.equal(safeNextPath("/\\evil.example"), "/");
});

test("未指定・空文字は既定値", () => {
  assert.equal(safeNextPath(null), "/");
  assert.equal(safeNextPath(undefined), "/");
  assert.equal(safeNextPath(""), "/");
  assert.equal(safeNextPath(null, "/onboarding"), "/onboarding");
});
