import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicChoices } from "@/lib/questions/publicView";
import type { QuestionFormat } from "@/lib/questions/types";

// 模試（週次テスト）の受験画面向け取得（設計: docs/learning-cycle.md §6 /weekly/test）
//
// 「本番形式」である以上、受験中は正答・誤答タグ・numericの正答値を一切返さない
// （publicChoices）。採点結果は POST /submit 後、レポート画面側で別途取得する。
//
// mock_exams はRLSにselect/insertしか無く updateが無いため、
// status: ready → in_progress の遷移は service role で行う。

interface QuestionJoin {
  id: string;
  format: QuestionFormat;
  body_md: string;
  choices: unknown;
  answer: unknown;
  distractors: unknown;
  explanation_md: string;
  est_time_sec: number;
}

interface ItemRow {
  id: string;
  order_no: number;
  question_id: string;
  points: number;
  questions: QuestionJoin | QuestionJoin[] | null;
}

function oneQuestion(q: ItemRow["questions"]): QuestionJoin | null {
  if (!q) return null;
  return Array.isArray(q) ? q[0] ?? null : q;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: mockExamId } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });
  }

  const { data: exam } = await supabase
    .from("mock_exams")
    .select("id, title, subject_id, kind, status, time_limit_min, total_points, started_at, submitted_at")
    .eq("id", mockExamId)
    .maybeSingle();
  if (!exam) {
    return NextResponse.json({ error: "mock exam not found" }, { status: 404 });
  }

  // questions は生徒に直接の読み取り権限が無い（正答が漏れるため。RLSで公開読み取りを廃止済み）。
  // 上で exam の所有者確認をRLS経由で済ませているため、ここから先はservice roleで読んでよい。
  const admin = createAdminClient();

  const { data: items } = await admin
    .from("mock_exam_items")
    .select(
      "id, order_no, question_id, points, questions(id, format, body_md, choices, answer, distractors, explanation_md, est_time_sec)"
    )
    .eq("mock_exam_id", mockExamId)
    .order("order_no");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("mock_item_id, is_correct, awarded_points, answer_raw")
    .eq("user_id", appUser.id)
    .in("mock_item_id", (items ?? []).map((i) => i.id));
  const attemptByItem = new Map((attempts ?? []).map((a) => [a.mock_item_id as string, a]));

  const revealed = exam.status === "submitted" || exam.status === "graded";

  const responseItems = (items ?? []).flatMap((row) => {
    const q = oneQuestion((row as unknown as ItemRow).questions);
    if (!q) return [];
    const attempt = attemptByItem.get(row.id);
    return [
      {
        id: row.id,
        order_no: row.order_no,
        question_id: row.question_id,
        points: row.points,
        format: q.format,
        body_md: q.body_md,
        est_time_sec: q.est_time_sec,
        choices: revealed ? q.choices : publicChoices(q.format, q.choices, q.answer),
        answer: revealed ? q.answer : undefined,
        explanation_md: revealed ? q.explanation_md : undefined,
        answered: !!attempt,
        your_answer: attempt?.answer_raw ?? null,
        correct: revealed ? attempt?.is_correct ?? null : null,
        awarded_points: revealed ? attempt?.awarded_points ?? null : null,
      },
    ];
  });

  if (exam.status === "ready") {
    const startedAt = new Date().toISOString();
    await admin.from("mock_exams").update({ status: "in_progress", started_at: startedAt }).eq("id", mockExamId);
    exam.status = "in_progress";
    exam.started_at = startedAt;
  }

  return NextResponse.json({
    id: exam.id,
    title: exam.title,
    subject_id: exam.subject_id,
    kind: exam.kind,
    status: exam.status,
    time_limit_min: exam.time_limit_min,
    total_points: exam.total_points,
    started_at: exam.started_at,
    submitted_at: exam.submitted_at,
    items: responseItems,
  });
}
