// 科目内の各スキルタグについて、優先度スコア算出に必要な3要素
// （習熟度・志望校での出題頻度・配点シェア）を集計する。
// weekly-plan/[id]/analyze と /api/practice/next の両方から使う共通ロジック。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UnitPriorityCandidate } from "./types";

export async function computeSkillTagCandidates(
  admin: SupabaseClient,
  userId: string,
  subjectId: string,
  schoolId: string | null
): Promise<UnitPriorityCandidate[]> {
  const { data: units } = await admin.from("units").select("id").eq("subject_id", subjectId);
  const unitIds = (units ?? []).map((u) => u.id as string);
  if (unitIds.length === 0) return [];

  const { data: skillTags } = await admin.from("skill_tags").select("id, unit_id").in("unit_id", unitIds);
  if (!skillTags || skillTags.length === 0) return [];

  const unitFreq: Record<string, number> = {};
  const unitPoints: Record<string, number> = {};
  let totalItems = 0;
  let totalPoints = 0;

  if (schoolId) {
    const { data: papers } = await admin.from("past_papers").select("id").eq("subject_id", subjectId).eq("school_id", schoolId);
    const paperIds = (papers ?? []).map((p) => p.id as string);

    if (paperIds.length > 0) {
      const { data: items } = await admin.from("past_paper_items").select("unit_ids, points").in("paper_id", paperIds);
      for (const item of items ?? []) {
        totalItems++;
        totalPoints += item.points as number;
        for (const unitId of item.unit_ids as string[]) {
          unitFreq[unitId] = (unitFreq[unitId] ?? 0) + 1;
          unitPoints[unitId] = (unitPoints[unitId] ?? 0) + (item.points as number);
        }
      }
    }
  }

  const hasBlueprintData = totalItems > 0;

  const { data: masteryRows } = await admin
    .from("mastery")
    .select("skill_tag_id, mastery")
    .eq("user_id", userId)
    .in(
      "skill_tag_id",
      skillTags.map((s) => s.id)
    );
  const masteryBySkill = new Map((masteryRows ?? []).map((m) => [m.skill_tag_id as string, Number(m.mastery)]));

  return skillTags.map((tag) => ({
    skillTagId: tag.id as string,
    mastery: masteryBySkill.get(tag.id as string) ?? 0.5,
    examFrequency: hasBlueprintData ? (unitFreq[tag.unit_id as string] ?? 0) / totalItems : 1,
    pointsShare: hasBlueprintData ? (unitPoints[tag.unit_id as string] ?? 0) / totalPoints : 1,
  }));
}
