import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadFriendsView } from "@/lib/friend-view";
import FriendsClient from "./FriendsClient";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login?next=/friends");

  const { data: me } = await supabase
    .from("users")
    .select("id, username")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!me) redirect("/onboarding");

  const initial = loadFriendsView(supabase, me);

  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-xs text-muted underline underline-offset-2">
          ← ホーム
        </Link>
        <p className="mt-4 font-mono text-xs tracking-widest text-brand-600">FRIENDS</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">フレンド</h1>
        <p className="mt-1 text-sm text-muted">
          ユーザー名で追加。相手が承諾すると、連続学習日数を見せ合えます。
        </p>

        <FriendsClient initial={initial} />
      </div>
    </div>
  );
}
