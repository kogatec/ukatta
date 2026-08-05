import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/weekly-cycle/week";
import { loadPlanSubjects, loadPlanUnits } from "@/lib/weekly-cycle/planView";
import AnalyzeButton from "./AnalyzeButton";

export default async function WeeklyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: weeklyPlanId } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    redirect("/onboarding");
  }

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("id, user_id, week_start, status")
    .eq("id", weeklyPlanId)
    .maybeSingle();
  if (!plan || plan.user_id !== appUser.id) {
    notFound();
  }

  const [subjects, focusUnits] = await Promise.all([
    loadPlanSubjects(supabase, plan.id, appUser.id),
    loadPlanUnits(supabase, plan.id),
  ]);

  const allGraded = subjects.length > 0 && subjects.every((s) => s.mock_exam_status === "graded");

  let nextWeekUnits: Awaited<ReturnType<typeof loadPlanUnits>> = [];
  if (plan.status === "tested") {
    const nextWeekStart = addDays(plan.week_start, 7);
    const { data: nextPlan } = await supabase
      .from("weekly_plans")
      .select("id")
      .eq("user_id", appUser.id)
      .eq("week_start", nextWeekStart)
      .maybeSingle();
    if (nextPlan) {
      nextWeekUnits = await loadPlanUnits(supabase, nextPlan.id);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/weekly" className="text-xs text-muted underline underline-offset-2">
          ← 今週の目標
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">週次レポート</h1>
        <p className="mt-1 text-xs text-muted">{plan.week_start} の週</p>

        <section className="mt-6 rounded-md border border-line bg-surface p-6">
          <p className="text-xs font-mono tracking-widest text-muted">スコア</p>
          <ul className="mt-3 space-y-3">
            {subjects.map((s) => {
              const pct =
                s.total_points && s.total_points > 0 ? Math.round((s.awarded_points / s.total_points) * 100) : null;
              return (
                <li key={s.subject_id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{s.subject_name}</span>
                  {s.mock_exam_status === "graded" ? (
                    <span className="text-sm font-semibold text-brand-600">
                      {s.correct_count}/{s.question_count}問正解 {pct !== null ? `（${pct}%）` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">未提出</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {focusUnits.length > 0 && (
          <section className="mt-6 rounded-md border border-line bg-sky p-6">
            <p className="text-xs font-mono tracking-widest text-muted">今週取り組んだ重点単元</p>
            <ul className="mt-3 space-y-1 text-sm text-foreground">
              {focusUnits.map((u) => (
                <li key={u.skill_tag_id} className="flex items-center justify-between">
                  <span>{u.skill_tag_name || u.unit_name}</span>
                  <span className={u.achieved ? "text-brand-600" : "text-muted"}>
                    {u.achieved ? "クリア" : "継続中"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6 rounded-md border border-line bg-surface p-6">
          <p className="text-xs font-mono tracking-widest text-muted">翌週の目標</p>

          {plan.status === "tested" ? (
            nextWeekUnits.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-foreground">
                {nextWeekUnits.map((u) => (
                  <li key={u.skill_tag_id}>{u.skill_tag_name || u.unit_name}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">来週の計画はまだ準備中です。</p>
            )
          ) : allGraded ? (
            <div className="mt-3">
              <AnalyzeButton weeklyPlanId={plan.id} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">全科目の採点が終わると、翌週の重点単元が決まります。</p>
          )}
        </section>
      </div>
    </div>
  );
}
