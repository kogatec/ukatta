// カリキュラムタキソノミー（subjects > units > skill_tags）の拡充。
// seed.sql は最小デモセットのため、5教科（国語・数学・英語・理科・社会）×
// 高校受験/大学受験の両トラックを実用レベルまで拡張する。
//
// ここに書く単元名・スキル名は教科書・学習指導要領で一般に使われる用語であり、
// 特定の過去問の文章・設問を参照/複製したものではない（著作権の対象外）。
//
// 冪等: 既存の同名レコードがあればスキップする。

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envPath = "/Users/kogakeiichirou1/入試アプリ/.env.local";
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
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

// ---------------------------------------------------------------
// 1. 科目定義（既存5 + 新規5 = 5教科 × 2トラック）
// ---------------------------------------------------------------
const SUBJECTS = [
  { code: "math_univ", name: "数学", exam_track: "university" },
  { code: "eng_univ", name: "英語", exam_track: "university" },
  { code: "jpn_univ", name: "国語", exam_track: "university" },
  { code: "sci_univ", name: "理科", exam_track: "university" },
  { code: "soc_univ", name: "社会", exam_track: "university" },
  { code: "math_hs", name: "数学", exam_track: "highschool" },
  { code: "eng_hs", name: "英語", exam_track: "highschool" },
  { code: "jpn_hs", name: "国語", exam_track: "highschool" },
  { code: "sci_hs", name: "理科", exam_track: "highschool" },
  { code: "soc_hs", name: "社会", exam_track: "highschool" },
];

// ---------------------------------------------------------------
// 2. 単元・スキルタグ定義
//    units: [{ name, skillTags: [...] }]
//    既存単元へのスキル追加は existingUnitSkillTags で指定（unit名でマッチ）
// ---------------------------------------------------------------
const CURRICULUM = {
  math_univ: {
    units: [
      {
        name: "ベクトル",
        skillTags: ["空間ベクトルの内積と角度", "位置ベクトルによる図形の証明"],
      },
      {
        name: "三角関数",
        skillTags: ["加法定理を用いた式変形", "三角方程式・不等式の解法"],
      },
      { name: "指数・対数関数", skillTags: ["対数方程式・不等式", "指数関数のグラフと最大最小"] },
      { name: "図形と方程式", skillTags: ["軌跡の方程式", "領域における最大最小"] },
    ],
    existingUnitSkillTags: {
      数列: ["漸化式から一般項を求める"],
    },
  },
  eng_univ: {
    units: [
      { name: "語彙・語法", skillTags: ["文脈からの語彙推測", "多義語の識別"] },
      {
        name: "文法（仮定法・分詞構文）",
        skillTags: ["仮定法過去完了の用法", "分詞構文の意味上の主語"],
      },
      { name: "会話表現", skillTags: ["会話特有表現の空所補充"] },
    ],
    existingUnitSkillTags: {
      長文読解: ["段落要旨の把握", "指示語の照応"],
    },
  },
  jpn_univ: {
    units: [
      { name: "古文", skillTags: ["助動詞の識別と意味", "敬語による人物関係の把握"] },
      { name: "漢文", skillTags: ["句形（使役・受身）の理解", "書き下し文への変換"] },
      { name: "小説読解", skillTags: ["登場人物の心情変化の把握"] },
    ],
    existingUnitSkillTags: {
      現代文: ["論理展開の把握（対比構造）"],
    },
  },
  sci_univ: {
    units: [
      { name: "力学（物理基礎）", skillTags: ["等加速度運動の公式運用", "力のつり合いと作図"] },
      { name: "電気（物理基礎）", skillTags: ["オームの法則と回路計算"] },
      { name: "物質の変化（化学基礎）", skillTags: ["化学反応式の量的関係（モル計算）"] },
      { name: "酸と塩基（化学基礎）", skillTags: ["中和滴定の計算"] },
    ],
  },
  soc_univ: {
    units: [
      { name: "近代日本史", skillTags: ["明治期の条約改正の経緯"] },
      { name: "世界史（近現代）", skillTags: ["冷戦期の国際関係の把握"] },
      { name: "政治・経済（公民）", skillTags: ["三権分立の仕組み", "需要供給曲線の読み取り"] },
    ],
  },
  math_hs: {
    units: [
      { name: "正負の数・文字式", skillTags: ["文字式の四則計算と分配法則"] },
      { name: "方程式", skillTags: ["連立方程式の文章題", "二次方程式の解の公式"] },
      { name: "関数", skillTags: ["一次関数の変化の割合と交点"] },
      { name: "平面図形", skillTags: ["三角形の合同・相似の証明", "円周角の定理"] },
      { name: "空間図形", skillTags: ["立体の表面積・体積"] },
      { name: "確率・データの活用", skillTags: ["場合の数と確率の基本計算"] },
    ],
  },
  eng_hs: {
    units: [
      { name: "文法（基本文型）", skillTags: ["5文型の判別"] },
      { name: "文法（助動詞・不定詞）", skillTags: ["不定詞の3用法の識別"] },
      { name: "文法（受動態・現在完了）", skillTags: ["現在完了の継続・経験・完了の区別"] },
      { name: "長文読解", skillTags: ["内容一致問題の根拠特定"] },
      { name: "語彙・熟語", skillTags: ["頻出熟語の空所補充"] },
    ],
  },
  jpn_hs: {
    units: [
      { name: "現代文", skillTags: ["接続語による論理関係の把握"] },
      { name: "古文", skillTags: ["古文単語と歴史的仮名遣い"] },
      { name: "漢字・語句", skillTags: ["同音異義語・類義語の識別"] },
    ],
  },
  sci_hs: {
    units: [
      { name: "物理分野（力と運動）", skillTags: ["力の合成・分解の作図"] },
      { name: "化学分野（化学変化）", skillTags: ["化学変化と質量保存の法則"] },
      { name: "生物分野（生命の連続性）", skillTags: ["遺伝の規則性（メンデルの法則）"] },
      { name: "地学分野（大地の変化）", skillTags: ["地層の重なりと堆積環境の推定"] },
    ],
  },
  soc_hs: {
    units: [
      { name: "地理（日本の地域構成）", skillTags: ["気候区分と農業の特色の対応"] },
      { name: "歴史（近現代）", skillTags: ["年代整序（明治〜昭和の出来事）"] },
      { name: "公民（政治のしくみ）", skillTags: ["国会・内閣・裁判所の関係"] },
    ],
  },
};

async function ensureSubject(def) {
  const { data: existing } = await admin
    .from("subjects")
    .select("id")
    .eq("code", def.code)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from("subjects")
    .insert({ code: def.code, name: def.name, exam_track: def.exam_track })
    .select("id")
    .single();
  if (error) throw new Error(`subject ${def.code}: ${error.message}`);
  console.log(`+ subject ${def.name} (${def.code})`);
  return created.id;
}

async function ensureUnit(subjectId, name, sort) {
  const { data: existing } = await admin
    .from("units")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from("units")
    .insert({ subject_id: subjectId, name, sort })
    .select("id")
    .single();
  if (error) throw new Error(`unit ${name}: ${error.message}`);
  console.log(`  + unit ${name}`);
  return created.id;
}

async function ensureSkillTag(unitId, name) {
  const { data: existing } = await admin
    .from("skill_tags")
    .select("id")
    .eq("unit_id", unitId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from("skill_tags")
    .insert({ unit_id: unitId, name })
    .select("id")
    .single();
  if (error) throw new Error(`skill_tag ${name}: ${error.message}`);
  console.log(`    + skill_tag ${name}`);
  return created.id;
}

async function main() {
  const subjectIds = {};
  for (const def of SUBJECTS) {
    subjectIds[def.code] = await ensureSubject(def);
  }

  for (const [code, plan] of Object.entries(CURRICULUM)) {
    const subjectId = subjectIds[code];

    const { data: existingUnits } = await admin
      .from("units")
      .select("id, name, sort")
      .eq("subject_id", subjectId);
    let nextSort = Math.max(0, ...(existingUnits ?? []).map((u) => u.sort ?? 0)) + 1;

    for (const unitDef of plan.units ?? []) {
      const unitId = await ensureUnit(subjectId, unitDef.name, nextSort++);
      for (const tagName of unitDef.skillTags ?? []) {
        await ensureSkillTag(unitId, tagName);
      }
    }

    for (const [unitName, tagNames] of Object.entries(plan.existingUnitSkillTags ?? {})) {
      const unit = (existingUnits ?? []).find((u) => u.name === unitName);
      if (!unit) {
        console.warn(`  ! unit "${unitName}" not found for ${code}, skipping tag additions`);
        continue;
      }
      for (const tagName of tagNames) {
        await ensureSkillTag(unit.id, tagName);
      }
    }
  }

  console.log("\ncurriculum seed done.");
}

main();
