// 大学受験トラック（university）の初回問題バンク。
// 各スキルタグに1問ずつ、著者（このセッションのAI）が作成し自ら検算・検証したもの。
// 数学は numeric（逆算・複数正解事故を防ぐ）、それ以外は mark（5択）。
//
// 品質ゲート（question-format.md §5）はプログラム側（scripts/insert-questions.mjs）で検証する:
//   - mark: 5択ちょうど・正答1つ・誤答4つ全てにerror_tag・keyが5つとも相異なる・均質性(文字数比≤2.0)
//   - numeric: distractors値が正答と非衝突・正規化後にdistractors同士も非衝突

export const questions = [
  // ================= 数学 (math_univ) — numeric =================
  {
    subjectCode: "math_univ",
    skillTagName: "微分による増減表の作成",
    format: "numeric",
    difficulty: 5,
    est_time_sec: 240,
    body_md:
      "f(x) = x^3 - 3x^2 + 2 の極大値をアに、極小値をイに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "2", kind: "integer" },
        { label: "イ", value: "-2", kind: "integer" },
      ],
    },
    distractors: [
      { slot: "イ", value: "2", error_tag: "sign_error", why_ja: "極小値の符号を取り違えています" },
    ],
    explanation_md:
      "f'(x)=3x^2-6x=3x(x-2)。f'(x)=0 の解は x=0, 2。増減表より x=0 で極大、x=2 で極小。f(0)=2（極大値）、f(2)=8-12+2=-2（極小値）。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "条件付き確率",
    format: "numeric",
    difficulty: 6,
    est_time_sec: 300,
    body_md:
      "袋に赤玉3個、白玉2個が入っている。玉を1個取り出し、色を確認せず戻さずにもう1個取り出す。2個目が白玉であったとき、1個目も白玉であった条件付き確率を、既約分数「分子/分母」の形でアに答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "ア", value: "1/4", kind: "fraction" }],
    },
    distractors: [
      { slot: "ア", value: "2/5", error_tag: "case_omission", why_ja: "2個目が白玉である確率と取り違え、条件付けの計算を省略しています" },
    ],
    explanation_md:
      "P(1個目白,2個目白)=(2/5)(1/4)=1/10。P(2個目白)=(3/5)(2/4)+(2/5)(1/4)=6/20+2/20=2/5。求める条件付き確率=(1/10)/(2/5)=1/4。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "整数の証明問題",
    format: "numeric",
    difficulty: 5,
    est_time_sec: 240,
    body_md: "84 と 126 の最大公約数をアイに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "アイ", value: "42", kind: "integer" }],
    },
    distractors: [
      { slot: "アイ", value: "21", error_tag: "arithmetic", why_ja: "計算の途中で余分に2で割ってしまっています" },
    ],
    explanation_md: "84=2^2×3×7、126=2×3^2×7。共通因数は2×3×7=42。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "二次関数の場合分けによる最大最小",
    format: "numeric",
    difficulty: 6,
    est_time_sec: 300,
    body_md:
      "0≤x≤3 の範囲で f(x)=x^2-4x+5 の最大値をアに、最小値をイに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "5", kind: "integer" },
        { label: "イ", value: "1", kind: "integer" },
      ],
    },
    distractors: [
      { slot: "ア", value: "2", error_tag: "case_omission", why_ja: "端点x=0の値を確認せず、x=3側だけで最大値を判断しています" },
    ],
    explanation_md:
      "f(x)=(x-2)^2+1。頂点x=2は範囲内で最小値1。端点はf(0)=5, f(3)=2。最大値は5（x=0）。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "漸化式から一般項を求める",
    format: "numeric",
    difficulty: 6,
    est_time_sec: 300,
    body_md:
      "a1=1, a(n+1)=2an+3 で定まる数列の一般項を an = ア・2^n + イ の形で表すとき、アとイに整数を答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "2", kind: "integer" },
        { label: "イ", value: "-3", kind: "integer" },
      ],
    },
    distractors: [
      { slot: "イ", value: "3", error_tag: "sign_error", why_ja: "特性方程式の解の符号を取り違えています" },
    ],
    explanation_md:
      "bn=an+3 とおくと b(n+1)=2bn, b1=4 より bn=4・2^(n-1)=2^(n+1)。an=2^(n+1)-3=2・2^n-3。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "空間ベクトルの内積と角度",
    format: "numeric",
    difficulty: 5,
    est_time_sec: 240,
    body_md:
      "ベクトルa=(1,1,0)、ベクトルb=(1,0,1)のなす角をθとする。cosθの値を既約分数「分子/分母」の形でアに答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "ア", value: "1/2", kind: "fraction" }],
    },
    distractors: [
      { slot: "ア", value: "1/4", error_tag: "arithmetic", why_ja: "|a||b|の計算でルートの扱いを誤っています" },
    ],
    explanation_md: "a・b=1×1+1×0+0×1=1。|a|=|b|=√2。cosθ=1/(√2×√2)=1/2。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "位置ベクトルによる図形の証明",
    format: "numeric",
    difficulty: 6,
    est_time_sec: 300,
    body_md:
      "三角形ABCにおいて、辺BCを2:1に内分する点をDとする。ベクトルADをア/3・ベクトルAB＋イ/3・ベクトルACの形で表すとき、アとイに整数を答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "1", kind: "integer" },
        { label: "イ", value: "2", kind: "integer" },
      ],
    },
    distractors: [
      { slot: "ア", value: "2", error_tag: "domain_ignored", why_ja: "内分比の向き（BD:DC）を取り違えています" },
    ],
    explanation_md:
      "D=B+(2/3)(C-B)=(1/3)B+(2/3)C。AD=D-A=(1/3)(B-A)+(2/3)(C-A)=(1/3)AB+(2/3)AC。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "加法定理を用いた式変形",
    format: "numeric",
    difficulty: 6,
    est_time_sec: 300,
    body_md:
      "sin75°の値を (√ア＋√イ)/ウ の形で表すとき、ア・イ・ウに整数を答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "6", kind: "integer" },
        { label: "イ", value: "2", kind: "integer" },
        { label: "ウ", value: "4", kind: "integer" },
      ],
    },
    distractors: [
      { slot: "ウ", value: "2", error_tag: "arithmetic", why_ja: "分母の計算で係数の掛け忘れがあります" },
    ],
    explanation_md:
      "sin75°=sin(45°+30°)=sin45°cos30°+cos45°sin30°=(√2/2)(√3/2)+(√2/2)(1/2)=(√6+√2)/4。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "三角方程式・不等式の解法",
    format: "numeric",
    difficulty: 5,
    est_time_sec: 240,
    body_md:
      "0≤x<2π の範囲で sinx=1/2 を満たすxを小さい順に ア/イ・π、ウ/エ・π の形（既約分数）で答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア/イ", value: "1/6", kind: "fraction" },
        { label: "ウ/エ", value: "5/6", kind: "fraction" },
      ],
    },
    distractors: [
      { slot: "ウ/エ", value: "7/6", error_tag: "domain_ignored", why_ja: "sinが負になる範囲の解を誤って含めています" },
    ],
    explanation_md: "sinx=1/2 の解は x=π/6, 5π/6（0≤x<2πの範囲）。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "対数方程式・不等式",
    format: "numeric",
    difficulty: 6,
    est_time_sec: 300,
    body_md: "log2(x)+log2(x-2)=3 を満たすxの値をアに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "ア", value: "4", kind: "integer" }],
    },
    distractors: [
      { slot: "ア", value: "-2", error_tag: "domain_ignored", why_ja: "真数条件（x>2）を確認せず、方程式の解をそのまま採用しています" },
    ],
    explanation_md:
      "log2(x(x-2))=3 より x(x-2)=8、x^2-2x-8=0、(x-4)(x+2)=0。真数条件x>2よりx=4のみ。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "指数関数のグラフと最大最小",
    format: "numeric",
    difficulty: 5,
    est_time_sec: 240,
    body_md:
      "-1≤x≤2 の範囲で f(x)=2^x の最大値をアに、最小値を既約分数でイに答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "4", kind: "integer" },
        { label: "イ", value: "1/2", kind: "fraction" },
      ],
    },
    distractors: [
      { slot: "ア", value: "1/2", error_tag: "wrong_target", why_ja: "最大値と最小値を取り違えています" },
    ],
    explanation_md: "2^xは単調増加。x=-1で最小値1/2、x=2で最大値4。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "軌跡の方程式",
    format: "numeric",
    difficulty: 5,
    est_time_sec: 240,
    body_md:
      "2点A(0,0)、B(4,0)から等距離にある点の軌跡は直線 x=ア である。アに整数を答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "ア", value: "2", kind: "integer" }],
    },
    distractors: [
      { slot: "ア", value: "4", error_tag: "arithmetic", why_ja: "中点ではなく点Bの座標をそのまま答えています" },
    ],
    explanation_md: "線分ABの垂直二等分線は中点(2,0)を通りx軸に垂直な直線 x=2。",
  },
  {
    subjectCode: "math_univ",
    skillTagName: "領域における最大最小",
    format: "numeric",
    difficulty: 6,
    est_time_sec: 300,
    body_md:
      "領域 x+y≤4, x≥0, y≥0 において、2x+3yの最大値をアイに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "アイ", value: "12", kind: "integer" }],
    },
    distractors: [
      { slot: "アイ", value: "8", error_tag: "partial_stop", why_ja: "頂点(0,4)を確認せず、途中の頂点(4,0)の値で計算を止めています" },
    ],
    explanation_md:
      "領域の頂点は(0,0),(4,0),(0,4)。目的関数の値はそれぞれ0,8,12。線形計画法より最大値は頂点で取り、12。",
  },

  // ================= 英語 (eng_univ) — mark =================
  {
    subjectCode: "eng_univ",
    skillTagName: "関係代名詞の非制限用法",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md:
      "次の空所に入れるのに最も適切なものを選べ。\nMy father, ___ lives in Osaka, is a doctor.",
    choices: {
      options: [
        { key: "a", text: "who", correct: true },
        { key: "b", text: "which", correct: false, error_tag: "grammar_scope", why_ja: "先行詞が人であるにもかかわらず物を指すwhichを使っています" },
        { key: "c", text: "that", correct: false, error_tag: "reference_miss", why_ja: "コンマ付きの非制限用法ではthatは使えません" },
        { key: "d", text: "whom", correct: false, error_tag: "word_sense", why_ja: "主格の位置なのに目的格whomを使っています" },
        { key: "e", text: "whose", correct: false, error_tag: "collocation", why_ja: "所有格の意味になり、後続の動詞livesと結びつきません" },
      ],
    },
    explanation_md: "非制限用法（コンマ+関係代名詞）で先行詞が人・主格の場合はwhoを用いる。thatは非制限用法では使えない。",
  },
  {
    subjectCode: "eng_univ",
    skillTagName: "段落要旨の把握",
    format: "mark",
    difficulty: 6,
    est_time_sec: 150,
    body_md:
      "次の文章を読み、筆者の主張として最も適切なものを選べ。\n\n近年、リモートワークの普及により、多くの企業がオフィスの規模を縮小している。一方で、対面でのコミュニケーションが減ることで、若手社員の育成が難しくなっているという指摘もある。効率と人材育成のバランスをどう取るかが、今後の企業経営における重要な課題となるだろう。",
    choices: {
      options: [
        { key: "a", text: "効率化と人材育成の両立が今後の課題である", correct: true },
        { key: "b", text: "リモートワークは今後廃止されるべきである", correct: false, error_tag: "overgeneralization", why_ja: "本文にない極端な結論に飛躍しています" },
        { key: "c", text: "オフィスの規模縮小こそが筆者の主張である", correct: false, error_tag: "example_as_claim", why_ja: "具体例（オフィス縮小の事実）を筆者の主張と取り違えています" },
        { key: "d", text: "若手社員の育成は完全に不可能である", correct: false, error_tag: "scope_partial", why_ja: "指摘の一部（育成の難しさ）だけを取り出し、全体主張を無視しています" },
        { key: "e", text: "リモートワークは理解を深める効果がある", correct: false, error_tag: "outside_knowledge", why_ja: "本文に根拠のない一般論を持ち込んでいます" },
      ],
    },
    explanation_md: "本文は効率化（リモートワーク普及）と人材育成の難しさという2つの側面を挙げ、そのバランスが今後の課題だと述べている。",
  },
  {
    subjectCode: "eng_univ",
    skillTagName: "指示語の照応",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md:
      "次の英文を読み、下線部Itが指す内容として最も適切なものを選べ。\n\nMany students struggle with time management when they start university. It often leads to procrastination and stress.",
    choices: {
      options: [
        { key: "a", text: "時間管理の失敗", correct: true },
        { key: "b", text: "大学に入学すること", correct: false, error_tag: "reference_miss", why_ja: "直前の別の名詞句を指示語の先行詞と取り違えています" },
        { key: "c", text: "多くの大学生の存在", correct: false, error_tag: "word_sense", why_ja: "Itが人を指すという誤った解釈をしています" },
        { key: "d", text: "感じるストレスそのもの", correct: false, error_tag: "scope_partial", why_ja: "Itが引き起こす結果を原因そのものと取り違えています" },
        { key: "e", text: "課題の先延ばし行動", correct: false, error_tag: "example_as_claim", why_ja: "Itが指すものが引き起こす結果の一つを、指示対象そのものと取り違えています" },
      ],
    },
    explanation_md: "Itはこの文の主節「Many students struggle with time management」の中の「time management（の失敗）」を指す。",
  },
  {
    subjectCode: "eng_univ",
    skillTagName: "文脈からの語彙推測",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md:
      "次の空所に入れるのに最も適切なものを選べ。\nThe committee decided to ___ the meeting until next week due to unforeseen circumstances.",
    choices: {
      options: [
        { key: "a", text: "postpone", correct: true },
        { key: "b", text: "attend", correct: false, error_tag: "word_sense", why_ja: "文脈に合わない語義（出席する）を選んでいます" },
        { key: "c", text: "announce", correct: false, error_tag: "collocation", why_ja: "meetingとの結びつき（コロケーション）として不適切です" },
        { key: "d", text: "remind", correct: false, error_tag: "grammar_scope", why_ja: "remindはremind A of Bの構文を必要とし、この文の形に合いません" },
        { key: "e", text: "suggest", correct: false, error_tag: "verb_pattern", why_ja: "suggestの語法（that節や動名詞を伴う）に合わない使い方です" },
      ],
    },
    explanation_md: "「予期せぬ事情のため会議を来週まで延期する」という文脈にはpostpone（延期する）が適切。",
  },
  {
    subjectCode: "eng_univ",
    skillTagName: "多義語の識別",
    format: "mark",
    difficulty: 5,
    est_time_sec: 90,
    body_md:
      "次の英文の下線部addressの意味として最も適切なものを選べ。\nThe mayor decided to address the growing concerns of local residents.",
    choices: {
      options: [
        { key: "a", text: "対処する", correct: true },
        { key: "b", text: "居住する", correct: false, error_tag: "word_sense", why_ja: "addressの別義（住所）から連想した誤った語義選択です" },
        { key: "c", text: "演説する", correct: false, error_tag: "collocation", why_ja: "concernsとの結びつきを誤読しています" },
        { key: "d", text: "挨拶する", correct: false, error_tag: "outside_knowledge", why_ja: "一般的なイメージからの誤った連想です" },
        { key: "e", text: "訪問する", correct: false, error_tag: "reference_miss", why_ja: "文中の別の語との意味の混同です" },
      ],
    },
    explanation_md: "addressは多義語で、ここでは「(問題などに)対処する、取り組む」の意味で使われている。",
  },
  {
    subjectCode: "eng_univ",
    skillTagName: "仮定法過去完了の用法",
    format: "mark",
    difficulty: 6,
    est_time_sec: 120,
    body_md:
      "次の空所に入れるのに最も適切な形を選べ。\nIf she ___ harder, she would have passed the exam.",
    choices: {
      options: [
        { key: "a", text: "had studied", correct: true },
        { key: "b", text: "studied", correct: false, error_tag: "grammar_scope", why_ja: "仮定法過去完了に必要な過去完了形の使いどころを誤っています" },
        { key: "c", text: "has studied", correct: false, error_tag: "verb_pattern", why_ja: "時制の一致が取れていません" },
        { key: "d", text: "would study", correct: false, error_tag: "collocation", why_ja: "帰結節の形が重複し、条件節との組み合わせが不適切です" },
        { key: "e", text: "did study", correct: false, error_tag: "word_sense", why_ja: "強調の過去形になり、仮定の意味を表せません" },
      ],
    },
    explanation_md: "「would have + 過去分詞」の帰結節に対応する条件節は「if + 主語 + had + 過去分詞」（仮定法過去完了）。",
  },
  {
    subjectCode: "eng_univ",
    skillTagName: "分詞構文の意味上の主語",
    format: "mark",
    difficulty: 6,
    est_time_sec: 120,
    body_md:
      "次の英文の分詞構文について最も適切な指摘を選べ。\nWalking along the beach, the sunset looked beautiful.",
    choices: {
      options: [
        { key: "a", text: "分詞の意味上の主語と主節の主語が一致しない誤りである", correct: true },
        { key: "b", text: "sunsetが歩いているという意味で文法的に正しい", correct: false, error_tag: "word_sense", why_ja: "分詞構文の意味を誤って解釈しています" },
        { key: "c", text: "分詞構文ではなく後置修飾であり問題はない", correct: false, error_tag: "grammar_scope", why_ja: "構文の種類を取り違えています" },
        { key: "d", text: "前文の情報がないと判断できない", correct: false, error_tag: "scope_partial", why_ja: "この文単体で判断できる誤りを見落としています" },
        { key: "e", text: "beachが歩いているという意味になる", correct: false, error_tag: "reference_miss", why_ja: "分詞の意味上の主語を誤って特定しています" },
      ],
    },
    explanation_md: "分詞構文の意味上の主語は主節の主語と一致するのが原則。この文では「歩いている」のは省略された人であり、主節の主語sunsetとは一致しない（懸垂分詞）。",
  },
  {
    subjectCode: "eng_univ",
    skillTagName: "会話特有表現の空所補充",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md:
      "次の会話の空所に入れるのに最も適切な表現を選べ。\nA: Could you help me carry these boxes?\nB: ___. Where do you want them?",
    choices: {
      options: [
        { key: "a", text: "Sure, no problem", correct: true },
        { key: "b", text: "I don't think so", correct: false, error_tag: "word_sense", why_ja: "依頼への応答として意味が正反対になっています" },
        { key: "c", text: "It's on me", correct: false, error_tag: "collocation", why_ja: "「私のおごりです」という別の慣用表現で文脈に合いません" },
        { key: "d", text: "Never mind", correct: false, error_tag: "outside_knowledge", why_ja: "会話の流れと無関係な定型表現です" },
        { key: "e", text: "Not at all, thanks", correct: false, error_tag: "scope_partial", why_ja: "丁寧な響きはあるが依頼への承諾表現としては不適切です" },
      ],
    },
    explanation_md: "依頼に対して快諾する定型表現はSure, no problem。続くWhere do you want them?とも自然につながる。",
  },

  // ================= 国語 (jpn_univ) — mark =================
  {
    subjectCode: "jpn_univ",
    skillTagName: "筆者の主張の要約",
    format: "mark",
    difficulty: 6,
    est_time_sec: 150,
    body_md:
      "次の文章を読み、筆者の主張として最も適切なものを選べ。\n\n情報技術の発展により、私たちは大量の情報に瞬時にアクセスできるようになった。しかし、情報量の増加は必ずしも理解の深化を意味しない。むしろ、断片的な情報の消費に終始し、物事を多角的に考察する力が失われつつあるのではないか。真に必要なのは、情報の量ではなく、それを吟味し関連づける力である。",
    choices: {
      options: [
        { key: "a", text: "情報を吟味し関連づける力こそ重要である", correct: true },
        { key: "b", text: "情報技術の発展は全て否定されるべきである", correct: false, error_tag: "overgeneralization", why_ja: "本文にない極端な結論に飛躍しています" },
        { key: "c", text: "大量の情報にアクセスできることが筆者の主張である", correct: false, error_tag: "example_as_claim", why_ja: "前提となる事実を筆者の主張そのものと取り違えています" },
        { key: "d", text: "多角的思考力の喪失だけが本文の論点である", correct: false, error_tag: "scope_partial", why_ja: "本文の一部（懸念）だけを取り出し、結論部分を無視しています" },
        { key: "e", text: "情報技術は理解を深めるものである", correct: false, error_tag: "opposite_polarity", why_ja: "本文の主張（理解の深化を意味しない）と肯定・否定を逆に取っています" },
      ],
    },
    explanation_md: "本文は情報量の増加が理解の深化を意味しないと指摘し、必要なのは情報を吟味し関連づける力だと結んでいる。",
  },
  {
    subjectCode: "jpn_univ",
    skillTagName: "論理展開の把握（対比構造）",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md:
      "次の文章の空所に入れるのに最も適切な語を選べ。\n\n従来の教育は知識の暗記を重視してきた。（　）、近年は思考力や表現力を重視する教育への転換が進んでいる。",
    choices: {
      options: [
        { key: "a", text: "しかし", correct: true },
        { key: "b", text: "つまり", correct: false, error_tag: "reference_miss", why_ja: "言い換えの接続語を対比の文脈で誤用しています" },
        { key: "c", text: "なぜなら", correct: false, error_tag: "opposite_polarity", why_ja: "原因・結果の関係を対比の関係と取り違えています" },
        { key: "d", text: "さらに", correct: false, error_tag: "scope_partial", why_ja: "累加の接続語であり、対比の一部のような印象を与えるだけで文意に合いません" },
        { key: "e", text: "たとえば", correct: false, error_tag: "example_as_claim", why_ja: "例示の接続語を対比の文脈で誤用しています" },
      ],
    },
    explanation_md: "前半（暗記重視）と後半（思考力重視への転換）は対比関係にあるため、逆接の「しかし」が適切。",
  },
  {
    subjectCode: "jpn_univ",
    skillTagName: "助動詞の識別と意味",
    format: "mark",
    difficulty: 5,
    est_time_sec: 90,
    body_md:
      "次の傍線部の助動詞の意味として最も適切なものを選べ。\n「今は昔、竹取の翁といふ者ありけり」の「けり」の意味は。",
    choices: {
      options: [
        { key: "a", text: "過去（〜た）", correct: true },
        { key: "b", text: "詠嘆（〜だなあ）", correct: false, error_tag: "word_sense", why_ja: "「けり」の別の用法（詠嘆）と混同しています" },
        { key: "c", text: "推量（〜だろう）", correct: false, error_tag: "grammar_scope", why_ja: "推量の助動詞との活用・接続の違いを誤認しています" },
        { key: "d", text: "完了（〜てしまった）", correct: false, error_tag: "collocation", why_ja: "完了の助動詞「つ・ぬ」と「けり」を混同しています" },
        { key: "e", text: "打消（〜ない）", correct: false, error_tag: "reference_miss", why_ja: "全く異なる助動詞と取り違えています" },
      ],
    },
    explanation_md: "地の文の文末にある「けり」は物語の過去の出来事を述べる過去の助動詞。",
  },
  {
    subjectCode: "jpn_univ",
    skillTagName: "敬語による人物関係の把握",
    format: "mark",
    difficulty: 6,
    est_time_sec: 120,
    body_md:
      "次の文の敬語表現から、誰への敬意が表されているか最も適切なものを選べ。\n「帝、后に賜ふ」（帝が后に何かをお与えになる）における「賜ふ」は誰への敬意か。",
    choices: {
      options: [
        { key: "a", text: "帝への敬意（尊敬語）", correct: true },
        { key: "b", text: "后への敬意を表す", correct: false, error_tag: "reference_miss", why_ja: "敬意の対象（動作主）を取り違えています" },
        { key: "c", text: "作者から帝への謙譲語", correct: false, error_tag: "grammar_scope", why_ja: "謙譲語と尊敬語の区別を誤っています" },
        { key: "d", text: "読者への敬意（丁寧語）", correct: false, error_tag: "word_sense", why_ja: "敬語の種類（丁寧語）を誤認しています" },
        { key: "e", text: "誰への敬意も表さない", correct: false, error_tag: "scope_partial", why_ja: "敬語表現の機能そのものを見落としています" },
      ],
    },
    explanation_md: "「賜ふ」は尊敬語で、動作主（与える人）である帝への敬意を表す。",
  },
  {
    subjectCode: "jpn_univ",
    skillTagName: "句形（使役・受身）の理解",
    format: "mark",
    difficulty: 5,
    est_time_sec: 90,
    body_md: "次の漢文の句形として最も適切なものを選べ。\n「使民戦」（民をして戦わしむ）",
    choices: {
      options: [
        { key: "a", text: "使役形", correct: true },
        { key: "b", text: "受身形", correct: false, error_tag: "grammar_scope", why_ja: "句形の種類（受身と使役）を取り違えています" },
        { key: "c", text: "疑問形", correct: false, error_tag: "reference_miss", why_ja: "全く異なる句形と混同しています" },
        { key: "d", text: "仮定形", correct: false, error_tag: "word_sense", why_ja: "句形の意味（仮定と使役）を混同しています" },
        { key: "e", text: "比較形", correct: false, error_tag: "scope_partial", why_ja: "文中の一部の語だけを見て別の句形と判断しています" },
      ],
    },
    explanation_md: "「使A〜」は「Aをして〜しむ」と読む使役形の典型パターン。",
  },
  {
    subjectCode: "jpn_univ",
    skillTagName: "書き下し文への変換",
    format: "mark",
    difficulty: 6,
    est_time_sec: 120,
    body_md: "次の漢文を書き下し文にしたとき、最も適切なものを選べ。\n「不入虎穴、不得虎子」",
    choices: {
      options: [
        { key: "a", text: "虎穴に入らずんば、虎子を得ず", correct: true },
        { key: "b", text: "虎穴に入りて、虎子を得ず", correct: false, error_tag: "grammar_scope", why_ja: "否定の呼応（〜ずんば）を無視しています" },
        { key: "c", text: "虎穴に入らずんば、虎子を得たり", correct: false, error_tag: "word_sense", why_ja: "文末の意味（否定）を取り違えています" },
        { key: "d", text: "虎穴を入らずんば、虎子に得ず", correct: false, error_tag: "collocation", why_ja: "助詞の使い方を誤っています" },
        { key: "e", text: "虎穴に入らば、虎子を得ん", correct: false, error_tag: "reference_miss", why_ja: "仮定形と否定形の構造を取り違えています" },
      ],
    },
    explanation_md: "「不入A、不得B」は「Aに入らずんば、Bを得ず」（Aしなければ、Bを得られない）と読む。",
  },
  {
    subjectCode: "jpn_univ",
    skillTagName: "登場人物の心情変化の把握",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md:
      "次の文章を読み、傍線部における主人公の心情として最も適切なものを選べ。\n\n彼は合格発表の掲示板の前に立ち、自分の受験番号を何度も確かめた。番号を見つけた瞬間、膝の力が抜けそうになった。",
    choices: {
      options: [
        { key: "a", text: "安堵と喜びが入り混じった心情", correct: true },
        { key: "b", text: "怒りと失望が入り混じった心情", correct: false, error_tag: "opposite_polarity", why_ja: "心情の方向をプラスからマイナスへ逆に取り違えています" },
        { key: "c", text: "他の受験生に対する同情の心情", correct: false, error_tag: "scope_partial", why_ja: "主人公以外の心情と混同しています" },
        { key: "d", text: "受験制度そのものへの不満の心情", correct: false, error_tag: "outside_knowledge", why_ja: "本文に根拠のない一般論を持ち込んでいます" },
        { key: "e", text: "次の目標への焦りの心情", correct: false, error_tag: "example_as_claim", why_ja: "合格後に一般的に起こりうる展開を、この場面の心情として先取りしています" },
      ],
    },
    explanation_md: "「膝の力が抜けそうになった」は緊張が解けた安堵と、合格を確認した喜びが同時に押し寄せた様子を表す表現。",
  },

  // ================= 理科 (sci_univ) — mark =================
  {
    subjectCode: "sci_univ",
    skillTagName: "等加速度運動の公式運用",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md:
      "静止していた物体が一定の加速度2.0 m/s^2で運動を始めた。5.0秒後の速度として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "10 m/s", correct: true },
        { key: "b", text: "2.5 m/s", correct: false, error_tag: "calculation_error", why_ja: "加速度を時間で割ってしまっています" },
        { key: "c", text: "25 m/s", correct: false, error_tag: "formula_misapplication", why_ja: "変位の公式(1/2)at^2と速度の公式v=atを混同しています" },
        { key: "d", text: "7.0 m/s", correct: false, error_tag: "concept_confusion", why_ja: "加速度と時間を単純に足し算しています" },
        { key: "e", text: "50 m/s", correct: false, error_tag: "graph_misread", why_ja: "v-tグラフの傾きと面積の意味を取り違えています" },
      ],
    },
    explanation_md: "等加速度直線運動の速度の公式 v=v0+at より、v=0+2.0×5.0=10 m/s。",
  },
  {
    subjectCode: "sci_univ",
    skillTagName: "力のつり合いと作図",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "水平な机の上に置かれた物体にはたらく重力とつり合う力として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "机からの垂直抗力", correct: true },
        { key: "b", text: "物体にはたらく摩擦力", correct: false, error_tag: "concept_confusion", why_ja: "水平方向の力と鉛直方向の力を混同しています" },
        { key: "c", text: "物体自身の慣性力", correct: false, error_tag: "formula_misapplication", why_ja: "この状況では発生しない力を想定しています" },
        { key: "d", text: "物体にはたらく空気抵抗", correct: false, error_tag: "careless_select", why_ja: "静止した物体には働かない力を選んでいます" },
        { key: "e", text: "物体にはたらく見せかけの力", correct: false, error_tag: "graph_misread", why_ja: "存在しない力を作図上の誤解釈から想定しています" },
      ],
    },
    explanation_md: "静止している物体には重力（鉛直下向き）と垂直抗力（鉛直上向き）がつり合ってはたらいている。",
  },
  {
    subjectCode: "sci_univ",
    skillTagName: "オームの法則と回路計算",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "抵抗10Ωに電圧20Vを加えたとき、流れる電流として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "2.0 A", correct: true },
        { key: "b", text: "200 A", correct: false, error_tag: "formula_misapplication", why_ja: "電圧と抵抗を掛け算してしまっています" },
        { key: "c", text: "0.5 A", correct: false, error_tag: "concept_confusion", why_ja: "I=V/Rを逆にR/Vとして計算しています" },
        { key: "d", text: "10 A", correct: false, error_tag: "calculation_error", why_ja: "電圧から抵抗を引き算してしまっています" },
        { key: "e", text: "20 A", correct: false, error_tag: "careless_select", why_ja: "抵抗の値を無視して電圧をそのまま答えています" },
      ],
    },
    explanation_md: "オームの法則 I=V/R より、I=20/10=2.0 A。",
  },
  {
    subjectCode: "sci_univ",
    skillTagName: "化学反応式の量的関係（モル計算）",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md:
      "2.0 molの水素と十分な酸素を反応させて水を生成する（2H2+O2→2H2O）。生成する水は何molか、最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "2.0 mol", correct: true },
        { key: "b", text: "1.0 mol", correct: false, error_tag: "formula_misapplication", why_ja: "反応式の係数比を逆に適用しています" },
        { key: "c", text: "4.0 mol", correct: false, error_tag: "concept_confusion", why_ja: "酸素の係数と反応の量的関係を混同しています" },
        { key: "d", text: "0.5 mol", correct: false, error_tag: "calculation_error", why_ja: "計算の際に誤って2で割っています" },
        { key: "e", text: "2.0 g", correct: false, error_tag: "careless_select", why_ja: "molとgという単位を混同しています" },
      ],
    },
    explanation_md: "2H2+O2→2H2O の係数比よりH2とH2Oは1:1。2.0 molのH2から2.0 molのH2Oが生成する。",
  },
  {
    subjectCode: "sci_univ",
    skillTagName: "中和滴定の計算",
    format: "mark",
    difficulty: 6,
    est_time_sec: 150,
    body_md:
      "0.10 mol/Lの塩酸20 mLを中和するのに必要な0.20 mol/Lの水酸化ナトリウム水溶液の体積として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "10 mL", correct: true },
        { key: "b", text: "20 mL", correct: false, error_tag: "concept_confusion", why_ja: "濃度の違いを無視して同じ体積としています" },
        { key: "c", text: "40 mL", correct: false, error_tag: "formula_misapplication", why_ja: "濃度比を逆にかけています" },
        { key: "d", text: "5 mL", correct: false, error_tag: "calculation_error", why_ja: "計算の際に2倍と1/2を取り違えています" },
        { key: "e", text: "0.010 mL", correct: false, error_tag: "careless_select", why_ja: "単位（LとmL）の換算を誤っています" },
      ],
    },
    explanation_md: "中和の関係より 0.10×20=0.20×V、V=10 mL。",
  },

  // ================= 社会 (soc_univ) — mark =================
  {
    subjectCode: "soc_univ",
    skillTagName: "明治期の条約改正の経緯",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md:
      "日本が欧米諸国と結んでいた不平等条約のうち、関税自主権の回復を実現した外相として最も適切な人物を選べ。",
    choices: {
      options: [
        { key: "a", text: "小村寿太郎", correct: true },
        { key: "b", text: "陸奥宗光", correct: false, error_tag: "term_confusion", why_ja: "領事裁判権の撤廃を実現した人物と取り違えています" },
        { key: "c", text: "岩倉具視", correct: false, error_tag: "cause_effect_confusion", why_ja: "条約改正交渉の発端となった使節団長と最終的な成果達成者を混同しています" },
        { key: "d", text: "伊藤博文", correct: false, error_tag: "chronology_error", why_ja: "異なる時期に活躍した人物と取り違えています" },
        { key: "e", text: "井上馨", correct: false, error_tag: "careless_select", why_ja: "交渉に関わった人物ではあるが、最終的な達成者ではありません" },
      ],
    },
    explanation_md: "関税自主権の完全回復は1911年、小村寿太郎外相によって実現した。",
  },
  {
    subjectCode: "soc_univ",
    skillTagName: "冷戦期の国際関係の把握",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md: "1962年に米ソ間で核戦争の危機に発展した出来事として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "キューバ危機", correct: true },
        { key: "b", text: "ベルリン封鎖", correct: false, error_tag: "chronology_error", why_ja: "時期の異なる冷戦初期の出来事と混同しています" },
        { key: "c", text: "朝鮮戦争の勃発", correct: false, error_tag: "cause_effect_confusion", why_ja: "冷戦の代理戦争という点で別の出来事と混同しています" },
        { key: "d", text: "ベトナム戦争", correct: false, error_tag: "term_confusion", why_ja: "冷戦期の別の紛争と取り違えています" },
        { key: "e", text: "スプートニク打上げ", correct: false, error_tag: "careless_select", why_ja: "同時期の米ソ対立に関する別の出来事と混同しています" },
      ],
    },
    explanation_md: "1962年、ソ連がキューバにミサイル基地を建設したことで米ソ間の緊張が最高潮に達した（キューバ危機）。",
  },
  {
    subjectCode: "soc_univ",
    skillTagName: "三権分立の仕組み",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "日本国憲法における三権分立のうち、法律の違憲審査権を持つ機関として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "裁判所（司法府）", correct: true },
        { key: "b", text: "内閣（行政府）", correct: false, error_tag: "term_confusion", why_ja: "権限の所在を取り違えています" },
        { key: "c", text: "国会（立法府）", correct: false, error_tag: "cause_effect_confusion", why_ja: "法律を制定する機関と審査する機関を混同しています" },
        { key: "d", text: "内閣法制局", correct: false, error_tag: "chronology_error", why_ja: "審査に関与する機関と最終的な権限を持つ機関を混同しています" },
        { key: "e", text: "会計検査院", correct: false, error_tag: "careless_select", why_ja: "全く異なる役割の機関を選んでいます" },
      ],
    },
    explanation_md: "違憲審査権（法令審査権）は裁判所が持ち、最終的な判断権は最高裁判所にある。",
  },
  {
    subjectCode: "soc_univ",
    skillTagName: "需要供給曲線の読み取り",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md: "ある商品の価格が上昇したとき、需要曲線上で起こる変化として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "需要曲線上を左上へ移動する", correct: true },
        { key: "b", text: "需要曲線自体が左にシフトする", correct: false, error_tag: "concept_confusion", why_ja: "曲線上の移動と曲線自体のシフトを混同しています" },
        { key: "c", text: "供給曲線上を右上に移動する", correct: false, error_tag: "term_confusion", why_ja: "需要と供給の曲線を取り違えています" },
        { key: "d", text: "需要量だけが増加する", correct: false, error_tag: "cause_effect_confusion", why_ja: "価格と需要量の関係を逆に理解しています" },
        { key: "e", text: "曲線に変化は起きない", correct: false, error_tag: "careless_select", why_ja: "価格変化の影響そのものを見落としています" },
      ],
    },
    explanation_md: "価格の上昇は需要曲線上を左上（数量減・価格増の方向）へ移動させ、需要量を減少させる。曲線自体はシフトしない。",
  },
];
