// 高校受験トラック（highschool）の初回問題バンク。
// university-track.mjs と同じ方針: 各スキルタグに1問、著者が検算・検証済み。
// 数学は numeric、それ以外は mark。

export const questions = [
  // ================= 数学 (math_hs) — numeric =================
  {
    subjectCode: "math_hs",
    skillTagName: "文字式の四則計算と分配法則",
    format: "numeric",
    difficulty: 3,
    est_time_sec: 90,
    body_md: "3(2x-5)-2(x-4) を計算し、xの係数をア、定数項をイに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "4", kind: "integer" },
        { label: "イ", value: "-7", kind: "integer" },
      ],
    },
    distractors: [
      { slot: "イ", value: "-23", error_tag: "sign_error", why_ja: "-2(x-4)を展開する際の符号の扱いを誤っています" },
    ],
    explanation_md: "3(2x-5)=6x-15、2(x-4)=2x-8。6x-15-(2x-8)=4x-7。",
  },
  {
    subjectCode: "math_hs",
    skillTagName: "連立方程式の文章題",
    format: "numeric",
    difficulty: 5,
    est_time_sec: 150,
    body_md:
      "1個120円のりんごと1個80円のみかんを合わせて10個買うと、代金の合計は1000円だった。りんごの個数をア、みかんの個数をイに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "5", kind: "integer" },
        { label: "イ", value: "5", kind: "integer" },
      ],
    },
    distractors: [{ slot: "ア", value: "6", error_tag: "arithmetic", why_ja: "式を整理する途中の計算を誤っています" }],
    explanation_md: "x+y=10、120x+80y=1000。y=10-xを代入すると120x+800-80x=1000、40x=200、x=5、y=5。",
  },
  {
    subjectCode: "math_hs",
    skillTagName: "二次方程式の解の公式",
    format: "numeric",
    difficulty: 4,
    est_time_sec: 120,
    body_md: "x^2-5x+6=0 を解き、小さい方の解をア、大きい方の解をイに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "2", kind: "integer" },
        { label: "イ", value: "3", kind: "integer" },
      ],
    },
    distractors: [{ slot: "ア", value: "3", error_tag: "wrong_target", why_ja: "小さい方・大きい方の解を取り違えています" }],
    explanation_md: "(x-2)(x-3)=0 より x=2, 3。",
  },
  {
    subjectCode: "math_hs",
    skillTagName: "一次関数の変化の割合と交点",
    format: "numeric",
    difficulty: 4,
    est_time_sec: 120,
    body_md: "一次関数 y=2x+1 と y=-x+7 の交点の座標を、xをア、yをイに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [
        { label: "ア", value: "2", kind: "integer" },
        { label: "イ", value: "5", kind: "integer" },
      ],
    },
    distractors: [{ slot: "ア", value: "3", error_tag: "arithmetic", why_ja: "方程式を整理する計算を誤っています" }],
    explanation_md: "2x+1=-x+7 より 3x=6、x=2。y=2×2+1=5。",
  },
  {
    subjectCode: "math_hs",
    skillTagName: "三角形の合同・相似の証明",
    format: "numeric",
    difficulty: 5,
    est_time_sec: 120,
    body_md:
      "相似な2つの三角形があり、相似比が2:3である。小さい方の三角形の面積が8cm^2のとき、大きい方の三角形の面積は何cm^2か、アに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "ア", value: "18", kind: "integer" }],
    },
    distractors: [
      { slot: "ア", value: "12", error_tag: "formula_confusion", why_ja: "面積比ではなく相似比のまま計算しています" },
    ],
    explanation_md: "面積比は相似比の2乗なので4:9。8×(9/4)=18。",
  },
  {
    subjectCode: "math_hs",
    skillTagName: "円周角の定理",
    format: "numeric",
    difficulty: 3,
    est_time_sec: 90,
    body_md: "ある弧に対する中心角が100°のとき、同じ弧に対する円周角は何度か、アに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "ア", value: "50", kind: "integer" }],
    },
    distractors: [
      { slot: "ア", value: "200", error_tag: "formula_confusion", why_ja: "中心角は円周角の2倍という関係を逆に使っています" },
    ],
    explanation_md: "円周角は中心角の半分なので、100÷2=50°。",
  },
  {
    subjectCode: "math_hs",
    skillTagName: "立体の表面積・体積",
    format: "numeric",
    difficulty: 4,
    est_time_sec: 120,
    body_md: "底面の半径3cm、高さ4cmの円柱の体積は何cm^3か。円周率をπとして、ア・πの形でアに整数で答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "ア", value: "36", kind: "integer" }],
    },
    distractors: [
      { slot: "ア", value: "12", error_tag: "formula_confusion", why_ja: "底面積の計算で半径を2乗するのを忘れています" },
    ],
    explanation_md: "円柱の体積 V=πr^2h = π×3^2×4 = 36π。",
  },
  {
    subjectCode: "math_hs",
    skillTagName: "場合の数と確率の基本計算",
    format: "numeric",
    difficulty: 4,
    est_time_sec: 120,
    body_md:
      "1から6までの目が出るさいころを1回投げるとき、3の倍数の目が出る確率を既約分数「分子/分母」の形でアに答えよ。",
    answer: {
      type: "numeric",
      slots: [{ label: "ア", value: "1/3", kind: "fraction" }],
    },
    distractors: [
      { slot: "ア", value: "1/6", error_tag: "case_omission", why_ja: "3の倍数が3と6の2通りあることを見落としています" },
    ],
    explanation_md: "3の倍数は3, 6の2通り。確率は2/6=1/3。",
  },

  // ================= 英語 (eng_hs) — mark =================
  {
    subjectCode: "eng_hs",
    skillTagName: "5文型の判別",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "次の文の文型として最も適切なものを選べ。\nShe gave me a present.",
    choices: {
      options: [
        { key: "a", text: "SVOO(第4文型)", correct: true },
        { key: "b", text: "SVO(第3文型)", correct: false, error_tag: "grammar_scope", why_ja: "目的語が2つあることを見落としています" },
        { key: "c", text: "SVC(第2文型)", correct: false, error_tag: "word_sense", why_ja: "補語と目的語を混同しています" },
        { key: "d", text: "SVOC(第5文型)", correct: false, error_tag: "collocation", why_ja: "目的語の後の語を補語と誤認しています" },
        { key: "e", text: "SV(第1文型)", correct: false, error_tag: "verb_pattern", why_ja: "自動詞・他動詞の区別を誤っています" },
      ],
    },
    explanation_md: "gave(与えた)は「me(人)にa present(物)を」の形をとる第4文型（SVOO）の動詞。",
  },
  {
    subjectCode: "eng_hs",
    skillTagName: "不定詞の3用法の識別",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "次の文の下線部 to swim の用法として最も適切なものを選べ。\nI want to swim in the sea.",
    choices: {
      options: [
        { key: "a", text: "名詞的用法", correct: true },
        { key: "b", text: "形容詞的用法", correct: false, error_tag: "grammar_scope", why_ja: "名詞を修飾する用法と混同しています" },
        { key: "c", text: "副詞的用法(目的)", correct: false, error_tag: "word_sense", why_ja: "「〜するために」の意味と取り違えています" },
        { key: "d", text: "副詞的用法(結果)", correct: false, error_tag: "collocation", why_ja: "結果を表す用法と混同しています" },
        { key: "e", text: "独立不定詞", correct: false, error_tag: "verb_pattern", why_ja: "慣用表現の独立不定詞と混同しています" },
      ],
    },
    explanation_md: "wantの目的語になっており、「泳ぐこと」という名詞の働きをしているため名詞的用法。",
  },
  {
    subjectCode: "eng_hs",
    skillTagName: "現在完了の継続・経験・完了の区別",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "次の文の現在完了の用法として最も適切なものを選べ。\nI have lived in Tokyo for ten years.",
    choices: {
      options: [
        { key: "a", text: "継続用法", correct: true },
        { key: "b", text: "経験用法", correct: false, error_tag: "grammar_scope", why_ja: "「〜したことがある」という経験の用法と混同しています" },
        { key: "c", text: "完了用法", correct: false, error_tag: "word_sense", why_ja: "「〜し終えた」という完了の意味と取り違えています" },
        { key: "d", text: "結果用法", correct: false, error_tag: "collocation", why_ja: "動作の結果が残っている用法と混同しています" },
        { key: "e", text: "受動用法", correct: false, error_tag: "verb_pattern", why_ja: "受動態と現在完了を混同しています" },
      ],
    },
    explanation_md: "for ten years（10年間）という継続を表す語句があるため継続用法。",
  },
  {
    subjectCode: "eng_hs",
    skillTagName: "内容一致問題の根拠特定",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md:
      "次の英文を読み、内容に一致するものを選べ。\n\nTom usually walks to school, but it rained heavily this morning, so he took the bus instead.",
    choices: {
      options: [
        { key: "a", text: "今朝、トムはバスで学校に行った", correct: true },
        { key: "b", text: "トムは毎日バスで学校に行く", correct: false, error_tag: "overgeneralization", why_ja: "usuallyの意味（普段は徒歩）を見落としています" },
        { key: "c", text: "今朝は晴れていた", correct: false, error_tag: "opposite_polarity", why_ja: "rained heavilyと正反対の内容にしています" },
        { key: "d", text: "トムは学校に行かなかった", correct: false, error_tag: "outside_knowledge", why_ja: "本文に無い内容を推測しています" },
        { key: "e", text: "バスが遅れたため歩いた", correct: false, error_tag: "reference_miss", why_ja: "原因と結果を取り違えています" },
      ],
    },
    explanation_md: "「今朝は激しい雨だったので、代わりにバスに乗った」とあるため、今朝はバス通学だった。",
  },
  {
    subjectCode: "eng_hs",
    skillTagName: "頻出熟語の空所補充",
    format: "mark",
    difficulty: 3,
    est_time_sec: 90,
    body_md: "次の空所に入れるのに最も適切な語を選べ。\nShe is good ___ playing the piano.",
    choices: {
      options: [
        { key: "a", text: "at", correct: true },
        { key: "b", text: "in", correct: false, error_tag: "grammar_scope", why_ja: "be good atの熟語を別の前置詞と混同しています" },
        { key: "c", text: "on", correct: false, error_tag: "word_sense", why_ja: "前置詞の意味を取り違えています" },
        { key: "d", text: "for", correct: false, error_tag: "collocation", why_ja: "be good forとの混同です" },
        { key: "e", text: "with", correct: false, error_tag: "verb_pattern", why_ja: "前置詞の使い分けを誤っています" },
      ],
    },
    explanation_md: "「〜が得意だ」は be good at 〜 の形をとる。",
  },

  // ================= 国語 (jpn_hs) — mark =================
  {
    subjectCode: "jpn_hs",
    skillTagName: "接続語による論理関係の把握",
    format: "mark",
    difficulty: 3,
    est_time_sec: 90,
    body_md: "次の文の空所に入れるのに最も適切な語を選べ。\n雨が降ってきた。（　）、試合は中止になった。",
    choices: {
      options: [
        { key: "a", text: "そのため", correct: true },
        { key: "b", text: "しかし", correct: false, error_tag: "opposite_polarity", why_ja: "逆接の接続語を因果関係の文脈で誤用しています" },
        { key: "c", text: "つまり", correct: false, error_tag: "reference_miss", why_ja: "言い換えの接続語を因果関係の文脈で誤用しています" },
        { key: "d", text: "たとえば", correct: false, error_tag: "example_as_claim", why_ja: "例示の接続語を因果関係の文脈で誤用しています" },
        { key: "e", text: "ところで", correct: false, error_tag: "scope_partial", why_ja: "話題転換の接続語を因果関係の文脈で誤用しています" },
      ],
    },
    explanation_md: "「雨が降った」ことが原因で「試合が中止になった」という因果関係なので、順接の「そのため」が適切。",
  },
  {
    subjectCode: "jpn_hs",
    skillTagName: "古文単語と歴史的仮名遣い",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "次の古文単語「うつくし」の現代語訳として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "かわいらしい", correct: true },
        { key: "b", text: "美しい", correct: false, error_tag: "word_sense", why_ja: "現代語の意味をそのまま古文に当てはめる誤りです" },
        { key: "c", text: "気味が悪い", correct: false, error_tag: "opposite_polarity", why_ja: "本来の意味と正反対の語義にしています" },
        { key: "d", text: "悲しい", correct: false, error_tag: "scope_partial", why_ja: "全く異なる感情の語義と混同しています" },
        { key: "e", text: "恐ろしい", correct: false, error_tag: "outside_knowledge", why_ja: "本文の文脈に根拠のない語義です" },
      ],
    },
    explanation_md: "古文の「うつくし」は現代語の「美しい」ではなく「かわいらしい・愛らしい」の意味で使われる（古今異義語）。",
  },
  {
    subjectCode: "jpn_hs",
    skillTagName: "同音異義語・類義語の識別",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "次の文の空所に入れるのに最も適切な漢字を選べ。\n委員長に（　）す。（推薦するという意味で）",
    choices: {
      options: [
        { key: "a", text: "推す", correct: true },
        { key: "b", text: "押す", correct: false, error_tag: "word_sense", why_ja: "同音の別漢字（力を加える意味）と混同しています" },
        { key: "c", text: "圧す", correct: false, error_tag: "reference_miss", why_ja: "同音の別漢字（押さえつける意味）と混同しています" },
        { key: "d", text: "御す", correct: false, error_tag: "scope_partial", why_ja: "全く異なる意味の漢字と混同しています" },
        { key: "e", text: "治す", correct: false, error_tag: "opposite_polarity", why_ja: "全く異なる意味の漢字と混同しています" },
      ],
    },
    explanation_md: "「推薦する」の意味で使うのは「推す」。「押す」は物理的に力を加える意味。",
  },

  // ================= 理科 (sci_hs) — mark =================
  {
    subjectCode: "sci_hs",
    skillTagName: "力の合成・分解の作図",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "一直線上で同じ向きにはたらく2つの力（3Nと5N）の合力として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "8N", correct: true },
        { key: "b", text: "2N", correct: false, error_tag: "calculation_error", why_ja: "足し算ではなく引き算をしています" },
        { key: "c", text: "15N", correct: false, error_tag: "formula_misapplication", why_ja: "足し算ではなく掛け算をしています" },
        { key: "d", text: "4N", correct: false, error_tag: "concept_confusion", why_ja: "2力の平均を取ってしまっています" },
        { key: "e", text: "0.6N", correct: false, error_tag: "careless_select", why_ja: "足し算ではなく割り算をしています" },
      ],
    },
    explanation_md: "同じ向きにはたらく2力の合力は、それぞれの力の大きさの和になる。3N+5N=8N。",
  },
  {
    subjectCode: "sci_hs",
    skillTagName: "化学変化と質量保存の法則",
    format: "mark",
    difficulty: 4,
    est_time_sec: 120,
    body_md:
      "12gの炭素を完全燃焼させると32gの酸素と反応し二酸化炭素が生じる。このとき生じる二酸化炭素の質量として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "44g", correct: true },
        { key: "b", text: "20g", correct: false, error_tag: "calculation_error", why_ja: "足し算ではなく引き算をしています" },
        { key: "c", text: "384g", correct: false, error_tag: "formula_misapplication", why_ja: "足し算ではなく掛け算をしています" },
        { key: "d", text: "32g", correct: false, error_tag: "concept_confusion", why_ja: "酸素の質量だけを答えています" },
        { key: "e", text: "12g", correct: false, error_tag: "careless_select", why_ja: "炭素の質量だけを答えています" },
      ],
    },
    explanation_md: "質量保存の法則により、反応前の物質の質量の合計＝反応後の物質の質量の合計。12g+32g=44g。",
  },
  {
    subjectCode: "sci_hs",
    skillTagName: "遺伝の規則性（メンデルの法則）",
    format: "mark",
    difficulty: 6,
    est_time_sec: 120,
    body_md:
      "丸い種子(優性)としわのある種子(劣性)の純系を交配してできた雑種第一代(F1)の種子の形として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "すべて丸い種子", correct: true },
        { key: "b", text: "しわのある種子のみ", correct: false, error_tag: "concept_confusion", why_ja: "優性・劣性の形質が現れる関係を逆に理解しています" },
        { key: "c", text: "丸としわが半々", correct: false, error_tag: "formula_misapplication", why_ja: "F2の分離比と純系同士の交配結果を混同しています" },
        { key: "d", text: "丸としわが3:1", correct: false, error_tag: "graph_misread", why_ja: "F2で現れる分離比をF1の結果と取り違えています" },
        { key: "e", text: "中間の形質のみ", correct: false, error_tag: "careless_select", why_ja: "メンデルの法則は中間の形質にはならないことを見落としています" },
      ],
    },
    explanation_md: "純系同士の交配でできるF1では、優性形質（丸い種子）のみが現れる（優性の法則）。",
  },
  {
    subjectCode: "sci_hs",
    skillTagName: "地層の重なりと堆積環境の推定",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "地層の中からアサリの化石が見つかった。この地層が堆積した環境として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "浅い海", correct: true },
        { key: "b", text: "深い海", correct: false, error_tag: "concept_confusion", why_ja: "アサリの生息環境（浅い海）を取り違えています" },
        { key: "c", text: "河口や湖", correct: false, error_tag: "formula_misapplication", why_ja: "淡水・汽水域の示相化石と混同しています" },
        { key: "d", text: "陸上（森林）", correct: false, error_tag: "careless_select", why_ja: "海洋生物の化石であることを見落としています" },
        { key: "e", text: "火山付近", correct: false, error_tag: "graph_misread", why_ja: "堆積岩と火成岩の成因を混同しています" },
      ],
    },
    explanation_md: "アサリは浅い海に生息する貝であり、示相化石として「浅い海で堆積した」ことを示す。",
  },

  // ================= 社会 (soc_hs) — mark =================
  {
    subjectCode: "soc_hs",
    skillTagName: "気候区分と農業の特色の対応",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md:
      "温暖で夏に降水量が多い日本の太平洋側の気候区分と、盛んな農業の組み合わせとして最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "太平洋側の気候・稲作や畑作", correct: true },
        { key: "b", text: "日本海側の気候・稲作", correct: false, error_tag: "term_confusion", why_ja: "気候区分を取り違えています" },
        { key: "c", text: "瀬戸内の気候・果樹栽培", correct: false, error_tag: "cause_effect_confusion", why_ja: "少雨という特徴を太平洋側の特徴と混同しています" },
        { key: "d", text: "中央高地の気候・高原野菜", correct: false, error_tag: "careless_select", why_ja: "内陸性の気候区分と混同しています" },
        { key: "e", text: "南西諸島の気候・さとうきび", correct: false, error_tag: "concept_confusion", why_ja: "亜熱帯の気候区分と混同しています" },
      ],
    },
    explanation_md: "太平洋側の気候は夏に降水量が多く温暖なため、稲作や畑作が盛んに行われる。",
  },
  {
    subjectCode: "soc_hs",
    skillTagName: "年代整序（明治〜昭和の出来事）",
    format: "mark",
    difficulty: 5,
    est_time_sec: 120,
    body_md: "次のうち、最も古い出来事として適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "日清戦争", correct: true },
        { key: "b", text: "日露戦争", correct: false, error_tag: "chronology_error", why_ja: "日清戦争（1894年）より後の出来事です" },
        { key: "c", text: "満州事変", correct: false, error_tag: "term_confusion", why_ja: "昭和初期の出来事と明治期の出来事を混同しています" },
        { key: "d", text: "太平洋戦争", correct: false, error_tag: "cause_effect_confusion", why_ja: "戦争の時期の前後関係を取り違えています" },
        { key: "e", text: "第一次世界大戦", correct: false, error_tag: "careless_select", why_ja: "大正期の出来事と明治期の出来事を混同しています" },
      ],
    },
    explanation_md: "日清戦争(1894-95年)が選択肢の中で最も古い。日露戦争(1904-05)、第一次世界大戦(1914-18)、満州事変(1931)、太平洋戦争(1941-45)の順に続く。",
  },
  {
    subjectCode: "soc_hs",
    skillTagName: "国会・内閣・裁判所の関係",
    format: "mark",
    difficulty: 4,
    est_time_sec: 90,
    body_md: "内閣総理大臣を指名する機関として最も適切なものを選べ。",
    choices: {
      options: [
        { key: "a", text: "国会", correct: true },
        { key: "b", text: "裁判所", correct: false, error_tag: "term_confusion", why_ja: "三権のうち司法を担う機関と取り違えています" },
        { key: "c", text: "天皇", correct: false, error_tag: "cause_effect_confusion", why_ja: "天皇による任命と国会による指名の役割を混同しています" },
        { key: "d", text: "内閣", correct: false, error_tag: "careless_select", why_ja: "指名される側の機関と指名する機関を取り違えています" },
        { key: "e", text: "国民審査", correct: false, error_tag: "chronology_error", why_ja: "最高裁判所裁判官に対する制度と混同しています" },
      ],
    },
    explanation_md: "内閣総理大臣は国会の議決によって指名され、天皇が任命する。",
  },
];
