import { test } from "node:test";
import assert from "node:assert/strict";
import { examStageFromDaysLeft, stageProfile } from "./examStage.ts";

test("残り日数から正しい段階を判定する", () => {
  assert.equal(examStageFromDaysLeft(400), "light");
  assert.equal(examStageFromDaysLeft(365), "standard"); // 境界: 365は超えないのでstandard
  assert.equal(examStageFromDaysLeft(200), "standard");
  assert.equal(examStageFromDaysLeft(180), "intensive"); // 境界
  assert.equal(examStageFromDaysLeft(100), "intensive");
  assert.equal(examStageFromDaysLeft(90), "final"); // 境界
  assert.equal(examStageFromDaysLeft(10), "final");
  assert.equal(examStageFromDaysLeft(0), "final");
});

test("直前期は月1回の本番シミュレーションを含む", () => {
  assert.equal(stageProfile("final").monthlyFullSimulation, true);
  assert.equal(stageProfile("light").monthlyFullSimulation, false);
});

test("段階が進むほど日次ミッションの時間が増える", () => {
  const minutes = (["light", "standard", "intensive", "final"] as const).map(
    (s) => stageProfile(s).dailyMinutes
  );
  for (let i = 1; i < minutes.length; i++) {
    assert.ok(minutes[i] >= minutes[i - 1], `${minutes[i - 1]} -> ${minutes[i]}`);
  }
});
