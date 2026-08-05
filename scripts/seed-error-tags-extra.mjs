// 理科・社会向けの誤答タグを追加する（question-format.md §4 の体系を拡張）。
// error_tags は「タグの追加でデプロイが要らない」設計のため、ここに追記するだけでよい。
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NEW_TAGS = [
  { tag: "formula_misapplication", error_type: "knowledge_gap", subject_scope: "science", label_ja: "公式の誤った適用", sort: 60 },
  { tag: "concept_confusion", error_type: "knowledge_gap", subject_scope: "science", label_ja: "概念の混同", sort: 61 },
  { tag: "calculation_error", error_type: "calculation", subject_scope: "science", label_ja: "計算ミス", sort: 62 },
  { tag: "graph_misread", error_type: "misread", subject_scope: "science", label_ja: "グラフ・図の読み取りミス", sort: 63 },
  { tag: "term_confusion", error_type: "knowledge_gap", subject_scope: "social", label_ja: "用語の混同", sort: 70 },
  { tag: "chronology_error", error_type: "knowledge_gap", subject_scope: "social", label_ja: "年代・順序の誤り", sort: 71 },
  { tag: "cause_effect_confusion", error_type: "misread", subject_scope: "social", label_ja: "因果関係の取り違え", sort: 72 },
];

for (const t of NEW_TAGS) {
  const { data: existing } = await admin.from("error_tags").select("tag").eq("tag", t.tag).maybeSingle();
  if (existing) {
    console.log(`= ${t.tag} (already exists)`);
    continue;
  }
  const { error } = await admin.from("error_tags").insert(t);
  if (error) {
    console.error(`! ${t.tag}: ${error.message}`);
  } else {
    console.log(`+ ${t.tag}`);
  }
}
console.log("done.");
