import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicChoices } from "@/lib/questions/publicView";
import type { QuestionFormat } from "@/lib/questions/types";
import { weekStartOf } from "@/lib/weekly-cycle/week";
import { daysUntil } from "@/lib/date";
import { examStageFromDaysLeft, stageProfile } from "@/lib/weekly-cycle/examStage";
import { computeSubjectWeakness } from "@/lib/weekly-cycle/weakness";
import {
  computeSubjectAllocation,
  computeLayerAllocation,
  planDailySubjects,
  LAMBDA,
  BALANCE_GUARD,
} from "@/lib/weekly-cycle/allocation";
import type { MissionLayer } from "@/lib/weekly-cycle/types";

// 今日のミッション取得・生成（設計: docs/learning-cycle.md §4）
//
// 3層構成（復習期限・今週の重点・維持）に配分し、実際に配信可能な問題を選ぶ。
// AIによるブループリント生成は行わず、既存プールから条件に合う問題を決定論的に選ぶ
// （§5.2 と同じ考え方: 直近90日以内に解いた問題は除外）。
//
// 「4日連続ゼロ禁止」ガードは維持層の科目配分にのみ適用している。復習・重点層で
// その科目が触れられていれば実質的に出題頻度は満たされているため、この簡略化は
// 許容範囲と判断した（厳密な全層横断のガードは未実装）。

const MINUTES_PER_QUESTION = 3;
const RECENT_EXCLUSION_DAYS = 90; // DESIGN.md §5.2 と同じ基準
const ZERO_STREAK_LOOKBACK_DAYS = BALANCE_GUARD.maxZeroStreakDays;

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface PlannedItem {
  questionId: string;
  subjectId: string;
  layer: MissionLayer;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id, exam_date")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });
  }

  const admin = createAdminClient();
  const today = todayDateStr();

  const { data: existing } = await admin
    .from("daily_missions")
    .select("id, status, estimated_minutes")
    .eq("user_id", appUser.id)
    .eq("mission_date", today)
    .maybeSingle();

  if (existing) {
    // 前回の生成時点で配信可能な問題が1問も無かった場合、そのまま返すと
    // 「後から問題プールが増えても一生空のまま」になってしまう。
    // まだ手を付けていない（pending）空ミッションに限り、削除して作り直す。
    const { count: existingItemCount } = await admin
      .from("daily_mission_items")
      .select("id", { count: "exact", head: true })
      .eq("daily_mission_id", existing.id);
    if ((existingItemCount ?? 0) > 0 || existing.status !== "pending") {
      return buildMissionResponse(admin, existing.id, existing.status, existing.estimated_minutes);
    }
    await admin.from("daily_missions").delete().eq("id", existing.id);
  }

  const { data: target } = await supabase
    .from("user_targets")
    .select("exam_subjects")
    .eq("user_id", appUser.id)
    .eq("priority", 1)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "no target school registered" }, { status: 400 });
  }

  const examSubjects = target.exam_subjects as { subject_id: string; weight_points: number }[];
  if (!examSubjects || examSubjects.length === 0) {
    return NextResponse.json({ error: "target has no exam subjects" }, { status: 400 });
  }

  const daysLeft = appUser.exam_date ? daysUntil(appUser.exam_date) : 400;
  const stage = examStageFromDaysLeft(daysLeft);
  const profile = stageProfile(stage);
  const totalQuestions = Math.max(1, Math.round(profile.dailyMinutes / MINUTES_PER_QUESTION));
  const lambda = stage === "final" ? LAMBDA.finalStage : LAMBDA.default;

  const subjectAllocation = computeSubjectAllocation(
    await Promise.all(
      examSubjects.map(async (es) => ({
        subjectId: es.subject_id,
        weightPoints: es.weight_points,
        weaknessLevel: await computeSubjectWeakness(admin, appUser.id, es.subject_id),
      }))
    ),
    lambda
  );

  const nowIso = new Date().toISOString();
  const { data: dueReview } = await admin
    .from("review_queue")
    .select("skill_tag_id, due_at")
    .eq("user_id", appUser.id)
    .lte("due_at", nowIso)
    .neq("state", "suspended")
    .order("due_at", { ascending: true });

  const layers = computeLayerAllocation(totalQuestions, (dueReview ?? []).length);

  const weekStart = weekStartOf(new Date());
  const { data: plan } = await admin
    .from("weekly_plans")
    .select("id")
    .eq("user_id", appUser.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  let focusUnits: { skill_tag_id: string; priority_score: number }[] = [];
  if (plan) {
    const { data: units } = await admin
      .from("weekly_plan_units")
      .select("skill_tag_id, priority_score")
      .eq("weekly_plan_id", plan.id)
      .eq("achieved", false)
      .order("priority_score", { ascending: false });
    focusUnits = units ?? [];
  }

  const zeroStreakDays = await computeZeroStreakDays(admin, appUser.id, examSubjects.map((s) => s.subject_id), today);

  const subjectPlan = planDailySubjects({
    targetShares: subjectAllocation,
    totalQuestionsToday: layers.maintenance,
    zeroStreakDays,
  });

  const usedQuestionIds = new Set<string>();
  const excludeSince = new Date();
  excludeSince.setUTCDate(excludeSince.getUTCDate() - RECENT_EXCLUSION_DAYS);
  const excludeSinceIso = excludeSince.toISOString();

  const plannedItems: PlannedItem[] = [];

  // 層1: 復習期限
  for (const rq of (dueReview ?? []).slice(0, layers.review)) {
    const picked = await pickQuestionForSkillTag(admin, appUser.id, rq.skill_tag_id, usedQuestionIds, excludeSinceIso);
    if (!picked) continue;
    usedQuestionIds.add(picked.id);
    plannedItems.push({ questionId: picked.id, subjectId: picked.subject_id, layer: "review" });
  }

  // 層2: 今週の重点（優先度順のラウンドロビン）
  if (focusUnits.length > 0) {
    let i = 0;
    const maxTries = layers.focus * focusUnits.length;
    while (plannedItems.filter((p) => p.layer === "focus").length < layers.focus && i < maxTries) {
      const unit = focusUnits[i % focusUnits.length];
      i++;
      const picked = await pickQuestionForSkillTag(
        admin,
        appUser.id,
        unit.skill_tag_id,
        usedQuestionIds,
        excludeSinceIso
      );
      if (!picked) continue;
      usedQuestionIds.add(picked.id);
      plannedItems.push({ questionId: picked.id, subjectId: picked.subject_id, layer: "focus" });
    }
  }

  // 層3: 維持（科目バランスに従う）。
  // 重点単元が無い/選定できなかった分は、復習期限と同様にここへ繰り込む
  // （さもないと「今週の重点がまだ無い」初回ユーザーで問題数が静かに減ってしまう）。
  const focusShortfall = layers.focus - plannedItems.filter((p) => p.layer === "focus").length;
  const maintenanceTotal = layers.maintenance + Math.max(focusShortfall, 0);
  const maintenancePlan =
    maintenanceTotal === layers.maintenance
      ? subjectPlan
      : planDailySubjects({
          targetShares: subjectAllocation,
          totalQuestionsToday: maintenanceTotal,
          zeroStreakDays,
        });

  for (const sp of maintenancePlan) {
    for (let n = 0; n < sp.questionCount; n++) {
      const picked = await pickQuestionForSubject(admin, appUser.id, sp.subjectId, usedQuestionIds, excludeSinceIso);
      if (!picked) continue;
      usedQuestionIds.add(picked.id);
      plannedItems.push({ questionId: picked.id, subjectId: picked.subject_id, layer: "maintenance" });
    }
  }

  const { data: mission, error: missionError } = await admin
    .from("daily_missions")
    .insert({
      user_id: appUser.id,
      mission_date: today,
      weekly_plan_id: plan?.id ?? null,
      estimated_minutes: profile.dailyMinutes,
    })
    .select("id, status, estimated_minutes")
    .single();
  if (missionError || !mission) {
    return NextResponse.json(
      { error: missionError?.message ?? "failed to create daily mission" },
      { status: 500 }
    );
  }

  if (plannedItems.length > 0) {
    const rows = plannedItems.map((p, idx) => ({
      daily_mission_id: mission.id,
      question_id: p.questionId,
      subject_id: p.subjectId,
      layer: p.layer,
      order_no: idx + 1,
    }));
    await admin.from("daily_mission_items").insert(rows);
  }

  return buildMissionResponse(admin, mission.id, mission.status, mission.estimated_minutes);
}

interface QuestionJoin {
  id: string;
  format: QuestionFormat;
  body_md: string;
  choices: unknown;
  answer: unknown;
  explanation_md: string;
  est_time_sec: number;
}

interface MissionItemRow {
  id: string;
  order_no: number;
  layer: string;
  subject_id: string;
  question_id: string;
  attempt_id: string | null;
  questions: QuestionJoin | QuestionJoin[] | null;
}

function oneQuestion(q: MissionItemRow["questions"]): QuestionJoin | null {
  if (!q) return null;
  return Array.isArray(q) ? q[0] ?? null : q;
}

/**
 * 日次ミッションの出題を組み立てる。週次テストと違い「単元が分かっている」前提の
 * 演習なので、解答済みの設問は即座に正誤・解説を開示する（未解答分のみ隠す）。
 */
async function buildMissionResponse(
  admin: SupabaseClient,
  missionId: string,
  status: string,
  estimatedMinutes: number
) {
  const { data: items } = await admin
    .from("daily_mission_items")
    .select(
      "id, order_no, layer, subject_id, question_id, attempt_id, questions(id, format, body_md, choices, answer, explanation_md, est_time_sec)"
    )
    .eq("daily_mission_id", missionId)
    .order("order_no");

  const attemptIds = (items ?? [])
    .map((i) => (i as unknown as MissionItemRow).attempt_id)
    .filter((id): id is string => !!id);
  const { data: attempts } = attemptIds.length
    ? await admin.from("attempts").select("id, is_correct, awarded_points, error_tag").in("id", attemptIds)
    : { data: [] as { id: string; is_correct: boolean; awarded_points: number; error_tag: string | null }[] };
  const attemptById = new Map((attempts ?? []).map((a) => [a.id, a]));

  const responseItems = (items ?? []).flatMap((row) => {
    const r = row as unknown as MissionItemRow;
    const q = oneQuestion(r.questions);
    if (!q) return [];
    const attempt = r.attempt_id ? attemptById.get(r.attempt_id) : undefined;
    const revealed = !!attempt;
    return [
      {
        id: r.id,
        order_no: r.order_no,
        layer: r.layer,
        subject_id: r.subject_id,
        question_id: r.question_id,
        format: q.format,
        body_md: q.body_md,
        est_time_sec: q.est_time_sec,
        choices: revealed ? q.choices : publicChoices(q.format, q.choices, q.answer),
        explanation_md: revealed ? q.explanation_md : undefined,
        answered: revealed,
        correct: revealed ? attempt!.is_correct : null,
        error_tag: revealed ? attempt!.error_tag : null,
      },
    ];
  });

  return NextResponse.json({
    daily_mission_id: missionId,
    status,
    estimated_minutes: estimatedMinutes,
    items: responseItems,
  });
}

async function pickQuestionForSkillTag(
  admin: SupabaseClient,
  userId: string,
  skillTagId: string,
  usedQuestionIds: Set<string>,
  excludeSinceIso: string
): Promise<{ id: string; subject_id: string } | null> {
  const { data: qt } = await admin.from("question_tags").select("question_id").eq("skill_tag_id", skillTagId);
  const candidateIds = (qt ?? []).map((q) => q.question_id as string).filter((id) => !usedQuestionIds.has(id));
  if (candidateIds.length === 0) return null;

  const { data: qs } = await admin
    .from("questions")
    .select("id, subject_id")
    .in("id", candidateIds)
    .eq("license_status", "deliverable");
  if (!qs || qs.length === 0) return null;

  return pickLeastRecentlySeen(admin, userId, qs, excludeSinceIso);
}

async function pickQuestionForSubject(
  admin: SupabaseClient,
  userId: string,
  subjectId: string,
  usedQuestionIds: Set<string>,
  excludeSinceIso: string
): Promise<{ id: string; subject_id: string } | null> {
  const { data: qs } = await admin
    .from("questions")
    .select("id, subject_id")
    .eq("subject_id", subjectId)
    .eq("license_status", "deliverable")
    .limit(50);
  const remaining = (qs ?? []).filter((q) => !usedQuestionIds.has(q.id));
  if (remaining.length === 0) return null;

  return pickLeastRecentlySeen(admin, userId, remaining, excludeSinceIso);
}

/** 直近 RECENT_EXCLUSION_DAYS 日以内に解いていない問題を優先する。全て既出なら仕方なく再出題する。 */
async function pickLeastRecentlySeen(
  admin: SupabaseClient,
  userId: string,
  candidates: { id: string; subject_id: string }[],
  excludeSinceIso: string
): Promise<{ id: string; subject_id: string } | null> {
  const { data: recent } = await admin
    .from("attempts")
    .select("question_id")
    .eq("user_id", userId)
    .in(
      "question_id",
      candidates.map((c) => c.id)
    )
    .gte("created_at", excludeSinceIso);
  const excluded = new Set((recent ?? []).map((r) => r.question_id as string));

  return candidates.find((c) => !excluded.has(c.id)) ?? candidates[0] ?? null;
}

/** 直近maxZeroStreakDays日、科目ごとに一度も出題されていない連続日数を数える。 */
async function computeZeroStreakDays(
  admin: SupabaseClient,
  userId: string,
  subjectIds: string[],
  today: string
): Promise<Record<string, number>> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - ZERO_STREAK_LOOKBACK_DAYS);

  const { data: recentMissions } = await admin
    .from("daily_missions")
    .select("id, mission_date")
    .eq("user_id", userId)
    .gte("mission_date", since.toISOString().slice(0, 10))
    .lt("mission_date", today)
    .order("mission_date", { ascending: false });

  const missionIds = (recentMissions ?? []).map((m) => m.id as string);
  const recentItems = missionIds.length
    ? (
        await admin
          .from("daily_mission_items")
          .select("subject_id, daily_mission_id")
          .in("daily_mission_id", missionIds)
      ).data ?? []
    : [];

  const zeroStreakDays: Record<string, number> = {};
  for (const subjectId of subjectIds) {
    let streak = 0;
    for (const m of recentMissions ?? []) {
      const hasItem = recentItems.some(
        (i) => i.daily_mission_id === m.id && i.subject_id === subjectId
      );
      if (hasItem) break;
      streak++;
    }
    zeroStreakDays[subjectId] = streak;
  }
  return zeroStreakDays;
}
