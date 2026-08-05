import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectsForm from "./SubjectsForm";

export default async function SubjectsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id, exam_track")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    redirect("/onboarding");
  }

  const { data: target } = await supabase
    .from("user_targets")
    .select("id, exam_subjects, schools(name)")
    .eq("user_id", appUser.id)
    .eq("priority", 1)
    .maybeSingle();

  if (!target) {
    redirect("/onboarding");
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("exam_track", appUser.exam_track)
    .order("name");

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs tracking-widest text-brand-600">UKATTA</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">受験科目を設定</h1>
        <p className="mt-1 text-sm text-muted">
          {(target.schools as unknown as { name: string } | null)?.name} の受験科目と配点を選んでください。
          週次テスト・日次ミッションの科目配分に使います。
        </p>

        <SubjectsForm
          targetId={target.id}
          subjects={subjects ?? []}
          initialExamSubjects={
            (target.exam_subjects as { subject_id: string; weight_points: number }[]) ?? []
          }
        />
      </div>
    </div>
  );
}
