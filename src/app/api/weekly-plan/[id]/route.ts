import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/weekly-cycle/week";
import { loadPlanSubjects, loadPlanUnits } from "@/lib/weekly-cycle/planView";

// 特定の週の計画（週次テストの結果・重点単元）を取得する（設計: docs/learning-cycle.md §6 /weekly/report）。
//
// status が tested（分析済み）なら、翌週の計画に書き込まれた重点単元も合わせて返す
// （レポート画面の「翌週の目標」に相当）。

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("id, user_id, week_start, status, skip_streak")
    .eq("id", weeklyPlanId)
    .maybeSingle();
  if (!plan || plan.user_id !== appUser.id) {
    return NextResponse.json({ error: "weekly plan not found" }, { status: 404 });
  }

  const [subjects, focusUnits] = await Promise.all([
    loadPlanSubjects(supabase, plan.id, appUser.id),
    loadPlanUnits(supabase, plan.id),
  ]);

  let nextWeek: { week_start: string; focus_units: Awaited<ReturnType<typeof loadPlanUnits>> } | null = null;
  if (plan.status === "tested") {
    const nextWeekStart = addDays(plan.week_start, 7);
    const { data: nextPlan } = await supabase
      .from("weekly_plans")
      .select("id, week_start")
      .eq("user_id", appUser.id)
      .eq("week_start", nextWeekStart)
      .maybeSingle();
    if (nextPlan) {
      nextWeek = {
        week_start: nextPlan.week_start,
        focus_units: await loadPlanUnits(supabase, nextPlan.id),
      };
    }
  }

  return NextResponse.json({
    weekly_plan_id: plan.id,
    week_start: plan.week_start,
    status: plan.status,
    skip_streak: plan.skip_streak,
    subjects,
    focus_units: focusUnits,
    next_week: nextWeek,
  });
}
