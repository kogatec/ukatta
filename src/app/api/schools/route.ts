import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PostgRESTのor()フィルタ構文を壊す文字とILIKEワイルドカードを除去する
function sanitizeSearchTerm(value: string) {
  return value.replace(/[,()%_]/g, "").trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = sanitizeSearchTerm(searchParams.get("q") ?? "");
  const type = searchParams.get("type");
  const pref = searchParams.get("pref");

  const supabase = await createClient();
  let query = supabase
    .from("schools")
    .select("id, type, name, name_kana, prefecture, is_national, deviation")
    .order("deviation", { ascending: false, nullsFirst: false })
    .limit(20);

  if (type === "highschool" || type === "university") {
    query = query.eq("type", type);
  }
  if (pref) {
    query = query.eq("prefecture", pref);
  }
  if (q) {
    query = query.or(`name.ilike.%${q}%,name_kana.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schools: data });
}
