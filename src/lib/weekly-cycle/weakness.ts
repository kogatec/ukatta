import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 科目の弱点度（0〜1）を、その科目に属する単元群のmasteryの平均から計算する。
 * データが無ければ中立値0.5（Beta(1,1)の事前分布のmasteryと一致）を返す。
 *
 * 週次計画の生成（科目選択）と日次ミッションの生成（配点比率×弱点度の配分）の
 * 両方で同じ定義を使う必要があるため、ここに共通化する。
 */
export async function computeSubjectWeakness(
  admin: SupabaseClient,
  userId: string,
  subjectId: string
): Promise<number> {
  const { data: units } = await admin.from("units").select("id").eq("subject_id", subjectId);
  const unitIds = (units ?? []).map((u) => u.id as string);
  if (unitIds.length === 0) return 0.5;

  const { data: skillTags } = await admin.from("skill_tags").select("id").in("unit_id", unitIds);
  const skillTagIds = (skillTags ?? []).map((s) => s.id as string);
  if (skillTagIds.length === 0) return 0.5;

  const { data: masteryRows } = await admin
    .from("mastery")
    .select("mastery")
    .eq("user_id", userId)
    .in("skill_tag_id", skillTagIds)
    .gt("sample_size", 0);

  if (!masteryRows || masteryRows.length === 0) return 0.5;

  const avg = masteryRows.reduce((sum, r) => sum + Number(r.mastery), 0) / masteryRows.length;
  return 1 - avg;
}
