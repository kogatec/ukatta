import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { uuidLike } from "@/lib/validation";

// PATCH /api/friends/[id]  body: { action: "accept" | "decline" }
//   相手からの pending を承諾／拒否する。RLSで
//   「相手側かつ requested_by が自分でない」場合のみ update が通る。
//
// DELETE /api/friends/[id]
//   フレンド解除、または自分が出した申請の取り下げ、または受けた申請の完全削除。
//   RLSで当事者のいずれかなら delete が通る。

const patchSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = uuidLike.safeParse(id);
  if (!parsedId.success) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const nextStatus = parsed.data.action === "accept" ? "accepted" : "declined";
  const { data, error } = await supabase
    .from("friendships")
    .update({ status: nextStatus, responded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "リクエストが見つかりません" }, { status: 404 });

  return NextResponse.json({ ok: true, status: nextStatus });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = uuidLike.safeParse(id);
  if (!parsedId.success) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
