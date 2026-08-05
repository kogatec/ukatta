"use client";

import { useState, useCallback } from "react";
import { use } from "react";

interface FriendItem {
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

interface FriendsResponse {
  me: { username: string | null };
  accepted: FriendItem[];
  incoming: FriendItem[];
  outgoing: FriendItem[];
}

/** last_active から「今日／昨日／N日前」を作る（TZは端末ローカル）。 */
function activityLabel(lastActive: string | null | undefined): string {
  if (!lastActive) return "まだ学習記録なし";
  const today = new Date();
  const last = new Date(lastActive + "T00:00:00");
  const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "今日活動中";
  if (diffDays === 1) return "昨日活動";
  return `${diffDays}日前`;
}

/** 初回ロードは `use(promise)` でSuspense的に、以降のリロードはsetStateで差し替える。
 *  React 19+ / Next.js 16 の推奨パターン。useEffect内でsetStateする lint に引っかからない。 */
export default function FriendsClient({ initial }: { initial: Promise<FriendsResponse> }) {
  const initialData = use(initial);
  const [data, setData] = useState<FriendsResponse>(initialData);
  const [addValue, setAddValue] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addFlash, setAddFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.ok) setData(await res.json());
  }, []);

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    if (!addValue.trim() || addBusy) return;
    setAddBusy(true);
    setAddError(null);
    setAddFlash(null);
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addValue.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(typeof json.error === "string" ? json.error : "追加に失敗しました");
      } else {
        setAddFlash(
          json.status === "accepted"
            ? "フレンドになりました"
            : "リクエストを送信しました"
        );
        setAddValue("");
        await load();
      }
    } finally {
      setAddBusy(false);
    }
  }

  async function respond(id: string, action: "accept" | "decline") {
    await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  }

  async function removeFriendship(id: string, confirmText: string) {
    if (!confirm(confirmText)) return;
    await fetch(`/api/friends/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="mt-6">
      {data.me.username ? (
        <p className="text-xs text-muted">
          あなたのユーザー名: <span className="font-mono font-semibold text-foreground">@{data.me.username}</span>
        </p>
      ) : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ユーザー名が未設定です。フレンド機能を使うには先にユーザー名の設定が必要です。
        </p>
      )}

      {/* フレンド追加 */}
      <form onSubmit={addFriend} className="mt-6 rounded-md border border-line bg-surface p-4">
        <label className="block text-xs text-muted" htmlFor="add-username">
          ユーザー名でフレンド追加
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="add-username"
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder="keiichiro04"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded-md border border-line bg-background px-3 py-2 font-mono text-sm outline-none focus:border-brand-600"
          />
          <button
            type="submit"
            disabled={!addValue.trim() || addBusy || !data.me.username}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {addBusy ? "送信中…" : "追加"}
          </button>
        </div>
        {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
        {addFlash && <p className="mt-2 text-xs text-brand-600">{addFlash}</p>}
      </form>

      {/* 受信中のリクエスト */}
      {data.incoming.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-mono tracking-widest text-muted">受信中のリクエスト</p>
          <ul className="mt-3 space-y-2">
            {data.incoming.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {f.display_name ?? "（表示名未設定）"}
                  </p>
                  <p className="font-mono text-xs text-muted">@{f.username ?? "?"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(f.id, "accept")}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500"
                  >
                    承諾
                  </button>
                  <button
                    onClick={() => respond(f.id, "decline")}
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
                  >
                    拒否
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* フレンド一覧 */}
      <section className="mt-8">
        <p className="text-xs font-mono tracking-widest text-muted">フレンド ({data.accepted.length})</p>
        {data.accepted.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-muted">
            まだフレンドがいません。ユーザー名を教え合って追加しましょう。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.accepted.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {f.display_name ?? "（表示名未設定）"}
                  </p>
                  <p className="font-mono text-xs text-muted">@{f.username ?? "?"}</p>
                  <p className="mt-1 text-xs text-muted">
                    連続 <span className="font-semibold text-brand-600">{f.current_streak}日</span>
                    ・最長 {f.longest_streak}日 ・ {activityLabel(f.last_active)}
                  </p>
                </div>
                <button
                  onClick={() => removeFriendship(f.id, `${f.display_name ?? f.username}さんとのフレンドを解除しますか？`)}
                  className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
                >
                  解除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 送信中のリクエスト */}
      {data.outgoing.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-mono tracking-widest text-muted">送信中のリクエスト</p>
          <ul className="mt-3 space-y-2">
            {data.outgoing.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {f.display_name ?? "（表示名未設定）"}
                  </p>
                  <p className="font-mono text-xs text-muted">@{f.username ?? "?"}</p>
                </div>
                <button
                  onClick={() => removeFriendship(f.id, "この申請を取り下げますか？")}
                  className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
                >
                  取り下げ
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
