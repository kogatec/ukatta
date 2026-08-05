import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameSchema } from "@/lib/validation";
import { normalizePair } from "@/lib/friends";

// POST /api/friends/requests
//   body: { username: "..." }
//   ユーザー名で相手を探して申請を出す。
//
// - 相手検索は完全一致のみ。総当たり収集を防ぐため、部分一致検索は用意しない。
// - 相手の存在確認は service role で行う（他人の users 行を通常RLSで読めないため）。
//   だが返す情報は「見つかったか／既に関係があるか」のブール的な最小限にとどめる。
// - 既に「相手→自分」で pending があれば、その場で accepted に昇格させる。
// - 既に accepted なら 409 で「もう友達です」を返す。

const bodySchema = z.object({
  username: usernameSchema,
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "ユーザー名の形式が正しくありません" }, { status: 400 });
  }
  const { username } = parsed.data;

  const { data: me } = await supabase
    .from("users")
    .select("id, username")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });
  if (!me.username) {
    return NextResponse.json(
      { error: "先に自分のユーザー名を設定してください" },
      { status: 409 }
    );
  }
  if (me.username.toLowerCase() === username.toLowerCase()) {
    return NextResponse.json({ error: "自分は追加できません" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "そのユーザー名の人は見つかりませんでした" }, { status: 404 });
  }

  const pair = normalizePair(me.id, target.id);

  // 既存の関係を確認
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status, requested_by_user_id")
    .eq("user_a_id", pair.user_a_id)
    .eq("user_b_id", pair.user_b_id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "すでに友達です" }, { status: 409 });
    }
    if (existing.status === "pending") {
      if (existing.requested_by_user_id === me.id) {
        return NextResponse.json({ error: "すでに申請中です" }, { status: 409 });
      }
      // 相手から届いていた申請 → その場で成立させる
      const { error: updErr } = await supabase
        .from("friendships")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, status: "accepted" }, { status: 200 });
    }
    // declined を pending に戻す（同じ人からもう一度申請できるようにする）
    if (existing.status === "declined") {
      const { error: updErr } = await supabase
        .from("friendships")
        .update({
          status: "pending",
          requested_by_user_id: me.id,
          requested_at: new Date().toISOString(),
          responded_at: null,
        })
        .eq("id", existing.id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
    }
  }

  const { error: insErr } = await supabase.from("friendships").insert({
    user_a_id: pair.user_a_id,
    user_b_id: pair.user_b_id,
    requested_by_user_id: me.id,
    status: "pending",
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: "pending" }, { status: 201 });
}
