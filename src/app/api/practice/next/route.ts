import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicChoices } from "@/lib/questions/publicView";
import type { QuestionFormat } from "@/lib/questions/types";
import { computeSubjectWeakness } from "@/lib/weekly-cycle/weakness";
import { computeSkillTagCandidates } from "@/lib/weekly-cycle/priorityCandidates";
import { rankUnitsByPriority } from "@/lib/weekly-cycle/weeklyReview";

// 演習モード（設計: 2026-08-05の合意事項）。
//
// 日次ミッションは「今日はここまで」という上限付きの割り当てだが、
// 生徒が自発的に何度でも練習できる無制限の出題エンドポイントをここに用意する。
// 週次サイクルの mock_exams / daily_missions のような「まとまった1セッション」を
// 表すレコードは作らず、1問ずつ都度リクエストするステートレスな設計にする
// （「もう1問」を押すたびにこのAPIを呼ぶだけでよい）。
//
// 出題ロジック:
//   1. 科目: 指定が無ければ、志望校の受験科目の中から苦手なものほど選ばれやすい重み付け抽選
//   2. 単元: 「(1-習熟度)×志望校での出題頻度×配点」（weeklyReview.tsと同じ優先度式）で重み付け抽選
//   3. 問題: その単元に属する配信可能な問題のうち、直近に解いていないものを優先してランダムに1問
//
// 採点は既存の /api/attempts をそのまま使う（context: "drill" として扱う）。

const RECENT_EXCLUSION_HOURS = 20; // 「同じ問題を今日何度も出さない」程度の除外期間

interface QuestionJoin {
  id: string;
  format: QuestionFormat;
  body_md: string;
  choices: unknown;
  answer: unknown;
  explanation_md: string;
  est_time_sec: number;
  license_status: string;
}

function oneQuestion(q: unknown): QuestionJoin | null {
  if (!q) return null;
  return Array.isArray(q) ? ((q[0] as QuestionJoin) ?? null) : (q as QuestionJoin);
}

function weightedPick<T>(items: T[], weight: (item: T) => number): T | null {
  if (items.length === 0) return null;
  const weights = items.map((i) => Math.max(0, weight(i)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedSubjectId = searchParams.get("subject_id");

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

  const admin = createAdminClient();

  const { data: target } = await supabase
    .from("user_targets")
    .select("school_id, exam_subjects")
    .eq("user_id", appUser.id)
    .eq("priority", 1)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "no target school registered" }, { status: 400 });
  }
  const examSubjects = (target.exam_subjects ?? []) as { subject_id: string; weight_points: number }[];
  if (examSubjects.length === 0) {
    return NextResponse.json({ error: "target has no exam subjects" }, { status: 400 });
  }

  // ---- 1. 科目を決める ----
  let subjectId: string;
  if (requestedSubjectId && requestedSubjectId !== "auto") {
    if (!examSubjects.some((es) => es.subject_id === requestedSubjectId)) {
      return NextResponse.json({ error: "subject not in exam_subjects" }, { status: 400 });
    }
    subjectId = requestedSubjectId;
  } else {
    const weaknessBySubject = await Promise.all(
      examSubjects.map(async (es) => ({
        subjectId: es.subject_id,
        weakness: await computeSubjectWeakness(admin, appUser.id, es.subject_id),
      }))
    );
    // 苦手(weaknessが高い)ほど選ばれやすい。完全に得意な科目も0にはしない（+0.1の下駄）。
    const picked = weightedPick(weaknessBySubject, (w) => w.weakness + 0.1);
    subjectId = picked!.subjectId;
  }

  const { data: subject } = await admin.from("subjects").select("id, name").eq("id", subjectId).single();

  // ---- 2. 単元（スキルタグ）を「苦手×出やすい×配点」で重み付け抽選する ----
  const candidates = await computeSkillTagCandidates(admin, appUser.id, subjectId, target.school_id ?? null);
  if (candidates.length === 0) {
    return NextResponse.json({ error: "no skill tags for subject" }, { status: 404 });
  }
  const ranked = rankUnitsByPriority(candidates);
  const skillTagPick = weightedPick(ranked, (r) => r.priorityScore + 0.01)!;
  const { data: skillTag } = await admin
    .from("skill_tags")
    .select("id, name")
    .eq("id", skillTagPick.skillTagId)
    .single();
  if (!skillTag) {
    return NextResponse.json({ error: "skill tag not found" }, { status: 404 });
  }

  // ---- 3. その単元の配信可能問題から、直近に解いていないものをランダムに1問 ----
  const { data: taggedQuestions } = await admin
    .from("question_tags")
    .select(
      "question_id, questions(id, format, body_md, choices, answer, explanation_md, est_time_sec, license_status)"
    )
    .eq("skill_tag_id", skillTag.id);

  const deliverable = (taggedQuestions ?? [])
    .map((t) => oneQuestion(t.questions))
    .filter((q): q is QuestionJoin => !!q && q.license_status === "deliverable");

  if (deliverable.length === 0) {
    return NextResponse.json(
      { error: "no questions available", subject_name: subject?.name },
      { status: 404 }
    );
  }

  const cutoffIso = new Date(Date.now() - RECENT_EXCLUSION_HOURS * 60 * 60 * 1000).toISOString();
  const { data: recentAttempts } = await admin
    .from("attempts")
    .select("question_id")
    .eq("user_id", appUser.id)
    .gte("created_at", cutoffIso)
    .in(
      "question_id",
      deliverable.map((q) => q.id)
    );
  const recentlySeen = new Set((recentAttempts ?? []).map((a) => a.question_id as string));

  let pool = deliverable.filter((q) => !recentlySeen.has(q.id));
  if (pool.length === 0) pool = deliverable; // 直近で全問解いていたら、やむを得ず再出題する

  const question = pool[Math.floor(Math.random() * pool.length)];

  return NextResponse.json({
    subject_id: subject!.id,
    subject_name: subject!.name,
    skill_tag_name: skillTag.name,
    question_id: question.id,
    format: question.format,
    body_md: question.body_md,
    est_time_sec: question.est_time_sec,
    choices: publicChoices(question.format, question.choices, question.answer),
  });
}
