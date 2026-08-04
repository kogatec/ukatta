import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { weekStartOf } from "@/lib/weekly-cycle/week";
import { daysUntil } from "@/lib/date";
import { examStageFromDaysLeft, stageProfile } from "@/lib/weekly-cycle/examStage";
import { selectWeeklySubjects } from "@/lib/weekly-cycle/subjectSelection";
import { computeSubjectWeakness } from "@/lib/weekly-cycle/weakness";
import type { SubjectCandidate } from "@/lib/weekly-cycle/types";

// 週次テストの生成（設計: docs/learning-cycle.md §2）
//
// 実際のAI駆動ブループリント生成（DESIGN.md §5.1）は未実装のため、
// ここでは「対象科目の配信可能問題から必要数を決定論的に選ぶ」暫定ロジックで代替する。
// 生成自体はDB操作のみで数百ms〜数秒程度のため、非同期ジョブ化はせず同期処理にしている
// （実際のAI生成を組み込む際は DESIGN.md §14 の 202 job_id パターンに寄せて再設計する）。
//
// weekly_plans以下の全テーブルは生徒本人に書き込み権限が無い（RLS）ため service role で書く。

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id, exam_date")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });
  }

  const admin = createAdminClient();
  const weekStart = weekStartOf(new Date());

  // 週次計画の行は「前週の分析」が翌週の重点単元(weekly_plan_units)を書き込むために
  // 先に（空の状態で）作られていることがある。その場合はここで科目を追加する。
  // 科目が既に入っていれば「今週分は生成済み」とみなす。
  let plan: { id: string } | null = null;
  const { data: existingPlan } = await admin
    .from("weekly_plans")
    .select("id")
    .eq("user_id", appUser.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (existingPlan) {
    const { count } = await admin
      .from("weekly_plan_subjects")
      .select("id", { count: "exact", head: true })
      .eq("weekly_plan_id", existingPlan.id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "already generated", weekly_plan_id: existingPlan.id },
        { status: 409 }
      );
    }
    plan = existingPlan;
  }

  const { data: target } = await supabase
    .from("user_targets")
    .select("id, exam_subjects")
    .eq("user_id", appUser.id)
    .eq("priority", 1)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "no target school registered" }, { status: 400 });
  }

  const examSubjects = target.exam_subjects as { subject_id: string; weight_points: number }[];
  if (!examSubjects || examSubjects.length === 0) {
    return NextResponse.json({ error: "target has no exam subjects" }, { status: 400 });
  }

  // 弱点度: 科目に属する単元のmasteryを平均する（データが無ければ中立の0.5 = Beta(1,1)の事前分布と一致）
  const candidates: SubjectCandidate[] = [];
  for (const es of examSubjects) {
    const weaknessLevel = await computeSubjectWeakness(admin, appUser.id, es.subject_id);

    const { data: rotation } = await admin
      .from("subject_rotation_state")
      .select("last_tested_week")
      .eq("user_id", appUser.id)
      .eq("subject_id", es.subject_id)
      .maybeSingle();

    candidates.push({
      subjectId: es.subject_id,
      weaknessLevel,
      weightPoints: es.weight_points,
      lastTestedWeek: rotation?.last_tested_week ?? null,
    });
  }

  // 受験日未設定は「まだ先」として light 扱いにする（緊急度シグナルが無いため）
  const daysLeft = appUser.exam_date ? daysUntil(appUser.exam_date) : 400;
  const stage = examStageFromDaysLeft(daysLeft);
  const profile = stageProfile(stage);

  const selected = selectWeeklySubjects(candidates, weekStart, profile.subjectCount);

  if (!plan) {
    const { data: created, error: planError } = await admin
      .from("weekly_plans")
      .insert({ user_id: appUser.id, target_id: target.id, week_start: weekStart, status: "pending" })
      .select("id")
      .single();
    if (planError || !created) {
      return NextResponse.json(
        { error: planError?.message ?? "failed to create weekly plan" },
        { status: 500 }
      );
    }
    plan = created;
  }

  const timeLimitMin = Math.round((profile.timeLimitMinRange[0] + profile.timeLimitMinRange[1]) / 2);
  const MINUTES_PER_QUESTION = 3; // 暫定の目安（実際の est_time_sec 集計に置き換え予定）

  const results = [];
  for (const s of selected) {
    const { data: planSubject } = await admin
      .from("weekly_plan_subjects")
      .insert({
        weekly_plan_id: plan.id,
        subject_id: s.subjectId,
        time_limit_min: timeLimitMin,
        selection_score: s.score,
      })
      .select("id")
      .single();
    if (!planSubject) continue;

    const targetQuestionCount = Math.max(1, Math.round(timeLimitMin / MINUTES_PER_QUESTION));
    const { data: candidateQuestions } = await admin
      .from("questions")
      .select("id")
      .eq("subject_id", s.subjectId)
      .eq("license_status", "deliverable")
      .limit(targetQuestionCount);

    const questionIds = (candidateQuestions ?? []).map((q) => q.id);

    const { data: mockExam } = await admin
      .from("mock_exams")
      .insert({
        user_id: appUser.id,
        target_id: target.id,
        subject_id: s.subjectId,
        title: `週次テスト（${weekStart}）`,
        blueprint: { note: "MVP: 決定論的選定。過去問メタデータに基づくブループリント生成は未実装" },
        status: questionIds.length > 0 ? "ready" : "generating",
        time_limit_min: timeLimitMin,
        total_points: questionIds.length, // 暫定: 1問1点
        kind: "weekly",
      })
      .select("id, status")
      .single();
    if (!mockExam) continue;

    if (questionIds.length > 0) {
      const items = questionIds.map((qId, i) => ({
        mock_exam_id: mockExam.id,
        order_no: i + 1,
        question_id: qId,
        points: 1,
      }));
      await admin.from("mock_exam_items").insert(items);
    }

    await admin
      .from("weekly_plan_subjects")
      .update({ mock_exam_id: mockExam.id })
      .eq("id", planSubject.id);

    results.push({
      subject_id: s.subjectId,
      mock_exam_id: mockExam.id,
      status: mockExam.status,
      question_count: questionIds.length,
      time_limit_min: timeLimitMin,
    });
  }

  return NextResponse.json(
    { weekly_plan_id: plan.id, week_start: weekStart, stage: stage, subjects: results },
    { status: 201 }
  );
}
