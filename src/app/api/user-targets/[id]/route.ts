import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { uuidLike } from "@/lib/validation";

// 志望校の受験科目（配点）を更新する（設計: docs/learning-cycle.md）。
//
// オンボーディングでは志望校のみ登録し、受験科目は空配列のまま作られる
// （学部・入試方式によって科目構成が異なり、登録時点では決め切れないため）。
// 週次サイクルの生成にはexam_subjectsが必須なので、後から設定できる画面をここに用意する。
// user_targetsは本人にRLSでupdate権限があるため、通常クライアントで完結する。

const bodySchema = z.object({
  exam_subjects: z
    .array(z.object({ subject_id: uuidLike, weight_points: z.number().min(1).max(1000) }))
    .min(1),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params;

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

  const { data: appUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!appUser) {
    return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });
  }

  const { data: target } = await supabase
    .from("user_targets")
    .select("id, user_id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target || target.user_id !== appUser.id) {
    return NextResponse.json({ error: "target not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("user_targets")
    .update({ exam_subjects: parsed.data.exam_subjects })
    .eq("id", targetId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
