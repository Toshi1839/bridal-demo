/* 受注と衣装在庫（第3段階・オプションの画面）のデータ
   衣装の名前・品番・写真は、御社サイト（yashiro-dress.com）の公開情報。写真は御社サイトの画像を img/costume に複製して表示する。
   紋付袴・卒業式袴・七五三・小物はサイトに載っていないので、名前もサンプル。料金・在庫の状態・お客様と担当者の氏名はすべてサンプル。
   式場・神社挙式のプラン・キャンペーンの名前と料金は、御社と式場のサイトの公開情報。
   日付は「今日から何日後か」で持ち、画面を開いた日に合わせて並べ直す。 */
(function () {
  "use strict";

  var businesses = [
    { id: "bridal", name: "ウェディング", tone: "gold" },
    { id: "shrine", name: "神社挙式（和婚）", tone: "ver" },
    { id: "photo", name: "フォトウェディング", tone: "green" },
    { id: "furisode", name: "成人式・振袖", tone: "rose" },
    { id: "hakama", name: "卒業式・袴", tone: "blue" },
    { id: "shichigosan", name: "七五三", tone: "amber" }
  ];

  // 御社サイトの「ご利用の流れ」（ご来店 → お打ち合わせ・ご試着 → ご成約 → サイズ補正 → 小物選び → 挙式）に、お届けと返却を足した8つ
  var stages = ["ご来店予約", "打合せ・試着", "ご成約", "サイズ補正", "小物選び", "お届け準備", "当日", "ご返却・完了"];
  var stageTone = { "ご来店予約": "mute", "打合せ・試着": "info", "ご成約": "gold", "サイズ補正": "info", "小物選び": "rose", "お届け準備": "warn", "当日": "rose", "ご返却・完了": "good" };
  // そのステージで済ませること（すべて済むと次のステージへ進める）。2つ目が入金のものは、入金を登録すると自動で済みになる
  var checklists = {
    "ご来店予約": ["ご来店の日時を確定（第1〜第3希望から）", "挙式日・会場（学校）・ご使用日を記録"],
    "打合せ・試着": ["ご希望のイメージと会場の雰囲気を伺う", "おすすめの衣装をご試着・お見積り"],
    "ご成約": ["お客様のお名前で衣装をご予約", "内金の入金を確認"],
    "サイズ補正": ["採寸（サイズ補正）", "補正の依頼書を作成"],
    "小物選び": ["ベール・アクセサリーを専任スタイリストと選ぶ", "残金をご請求"],
    "お届け準備": ["前日までの会場へのお届けを手配", "着付け・ヘアメイクを手配"],
    "当日": ["衣装のご返却を確認", "残金の入金を確認"]
  };
  var stageHelp = {
    "ご来店予約": "ご来店は完全予約制。第1〜第3希望から日時を決めます",
    "打合せ・試着": "イメージと会場の雰囲気を伺い、おすすめの衣装をご試着",
    "ご成約": "お客様のお名前で衣装をご予約。新郎様の衣装は新婦様の衣装が決まってから",
    "サイズ補正": "より美しく着こなしていただけるよう、サイズに合わせて補正",
    "小物選び": "ベール・ウェディングアクセサリーを専任スタイリストと",
    "お届け準備": "衣装・小物は前日までに挙式会場へお届け",
    "当日": "挙式・撮影・式典の当日",
    "ご返却・完了": "ご返却と残金の入金まで確かめて完了"
  };

  var categories = [
    { id: "WD", name: "ウェディングドレス", biz: ["bridal", "photo"], shape: "dress" },
    { id: "CD", name: "カラードレス", biz: ["bridal", "photo"], shape: "dress" },
    { id: "WA", name: "和装（白無垢・色打掛）", biz: ["shrine", "bridal", "photo"], shape: "kimono" },
    { id: "MO", name: "紋付袴", biz: ["shrine", "bridal", "photo"], shape: "kimono" },
    { id: "TX", name: "タキシード", biz: ["bridal", "photo"], shape: "tux" },
    { id: "FS", name: "振袖", biz: ["furisode"], shape: "kimono" },
    { id: "HK", name: "卒業式袴", biz: ["hakama"], shape: "kimono" },
    { id: "SG", name: "七五三", biz: ["shichigosan"], shape: "kimono" },
    { id: "AC", name: "小物", biz: ["bridal", "shrine", "photo", "furisode"], shape: "acc" }
  ];

  // 写真：[一覧用（高さ300px）, 詳細用（高さ900px）]。御社サイトの写真を、このフォルダの img/costume に複製したもの
  // （御社サイトは、ほかのサイトから写真を直接読み込むことを止める設定のため、直接は読み込まない）
  var PHOTO = {};
  ["NY-0094", "NY-0098", "MI3-ow", "MI1-ow", "DEF0044", "KH-0028", "KH-0486", "FL0001", "HE-114", "Fi35-pu", "Fi-28", "KR-0180", "瑞天珀", "010131", "010412", "010425", "010119", "TX-01", "TX-02", "TX-03", "TX-04", "TX-05", "TX-06", "330153", "330167", "330120", "330122", "330052"].forEach(function (code) {
    var f = { "瑞天珀": "zuitenpaku" }[code] || code;
    PHOTO[code] = ["img/costume/" + f + "-s.jpg", "img/costume/" + f + "-l.jpg"];
  });

  // status: avail（貸出可）／rented（貸出中）／cleaning（クリーニング中）／repair（お直し中）。back＝戻る日（今日から何日後）。pick＝御社サイトの「おすすめ」
  function C(code, cat, name, color, hex, size, price, store, rentals, extra) {
    var c = { code: code, cat: cat, name: name, color: color, hex: hex, size: size, price: price, store: store, rentals: rentals, bought: "2021/03/01", status: "avail",
      log: [["2026/09/0" + (1 + rentals % 9), "貸出後のクリーニング・検品"], ["2021/03/01", "在庫に登録"]] };
    if (PHOTO[code]) c.img = PHOTO[code];
    for (var k in extra || {}) c[k] = extra[k];
    return c;
  }
  var costumes = [
    C("NY-0094", "WD", "DAVID K NEW YORK", "オフホワイト", "#F5F5F0", "9号", 280000, "matsue", 9, { pick: true, log: [["2026/09/05", "貸出後のクリーニング・検品"], ["2026/06/18", "裾の修理（社内）"], ["2021/03/01", "在庫に登録"]] }),
    C("NY-0098", "WD", "DAVID K NEW YORK", "オフホワイト", "#F2F0EA", "11号", 260000, "izumo", 7),
    C("MI3-ow", "WD", "オフホワイトのドレス", "オフホワイト", "#F0E9DF", "9号", 198000, "yonago", 15),
    C("MI1-ow", "WD", "オフホワイトのドレス", "オフホワイト", "#EDE3CF", "7号", 198000, "matsue", 12, { status: "cleaning", back: 3, log: [["2026/10/06", "クリーニングに出す"], ["2021/03/01", "在庫に登録"]] }),
    C("DEF0044", "CD", "Delafore", "ベージュ", "#CDB29A", "9号", 180000, "matsue", 11, { pick: true }),
    C("KH-0028", "CD", "KIYOKO HATA × marry", "ローズ", "#E2507A", "9号", 198000, "izumo", 8, { pick: true }),
    C("KH-0486", "CD", "KIYOKO HATA", "ブラウン", "#7A4740", "9号", 190000, "yonago", 6, { status: "cleaning", back: 2, log: [["2026/10/05", "クリーニングに出す"], ["2021/03/01", "在庫に登録"]] }),
    C("FL0001", "CD", "FLOWERY FIELDS", "ピンク", "#EAB3BB", "7号", 170000, "tottori", 10, { status: "rented", back: 2, log: [["2026/09/25", "貸出（OR-26-0402）"], ["2026/08/30", "貸出後のクリーニング・検品"], ["2021/03/01", "在庫に登録"]] }),
    C("HE-114", "CD", "A by Hatsuko endo", "ペールブルー", "#C9D6DC", "9号", 185000, "matsue", 4),
    C("Fi35-pu", "CD", "パープルのドレス", "パープル", "#8D6C8C", "11号", 150000, "yonago", 5),
    C("Fi-28", "CD", "ブルーのドレス", "ブルー", "#9CC7D6", "9号", 150000, "izumo", 9),
    C("KR-0180", "CD", "カーキのドレス", "カーキ", "#4B5A38", "9号", 160000, "tottori", 3),
    C("瑞天珀", "WA", "白無垢 友禅丸章", "白", "#FAF7F0", "Free", 250000, "matsue", 6, { pick: true }),
    C("010131", "WA", "鶴刺繍 赤ライン 華やかで品のある白無垢", "白（赤ライン）", "#F4F1EA", "Free", 220000, "matsue", 9, { pick: true }),
    C("010412", "WA", "鹿の子しぼり 牡丹柄の白無垢", "白", "#F1ECE2", "Free", 230000, "izumo", 7, { pick: true }),
    C("010425", "WA", "白地青海波 唐織和モダンの色打掛", "白地", "#EAD9C8", "Free", 280000, "yonago", 5, { pick: true, status: "repair", back: 9, log: [["2026/10/01", "袖のほつれの修理（外注）"], ["2021/03/01", "在庫に登録"]] }),
    C("010119", "WA", "からし色 和柄の色打掛", "からし色", "#D9B44A", "Free", 260000, "tottori", 8, { pick: true }),
    C("MO-01", "MO", "紋付袴（黒）", "黒", "#2A2A2A", "L", 60000, "matsue", 12, { sample: true }),
    C("MO-02", "MO", "紋付袴（黒）", "黒", "#2A2A2A", "M", 60000, "tottori", 5, { sample: true }),
    C("TX-01", "TX", "ダークブラウン", "ダークブラウン", "#3B2A26", "M", 65000, "matsue", 14, { pick: true }),
    C("TX-02", "TX", "ライトグレー", "ライトグレー", "#B4B4B2", "L", 60000, "izumo", 11, { pick: true }),
    C("TX-03", "TX", "ネイビーグレー", "ネイビーグレー", "#1F2433", "M", 60000, "yonago", 9),
    C("TX-04", "TX", "CPグリーン", "グリーン", "#3D7086", "M", 65000, "tottori", 6, { status: "rented", back: 2, log: [["2026/09/25", "貸出（OR-26-0402）"], ["2021/03/01", "在庫に登録"]] }),
    C("TX-05", "TX", "白×赤ストライプ", "白×赤", "#D58C97", "M", 62000, "matsue", 4),
    C("TX-06", "TX", "FKサテンコードラペル", "ネイビー", "#2F3A5C", "L", 65000, "izumo", 7),
    C("330153", "FS", "振袖（黒地・花柄）", "黒", "#2B2B33", "Free", 248000, "matsue", 3, { pick: true }),
    C("330167", "FS", "振袖（若草色・花柄）", "若草色", "#8DBE3C", "Free", 230000, "izumo", 2, { pick: true }),
    C("330120", "FS", "振袖（朱赤・花柄）", "朱赤", "#E0553F", "Free", 220000, "yonago", 4),
    C("330122", "FS", "振袖（紫・花柄）", "紫", "#8E5A9B", "Free", 210000, "tottori", 2),
    C("330052", "FS", "振袖（桜色・花柄）", "桜色", "#E7A6BD", "Free", 200000, "matsue", 5),
    C("HK-112", "HK", "卒業式袴（紺）", "紺", "#2E3A63", "Free", 48000, "matsue", 6, { sample: true }),
    C("HK-118", "HK", "卒業式袴（海老茶）", "海老茶", "#7A2E2E", "Free", 48000, "izumo", 5, { sample: true }),
    C("SG-071", "SG", "七五三 7歳（赤）", "赤", "#C0463E", "7歳", 38000, "yonago", 4, { sample: true }),
    C("SG-083", "SG", "七五三 5歳（黒）", "黒", "#2B2B2B", "5歳", 36000, "tottori", 3, { sample: true }),
    C("AC-031", "AC", "カテドラルベール", "白", "#FAF8F2", "Free", 25000, "matsue", 22, { sample: true }),
    C("AC-044", "AC", "パールティアラ", "ゴールド", "#D1B064", "Free", 18000, "yonago", 15, { sample: true })
  ];

  // 式場・挙式の場（名前は御社と式場のサイトから）。store＝近くの衣装店
  var venues = [
    { id: "regale", name: "ヴィラ・ノッツェ レガール松江", short: "レガール松江", kind: "自社の邸宅結婚式場", store: "matsue" },
    { id: "cortile", name: "ヴィラ・ノッツェ コルティーレ出雲", short: "コルティーレ出雲", kind: "自社の邸宅結婚式場", store: "izumo" },
    { id: "carreau", name: "ヴィラ・ノッツェ カロー鳥取", short: "カロー鳥取", kind: "自社の邸宅結婚式場", store: "tottori" },
    { id: "corridor", name: "コリドールコート", short: "コリドールコート", kind: "松江イングリッシュガーデンの結婚式場", store: "matsue" },
    { id: "izumotaisha", name: "出雲大社", short: "出雲大社", kind: "神前式", store: "matsue" },
    { id: "miho", name: "美保神社", short: "美保神社", kind: "神前式", store: "matsue" },
    { id: "kumano", name: "熊野大社", short: "熊野大社", kind: "神前式", store: "matsue" },
    { id: "ube", name: "宇倍神社", short: "宇倍神社", kind: "神前式", store: "tottori" }
  ];
  var styles = ["チャペル式", "人前式", "神前式", "フォトウェディング（スタジオ）", "フォトウェディング（ロケ）", "少人数婚・家族婚", "通常レンタル", "オーダーレンタル"];
  // プラン・キャンペーン（名前と料金は公開情報。料金は税込）
  var plans = [
    "シンプル和婚「結」（出雲大社・176,000円〜）", "トータルビューティ和婚「彩」（出雲大社・275,000円）", "フルサポート和婚「絆」（出雲大社・385,000円・人気No.1）", "Premium和婚「華」（出雲大社・495,000円）",
    "美保神社神前挙式プラン（217,800円・初穂料別）", "熊野大社神前挙式プラン（179,300円・初穂料別）", "宇倍神社神前結婚式プラン（鳥取店）",
    "会場リニューアル記念プラン（コルティーレ出雲・ドレス1点と前撮り）", "会場リニューアル記念プラン（コルティーレ出雲・ドレス2点と前撮り）", "【最大60万優待】（カロー鳥取）", "地元婚特典（コルティーレ出雲）",
    "振袖のご成約で ReFa HEART BRUSH mini（15万円以上・先着順）", "振袖ご契約の方は袴セット30％OFF", "NewStylePhoto Wedding（コースA〜C）"
  ];

  var colorChoices = ["オフホワイト", "アイボリー", "シャンパン", "ベージュ", "ローズ", "ピンク", "ブルー", "パープル", "グリーン"];
  var alterParts = ["裾丈", "ウエスト", "バスト", "袖", "着丈"];
  var sources = ["ブライダルフェア（ヴィラ・ノッツェ）", "式場のご紹介", "Web（ご来店予約）", "公式LINE", "Instagram", "お電話", "ご来店", "ご紹介"];

  // 受注。day＝お日取り（今日から何日後）、contract＝成約日（今日から何日後・まだなら null）
  function req(colors, colorNote, design, m, parts, detail, acc, other) {
    return { colors: colors, colorNote: colorNote, design: design, m: m, parts: parts, detail: detail, acc: acc, other: other };
  }
  var noReq = function () { return req([], "", "", { bust: "", waist: "", hip: "", height: "", shoe: "" }, [], "", "", ""); };
  function O(no, customer, biz, store, costumes, day, stage, amount, paid, staff, venue, style, plan, contract, source, checks, rq) {
    return { no: no, customer: customer, biz: biz, store: store, costumes: costumes, day: day, stage: stage, amount: amount, paid: paid, staff: staff, venue: venue, style: style, plan: plan,
      contract: contract, source: source, checks: checks, req: rq || noReq() };
  }
  var orders = [
    O("OR-26-0412", "佐藤様・田中様", "bridal", "matsue", ["NY-0094", "KH-0028", "TX-01"], 37, "お届け準備", 486000, 150000, "森本 彩", "ヴィラ・ノッツェ レガール松江", "チャペル式", "", -145, "式場のご紹介", [true, false],
      req(["オフホワイト", "ローズ"], "ウェディングはオフホワイト、カラードレスはローズ", "袖のあるデザイン、ロングトレーン", { bust: "82", waist: "64", hip: "88", height: "158", shoe: "23" }, ["裾丈", "ウエスト"], "5cmヒール用に裾−3cm、ウエスト1.5cm詰め。カラードレスは裾のみ。", "カテドラルベール、パールティアラ", "新郎のタイはカラードレスに合わせる")),
    O("OR-26-0415", "伊藤様・小林様", "bridal", "izumo", ["NY-0098", "Fi-28", "TX-02"], 120, "ご成約", 612000, 180000, "中村 由佳", "ヴィラ・ノッツェ コルティーレ出雲", "チャペル式", "会場リニューアル記念プラン（コルティーレ出雲・ドレス2点と前撮り）", -12, "ブライダルフェア（ヴィラ・ノッツェ）", [true, true],
      req(["オフホワイト", "ブルー"], "", "ボリュームのあるスカート", { bust: "", waist: "", hip: "", height: "162", shoe: "24" }, [], "", "ショートベール", "プランのドレス2点と前撮り")),
    O("OR-26-0420", "山本 美咲様", "furisode", "izumo", ["330167"], 458, "ご成約", 248000, 50000, "小林 美穂", "二十歳の集い（出雲市）", "通常レンタル", "振袖のご成約で ReFa HEART BRUSH mini（15万円以上・先着順）", -30, "Web（ご来店予約）", [true, false]),
    O("OR-26-0421", "中村 あかり様", "furisode", "tottori", ["330122"], 458, "打合せ・試着", 210000, 0, "前田 真由", "二十歳の集い（当日は鳥取店で着付け）", "オーダーレンタル", "振袖のご成約で ReFa HEART BRUSH mini（15万円以上・先着順）", null, "公式LINE", [true, false]),
    O("OR-26-0398", "加藤様・清水様", "photo", "matsue", ["MI1-ow", "TX-05"], -26, "ご返却・完了", 198000, 198000, "木村 遥", "松江城・武家屋敷・玉造温泉（コースB）", "フォトウェディング（ロケ）", "NewStylePhoto Wedding（コースA〜C）", -120, "Instagram", []),
    O("OR-26-0425", "渡辺 結菜様", "shichigosan", "yonago", ["SG-071"], 31, "ご来店予約", 38000, 0, "森 千尋", "七五三参り", "", "", null, "Web（ご来店予約）", [false, false]),
    O("OR-26-0402", "鈴木様・林様", "bridal", "tottori", ["FL0001", "TX-04"], -11, "当日", 528000, 300000, "西田 奈央", "ヴィラ・ノッツェ カロー鳥取", "チャペル式", "【最大60万優待】（カロー鳥取）", -190, "ブライダルフェア（ヴィラ・ノッツェ）", [false, false]),
    O("OR-26-0409", "高橋 さくら様", "hakama", "matsue", ["HK-112"], 161, "サイズ補正", 33600, 33600, "森本 彩", "卒業式", "", "振袖ご契約の方は袴セット30％OFF", -40, "ご来店", [true, false]),
    O("OR-26-0426", "小川様・木村様", "bridal", "matsue", [], 247, "ご来店予約", 450000, 0, "森本 彩", "コリドールコート", "人前式", "", null, "式場のご紹介", [false, false]),
    O("OR-26-0417", "吉田様・松本様", "photo", "izumo", ["KH-0028"], 16, "サイズ補正", 225000, 100000, "中村 由佳", "スタジオヴィセーヌ出雲店", "フォトウェディング（スタジオ）", "", -60, "Web（ご来店予約）", [true, true]),
    O("OR-26-0388", "井上様・佐々木様", "bridal", "tottori", [], -28, "ご返却・完了", 552000, 552000, "前田 真由", "ヴィラ・ノッツェ カロー鳥取", "人前式", "", -230, "ブライダルフェア（ヴィラ・ノッツェ）", []),
    O("OR-26-0419", "林 ひなた様", "shichigosan", "tottori", ["SG-083"], 23, "小物選び", 45000, 20000, "西田 奈央", "七五三参り（宇倍神社）", "", "", -35, "ご来店", [true, false]),
    O("OR-26-0428", "西村様・青木様", "bridal", "yonago", ["MI3-ow", "AC-031"], 54, "ご成約", 395000, 0, "松本 愛", "ヴィラ・ノッツェ レガール松江", "チャペル式", "", -3, "Instagram", [true, false]),
    O("OR-26-0430", "福田様・岡田様", "shrine", "matsue", ["瑞天珀", "MO-01"], 96, "打合せ・試着", 350000, 0, "坂本 結衣", "出雲大社", "神前式", "フルサポート和婚「絆」（出雲大社・385,000円・人気No.1）", null, "Web（ご来店予約）", [true, false],
      req([], "白無垢は友禅丸章、ご両家の留袖もご相談", "白無垢・綿帽子", { bust: "", waist: "", hip: "", height: "156", shoe: "" }, [], "", "", "挙式後はコルティーレ出雲で会食（ご両家 12名）")),
    O("OR-26-0431", "森様・石井様", "shrine", "matsue", ["010131", "MO-01"], 68, "ご成約", 198000, 60000, "森本 彩", "美保神社", "神前式", "美保神社神前挙式プラン（217,800円・初穂料別）", -20, "お電話", [true, true]),
    O("OR-26-0432", "大野様・遠藤様", "shrine", "tottori", ["010119", "MO-02"], 140, "ご来店予約", 200000, 0, "前田 真由", "宇倍神社", "神前式", "宇倍神社神前結婚式プラン（鳥取店）", null, "Web（ご来店予約）", [false, false]),
    O("OR-26-0433", "岡本様・三浦様", "bridal", "izumo", [], 210, "ご来店予約", 0, 0, "小林 美穂", "ヴィラ・ノッツェ コルティーレ出雲", "チャペル式", "会場リニューアル記念プラン（コルティーレ出雲・ドレス1点と前撮り）", null, "ブライダルフェア（ヴィラ・ノッツェ）", [true, false]),
    O("OR-26-0434", "長谷川様・村上様", "shrine", "matsue", ["010412"], 180, "打合せ・試着", 163000, 0, "木村 遥", "熊野大社", "神前式", "熊野大社神前挙式プラン（179,300円・初穂料別）", null, "式場のご紹介", [true, false])
  ];

  window.P3_DATA = {
    businesses: businesses, stages: stages, stageTone: stageTone, checklists: checklists, stageHelp: stageHelp, categories: categories,
    costumes: costumes, venues: venues, styles: styles, plans: plans, orders: orders, colorChoices: colorChoices, alterParts: alterParts, sources: sources
  };
})();
