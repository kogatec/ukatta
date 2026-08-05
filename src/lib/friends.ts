// フレンド機能の共通ヘルパー。
//
// friendships テーブルは (user_a_id, user_b_id) を UUID の小さい方をAに正規化して保存する
// （設計: supabase/migrations/20260806000000_friends.sql）。この正規化はAPI側でやる。

export interface FriendshipPair {
  user_a_id: string;
  user_b_id: string;
}

/** UUIDの辞書順（stringのlocale比較でよい。UUIDはASCII範囲）で小さい方をAに置く。 */
export function normalizePair(x: string, y: string): FriendshipPair {
  if (x === y) throw new Error("cannot pair a user with themself");
  return x < y ? { user_a_id: x, user_b_id: y } : { user_a_id: y, user_b_id: x };
}

/** ペアのうち自分ではない側を返す。 */
export function otherSide(pair: FriendshipPair, meId: string): string {
  return pair.user_a_id === meId ? pair.user_b_id : pair.user_a_id;
}
