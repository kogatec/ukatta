"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GradeLevel = "jhs1" | "jhs2" | "jhs3" | "hs1" | "hs2" | "hs3" | "ronin";

const GRADES: { value: GradeLevel; label: string; track: "highschool" | "university" }[] = [
  { value: "jhs1", label: "中1", track: "highschool" },
  { value: "jhs2", label: "中2", track: "highschool" },
  { value: "jhs3", label: "中3", track: "highschool" },
  { value: "hs1", label: "高1", track: "university" },
  { value: "hs2", label: "高2", track: "university" },
  { value: "hs3", label: "高3", track: "university" },
  { value: "ronin", label: "既卒", track: "university" },
];

interface SchoolOption {
  id: string;
  name: string;
  prefecture: string | null;
  deviation: number | null;
}

// ユーザー名の形式チェック（サーバー側 usernameSchema と一致）
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export default function OnboardingForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [grade, setGrade] = useState<GradeLevel | null>(null);
  const [examDate, setExamDate] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const track = grade
    ? GRADES.find((g) => g.value === grade)?.track ?? "highschool"
    : null;

  async function handleSearch(value: string) {
    setQuery(value);
    setSelectedSchool(null);
    if (!track || value.trim().length === 0) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/schools?type=${track}&q=${encodeURIComponent(value)}`
      );
      const json = await res.json();
      setResults(json.schools ?? []);
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit() {
    if (!grade || !track || !selectedSchool || !displayName.trim() || !USERNAME_PATTERN.test(username)) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName.trim(),
        username,
        grade_level: grade,
        exam_track: track,
        exam_date: examDate || undefined,
        targets: [
          {
            school_id: selectedSchool.id,
            priority: 1,
            exam_subjects: [],
          },
        ],
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(typeof json.error === "string" ? json.error : "登録に失敗しました。もう一度お試しください。");
      setSubmitting(false);
      return;
    }

    router.push("/diagnostic");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <p className="font-mono text-xs tracking-widest text-brand-600">Step 1 / 4</p>
      <h2 className="mt-2 text-lg font-bold text-foreground">呼び方を教えてください</h2>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="例: けいいちろう"
        className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600"
      />

      <p className="mt-8 font-mono text-xs tracking-widest text-brand-600">Step 2 / 4</p>
      <h2 className="mt-2 text-lg font-bold text-foreground">ユーザー名を決めてください</h2>
      <p className="mt-1 text-xs text-muted">友達がこの名前であなたを追加します。半角英数字とアンダースコア、3〜20文字。あとから変更できません。</p>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="例: keiichiro04"
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-brand-600"
      />
      {username.length > 0 && !USERNAME_PATTERN.test(username) && (
        <p className="mt-1 text-xs text-red-600">半角英数字とアンダースコア、3〜20文字で入力してください</p>
      )}

      <p className="mt-8 font-mono text-xs tracking-widest text-brand-600">Step 3 / 4</p>
      <h2 className="mt-2 text-lg font-bold text-foreground">学年を教えてください</h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {GRADES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => {
              setGrade(g.value);
              setQuery("");
              setResults([]);
              setSelectedSchool(null);
            }}
            className={`rounded-md border px-0 py-3 text-sm font-semibold transition-colors ${
              grade === g.value
                ? "border-brand-600 bg-sky text-brand-600"
                : "border-line bg-surface text-foreground hover:border-brand-600"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {grade && (
        <>
          <p className="mt-8 font-mono text-xs tracking-widest text-brand-600">Step 4 / 4</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">
            第一志望の{track === "highschool" ? "高校" : "大学"}を検索
          </h2>
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={track === "highschool" ? "例: 都立西高校" : "例: 早稲田大学"}
            className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600"
          />

          {searching && <p className="mt-2 text-xs text-muted">検索中…</p>}

          {results.length > 0 && !selectedSchool && (
            <ul className="mt-2 divide-y divide-line rounded-md border border-line bg-surface">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSchool(s);
                      setQuery(s.name);
                      setResults([]);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-sky"
                  >
                    <span>{s.name}</span>
                    <span className="text-xs text-muted">{s.prefecture}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedSchool && (
            <p className="mt-2 rounded-md bg-sky px-3 py-2 text-sm text-brand-600">
              {selectedSchool.name} を第一志望に設定します
            </p>
          )}

          <label className="mt-6 block text-sm text-muted" htmlFor="exam_date">
            受験日（わかれば）
          </label>
          <input
            id="exam_date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600"
          />
        </>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        disabled={!displayName.trim() || !USERNAME_PATTERN.test(username) || !selectedSchool || submitting}
        onClick={handleSubmit}
        className="mt-8 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "登録中…" : "はじめる"}
      </button>
    </div>
  );
}
