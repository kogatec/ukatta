// 数値マークの解答照合に使う正規化（設計: docs/question-format.md §3.1）
// 生徒の入力ゆれ（全角・空白・約分していない分数・-0）を吸収してから比較する。

/** 全角英数記号を半角に落とす */
function toHalfWidth(s: string): string {
  return s.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * 数値解答を比較可能な正規形にする。
 * 分数は既約形にし、符号は必ず分子側へ寄せる（"3/-4" → "-3/4"）。
 * 数値として解釈できない入力は、空白除去だけした文字列を返す。
 */
export function normalizeNumericValue(raw: string): string {
  let s = toHalfWidth(String(raw ?? ""))
    .replace(/\s+/g, "")
    .replace(/[−–—]/g, "-"); // 全角マイナス・ダッシュ類を半角ハイフンへ

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
    num /= g;
    den /= g;
    return den === 1 ? String(num) : `${num}/${den}`;
  }

  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    // -0 と 0 を同一視し、"1.50" → "1.5"、"01" → "1" に揃える
    if (Number.isFinite(n)) {
      s = Object.is(n, -0) ? "0" : String(n);
    }
  }

  return s;
}
