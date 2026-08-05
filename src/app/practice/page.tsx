import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PracticeRunner from "./PracticeRunner";

export default async function PracticePage() {
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

  const { data: target } = await supabase
    .from("user_targets")
    .select("exam_subjects")
    .eq("user_id", appUser.id)
    .eq("priority", 1)
    .maybeSingle();

  const examSubjects = (target?.exam_subjects as { subject_id: string; weight_points: number }[]) ?? [];

  if (examSubjects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted">受験科目がまだ設定されていません。</p>
        <a
          href="/settings/subjects"
          className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
        >
          受験科目を設定する
        </a>
      </div>
    );
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .in(
      "id",
      examSubjects.map((s) => s.subject_id)
    );

  return <PracticeRunner subjects={subjects ?? []} />;
}
