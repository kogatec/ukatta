import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { weekStartOf } from "@/lib/weekly-cycle/week";

// 今週の週次計画を取得する（設計: docs/learning-cycle.md §6の /weekly 画面向け）。
// weekly_plan_units は「前週の分析で決まった、今週の重点単元」。

export async function GET() {
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

  const weekStart = weekStartOf(new Date());

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("id, week_start, status, skip_streak")
    .eq("user_id", appUser.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ exists: false, week_start: weekStart });
  }

  const { data: subjects } = await supabase
    .from("weekly_plan_subjects")
    .select("subject_id, time_limit_min, mock_exam_id, mock_exams(status, submitted_at)")
    .eq("weekly_plan_id", plan.id);

  const { data: units } = await supabase
    .from("weekly_plan_units")
    .select("skill_tag_id, priority_score, target_mastery, achieved, achieved_at")
    .eq("weekly_plan_id", plan.id)
    .order("priority_score", { ascending: false });

  return NextResponse.json({
    exists: true,
    weekly_plan_id: plan.id,
    week_start: plan.week_start,
    status: plan.status,
    skip_streak: plan.skip_streak,
    subjects: (subjects ?? []).map((s) => ({
      subject_id: s.subject_id,
      time_limit_min: s.time_limit_min,
      mock_exam_id: s.mock_exam_id,
      mock_exam_status: (s.mock_exams as unknown as { status: string } | null)?.status ?? null,
    })),
    focus_units: units ?? [],
  });
}
