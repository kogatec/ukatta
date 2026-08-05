import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectFocusUnits } from "@/lib/weekly-cycle/weeklyReview";
import { addDays } from "@/lib/weekly-cycle/week";
import type { UnitPriorityCandidate } from "@/lib/weekly-cycle/types";

// 週次テストの分析 → 翌週の重点単元決定（設計: docs/learning-cycle.md §3）
//
// 前提: この週の全科目のmock_examsが提出済み(status in submitted/graded)であること。
// 実際の採点フロー（POST /api/mock-exams/:id/submit 相当）はまだ実装していないため、
// 現状はDB側でstatusを進めた模試に対してのみ呼べる。次の実装ステップで補う。
//
// 出題頻度・配点シェアは past_paper_items（過去問メタデータ、著作権フリー）から集計する。
// データが無い科目（過去問メタデータ未収集）は、頻度・配点を中立値1.0として扱い、
// 苦手度のみでランキングする（全単元が同点0になる事故を防ぐ）。

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: weeklyPlanId } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("weekly_plans")
    .select("id, user_id, target_id, week_start, status")
    .eq("id", weeklyPlanId)
    .maybeSingle();
  if (!plan || plan.user_id !== appUser.id) {
    return NextResponse.json({ error: "weekly plan not found" }, { status: 404 });
  }
  if (plan.status === "tested") {
    return NextResponse.json({ error: "already analyzed" }, { status: 409 });
  }

  const { data: planSubjects } = await admin
    .from("weekly_plan_subjects")
    .select("subject_id, mock_exam_id")
    .eq("weekly_plan_id", plan.id);
  if (!planSubjects || planSubjects.length === 0) {
    return NextResponse.json({ error: "no subjects generated for this week" }, { status: 400 });
  }

  const mockExamIds = planSubjects.map((s) => s.mock_exam_id).filter((id): id is string => !!id);
  const { data: mockExams } = await admin
    .from("mock_exams")
    .select("id, status")
    .in("id", mockExamIds);

  const unsubmitted = (mockExams ?? []).filter((m) => !["submitted", "graded"].includes(m.status));
  if (unsubmitted.length > 0) {
    return NextResponse.json(
      { error: "not all subjects have been submitted yet", pending: unsubmitted.map((m) => m.id) },
      { status: 400 }
    );
  }

  const { data: target } = await admin
    .from("user_targets")
    .select("school_id")
    .eq("id", plan.target_id)
    .maybeSingle();

  // ---- 単元候補の収集: 対象科目に属する全skill_tagと、その習熟度・出題頻度・配点シェア ----
  const candidates: UnitPriorityCandidate[] = [];

  for (const ps of planSubjects) {
    const { data: units } = await admin.from("units").select("id").eq("subject_id", ps.subject_id);
    const unitIds = (units ?? []).map((u) => u.id);
    if (unitIds.length === 0) continue;

    const { data: skillTags } = await admin.from("skill_tags").select("id, unit_id").in("unit_id", unitIds);
    if (!skillTags || skillTags.length === 0) continue;

    // 過去問メタデータから単元ごとの出題頻度・配点シェアを集計する
    const unitFreq: Record<string, number> = {};
    const unitPoints: Record<string, number> = {};
    let totalItems = 0;
    let totalPoints = 0;

    if (target?.school_id) {
      const { data: papers } = await admin
        .from("past_papers")
        .select("id")
        .eq("subject_id", ps.subject_id)
        .eq("school_id", target.school_id);
      const paperIds = (papers ?? []).map((p) => p.id);

      if (paperIds.length > 0) {
        const { data: items } = await admin
          .from("past_paper_items")
          .select("unit_ids, points")
          .in("paper_id", paperIds);

        for (const item of items ?? []) {
          totalItems++;
          totalPoints += item.points;
          for (const unitId of item.unit_ids as string[]) {
            unitFreq[unitId] = (unitFreq[unitId] ?? 0) + 1;
            unitPoints[unitId] = (unitPoints[unitId] ?? 0) + item.points;
          }
        }
      }
    }

    const hasBlueprintData = totalItems > 0;

    const { data: masteryRows } = await admin
      .from("mastery")
      .select("skill_tag_id, mastery")
      .eq("user_id", appUser.id)
      .in(
        "skill_tag_id",
        skillTags.map((s) => s.id)
      );
    const masteryBySkill = new Map((masteryRows ?? []).map((m) => [m.skill_tag_id, Number(m.mastery)]));

    for (const tag of skillTags) {
      const examFrequency = hasBlueprintData ? (unitFreq[tag.unit_id] ?? 0) / totalItems : 1;
      const pointsShare = hasBlueprintData ? (unitPoints[tag.unit_id] ?? 0) / totalPoints : 1;
      candidates.push({
        skillTagId: tag.id,
        mastery: masteryBySkill.get(tag.id) ?? 0.5,
        examFrequency,
        pointsShare,
      });
    }
  }

  const focusUnits = selectFocusUnits(candidates);

  // ---- 翌週の計画行を find-or-create し、重点単元を書き込む ----
  const nextWeekStart = addDays(plan.week_start, 7);
  const { data: existingNextPlan } = await admin
    .from("weekly_plans")
    .select("id")
    .eq("user_id", appUser.id)
    .eq("week_start", nextWeekStart)
    .maybeSingle();

  let nextPlanId = existingNextPlan?.id;
  if (!nextPlanId) {
    const { data: created, error: createError } = await admin
      .from("weekly_plans")
      .insert({ user_id: appUser.id, target_id: plan.target_id, week_start: nextWeekStart, status: "pending" })
      .select("id")
      .single();
    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message ?? "failed to create next weekly plan" },
        { status: 500 }
      );
    }
    nextPlanId = created.id;
  }

  if (focusUnits.length > 0) {
    await admin.from("weekly_plan_units").upsert(
      focusUnits.map((u) => ({
        weekly_plan_id: nextPlanId,
        skill_tag_id: u.skillTagId,
        priority_score: u.priorityScore,
      })),
      { onConflict: "weekly_plan_id,skill_tag_id" }
    );
  }

  // ---- 今週の状態確定・科目ローテーション状態の更新 ----
  await admin.from("weekly_plans").update({ status: "tested", skip_streak: 0 }).eq("id", plan.id);

  for (const ps of planSubjects) {
    await admin
      .from("subject_rotation_state")
      .upsert(
        { user_id: appUser.id, subject_id: ps.subject_id, last_tested_week: plan.week_start },
        { onConflict: "user_id,subject_id" }
      );
  }

  return NextResponse.json({
    weekly_plan_id: plan.id,
    status: "tested",
    next_weekly_plan_id: nextPlanId,
    next_week_start: nextWeekStart,
    focus_units: focusUnits,
  });
}
