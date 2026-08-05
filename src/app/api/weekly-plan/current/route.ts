import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { weekStartOf } from "@/lib/weekly-cycle/week";
import { loadPlanSubjects, loadPlanUnits } from "@/lib/weekly-cycle/planView";

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
    .select("id, exam_date")
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
    return NextResponse.json({ exists: false, week_start: weekStart, exam_date: appUser.exam_date });
  }

  const [subjects, focusUnits] = await Promise.all([
    loadPlanSubjects(supabase, plan.id, appUser.id),
    loadPlanUnits(supabase, plan.id),
  ]);

  return NextResponse.json({
    exists: true,
    weekly_plan_id: plan.id,
    week_start: plan.week_start,
    status: plan.status,
    skip_streak: plan.skip_streak,
    exam_date: appUser.exam_date,
    subjects,
    focus_units: focusUnits,
  });
}
