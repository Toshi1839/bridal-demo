/* 第3段階（オプション）の画面用サンプル：受注と衣装在庫
   提案書に貼った画面イメージ（Remya さんのデモ）の衣装名・担当者名に合わせている。店舗は A〜C店、式場は実名を使わない。
   日付は「今日から何日後か」で持ち、画面を開いた日に合わせて並べ直す。 */
(function () {
  "use strict";

  var businesses = [
    { id: "bridal", name: "ブライダル衣装", tone: "gold" },
    { id: "furisode", name: "成人式振袖", tone: "rose" },
    { id: "photo", name: "フォトウェディング", tone: "green" },
    { id: "shichigosan", name: "七五三", tone: "amber" },
    { id: "hakama", name: "卒業式袴", tone: "blue" }
  ];

  var stages = ["問合せ", "来店予約", "打合せ・試着", "成約", "確定", "準備中", "当日", "完了"];
  var stageTone = { "問合せ": "mute", "来店予約": "info", "打合せ・試着": "info", "成約": "gold", "確定": "good", "準備中": "warn", "当日": "rose", "完了": "good" };

  // そのステージで済ませること（すべて済むと次のステージへ進める）
  var checklists = {
    "問合せ": ["来店日時を予約", "ご希望のお日取り・会場を記録"],
    "来店予約": ["来店の受付", "試着する衣装を準備"],
    "打合せ・試着": ["お見積りを提示", "衣装を仮押さえ"],
    "成約": ["契約書の署名", "内金の入金を確認"],
    "確定": ["採寸", "お直し依頼書を作成"],
    "準備中": ["会場への配送・着付けを手配", "残金を請求"],
    "当日": ["衣装の返却を確認", "残金の入金を確認"]
  };

  var categories = [
    { id: "WD", name: "ウェディングドレス", biz: ["bridal", "photo"], shape: "dress" },
    { id: "CD", name: "カラードレス", biz: ["bridal", "photo"], shape: "dress" },
    { id: "WA", name: "和装（白無垢・色打掛）", biz: ["bridal", "photo"], shape: "kimono" },
    { id: "TX", name: "タキシード", biz: ["bridal", "photo"], shape: "tux" },
    { id: "FS", name: "振袖", biz: ["furisode"], shape: "kimono" },
    { id: "HK", name: "袴", biz: ["hakama"], shape: "kimono" },
    { id: "SG", name: "七五三", biz: ["shichigosan"], shape: "kimono" },
    { id: "AC", name: "小物", biz: ["bridal", "photo", "furisode"], shape: "acc" }
  ];

  // status: avail（貸出可）／rented（貸出中）／cleaning（クリーニング中）／repair（お直し中）。back＝戻る日（今日から何日後）
  var costumes = [
    { code: "WD-1182", cat: "WD", name: "Aラインレースドレス「クララ」", color: "アイボリー", hex: "#EFE6D2", size: "9号", price: 180000, store: "A", rentals: 14, bought: "2023/03/10", status: "avail",
      log: [["2026/09/05", "貸出後のクリーニング・検品"], ["2026/06/18", "裾の修理（社内）"], ["2023/03/10", "在庫に登録"]] },
    { code: "WD-1204", cat: "WD", name: "プリンセスチュールドレス「オーロラ」", color: "オフホワイト", hex: "#F2EEE6", size: "11号", price: 198000, store: "B", rentals: 9, bought: "2024/02/01", status: "avail",
      log: [["2026/08/22", "貸出後のクリーニング・検品"], ["2024/02/01", "在庫に登録"]] },
    { code: "WD-0931", cat: "WD", name: "マーメイドサテンドレス「ルナ」", color: "純白", hex: "#FBFBF8", size: "7号", price: 160000, store: "B", rentals: 21, bought: "2021/11/15", status: "avail",
      log: [["2026/09/20", "貸出後のクリーニング・検品"], ["2025/12/02", "ファスナーの交換（外注）"], ["2021/11/15", "在庫に登録"]] },
    { code: "WD-1150", cat: "WD", name: "エンパイアラインドレス「グレース」", color: "アイボリー", hex: "#EFE6D2", size: "9号", price: 175000, store: "C", rentals: 17, bought: "2022/09/01", status: "rented", back: 2,
      log: [["2026/09/25", "貸出（OR-26-0402）"], ["2026/08/30", "貸出後のクリーニング・検品"], ["2022/09/01", "在庫に登録"]] },
    { code: "WD-1221", cat: "WD", name: "ベルラインドレス「エリーゼ」", color: "シャンパン", hex: "#E9D9B5", size: "9号", price: 210000, store: "A", rentals: 3, bought: "2026/01/20", status: "avail",
      log: [["2026/07/11", "貸出後のクリーニング・検品"], ["2026/01/20", "在庫に登録"]] },
    { code: "WD-1097", cat: "WD", name: "スレンダードレス「ノーラ」", color: "オフホワイト", hex: "#F2EEE6", size: "7号", price: 150000, store: "C", rentals: 12, bought: "2022/04/12", status: "cleaning", back: 4,
      log: [["2026/10/05", "クリーニングに出す"], ["2022/04/12", "在庫に登録"]] },
    { code: "CD-0457", cat: "CD", name: "カラードレス「ローズガーデン」", color: "ダスティピンク", hex: "#DCA9B4", size: "9号", price: 140000, store: "A", rentals: 11, bought: "2023/05/08", status: "avail",
      log: [["2026/09/12", "貸出後のクリーニング・検品"], ["2023/05/08", "在庫に登録"]] },
    { code: "CD-0512", cat: "CD", name: "カラードレス「ミッドナイト」", color: "ネイビー", hex: "#2F3E5E", size: "9号", price: 140000, store: "B", rentals: 8, bought: "2023/10/02", status: "avail",
      log: [["2026/08/09", "貸出後のクリーニング・検品"], ["2023/10/02", "在庫に登録"]] },
    { code: "CD-0533", cat: "CD", name: "カラードレス「セージ」", color: "セージグリーン", hex: "#A9BC9C", size: "11号", price: 130000, store: "C", rentals: 6, bought: "2024/06/14", status: "cleaning", back: 2,
      log: [["2026/10/04", "クリーニングに出す"], ["2024/06/14", "在庫に登録"]] },
    { code: "CD-0548", cat: "CD", name: "カラードレス「アンバー」", color: "マスタードゴールド", hex: "#C9A34E", size: "7号", price: 135000, store: "B", rentals: 4, bought: "2025/03/03", status: "avail",
      log: [["2026/07/26", "貸出後のクリーニング・検品"], ["2025/03/03", "在庫に登録"]] },
    { code: "CD-0561", cat: "CD", name: "カラードレス「ラベンダー」", color: "ラベンダー", hex: "#C7B8DA", size: "9号", price: 138000, store: "A", rentals: 5, bought: "2025/04/18", status: "avail",
      log: [["2026/09/01", "貸出後のクリーニング・検品"], ["2025/04/18", "在庫に登録"]] },
    { code: "WA-0210", cat: "WA", name: "白無垢「雪華」", color: "白", hex: "#FAF8F2", size: "Free", price: 220000, store: "B", rentals: 7, bought: "2022/01/25", status: "avail",
      log: [["2026/06/02", "貸出後のクリーニング・検品"], ["2022/01/25", "在庫に登録"]] },
    { code: "WA-0188", cat: "WA", name: "色打掛「紅」", color: "赤", hex: "#B83A3F", size: "Free", price: 260000, store: "A", rentals: 9, bought: "2021/08/30", status: "avail",
      log: [["2026/05/15", "貸出後のクリーニング・検品"], ["2021/08/30", "在庫に登録"]] },
    { code: "WA-0195", cat: "WA", name: "色打掛「金襴」", color: "金", hex: "#D1B064", size: "Free", price: 280000, store: "C", rentals: 5, bought: "2023/02/14", status: "repair", back: 9,
      log: [["2026/10/01", "袖のほつれの修理（外注）"], ["2023/02/14", "在庫に登録"]] },
    { code: "TX-221", cat: "TX", name: "タキシード「クラシック」", color: "ネイビー", hex: "#2F3E5E", size: "M", price: 60000, store: "A", rentals: 19, bought: "2022/03/01", status: "avail",
      log: [["2026/09/14", "貸出後のクリーニング・検品"], ["2022/03/01", "在庫に登録"]] },
    { code: "TX-238", cat: "TX", name: "タキシード「シャンパン」", color: "シャンパン", hex: "#E9D9B5", size: "L", price: 65000, store: "B", rentals: 6, bought: "2024/09/10", status: "avail",
      log: [["2026/08/20", "貸出後のクリーニング・検品"], ["2024/09/10", "在庫に登録"]] },
    { code: "TX-245", cat: "TX", name: "タキシード「グレー」", color: "グレー", hex: "#8C8F96", size: "M", price: 60000, store: "C", rentals: 10, bought: "2023/07/07", status: "rented", back: 2,
      log: [["2026/09/25", "貸出（OR-26-0402）"], ["2023/07/07", "在庫に登録"]] },
    { code: "FS-0331", cat: "FS", name: "振袖「桜重ね」", color: "桜色", hex: "#E4A7B5", size: "Free", price: 248000, store: "B", rentals: 3, bought: "2025/09/01", status: "avail",
      log: [["2026/01/20", "貸出後のクリーニング・検品"], ["2025/09/01", "在庫に登録"]] },
    { code: "FS-0342", cat: "FS", name: "振袖「瑠璃」", color: "瑠璃色", hex: "#4C6FA8", size: "Free", price: 210000, store: "C", rentals: 2, bought: "2025/09/01", status: "avail",
      log: [["2026/01/18", "貸出後のクリーニング・検品"], ["2025/09/01", "在庫に登録"]] },
    { code: "FS-0356", cat: "FS", name: "振袖「古典花車」", color: "朱赤", hex: "#C0463E", size: "Free", price: 230000, store: "A", rentals: 4, bought: "2024/10/05", status: "avail",
      log: [["2026/01/19", "貸出後のクリーニング・検品"], ["2024/10/05", "在庫に登録"]] },
    { code: "HK-112", cat: "HK", name: "卒業式袴「紺」", color: "紺", hex: "#2E3A63", size: "Free", price: 42000, store: "A", rentals: 6, bought: "2023/12/01", status: "avail",
      log: [["2026/03/25", "貸出後のクリーニング・検品"], ["2023/12/01", "在庫に登録"]] },
    { code: "HK-118", cat: "HK", name: "卒業式袴「海老茶」", color: "海老茶", hex: "#7A2E2E", size: "Free", price: 42000, store: "B", rentals: 5, bought: "2023/12/01", status: "avail",
      log: [["2026/03/24", "貸出後のクリーニング・検品"], ["2023/12/01", "在庫に登録"]] },
    { code: "SG-071", cat: "SG", name: "七五三（7歳）「手毬」", color: "赤", hex: "#C0463E", size: "7歳", price: 38000, store: "A", rentals: 4, bought: "2024/08/20", status: "avail",
      log: [["2025/11/20", "貸出後のクリーニング・検品"], ["2024/08/20", "在庫に登録"]] },
    { code: "SG-083", cat: "SG", name: "七五三（5歳）「鷹」", color: "黒", hex: "#2B2B2B", size: "5歳", price: 36000, store: "C", rentals: 3, bought: "2024/08/20", status: "avail",
      log: [["2025/11/18", "貸出後のクリーニング・検品"], ["2024/08/20", "在庫に登録"]] },
    { code: "AC-031", cat: "AC", name: "カテドラルベール", color: "白", hex: "#FAF8F2", size: "Free", price: 25000, store: "A", rentals: 22, bought: "2022/05/11", status: "avail",
      log: [["2026/09/14", "貸出後の検品"], ["2022/05/11", "在庫に登録"]] },
    { code: "AC-044", cat: "AC", name: "パールティアラ", color: "ゴールド", hex: "#D1B064", size: "Free", price: 18000, store: "B", rentals: 15, bought: "2023/01/09", status: "avail",
      log: [["2026/08/30", "貸出後の検品"], ["2023/01/09", "在庫に登録"]] }
  ];

  var colorChoices = ["アイボリー", "オフホワイト", "純白", "シャンパン", "ダスティピンク", "ネイビー", "赤", "セージグリーン"];
  var alterParts = ["裾丈", "ウエスト", "バスト", "袖", "着丈"];
  var sources = ["式場紹介", "Web", "来店", "ご紹介"];

  // 受注。day＝お日取り（今日から何日後）、contract＝成約日（今日から何日後・まだなら null）
  function req(colors, colorNote, design, m, parts, detail, acc, other) {
    return { colors: colors, colorNote: colorNote, design: design, m: m, parts: parts, detail: detail, acc: acc, other: other };
  }
  var noReq = function () { return req([], "", "", { bust: "", waist: "", hip: "", height: "", shoe: "" }, [], "", "", ""); };
  var orders = [
    { no: "OR-26-0412", customer: "佐藤様・田中様", biz: "bridal", store: "A", costumes: ["WD-1182", "CD-0457", "TX-221"], day: 37, stage: "準備中", amount: 486000, paid: 150000,
      staff: "森本 彩", venue: "ホテル挙式（サンプル）", contract: -145, source: "式場紹介", checks: [true, false],
      req: req(["アイボリー", "純白", "ダスティピンク"], "純白よりアイボリー、カラードレスはダスティピンク", "Aライン、レース袖、ロングトレーン",
        { bust: "82", waist: "64", hip: "88", height: "158", shoe: "23" }, ["裾丈", "ウエスト"], "5cmヒール用に裾−3cm、ウエスト1.5cm詰め。カラードレスは裾のみ。", "カテドラルベール、パールティアラ", "新郎のタイはカラードレスに合わせる") },
    { no: "OR-26-0415", customer: "伊藤様・小林様", biz: "bridal", store: "B", costumes: ["WD-1204", "CD-0512", "TX-238"], day: 120, stage: "成約", amount: 612000, paid: 180000,
      staff: "中村 由佳", venue: "ゲストハウス挙式（サンプル）", contract: -12, source: "Web", checks: [true, true],
      req: req(["オフホワイト", "ネイビー"], "", "ボリュームのあるスカート", { bust: "", waist: "", hip: "", height: "162", shoe: "24" }, [], "", "ショートベール", "") },
    { no: "OR-26-0420", customer: "山本 美咲様", biz: "furisode", store: "B", costumes: ["FS-0331"], day: 458, stage: "成約", amount: 248000, paid: 50000,
      staff: "小林 美穂", venue: "成人式（前撮りあり）", contract: -30, source: "来店", checks: [true, false], req: noReq() },
    { no: "OR-26-0421", customer: "中村 あかり様", biz: "furisode", store: "C", costumes: ["FS-0342"], day: 458, stage: "打合せ・試着", amount: 210000, paid: 0,
      staff: "松本 愛", venue: "成人式", contract: null, source: "Web", checks: [true, false], req: noReq() },
    { no: "OR-26-0398", customer: "加藤様・清水様", biz: "photo", store: "C", costumes: [], day: -26, stage: "完了", amount: 198000, paid: 198000,
      staff: "森 千尋", venue: "ロケーション撮影", contract: -120, source: "Web", checks: [], req: noReq() },
    { no: "OR-26-0425", customer: "渡辺 結菜様", biz: "shichigosan", store: "A", costumes: ["SG-071"], day: 31, stage: "問合せ", amount: 38000, paid: 0,
      staff: "木村 遥", venue: "七五三参り", contract: null, source: "Web", checks: [false, false], req: noReq() },
    { no: "OR-26-0402", customer: "鈴木様・林様", biz: "bridal", store: "C", costumes: ["WD-1150", "TX-245"], day: -11, stage: "当日", amount: 528000, paid: 300000,
      staff: "森 千尋", venue: "ホテル挙式（サンプル）", contract: -190, source: "式場紹介", checks: [false, false], req: noReq() },
    { no: "OR-26-0409", customer: "高橋 さくら様", biz: "hakama", store: "A", costumes: ["HK-112"], day: 161, stage: "確定", amount: 42000, paid: 42000,
      staff: "森本 彩", venue: "卒業式", contract: -40, source: "来店", checks: [true, false], req: noReq() },
    { no: "OR-26-0426", customer: "小川様・木村様", biz: "bridal", store: "A", costumes: [], day: 247, stage: "来店予約", amount: 450000, paid: 0,
      staff: "森本 彩", venue: "ゲストハウス挙式（サンプル）", contract: null, source: "式場紹介", checks: [false, false], req: noReq() },
    { no: "OR-26-0417", customer: "吉田様・松本様", biz: "photo", store: "B", costumes: ["CD-0548"], day: 16, stage: "確定", amount: 225000, paid: 100000,
      staff: "中村 由佳", venue: "スタジオ撮影", contract: -60, source: "Web", checks: [true, true], req: noReq() },
    { no: "OR-26-0388", customer: "井上様・佐々木様", biz: "bridal", store: "C", costumes: [], day: -28, stage: "完了", amount: 552000, paid: 552000,
      staff: "松本 愛", venue: "ホテル挙式（サンプル）", contract: -230, source: "式場紹介", checks: [], req: noReq() },
    { no: "OR-26-0419", customer: "林 ひなた様", biz: "shichigosan", store: "C", costumes: ["SG-083"], day: 23, stage: "準備中", amount: 45000, paid: 20000,
      staff: "森 千尋", venue: "七五三参り", contract: -35, source: "来店", checks: [true, false], req: noReq() },
    { no: "OR-26-0428", customer: "西村様・青木様", biz: "bridal", store: "B", costumes: ["WD-0931", "AC-031"], day: 54, stage: "成約", amount: 395000, paid: 0,
      staff: "小林 美穂", venue: "ホテル挙式（サンプル）", contract: -3, source: "式場紹介", checks: [true, false], req: noReq() },
    { no: "OR-26-0430", customer: "福田様・岡田様", biz: "bridal", store: "A", costumes: ["WA-0188", "TX-221"], day: 96, stage: "打合せ・試着", amount: 520000, paid: 0,
      staff: "坂本 結衣", venue: "神社挙式（サンプル）", contract: null, source: "ご紹介", checks: [true, false], req: noReq() }
  ];

  window.P3_DATA = {
    businesses: businesses, stages: stages, stageTone: stageTone, checklists: checklists, categories: categories,
    costumes: costumes, orders: orders, colorChoices: colorChoices, alterParts: alterParts, sources: sources
  };
})();
