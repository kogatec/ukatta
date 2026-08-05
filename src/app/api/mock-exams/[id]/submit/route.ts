import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 週次テストの提出（設計: docs/learning-cycle.md §2, docs/question-format.md）
//
// 採点自体は各設問への解答時点で /api/attempts が決定論的に終えている。
// ここでは「全問に解答済みか」を確認し、模試のstatusを確定させるだけ。
// AI採点を挟まないため submitted を経由せず、直接 graded にしてよい。
// mock_examsにupdateのRLSが無いため service role で更新する。

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .select("id, status, total_points")
    .eq("id", mockExamId)
    .maybeSingle();
  if (!exam) {
    return NextResponse.json({ error: "mock exam not found" }, { status: 404 });
  }
  if (exam.status === "submitted" || exam.status === "graded") {
    return NextResponse.json({ error: "already submitted" }, { status: 409 });
  }

  const { data: items } = await supabase
    .from("mock_exam_items")
    .select("id")
    .eq("mock_exam_id", mockExamId);
  const itemIds = (items ?? []).map((i) => i.id);
  if (itemIds.length === 0) {
    return NextResponse.json({ error: "mock exam has no items" }, { status: 400 });
  }

  const { data: attempts } = await supabase
    .from("attempts")
    .select("mock_item_id, is_correct, awarded_points")
    .eq("user_id", appUser.id)
    .in("mock_item_id", itemIds);

  const answeredItemIds = new Set((attempts ?? []).map((a) => a.mock_item_id as string));
  const unanswered = itemIds.filter((id) => !answeredItemIds.has(id));
  if (unanswered.length > 0) {
    return NextResponse.json(
      { error: "not all questions answered", unanswered_item_ids: unanswered },
      { status: 400 }
    );
  }

  const correctCount = (attempts ?? []).filter((a) => a.is_correct).length;
  const awardedPoints = (attempts ?? []).reduce((sum, a) => sum + Number(a.awarded_points ?? 0), 0);

  const admin = createAdminClient();
  await admin
    .from("mock_exams")
    .update({ status: "graded", submitted_at: new Date().toISOString() })
    .eq("id", mockExamId);

  return NextResponse.json({
    mock_exam_id: mockExamId,
    status: "graded",
    question_count: itemIds.length,
    correct_count: correctCount,
    awarded_points: awardedPoints,
    total_points: exam.total_points,
  });
}
