// 週次計画（週次テスト＋重点単元）の表示用データ整形。
// /api/weekly-plan/current と /api/weekly-plan/[id] の両方から使う共通ロジック。

import type { SupabaseClient } from "@supabase/supabase-js";

export interface PlanSubjectView {
  subject_id: string;
  subject_name: string;
  time_limit_min: number;
  mock_exam_id: string | null;
  mock_exam_status: string | null;
  submitted_at: string | null;
  total_points: number | null;
  question_count: number;
  correct_count: number;
  awarded_points: number;
}

export interface PlanUnitView {
  skill_tag_id: string;
  skill_tag_name: string;
  unit_name: string;
  priority_score: number;
  target_mastery: number;
  achieved: boolean;
  achieved_at: string | null;
}

export async function loadPlanSubjects(
  supabase: SupabaseClient,
  planId: string,
  userId: string
): Promise<PlanSubjectView[]> {
  const { data: subjects } = await supabase
    .from("weekly_plan_subjects")
    .select("subject_id, time_limit_min, mock_exam_id, subjects(name), mock_exams(status, submitted_at, total_points)")
    .eq("weekly_plan_id", planId);

  const result: PlanSubjectView[] = [];
  for (const s of subjects ?? []) {
    let questionCount = 0;
    let correctCount = 0;
    let awardedPoints = 0;

    if (s.mock_exam_id) {
      const { data: items } = await supabase
        .from("mock_exam_items")
        .select("id")
        .eq("mock_exam_id", s.mock_exam_id);
      const itemIds = (items ?? []).map((i) => i.id as string);
      questionCount = itemIds.length;

      if (itemIds.length > 0) {
        const { data: attempts } = await supabase
          .from("attempts")
          .select("is_correct, awarded_points")
          .eq("user_id", userId)
          .in("mock_item_id", itemIds);
        correctCount = (attempts ?? []).filter((a) => a.is_correct).length;
        awardedPoints = (attempts ?? []).reduce((sum, a) => sum + Number(a.awarded_points ?? 0), 0);
      }
    }

    const mockExam = s.mock_exams as unknown as {
      status: string;
      submitted_at: string | null;
      total_points: number;
    } | null;

    result.push({
      subject_id: s.subject_id as string,
      subject_name: (s.subjects as unknown as { name: string } | null)?.name ?? "",
      time_limit_min: s.time_limit_min as number,
      mock_exam_id: (s.mock_exam_id as string) ?? null,
      mock_exam_status: mockExam?.status ?? null,
      submitted_at: mockExam?.submitted_at ?? null,
      total_points: mockExam?.total_points ?? null,
      question_count: questionCount,
      correct_count: correctCount,
      awarded_points: awardedPoints,
    });
  }
  return result;
}

export async function loadPlanUnits(supabase: SupabaseClient, planId: string): Promise<PlanUnitView[]> {
  const { data: units } = await supabase
    .from("weekly_plan_units")
    .select("skill_tag_id, priority_score, target_mastery, achieved, achieved_at, skill_tags(name, units(name))")
    .eq("weekly_plan_id", planId)
    .order("priority_score", { ascending: false });

  return (units ?? []).map((u) => {
    const skillTag = u.skill_tags as unknown as { name: string; units: { name: string } | null } | null;
    return {
      skill_tag_id: u.skill_tag_id as string,
      skill_tag_name: skillTag?.name ?? "",
      unit_name: skillTag?.units?.name ?? "",
      priority_score: Number(u.priority_score),
      target_mastery: Number(u.target_mastery),
      achieved: u.achieved as boolean,
      achieved_at: (u.achieved_at as string) ?? null,
    };
  });
}
