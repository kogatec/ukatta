// ホーム画面向け: 教科別スコアと弱点単元の算出。
// 「スコア」は mastery（ベータ分布 α/(α+β)）を、実際に解いた（sample_size>0）
// スキルタグに限って教科ごとに平均したもの。診断テストの結果がそのまま初期値になり、
// 以降のドリル・週次テストの解答で継続的に更新される（同じ推定量を使い続ける一貫性）。
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SubjectScore {
  subject_id: string;
  subject_name: string;
  mastery: number | null; // 0〜1。未計測ならnull
  sample_size: number;
}

export interface WeaknessUnit {
  skill_tag_id: string;
  skill_tag_name: string;
  subject_name: string;
  mastery: number;
}

export interface DashboardStats {
  subjectScores: SubjectScore[];
  weaknesses: WeaknessUnit[];
}

const MAX_WEAKNESSES = 5;

export async function getDashboardStats(
  supabase: SupabaseClient,
  userId: string,
  examTrack: string
): Promise<DashboardStats> {
  const { data: subjects } = await supabase.from("subjects").select("id, name").eq("exam_track", examTrack);
  const subjectList = subjects ?? [];
  const subjectNameById = new Map(subjectList.map((s) => [s.id, s.name]));

  const { data: masteryRows } = await supabase
    .from("mastery")
    .select("skill_tag_id, alpha, beta, sample_size")
    .eq("user_id", userId)
    .gt("sample_size", 0);

  if (!masteryRows || masteryRows.length === 0) {
    return {
      subjectScores: subjectList.map((s) => ({ subject_id: s.id, subject_name: s.name, mastery: null, sample_size: 0 })),
      weaknesses: [],
    };
  }

  const { data: skillTags } = await supabase
    .from("skill_tags")
    .select("id, name, units(subject_id)")
    .in(
      "id",
      masteryRows.map((m) => m.skill_tag_id)
    );
  const tagById = new Map((skillTags ?? []).map((t) => [t.id, t]));

  const perSubject = new Map<string, { sum: number; count: number }>();
  const weaknessCandidates: WeaknessUnit[] = [];

  for (const m of masteryRows) {
    const tag = tagById.get(m.skill_tag_id as string) as unknown as
      | { id: string; name: string; units: { subject_id: string } | null }
      | undefined;
    const subjectId = tag?.units?.subject_id;
    if (!tag || !subjectId || !subjectNameById.has(subjectId)) continue; // 別トラックのタグは無視

    const mastery = Number(m.alpha) / (Number(m.alpha) + Number(m.beta));
    const agg = perSubject.get(subjectId) ?? { sum: 0, count: 0 };
    agg.sum += mastery;
    agg.count += 1;
    perSubject.set(subjectId, agg);

    weaknessCandidates.push({
      skill_tag_id: tag.id,
      skill_tag_name: tag.name,
      subject_name: subjectNameById.get(subjectId)!,
      mastery,
    });
  }

  const subjectScores: SubjectScore[] = subjectList.map((s) => {
    const agg = perSubject.get(s.id);
    return {
      subject_id: s.id,
      subject_name: s.name,
      mastery: agg ? agg.sum / agg.count : null,
      sample_size: agg?.count ?? 0,
    };
  });

  const weaknesses = weaknessCandidates.sort((a, b) => a.mastery - b.mastery).slice(0, MAX_WEAKNESSES);

  return { subjectScores, weaknesses };
}
