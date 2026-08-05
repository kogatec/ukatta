// 問題データを品質ゲートで検証してから deliverable として投入する。
// question-format.md §5 の基準をプログラム側で強制する:
//   mark:    5択ちょうど・正答1つ・誤答4つ全てにerror_tag・keyが5つとも相異なる・
//            均質性(文字数の最大/最小が2.0倍を超えない)
//   numeric: distractors値が正答スロットの値と非衝突・distractors同士も正規化後に非衝突
//
// --check-only を付けると検証のみ行い、DBには書き込まない。

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const CHECK_ONLY = process.argv.includes("--check-only");
const dataFileArg = process.argv.find((a) => a.endsWith(".mjs") && a.includes("questions-data"));
if (!dataFileArg) {
  console.error("usage: node scripts/insert-questions.mjs scripts/questions-data/<file>.mjs [--check-only]");
  process.exit(1);
}

const { questions } = await import(new URL(`../${dataFileArg}`.replace("../scripts", "./"), import.meta.url));

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

// --- 正規化（src/lib/questions/normalize.ts と同じロジック） ---
function toHalfWidth(s) {
  return s.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
function normalizeNumericValue(raw) {
  let s = toHalfWidth(String(raw ?? ""))
    .replace(/\s+/g, "")
    .replace(/[−–—]/g, "-");
  if (s === "") return "";
  const fraction = s.match(/^(-?\d+)\/(-?\d+)$/);
  if (fraction) {
    let num = Number(fraction[1]);
    let den = Number(fraction[2]);
    if (den === 0) return s;
    if (den < 0) {
      num = -num;
      den = -den;
    }
    const g = gcd(num, den) || 1;
    return den / g === 1 ? String(num / g) : `${num / g}/${den / g}`;
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) s = Object.is(n, -0) ? "0" : String(n);
  }
  return s;
}

// --- 品質ゲート ---
function validateMark(q) {
  const errors = [];
  const opts = q.choices?.options ?? [];
  if (opts.length !== 5) errors.push(`options must be exactly 5 (got ${opts.length})`);
  const correctCount = opts.filter((o) => o.correct).length;
  if (correctCount !== 1) errors.push(`correct options must be exactly 1 (got ${correctCount})`);
  const wrongOpts = opts.filter((o) => !o.correct);
  const missingTag = wrongOpts.filter((o) => !o.error_tag);
  if (missingTag.length > 0) errors.push(`${missingTag.length} wrong option(s) missing error_tag`);
  const tags = wrongOpts.map((o) => o.error_tag).filter(Boolean);
  if (new Set(tags).size !== tags.length) errors.push("wrong options must have distinct error_tag values");
  const keys = opts.map((o) => o.key);
  if (new Set(keys).size !== keys.length) errors.push("option keys must be distinct");

  const lengths = opts.map((o) => o.text.length);
  const max = Math.max(...lengths);
  const min = Math.min(...lengths);
  if (min > 0 && max / min > 2.0) {
    errors.push(`homogeneity check failed: max/min char length = ${(max / min).toFixed(2)} (options: ${lengths.join(",")})`);
  }
  return errors;
}

function validateNumeric(q) {
  const errors = [];
  const slots = q.answer?.slots ?? [];
  if (slots.length === 0) errors.push("numeric answer must have at least 1 slot");

  const normCorrect = new Map(slots.map((s) => [s.label, normalizeNumericValue(s.value)]));
  const seenPerSlot = new Map();
  for (const d of q.distractors ?? []) {
    if (!d.error_tag) errors.push(`distractor for slot "${d.slot}" missing error_tag`);
    const normD = normalizeNumericValue(d.value);
    if (normCorrect.has(d.slot) && normD === normCorrect.get(d.slot)) {
      errors.push(`distractor for slot "${d.slot}" equals the correct value after normalization`);
    }
    const seen = seenPerSlot.get(d.slot) ?? new Set();
    if (seen.has(normD)) errors.push(`duplicate distractor value for slot "${d.slot}" after normalization`);
    seen.add(normD);
    seenPerSlot.set(d.slot, seen);
  }
  return errors;
}

async function findSkillTagId(subjectCode, skillTagName) {
  const { data: subject } = await admin.from("subjects").select("id").eq("code", subjectCode).single();
  const { data: units } = await admin.from("units").select("id").eq("subject_id", subject.id);
  const { data: tag } = await admin
    .from("skill_tags")
    .select("id, unit_id")
    .in(
      "unit_id",
      units.map((u) => u.id)
    )
    .eq("name", skillTagName)
    .maybeSingle();
  return tag?.id ?? null;
}

async function main() {
  let failCount = 0;
  let insertCount = 0;
  let skipCount = 0;

  for (const [i, q] of questions.entries()) {
    const label = `[${i + 1}/${questions.length}] ${q.subjectCode} / ${q.skillTagName}`;
    const errors = q.format === "mark" ? validateMark(q) : validateNumeric(q);

    if (errors.length > 0) {
      failCount++;
      console.error(`✗ ${label}`);
      for (const e of errors) console.error(`    - ${e}`);
      continue;
    }

    const skillTagId = await findSkillTagId(q.subjectCode, q.skillTagName);
    if (!skillTagId) {
      failCount++;
      console.error(`✗ ${label}\n    - skill_tag "${q.skillTagName}" not found under subject "${q.subjectCode}"`);
      continue;
    }

    if (CHECK_ONLY) {
      console.log(`✓ ${label} (valid, not inserted)`);
      continue;
    }

    const { data: subject } = await admin.from("subjects").select("id").eq("code", q.subjectCode).single();

    const row = {
      source_type: "self_authored",
      license_status: "deliverable",
      subject_id: subject.id,
      difficulty: q.difficulty,
      format: q.format,
      body_md: q.body_md,
      choices: q.format === "mark" ? q.choices : null,
      answer: q.format === "mark" ? { type: "mark", key: q.choices.options.find((o) => o.correct).key } : q.answer,
      distractors: q.format === "numeric" ? q.distractors : null,
      explanation_md: q.explanation_md,
      est_time_sec: q.est_time_sec,
    };

    const { data: inserted, error } = await admin.from("questions").insert(row).select("id").single();
    if (error) {
      failCount++;
      console.error(`✗ ${label}\n    - insert failed: ${error.message}`);
      continue;
    }

    const { error: tagError } = await admin
      .from("question_tags")
      .insert({ question_id: inserted.id, skill_tag_id: skillTagId });
    if (tagError) {
      console.error(`  ! question_tags insert failed for ${label}: ${tagError.message}`);
    }

    insertCount++;
    console.log(`✓ ${label} → ${inserted.id}`);
  }

  console.log(
    `\n${CHECK_ONLY ? "check" : "insert"} done: ${insertCount || questions.length - failCount} ok, ${failCount} failed, ${skipCount} skipped`
  );
  if (failCount > 0) process.exitCode = 1;
}

main();
