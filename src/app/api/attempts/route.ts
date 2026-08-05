import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuidLike } from "@/lib/validation";
import { gradeMark, gradeNumeric } from "@/lib/questions/grade";
import type {
  MarkChoices,
  NumericAnswer,
  NumericDistractor,
  QuestionFormat,
} from "@/lib/questions/types";
import { updateMastery, CONDITION_WEIGHT } from "@/lib/mastery";
import { nextReviewState, applyExamProximityCompression, type ReviewQueueState } from "@/lib/review-schedule";
import { daysUntil } from "@/lib/date";
import type { MeasurementContext } from "@/lib/weekly-cycle/types";

// 解答記録API（設計: docs/question-format.md §5, docs/learning-cycle.md §5）
//
// 採点はAIを使わず決定論的（grade.ts）。誤答タグも事前に問題へ埋め込んだものを引くだけ。
// 習熟度更新・復習キュー更新は生徒本人には書き込み権限が無いため（RLS）、
// service role（admin client）で行う。attempts自体は本人insertがRLSで許可されている。

const answerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mark"), key: z.string().nullable() }),
  z.object({ type: z.literal("numeric"), inputs: z.record(z.string(), z.string()) }),
]);

const bodySchema = z
  .object({
    question_id: uuidLike,
    mock_item_id: uuidLike.optional(),
    daily_mission_item_id: uuidLike.optional(),
    context: z.enum(["mock", "review", "drill", "diagnostic"]),
    answer: answerSchema,
    time_spent_sec: z.number().int().min(0),
    self_confidence: z.number().int().min(1).max(4).optional(),
  })
  .refine((d) => !(d.mock_item_id && d.daily_mission_item_id), {
    message: "mock_item_id と daily_mission_item_id は同時に指定できません",
  });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { question_id, mock_item_id, daily_mission_item_id, context, answer, time_spent_sec, self_confidence } =
    parsed.data;

  const { data: appUser } = await supabase
    .from("users")
    .select("id, exam_date")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });
  }
  const daysUntilExam = appUser.exam_date ? daysUntil(appUser.exam_date) : null;

  // ---- 出題元（模試 or 日次ミッション）から points・測定条件を確定する ----
  // question_id はクライアントが送るが、item側の question_id と突き合わせて検証する
  // （なりすまし・古い状態のクライアントによる不整合を防ぐ）。
  let points = 1;
  // 診断テストは「範囲を知らない状態で解く」という点で週次テストと同じ条件のため、
  // 重み(weekly_test)を高く扱う（docs/learning-cycle.md §5）。
  let measurementContext: MeasurementContext =
    context === "review" ? "review_session" : context === "diagnostic" ? "weekly_test" : "daily_drill";

  if (mock_item_id) {
    const { data: item } = await supabase
      .from("mock_exam_items")
      .select("question_id, points, mock_exams(kind)")
      .eq("id", mock_item_id)
      .maybeSingle();
    if (!item) {
      return NextResponse.json({ error: "mock_item not found" }, { status: 404 });
    }
    if (item.question_id !== question_id) {
      return NextResponse.json({ error: "question_id does not match mock_item_id" }, { status: 400 });
    }
    points = item.points;
    const kind = (item.mock_exams as unknown as { kind: string } | null)?.kind ?? "adhoc";
    // 週次テスト・月1回の本番シミュレーションは「本番の時間制約で通し」の条件のため重み大。
    // 単発(adhoc)の模試は日次ドリルと同じ重みで扱う。
    measurementContext = kind === "weekly" || kind === "monthly_full" ? "weekly_test" : "daily_drill";
  } else if (daily_mission_item_id) {
    const { data: item } = await supabase
      .from("daily_mission_items")
      .select("question_id")
      .eq("id", daily_mission_item_id)
      .maybeSingle();
    if (!item) {
      return NextResponse.json({ error: "daily_mission_item not found" }, { status: 404 });
    }
    if (item.question_id !== question_id) {
      return NextResponse.json(
        { error: "question_id does not match daily_mission_item_id" },
        { status: 400 }
      );
    }
  }

  // 採点には正答が要るが、questions は生徒に読み取り権限が無い
  // （正答をDB直叩きで抜かれるのを防ぐため、RLSの公開読み取りを廃止した）。
  // 採点・習熟度更新はいずれもservice roleで行う。
  const admin = createAdminClient();

  const { data: question } = await admin
    .from("questions")
    .select("format, choices, answer, distractors, explanation_md, license_status")
    .eq("id", question_id)
    .eq("license_status", "deliverable")
    .maybeSingle();
  if (!question) {
    return NextResponse.json({ error: "question not found or not deliverable" }, { status: 404 });
  }

  const format = question.format as QuestionFormat;
  if (format !== answer.type) {
    return NextResponse.json({ error: "answer type does not match question format" }, { status: 400 });
  }

  const result =
    format === "mark"
      ? gradeMark(question.choices as MarkChoices, (answer as { key: string | null }).key, points)
      : gradeNumeric(
          question.answer as NumericAnswer,
          question.distractors as NumericDistractor[] | null,
          (answer as { inputs: Record<string, string> }).inputs,
          points
        );

  // ---- attempts本体を記録する（本人insertはRLSで許可） ----
  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .insert({
      user_id: appUser.id,
      question_id,
      mock_item_id: mock_item_id ?? null,
      context,
      answer_raw: answer,
      is_correct: result.correct,
      awarded_points: result.awardedPoints,
      time_spent_sec,
      self_confidence: self_confidence ?? null,
      error_tag: result.errorTag,
      condition_weight: CONDITION_WEIGHT[measurementContext],
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: attemptError?.message ?? "failed to record attempt" }, { status: 500 });
  }

  // ---- 習熟度・復習キューの更新はservice role（生徒本人はRLSで書き込めない） ----
  const { data: tags } = await supabase
    .from("question_tags")
    .select("skill_tag_id")
    .eq("question_id", question_id);
  const skillTagIds = (tags ?? []).map((t) => t.skill_tag_id as string);

  for (const skillTagId of skillTagIds) {
    const { data: masteryRow } = await admin
      .from("mastery")
      .select("alpha, beta, sample_size")
      .eq("user_id", appUser.id)
      .eq("skill_tag_id", skillTagId)
      .maybeSingle();

    const state = masteryRow
      ? { alpha: Number(masteryRow.alpha), beta: Number(masteryRow.beta) }
      : { alpha: 1, beta: 1 };
    const updated = updateMastery(state, {
      correct: result.correct,
      format,
      selfConfidence: self_confidence ?? null,
      measurementContext,
    });

    await admin.from("mastery").upsert(
      {
        user_id: appUser.id,
        skill_tag_id: skillTagId,
        alpha: updated.alpha,
        beta: updated.beta,
        sample_size: (masteryRow?.sample_size ?? 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,skill_tag_id" }
    );

    // 復習キュー: FSRS（review-schedule.ts）で次回復習日を計算する。
    const { data: rqRow } = await admin
      .from("review_queue")
      .select("due_at, state, reps, lapses, stability, difficulty, last_review_at")
      .eq("user_id", appUser.id)
      .eq("skill_tag_id", skillTagId)
      .maybeSingle();

    const currentReview: ReviewQueueState | null = rqRow
      ? {
          dueAt: new Date(rqRow.due_at),
          state: rqRow.state as ReviewQueueState["state"],
          reps: rqRow.reps,
          lapses: rqRow.lapses,
          stability: rqRow.stability !== null ? Number(rqRow.stability) : 0,
          difficulty: rqRow.difficulty !== null ? Number(rqRow.difficulty) : 0,
          lastReviewAt: rqRow.last_review_at ? new Date(rqRow.last_review_at) : null,
        }
      : null;

    const now = new Date();
    const nextReview = nextReviewState(currentReview, result.correct, now);
    const dueAt = applyExamProximityCompression(nextReview.dueAt, now, daysUntilExam);

    await admin.from("review_queue").upsert(
      {
        user_id: appUser.id,
        skill_tag_id: skillTagId,
        due_at: dueAt.toISOString(),
        state: nextReview.state,
        reps: nextReview.reps,
        lapses: nextReview.lapses,
        stability: nextReview.stability,
        difficulty: nextReview.difficulty,
        last_review_at: nextReview.lastReviewAt?.toISOString() ?? null,
      },
      { onConflict: "user_id,skill_tag_id" }
    );
  }

  if (daily_mission_item_id) {
    const { data: item } = await admin
      .from("daily_mission_items")
      .update({ attempt_id: attempt.id })
      .eq("id", daily_mission_item_id)
      .select("daily_mission_id")
      .single();

    if (item) {
      const { data: siblings } = await admin
        .from("daily_mission_items")
        .select("attempt_id")
        .eq("daily_mission_id", item.daily_mission_id);
      const allAnswered = (siblings ?? []).every((s) => s.attempt_id !== null);

      await admin
        .from("daily_missions")
        .update({ status: allAnswered ? "completed" : "in_progress" })
        .eq("id", item.daily_mission_id);
    }
  }

  return NextResponse.json(
    {
      attempt_id: attempt.id,
      correct: result.correct,
      awarded_points: result.awardedPoints,
      error_tag: result.errorTag,
      why_ja: result.whyJa,
      root_skill_id: result.rootSkillId,
      explanation_md: question.explanation_md,
    },
    { status: 201 }
  );
}
