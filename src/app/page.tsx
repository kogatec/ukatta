import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import InstallPrompt from "@/components/InstallPrompt";
import { daysUntil } from "@/lib/date";

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
    redirect("/login");
  }

  const { data: user } = await supabase
    .from("users")
    .select("display_name, grade_level, exam_track, exam_date")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!user) {
    redirect("/onboarding");
  }

  const { data: targets } = await supabase
    .from("user_targets")
    .select("priority, schools(name)")
    .order("priority", { ascending: true });

  const daysLeft = user.exam_date ? daysUntil(user.exam_date) : null;

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs tracking-widest text-brand-600">UKATTA</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {user.display_name}さん、おかえりなさい。
        </h1>
        <p className="mt-1 text-sm text-muted">
          {GRADE_LABEL[user.grade_level] ?? user.grade_level} ・{" "}
          {user.exam_track === "highschool" ? "高校受験" : "大学受験"}
        </p>

        <div className="mt-8 rounded-md border border-line bg-surface p-6">
          <p className="text-xs font-mono tracking-widest text-muted">EXAM COUNTDOWN</p>
          <p className="mt-2 text-4xl font-bold text-brand-600">
            {daysLeft !== null ? `${daysLeft}日` : "未設定"}
          </p>
        </div>

        <div className="mt-6 rounded-md border border-line bg-sky p-6">
          <p className="text-xs font-mono tracking-widest text-muted">志望校</p>
          {targets && targets.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-foreground">
              {targets.map((t, i) => (
                <li key={i}>
                  第{t.priority}志望 ・ {(t.schools as unknown as { name: string } | null)?.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">まだ登録されていません。</p>
          )}
        </div>

        <form action={signOut} className="mt-10">
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
