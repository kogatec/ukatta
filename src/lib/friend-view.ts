// フレンド一覧をサーバー側で組み立てる（/api/friends と同じロジック）。
// 初回描画のためのSSR側入口。

import type { SupabaseClient } from "@supabase/supabase-js";

export interface FriendItem {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  requested_at: string;
  responded_at?: string | null;
  current_streak?: number;
  longest_streak?: number;
  last_active?: string | null;
}

export interface FriendsView {
  me: { username: string | null };
  accepted: FriendItem[];
  incoming: FriendItem[];
  outgoing: FriendItem[];
}

export async function loadFriendsView(
  supabase: SupabaseClient,
  me: { id: string; username: string | null }
): Promise<FriendsView> {
  const { data: rows } = await supabase
    .from("friendships")
    .select("id, user_a_id, user_b_id, requested_by_user_id, status, requested_at, responded_at");
  const friendships = rows ?? [];

  const otherIds = Array.from(
    new Set(friendships.map((f) => (f.user_a_id === me.id ? f.user_b_id : f.user_a_id)))
  );

  const usersById = new Map<string, { id: string; display_name: string; username: string | null }>();
  const streaksById = new Map<string, { current: number; longest: number; last_active: string | null }>();

  if (otherIds.length > 0) {
    const [usersRes, streaksRes] = await Promise.all([
      supabase.from("users").select("id, display_name, username").in("id", otherIds),
      supabase.from("streaks").select("user_id, current, longest, last_active").in("user_id", otherIds),
    ]);
    for (const u of usersRes.data ?? []) usersById.set(u.id, u);
    for (const s of streaksRes.data ?? []) {
      streaksById.set(s.user_id, {
        current: s.current,
        longest: s.longest,
        last_active: s.last_active,
      });
    }
  }

  const accepted: FriendItem[] = [];
  const incoming: FriendItem[] = [];
  const outgoing: FriendItem[] = [];

  for (const f of friendships) {
    const otherId = f.user_a_id === me.id ? f.user_b_id : f.user_a_id;
    const other = usersById.get(otherId);
    const base: FriendItem = {
      id: f.id,
      user_id: otherId,
      display_name: other?.display_name ?? null,
      username: other?.username ?? null,
      requested_at: f.requested_at,
    };
    if (f.status === "accepted") {
      const s = streaksById.get(otherId);
      accepted.push({
        ...base,
        responded_at: f.responded_at,
        current_streak: s?.current ?? 0,
        longest_streak: s?.longest ?? 0,
        last_active: s?.last_active ?? null,
      });
    } else if (f.status === "pending") {
      if (f.requested_by_user_id === me.id) outgoing.push(base);
      else incoming.push(base);
    }
  }

  return { me: { username: me.username }, accepted, incoming, outgoing };
}
