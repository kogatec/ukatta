import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicChoices } from "@/lib/questions/publicView";
import type { QuestionFormat } from "@/lib/questions/types";

// 登録直後の5教科診断テスト（設計: 2026-08-04の合意事項）。
//
// 志望校の実際の受験科目（exam_subjects）を待たず、生徒の exam_track（高校受験/大学受験）に
// 属する5教科すべてを対象にする。「本番と同じ、範囲を知らない状態で解く」測定のため、
// 週次テストと同じくAI採点・時間割当ては行わず、配信可能な問題から決定論的に選ぶ。
//
// mock_examsは使わない（1科目=1模試という構造が5教科同時の診断には合わない）。
// 代わりに attempts.context='diagnostic' を直接使う（スキーマのcontext制約は元々これを想定済み）。
// 「完了したか」は状態を持たず、対象問題が全て解答済みかどうかで都度判定する（再開が自然にできる）。
//
// このAPIの初回呼び出し時、user_targets（第一志望）の exam_subjects が空であれば
// 5教科を既定配点で自動投入する。週次/日次サイクルが診断テストを待たずに動けるようにするため。

const MAX_ITEMS_PER_SUBJECT = 15;

interface QuestionJoin {
  id: string;
  format: QuestionFormat;
  body_md: string;
  choices: unknown;
  answer: unknown;
  explanation_md: string;
  est_time_sec: number;
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
    .select("id, exam_track")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });
  }

  const admin = createAdminClient();

  // 第一志望の exam_subjects が空なら、5教科を既定配点で自動投入する
  // （生徒本人が /settings/subjects を訪れなくても週次/日次サイクルが動くようにするため）。
  const { data: target } = await supabase
    .from("user_targets")
    .select("id, exam_subjects")
    .eq("user_id", appUser.id)
    .eq("priority", 1)
    .maybeSingle();

  const { data: trackSubjects } = await supabase
    .from("subjects")
    .select("id, code, name")
    .eq("exam_track", appUser.exam_track)
    .order("code");

  if (target && (!target.exam_subjects || (target.exam_subjects as unknown[]).length === 0)) {
    const defaultExamSubjects = (trackSubjects ?? []).map((s) => ({
      subject_id: s.id,
      weight_points: 100,
    }));
    if (defaultExamSubjects.length > 0) {
      await admin.from("user_targets").update({ exam_subjects: defaultExamSubjects }).eq("id", target.id);
    }
  }

  const subjectsResult = await buildDiagnosticItems(admin, appUser.id, trackSubjects ?? []);
  return NextResponse.json(subjectsResult);
}

async function buildDiagnosticItems(
  admin: SupabaseClient,
  userId: string,
  subjects: { id: string; code: string; name: string }[]
) {
  const bySubject = [];
  let totalItems = 0;
  let totalAnswered = 0;

  for (const subject of subjects) {
    const { data: questions } = await admin
      .from("questions")
      .select("id, format, body_md, choices, answer, explanation_md, est_time_sec")
      .eq("subject_id", subject.id)
      .eq("license_status", "deliverable")
      .order("created_at")
      .limit(MAX_ITEMS_PER_SUBJECT);

    const qs = (questions ?? []) as QuestionJoin[];
    if (qs.length === 0) continue;

    const { data: attempts } = await admin
      .from("attempts")
      .select("question_id, is_correct, answer_raw")
      .eq("user_id", userId)
      .eq("context", "diagnostic")
      .in(
        "question_id",
        qs.map((q) => q.id)
      );
    const attemptByQuestion = new Map((attempts ?? []).map((a) => [a.question_id as string, a]));

    const items = qs.map((q, idx) => {
      const attempt = attemptByQuestion.get(q.id);
      return {
        order_no: idx + 1,
        question_id: q.id,
        format: q.format,
        body_md: q.body_md,
        est_time_sec: q.est_time_sec,
        choices: publicChoices(q.format, q.choices, q.answer),
        answered: !!attempt,
        your_answer: attempt?.answer_raw ?? null,
      };
    });

    const answeredCount = items.filter((i) => i.answered).length;
    // attemptByQuestionはquestion_idで重複排除済み（同じ設問への複数回答があっても1件扱いにする）
    const correctCount = [...attemptByQuestion.values()].filter((a) => a.is_correct).length;
    totalItems += items.length;
    totalAnswered += answeredCount;

    bySubject.push({
      subject_id: subject.id,
      subject_code: subject.code,
      subject_name: subject.name,
      items,
      answered_count: answeredCount,
      correct_count: correctCount,
    });
  }

  return {
    subjects: bySubject,
    total_items: totalItems,
    total_answered: totalAnswered,
    completed: totalItems > 0 && totalAnswered === totalItems,
  };
}
