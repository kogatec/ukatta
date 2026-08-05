// 過去問メタデータ（層A・本文なし）10年分の投入。
//
// past_paper_items は「大問ごとの出題単元・形式・配点・難易度・想定時間」という
// 事実データのみを保持する。本文カラムは存在せず、著作権の対象外。
//
// 学校ごとに単元の出題傾向を重み付け（「この学校はこの単元が出やすい」）した上で
// 加重抽選する。重みは一般に知られている出題傾向の性質（頻出分野・記述量など）を
// もとにした仮の値であり、特定年度の実問題を参照したものではない。
// 実データが手に入り次第、この重みをそのまま置き換えられる設計にしてある。
//
// 冪等: (school_id, subject_id, year) の past_papers が既にあればスキップする。

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

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 1 - i); // 直近10年（今年は未実施のため除く）

const SCHOOLS = [
  { name: "都立西高校", track: "highschool" },
  { name: "都立日比谷高校", track: "highschool" },
  { name: "県立浦和高校", track: "highschool" },
  { name: "早稲田大学", track: "university" },
  { name: "慶應義塾大学", track: "university" },
  { name: "東京大学", track: "university" },
];

const SUBJECT_CODES_BY_TRACK = {
  highschool: ["math_hs", "eng_hs", "jpn_hs", "sci_hs", "soc_hs"],
  university: ["math_univ", "eng_univ", "jpn_univ", "sci_univ", "soc_univ"],
};

// 学校ごとの「記述傾向」。数学の実際の出題形式の目安（過去問メタデータの記述用、
// 配信可否には影響しない＝questions.formatとは独立）。
const MATH_FORMAT_PROFILE = {
  東京大学: { proof: 0.6, essay: 0.3, short: 0.1 },
  早稲田大学: { short: 0.4, essay: 0.4, proof: 0.2 },
  慶應義塾大学: { short: 0.5, essay: 0.3, proof: 0.2 },
  default: { short: 0.7, essay: 0.2, proof: 0.1 }, // 公立高校入試
};

// 決定論的な擬似乱数（同じ入力なら同じ結果＝再実行しても傾向がぶれない）
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

function weightedPick(rng, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickFormat(rng, profile) {
  const entries = Object.entries(profile);
  return weightedPick(
    rng,
    entries.map((e) => e[0]),
    entries.map((e) => e[1])
  );
}

async function main() {
  for (const schoolDef of SCHOOLS) {
    const { data: school } = await admin
      .from("schools")
      .select("id, name")
      .eq("name", schoolDef.name)
      .single();

    const subjectCodes = SUBJECT_CODES_BY_TRACK[schoolDef.track];
    const { data: subjects } = await admin
      .from("subjects")
      .select("id, code, name")
      .in("code", subjectCodes);

    for (const subject of subjects) {
      const { data: units } = await admin.from("units").select("id, name").eq("subject_id", subject.id);
      if (!units || units.length === 0) continue;

      // 学校×科目ごとに単元の出題ウェイトを決定論的に生成する
      // （同じ学校・科目なら常に同じ重みになる＝再実行で傾向がぶれない）
      const weightSeed = hashSeed(`${school.name}:${subject.code}`);
      const weightRng = mulberry32(weightSeed);
      const unitWeights = units.map(() => 0.5 + weightRng()); // 0.5〜1.5の相対頻度

      const isMath = subject.code.startsWith("math");
      const formatProfile = isMath
        ? MATH_FORMAT_PROFILE[school.name] ?? MATH_FORMAT_PROFILE.default
        : { mark: 0.85, essay: 0.15 };

      for (const year of YEARS) {
        const { data: existingPaper } = await admin
          .from("past_papers")
          .select("id")
          .eq("school_id", school.id)
          .eq("subject_id", subject.id)
          .eq("year", year)
          .maybeSingle();
        if (existingPaper) continue;

        const rng = mulberry32(hashSeed(`${school.name}:${subject.code}:${year}`));
        const timeLimitMin = isMath ? (schoolDef.track === "university" ? 90 : 50) : schoolDef.track === "university" ? 80 : 45;
        const itemCount = 4 + Math.floor(rng() * 3); // 4〜6大問

        let totalPoints = 0;
        const items = [];
        for (let i = 0; i < itemCount; i++) {
          const unit = weightedPick(rng, units, unitWeights);
          const points = 10 + Math.floor(rng() * 6) * 5; // 10,15,...35
          totalPoints += points;
          items.push({
            item_no: `大問${i + 1}`,
            unit_ids: [unit.id],
            format: pickFormat(rng, formatProfile),
            points,
            difficulty: 3 + Math.floor(rng() * 7), // 3〜9
            est_time_sec: 300 + Math.floor(rng() * 20) * 60, // 5〜25分
          });
        }

        const { data: paper, error: paperError } = await admin
          .from("past_papers")
          .insert({
            school_id: school.id,
            year,
            subject_id: subject.id,
            time_limit_min: timeLimitMin,
            total_points: totalPoints,
            notes: `大問${itemCount}題（自動生成メタデータ、本文なし）`,
          })
          .select("id")
          .single();
        if (paperError) {
          console.error(`paper ${school.name}/${subject.name}/${year}: ${paperError.message}`);
          continue;
        }

        const rows = items.map((it) => ({ paper_id: paper.id, ...it }));
        const { error: itemsError } = await admin.from("past_paper_items").insert(rows);
        if (itemsError) {
          console.error(`items ${school.name}/${subject.name}/${year}: ${itemsError.message}`);
        }
      }
      console.log(`done: ${school.name} / ${subject.name} (${YEARS.length}年分)`);
    }
  }
  console.log("\npast-paper seed done.");
}

main();
