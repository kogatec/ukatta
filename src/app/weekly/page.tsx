import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { weekStartOf } from "@/lib/weekly-cycle/week";
import { loadPlanSubjects, loadPlanUnits } from "@/lib/weekly-cycle/planView";
import GenerateTestButton from "./GenerateTestButton";

const MOCK_STATUS_LABEL: Record<string, string> = {
  generating: "準備中",
  ready: "受験できます",
  in_progress: "受験中",
  submitted: "採点中",
  graded: "受験済み",
  failed: "生成に失敗しました",
};

/** 今日から次に targetWeekday（0=日曜..6=土曜）が来るまでの日数。既に受験済みなら来週分を返す。 */
function daysUntilWeekday(targetWeekday: number, alreadyTested: boolean): number {
  const today = new Date().getUTCDay();
  let diff = (targetWeekday - today + 7) % 7;
  if (diff === 0 && alreadyTested) diff = 7;
  return diff;
}

export default async function WeeklyPage() {
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

  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select("weekly_test_weekday")
    .eq("user_id", appUser.id)
    .maybeSingle();
  const testWeekday = prefs?.weekly_test_weekday ?? 6;

  const weekStart = weekStartOf(new Date());
  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("id, week_start, status")
    .eq("user_id", appUser.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  const subjects = plan ? await loadPlanSubjects(supabase, plan.id, appUser.id) : [];
  const focusUnits = plan ? await loadPlanUnits(supabase, plan.id) : [];
  const achievedCount = focusUnits.filter((u) => u.achieved).length;

  const allGraded = subjects.length > 0 && subjects.every((s) => s.mock_exam_status === "graded");
  const daysToTest = daysUntilWeekday(testWeekday, plan?.status === "tested" || allGraded);

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-xs text-muted underline underline-offset-2">
          ← ホーム
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">今週の目標</h1>

        <section className="mt-6 rounded-md border border-line bg-surface p-6">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-mono tracking-widest text-muted">重点単元</p>
            <p className="text-sm font-semibold text-brand-600">
              {achievedCount}/{focusUnits.length || 0} 単元クリア
            </p>
          </div>

          {focusUnits.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              まだ重点単元がありません。週次テストを受けると、翌週の重点単元が決まります。
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {focusUnits.map((u) => (
                <li key={u.skill_tag_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{u.skill_tag_name || u.unit_name}</span>
                    <span className={u.achieved ? "text-brand-600" : "text-muted"}>
                      {u.achieved ? "クリア" : `目標 習熟度${Math.round(u.target_mastery * 100)}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-sky">
                    <div
                      className={`h-2 rounded-full ${u.achieved ? "bg-brand-600" : "bg-brand-500"}`}
                      style={{ width: u.achieved ? "100%" : "35%" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-md border border-line bg-sky p-6">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-mono tracking-widest text-muted">週次テスト</p>
            <p className="text-sm font-semibold text-brand-600">
              {daysToTest === 0 ? "今日" : `あと${daysToTest}日`}
            </p>
          </div>

          {!plan ? (
            <div className="mt-4">
              <p className="text-sm text-muted">今週のテストはまだ作られていません。</p>
              <div className="mt-3">
                <GenerateTestButton />
              </div>
            </div>
          ) : subjects.length === 0 ? (
            <p className="mt-4 text-sm text-muted">科目の生成待ちです。しばらくしてから開いてください。</p>
          ) : (
            <>
              <ul className="mt-4 space-y-2">
                {subjects.map((s) => (
                  <li
                    key={s.subject_id}
                    className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.subject_name}</p>
                      <p className="text-xs text-muted">
                        {s.time_limit_min}分 ・ {MOCK_STATUS_LABEL[s.mock_exam_status ?? ""] ?? s.mock_exam_status}
                      </p>
                    </div>
                    {s.mock_exam_id && (s.mock_exam_status === "ready" || s.mock_exam_status === "in_progress") && (
                      <Link
                        href={`/weekly/test/${s.mock_exam_id}`}
                        className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500"
                      >
                        {s.mock_exam_status === "in_progress" ? "再開する" : "受験する"}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>

              {(allGraded || plan.status === "tested") && (
                <Link
                  href={`/weekly/report/${plan.id}`}
                  className="mt-4 block w-full rounded-md bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-500"
                >
                  今週のレポートを見る
                </Link>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
