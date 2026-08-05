import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import InstallPrompt from "@/components/InstallPrompt";
import LandingPage from "@/components/LandingPage";
import { daysUntil } from "@/lib/date";
import { weekStartOf } from "@/lib/weekly-cycle/week";
import { loadPlanUnits } from "@/lib/weekly-cycle/planView";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import { getDashboardStats } from "@/lib/dashboard";

/** 今日から次に targetWeekday（0=日曜..6=土曜）が来るまでの日数。既に受験済みなら来週分を返す。 */
function daysUntilWeekday(targetWeekday: number, alreadyTested: boolean): number {
  const today = new Date().getUTCDay();
  let diff = (targetWeekday - today + 7) % 7;
  if (diff === 0 && alreadyTested) diff = 7;
  return diff;
}

const GRADE_LABEL: Record<string, string> = {
  jhs1: "中1",
  jhs2: "中2",
  jhs3: "中3",
  hs1: "高1",
  hs2: "高2",
  hs3: "高3",
  ronin: "既卒",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return <LandingPage />;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, display_name, grade_level, exam_track, exam_date")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!user) {
    redirect("/onboarding");
  }

  // 初回の5教科診断テストが未完了なら、まずそちらに誘導する
  // （途中離脱したユーザーがホームから再開できるようにするための保険。
  //   本来の導線はオンボーディング完了直後のリダイレクト）。
  const diagnosticProgress = await getDiagnosticProgress(supabase, user.id, user.exam_track);
  if (!diagnosticProgress.completed) {
    redirect("/diagnostic");
  }

  const { data: targets } = await supabase
    .from("user_targets")
    .select("priority, schools(name)")
    .order("priority", { ascending: true });

  const daysLeft = user.exam_date ? daysUntil(user.exam_date) : null;

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayMission } = await supabase
    .from("daily_missions")
    .select("status, estimated_minutes")
    .eq("user_id", user.id)
    .eq("mission_date", today)
    .maybeSingle();

  const weekStart = weekStartOf(new Date());
  const { data: weeklyPlan } = await supabase
    .from("weekly_plans")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select("weekly_test_weekday")
    .eq("user_id", user.id)
    .maybeSingle();

  const focusUnits = weeklyPlan ? await loadPlanUnits(supabase, weeklyPlan.id) : [];
  const achievedCount = focusUnits.filter((u) => u.achieved).length;
  const daysToTest = daysUntilWeekday(prefs?.weekly_test_weekday ?? 6, weeklyPlan?.status === "tested");

  const { subjectScores, weaknesses } = await getDashboardStats(supabase, user.id, user.exam_track);
  const missionDone = todayMission?.status === "completed";

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs tracking-widest text-brand-600">UKATTA</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {user.display_name}さん、おかえりなさい。
        </h1>
        <p className="mt-1 text-sm text-muted">
          {GRADE_LABEL[user.grade_level] ?? user.grade_level} ・{" "}
          {user.exam_track === "highschool" ? "高校受験" : "大学受験"}
          {daysLeft !== null && ` ・ 受験まで残り${daysLeft}日`}
        </p>

        {/* ホームの中心はこのボタン1つ。押せば強化課題+維持課題がすぐ出題される */}
        <Link
          href="/daily"
          className="mt-6 block rounded-md bg-brand-600 px-6 py-8 text-center text-white shadow-sm transition-colors hover:bg-brand-500"
        >
          <p className="text-sm font-semibold tracking-wide text-white/80">
            {missionDone ? "今日の分は完了しました" : "今日のミッション"}
          </p>
          <p className="mt-2 text-3xl font-bold">{missionDone ? "お疲れさまでした" : "勉強する"}</p>
          {!missionDone && todayMission && (
            <p className="mt-1 text-sm text-white/80">推定{todayMission.estimated_minutes}分</p>
          )}
        </Link>

        <Link
          href="/practice"
          className="mt-2 block text-center text-xs text-muted underline underline-offset-2"
        >
          科目を選んでもっと演習する
        </Link>

        {subjectScores.length > 0 && (
          <section className="mt-8">
            <p className="text-xs font-mono tracking-widest text-muted">教科別スコア</p>
            <div className="mt-3 space-y-3 rounded-md border border-line bg-surface p-5">
              {subjectScores.map((s) => (
                <div key={s.subject_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">{s.subject_name}</span>
                    <span className="text-muted">
                      {s.mastery !== null ? `${Math.round(s.mastery * 100)}%` : "未計測"}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-sky">
                    <div
                      className="h-2 rounded-full bg-brand-600"
                      style={{ width: `${s.mastery !== null ? Math.round(s.mastery * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {weaknesses.length > 0 && (
          <section className="mt-6">
            <p className="text-xs font-mono tracking-widest text-muted">弱点単元</p>
            <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">
              {weaknesses.map((w) => (
                <li key={w.skill_tag_id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{w.skill_tag_name}</p>
                    <p className="text-xs text-muted">{w.subject_name}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{Math.round(w.mastery * 100)}%</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6 flex items-center justify-between rounded-md border border-line bg-sky px-5 py-4">
          <div>
            <p className="text-xs text-muted">今週の目標</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {focusUnits.length > 0 ? `${achievedCount}/${focusUnits.length}単元クリア` : "まだありません"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">次の週次テスト</p>
            <p className="mt-0.5 text-sm font-semibold text-brand-600">
              {daysToTest === 0 ? "今日" : `あと${daysToTest}日`}
            </p>
          </div>
          <Link href="/weekly" className="ml-3 text-xs text-brand-600 underline underline-offset-2">
            詳しく
          </Link>
        </section>

        <div className="mt-6 rounded-md border border-line bg-surface p-5">
          <p className="text-xs text-muted">志望校</p>
          {targets && targets.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {targets.map((t, i) => (
                <li key={i}>
                  第{t.priority}志望 ・ {(t.schools as unknown as { name: string } | null)?.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">まだ登録されていません。</p>
          )}
        </div>

        <Link
          href="/friends"
          className="mt-6 flex items-center justify-between rounded-md border border-line bg-surface px-5 py-4 transition-colors hover:border-brand-600"
        >
          <div>
            <p className="text-xs text-muted">フレンド</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">友達の連続学習日数を見る</p>
          </div>
          <span className="text-brand-600">→</span>
        </Link>

        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="text-sm text-muted underline underline-offset-2 hover:text-foreground"
          >
            ログアウト
          </button>
        </form>
      </div>
      <InstallPrompt />
    </div>
  );
}
