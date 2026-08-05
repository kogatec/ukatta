// 診断テストの進捗判定。src/app/api/diagnostic/route.ts と同じ上限(1教科あたり最大15問)を使う。
// ホーム画面（診断未完了なら/diagnosticへ誘導）とAPIルートの両方から使う軽量版。
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const DIAGNOSTIC_MAX_ITEMS_PER_SUBJECT = 15;

export interface DiagnosticProgress {
  totalItems: number;
  answered: number;
  completed: boolean;
}

export async function getDiagnosticProgress(
  supabase: SupabaseClient,
  userId: string,
  examTrack: string
): Promise<DiagnosticProgress> {
  const { data: subjects } = await supabase.from("subjects").select("id").eq("exam_track", examTrack);

  // questions は生徒に読み取り権限が無い（正答が漏れるためRLSの公開読み取りを廃止した）。
  // ここで要るのは「何問あるか」という件数だけなので、service roleで数える。
  const admin = createAdminClient();

  let totalItems = 0;
  for (const s of subjects ?? []) {
    const { data: qs } = await admin
      .from("questions")
      .select("id")
      .eq("subject_id", s.id)
      .eq("license_status", "deliverable")
      .limit(DIAGNOSTIC_MAX_ITEMS_PER_SUBJECT);
    totalItems += (qs ?? []).length;
  }

  const { count: answered } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("context", "diagnostic");

  const answeredCount = answered ?? 0;
  return {
    totalItems,
    answered: answeredCount,
    completed: totalItems === 0 || answeredCount >= totalItems,
  };
}
