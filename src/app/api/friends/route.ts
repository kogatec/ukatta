import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadFriendsView } from "@/lib/friend-view";

// GET /api/friends
//   /friends ページのクライアント側リロード用。初回描画はサーバー側で loadFriendsView を使う。
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("users")
    .select("id, username")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "onboarding not completed" }, { status: 404 });

  const view = await loadFriendsView(supabase, me);
  return NextResponse.json(view);
}
