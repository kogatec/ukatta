// 全国の高校・大学マスタを外部データセットから投入するスクリプト。
// 出典:
//   高校: https://github.com/JaehyunSong/highschool-japan (hs_list.csv) — 学校名・都道府県・設置区分のみ利用
//   大学: https://github.com/shjimb/japanese-universities-list (jp_{national,public,private}_univ.txt)
// 偏差値・ランキング等の評価情報は一切取り込まない（DESIGN.md §1の権利設計・§13のデータ最小化方針に合わせる）。
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmp = "/tmp";

// --- RFC4180簡易CSVパーサ（このデータセットにクォート混在は無いが念のため対応） ---
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

// --- 高校データ ---
const hsRaw = readFileSync(join(tmp, "hs_list.csv"), "utf-8").split("\n").filter(Boolean);
const hsHeader = parseCsvLine(hsRaw[0]);
const idx = Object.fromEntries(hsHeader.map((h, i) => [h, i]));

const hsMap = new Map(); // key: name|pref -> row
for (const line of hsRaw.slice(1)) {
  const cells = parseCsvLine(line);
  const name = cells[idx.name]?.trim();
  const pref = cells[idx.pref]?.trim();
  const type = cells[idx.type]?.trim(); // 公立 | 私立 | 国立
  if (!name || !pref) continue;
  const key = `${name}|${pref}`;
  if (hsMap.has(key)) continue;
  hsMap.set(key, {
    type: "highschool",
    name,
    name_kana: name, // かな読みデータが無いため暫定的に name を複製（将来差し替え可能）
    prefecture: pref,
    is_national: type === "国立" || type === "公立",
  });
}

// --- 大学データ ---
function readUnivList(file, isNational) {
  return readFileSync(join(tmp, file), "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((name) => ({
      type: "university",
      name,
      name_kana: name,
      prefecture: null,
      is_national: isNational,
    }));
}

const univRows = [
  ...readUnivList("jp_national.txt", true),
  ...readUnivList("jp_public.txt", true),
  ...readUnivList("jp_private.txt", false),
];

// 大学名の重複除去（複数キャンパス等で稀に重複がありうる）
const univMap = new Map();
for (const row of univRows) {
  if (!univMap.has(row.name)) univMap.set(row.name, row);
}

const allRows = [...hsMap.values(), ...univMap.values()];

console.log(`highschool: ${hsMap.size}, university: ${univMap.size}, total: ${allRows.length}`);

// --- COPY用TSV生成 ---
function escapeTsv(v) {
  if (v === null) return "\\N";
  return String(v).replace(/\\/g, "\\\\").replace(/\t/g, " ").replace(/\n/g, " ");
}

const tsvLines = allRows.map((r) =>
  [r.type, r.name, r.name_kana, r.prefecture, r.is_national].map(escapeTsv).join("\t")
);

writeFileSync(join(tmp, "schools_import.tsv"), tsvLines.join("\n") + "\n", "utf-8");
console.log("wrote", join(tmp, "schools_import.tsv"));
