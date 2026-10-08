/* 画面を足した分（顧客・来店予約・請求と入金・経費・TKC連携・従業員・休暇・ユーザーと権限）のサンプル
   Remya さんのデモ（9/27 版）の項目に合わせている。店舗は A〜C店、取引先・式場は実名を使わない。
   日付は「今日から何日後か」で持ち、画面を開いた日に合わせて並べ直す。
   "m1"＝今月1日、"p1"＝先月1日、"pe1"＝先月の末日、"pe2"＝先々月の末日。 */
(function () {
  "use strict";

  // 画面ごとの権限。full＝全権限／own＝自店舗／view＝閲覧／self＝本人の分／use＝利用／none＝なし
  // 店舗に属する方（役職者・従業員・アルバイト）は、どの画面でも自分の店舗の分だけを表示する
  var perm = {
    home:      { exec: "use",  manager: "use",  staff: "use",  parttime: "use",  accounting: "use" },
    ai:        { exec: "use",  manager: "use",  staff: "use",  parttime: "use",  accounting: "use" },
    docs:      { exec: "full", manager: "view", staff: "view", parttime: "view", accounting: "view" },
    results:   { exec: "full", manager: "own",  staff: "none", parttime: "none", accounting: "full" },
    input:     { exec: "none", manager: "own",  staff: "own",  parttime: "none", accounting: "none" },
    confirm:   { exec: "none", manager: "none", staff: "none", parttime: "none", accounting: "full" },
    orders:    { exec: "full", manager: "own",  staff: "own",  parttime: "view", accounting: "view" },
    customers: { exec: "full", manager: "own",  staff: "own",  parttime: "none", accounting: "none" },
    calendar:  { exec: "full", manager: "own",  staff: "own",  parttime: "view", accounting: "none" },
    inventory: { exec: "full", manager: "own",  staff: "own",  parttime: "view", accounting: "view" },
    invoices:  { exec: "full", manager: "view", staff: "none", parttime: "none", accounting: "full" },
    expenses:  { exec: "full", manager: "own",  staff: "own",  parttime: "none", accounting: "full" },
    tkc:       { exec: "view", manager: "none", staff: "none", parttime: "none", accounting: "full" },
    employees: { exec: "full", manager: "view", staff: "none", parttime: "none", accounting: "none" },
    leave:     { exec: "full", manager: "own",  staff: "self", parttime: "self", accounting: "self" },
    users:     { exec: "full", manager: "none", staff: "none", parttime: "none", accounting: "none" }
  };
  var permLabel = { full: "全権限", own: "自店舗", view: "閲覧", self: "本人の分", use: "利用", none: "—" };

  // ---------- 来店予約 ----------
  var apptTypes = {
    visit: { name: "ご来店・打合せ", tone: "info" },
    fitting: { name: "試着", tone: "gold" },
    size: { name: "補正合わせ", tone: "warn" },
    acc: { name: "小物選び", tone: "rose" },
    shoot: { name: "前撮り", tone: "good" },
    ret: { name: "返却・検品", tone: "mute" }
  };
  // 定休日（火曜日）に当たる予約は、画面で翌日に送る
  var appts = [
    { d: 0, t: "10:00", type: "fitting", order: "OR-26-0430", staff: "坂本 結衣" },
    { d: 0, t: "11:00", type: "visit", order: "OR-26-0426", staff: "森本 彩" },
    { d: 0, t: "14:00", type: "acc", order: "OR-26-0415", staff: "中村 由佳" },
    { d: 0, t: "16:30", type: "ret", order: "OR-26-0402", staff: "森 千尋" },
    { d: 1, t: "13:00", type: "fitting", order: "OR-26-0421", staff: "松本 愛" },
    { d: 1, t: "15:30", type: "visit", order: "OR-26-0425", staff: "木村 遥" },
    { d: 2, t: "10:30", type: "size", order: "OR-26-0412", staff: "森本 彩" },
    { d: 2, t: "16:00", type: "fitting", order: "OR-26-0419", staff: "森 千尋" },
    { d: 3, t: "11:00", type: "visit", order: "OR-26-0428", staff: "小林 美穂" },
    { d: 4, t: "10:00", type: "shoot", order: "OR-26-0420", staff: "小林 美穂" },
    { d: 5, t: "10:00", type: "size", order: "OR-26-0417", staff: "中村 由佳" },
    { d: 5, t: "13:00", type: "fitting", order: "OR-26-0409", staff: "木村 遥" },
    { d: 6, t: "11:00", type: "fitting", order: "OR-26-0426", staff: "坂本 結衣" },
    { d: 6, t: "14:30", type: "acc", order: "OR-26-0412", staff: "坂本 結衣" }
  ];

  // ---------- 顧客（受注番号ごとの、お客様の情報） ----------
  // past＝過去のご利用 [内容, 金額（税別）, 今日から何日後]
  var custInfo = {
    "OR-26-0412": { id: "C-1021", since: -160, past: [], next: "記念日フォト（挙式の1年後）" },
    "OR-26-0415": { id: "C-1034", since: -20, past: [], next: "前撮り（フォトウェディング）" },
    "OR-26-0420": { id: "C-0877", since: -420, past: [["卒業式袴（お姉様のご利用）", 42000, -400]], next: "卒業式袴（成人式のご利用で30%割引）", note: "2025年にお姉様が卒業式袴をご利用" },
    "OR-26-0421": { id: "C-1102", since: -15, past: [], next: "卒業式袴（成人式のご利用で30%割引）" },
    "OR-26-0398": { id: "C-0751", since: -130, past: [], next: "ご家族の写真" },
    "OR-26-0425": { id: "C-1110", since: -5, past: [], next: "次の七五三（3年後）" },
    "OR-26-0402": { id: "C-0698", since: -200, past: [], next: "記念日フォト（挙式の1年後）" },
    "OR-26-0409": { id: "C-0923", since: -700, past: [["成人式振袖", 218000, -640]], next: "3〜5年後のブライダル", note: "成人式の振袖もご利用いただいたお客様" },
    "OR-26-0426": { id: "C-1115", since: -10, past: [], next: "前撮り（フォトウェディング）" },
    "OR-26-0417": { id: "C-0988", since: -70, past: [], next: "記念日フォト" },
    "OR-26-0388": { id: "C-0642", since: -240, past: [], next: "ご家族の七五三" },
    "OR-26-0419": { id: "C-1006", since: -40, past: [], next: "次の七五三（3年後）" },
    "OR-26-0428": { id: "C-1118", since: -8, past: [], next: "前撮り（フォトウェディング）" },
    "OR-26-0430": { id: "C-1120", since: -25, past: [], next: "前撮り（和装）" }
  };

  // ---------- 請求と入金 ----------
  // base＝税別の金額（税込は1.1倍）。type：内金／残金／一括。paid＝入金日（まだなら null）
  var invoices = [
    { no: "INV-26-0937", order: "OR-26-0428", type: "内金", base: 120000, issued: -3, due: 0, paid: null },
    { no: "INV-26-0935", order: "OR-26-0417", type: "残金", base: 125000, issued: -3, due: 9, paid: null },
    { no: "INV-26-0934", order: "OR-26-0412", type: "残金", base: 336000, issued: -2, due: 23, paid: null },
    { no: "INV-26-0931", order: "OR-26-0402", type: "残金", base: 228000, issued: -15, due: -1, paid: null },
    { no: "INV-26-0928", order: "OR-26-0419", type: "残金", base: 25000, issued: -6, due: 10, paid: null },
    { no: "INV-26-0919", order: "OR-26-0415", type: "内金", base: 180000, issued: -12, due: -5, paid: -6 },
    { no: "INV-26-0915", order: "OR-26-0420", type: "内金", base: 50000, issued: -30, due: -23, paid: -25 },
    { no: "INV-26-0902", order: "OR-26-0409", type: "一括", base: 42000, issued: -40, due: -30, paid: -33 },
    { no: "INV-26-0887", order: "OR-26-0388", type: "残金", base: 402000, issued: -40, due: -30, paid: -29 },
    { no: "INV-26-0874", order: "OR-26-0398", type: "一括", base: 198000, issued: -45, due: -30, paid: -31 }
  ];
  // 衣装の他にかかる分の書き方（請求書の品目）
  var otherLine = { bridal: "着付け・お直し・小物など", photo: "撮影・データ・小物など", furisode: "着付け・前撮り・小物など", shichigosan: "着付け・小物など", hakama: "着付け・小物など" };

  // ---------- 経費 ----------
  // amount は税込。chk＝業者の請求書との照合（一致／金額相違／定期）。quote＝見積の金額（相違があるとき）
  var expCats = ["お直し外注", "ヘアメイク・着付け外注", "撮影外注", "クリーニング", "配送費", "衣装仕入", "地代家賃", "水道光熱費", "広告宣伝費"];
  var expAcct = { "お直し外注": "out", "ヘアメイク・着付け外注": "out", "撮影外注": "out", "クリーニング": "out", "配送費": "ship", "衣装仕入": "buy", "地代家賃": "rent", "水道光熱費": "util", "広告宣伝費": "ads" };
  var expenses = [
    { no: "EX-26-0121", d: -1, store: "A", cat: "お直し外注", desc: "アトリエ・ブラン · 裾・ウエスト（WD-1182）", order: "OR-26-0412", amount: 19800, st: "承認済", chk: "一致" },
    { no: "EX-26-0120", d: -1, store: "A", cat: "配送費", desc: "配送業者（サンプル） · 会場への配送", order: "OR-26-0412", amount: 6600, st: "承認待ち", chk: "一致" },
    { no: "EX-26-0118", d: -3, store: "C", cat: "ヘアメイク・着付け外注", desc: "着付け（外部スタッフ） · 挙式当日", order: "OR-26-0402", amount: 16500, st: "承認待ち", chk: "一致" },
    { no: "EX-26-0115", d: -4, store: "B", cat: "撮影外注", desc: "フリーカメラマン · スタジオ撮影", order: "OR-26-0417", amount: 66000, st: "要確認", chk: "金額相違", quote: 60500 },
    { no: "EX-26-0112", d: -5, store: "B", cat: "衣装仕入", desc: "振袖 新規仕入（5点）", order: null, amount: 1650000, st: "承認済", chk: "一致" },
    { no: "EX-26-0109", d: -7, store: "C", cat: "クリーニング", desc: "クリーニング店（サンプル） · 使用後のドレス 6点", order: null, amount: 39600, st: "承認済", chk: "一致" },
    { no: "EX-26-0106", d: -12, store: "B", cat: "広告宣伝費", desc: "Instagram 広告 · 振袖キャンペーン", order: null, amount: 132000, st: "承認済", chk: "一致" },
    { no: "EX-26-0104", d: -20, store: "C", cat: "お直し外注", desc: "お直し外注 · 裾", order: "OR-26-0388", amount: 13200, st: "承認済", chk: "一致" },
    { no: "EX-26-0102", d: -24, store: "C", cat: "撮影外注", desc: "撮影データの編集 · 外注", order: "OR-26-0398", amount: 24200, st: "承認済", chk: "一致" },
    { no: "EX-26-0101", d: "m1", store: "A", cat: "地代家賃", desc: "A店 家賃（{m}月分）", order: null, amount: 935000, st: "承認済", chk: "定期" }
  ];

  // 月次給与費（店舗・部門ごとの合計の元）：[給与, 法定福利費, 通勤手当]。給与計算は今のサービスのまま
  var salary = { A: [1650000, 297000, 53000], B: [1240000, 223200, 36800], C: [950000, 171000, 29000], HQ: [2100000, 378000, 42000] };
  var salaryBonusMonths = [7, 12];

  // ---------- TKC連携 ----------
  // 勘定科目とコード（サンプル。導入のときに会計事務所と決める）
  var accounts = {
    bank: ["普通預金", "1112"], ar: ["売掛金", "1135"], adv: ["前受金", "2150"], ap: ["買掛金", "2110"], accr: ["未払金", "2120"],
    sales: ["売上高", "4110"], buy: ["仕入高", "5110"], out: ["外注費", "6120"], ship: ["荷造運賃", "6150"], sal: ["給料手当", "6210"],
    bonus: ["賞与", "6220"], wel: ["法定福利費", "6230"], rent: ["地代家賃", "6310"], util: ["水道光熱費", "6320"], ads: ["広告宣伝費", "6410"]
  };
  var mapping = [
    ["レンタル売上（施行のとき）", "sales"], ["内金（ご成約のとき）", "adv"], ["お客様の未入金", "ar"], ["入金（振込・カード）", "bank"],
    ["外注費（お直し・着付け・撮影・クリーニング）", "out"], ["配送費", "ship"], ["衣装の仕入", "buy"], ["家賃", "rent"],
    ["給与（月次の合計）", "sal"], ["賞与", "bonus"], ["法定福利費", "wel"], ["広告", "ads"]
  ];
  var journal = [
    { d: -1, dr: "ar", cr: "sales", src: "OR-26-0402（施行）", amount: 580800, st: "送信可" },
    { d: -1, dr: "out", cr: "ap", src: "EX-26-0121 · OR-26-0412", amount: 19800, st: "送信可" },
    { d: -4, dr: "out", cr: "ap", src: "EX-26-0115 · OR-26-0417", amount: 66000, st: "科目要確認" },
    { d: -5, dr: "buy", cr: "ap", src: "EX-26-0112", amount: 1650000, st: "送信可" },
    { d: -6, dr: "bank", cr: "adv", src: "INV-26-0919 · OR-26-0415", amount: 198000, st: "送信済" },
    { d: "m1", dr: "rent", cr: "accr", src: "EX-26-0101（A店 家賃）", amount: 935000, st: "送信済" },
    { d: "pe2", dr: "sal", cr: "accr", src: "{m2}月分の給与", amount: 5940000, st: "送信済" },
    { d: "pe2", dr: "wel", cr: "accr", src: "{m2}月分の給与", amount: 1069200, st: "送信済" }
  ];
  var sends = [
    { d: "m1", text: "{m}月分の家賃 · 4件" },
    { d: "p1", text: "{m1}月の売上・経費 · 214件" },
    { d: "pe2", text: "{m2}月分の給与 · 8件" }
  ];

  // ---------- 従業員と休暇 ----------
  // leave＝有給の残り（日）、taken＝今年度に取った日数、grant10＝付与が10日以上（年5日の取得義務の対象）
  var employees = [
    { id: "E-0012", name: "石田 誠", mail: "ishida", store: null, pos: "取締役", type: "正社員", joined: "2008/04/01", leave: 16.0, taken: 4, grant10: true, role: "exec", tfa: true, last: 0 },
    { id: "E-0045", name: "森本 彩", mail: "morimoto", store: "A", pos: "店長", type: "正社員", joined: "2014/10/01", leave: 11.5, taken: 5, grant10: true, role: "manager", tfa: true, last: 0 },
    { id: "E-0078", name: "坂本 結衣", mail: "sakamoto", store: "A", pos: "衣装コーディネーター", type: "正社員", joined: "2019/04/01", leave: 8.0, taken: 3, grant10: true, role: "staff", tfa: true, last: 0 },
    { id: "E-0093", name: "木村 遥", mail: "kimura", store: "A", pos: "衣装コーディネーター", type: "正社員", joined: "2022/04/01", leave: 6.5, taken: 2, grant10: true, role: "staff", tfa: true, last: -1 },
    { id: "E-0101", name: "小林 美穂", mail: "kobayashi", store: "B", pos: "店長", type: "正社員", joined: "2012/07/01", leave: 14.0, taken: 5, grant10: true, role: "manager", tfa: true, last: 0 },
    { id: "E-0110", name: "中村 由佳", mail: "nakamura", store: "B", pos: "着付師", type: "パート", joined: "2022/04/01", leave: 6.5, taken: 5, grant10: true, role: "staff", tfa: true, last: -1 },
    { id: "E-0131", name: "田中 優", mail: "tanaka", store: "B", pos: "接客（アルバイト）", type: "アルバイト", joined: "2025/09/01", leave: 3.0, taken: 1, grant10: false, role: "parttime", tfa: true, last: -2 },
    { id: "E-0117", name: "松本 愛", mail: "matsumoto", store: "C", pos: "店長", type: "正社員", joined: "2016/04/01", leave: 10.0, taken: 4, grant10: true, role: "manager", tfa: true, last: 0 },
    { id: "E-0126", name: "森 千尋", mail: "mori", store: "C", pos: "衣装コーディネーター", type: "正社員", joined: "2023/04/01", leave: 5.0, taken: 2, grant10: true, role: "staff", tfa: true, last: -1 },
    { id: "E-0128", name: "岡田 恵美", mail: "okada", store: "C", pos: "縫製・お直し担当", type: "パート", joined: "2024/09/01", leave: 3.0, taken: 1, grant10: false, role: "staff", tfa: false, last: null },
    { id: "E-0124", name: "井上 陽翔", mail: "inoue", store: null, pos: "経理", type: "正社員", joined: "2021/04/01", leave: 9.0, taken: 3, grant10: true, role: "accounting", tfa: true, last: 0 },
    { id: "E-0081", name: "藤田 里奈", mail: "fujita", store: null, pos: "総務・人事", type: "正社員", joined: "2017/04/01", leave: 12.0, taken: 6, grant10: true, role: "manager", tfa: true, last: -1 }
  ];
  var leaveTypes = ["年次有給休暇", "年次有給休暇（半日）", "特別休暇（慶弔）"];
  var leave = [
    { name: "坂本 結衣", type: "年次有給休暇", d: 6, days: 1, st: "申請中" },
    { name: "木村 遥", type: "年次有給休暇", d: 11, days: 2, st: "申請中" },
    { name: "小林 美穂", type: "年次有給休暇", d: 15, days: 1, st: "申請中" },
    { name: "中村 由佳", type: "年次有給休暇（半日）", d: -8, days: 0.5, st: "承認済" },
    { name: "岡田 恵美", type: "特別休暇（慶弔）", d: 26, days: 1, st: "承認済", note: "親族の結婚式" },
    { name: "森 千尋", type: "年次有給休暇", d: 4, days: 1, st: "却下", note: "挙式の当日のため、日を変えてもらう（就業規則 第12条）" }
  ];

  // ---------- 操作の記録（実績のサンプル入力と同じ時刻） ----------
  var audit = [
    { d: -1, h: 17, m: 42, who: "小林 美穂", what: "実績を入力（成約 · B店）" },
    { d: -1, h: 18, m: 20, who: "坂本 結衣", what: "実績を入力（成約 · A店）" },
    { d: -1, h: 19, m: 5, who: "木村 遥", what: "実績を入力（施行 · A店）" },
    { d: 0, h: 8, m: 41, who: "井上 陽翔", what: "ログイン（2段階認証）" },
    { d: 0, h: 8, m: 58, who: "森本 彩", what: "ログイン（2段階認証）" },
    { d: 0, h: 10, m: 15, who: "松本 愛", what: "実績を入力（成約 · C店）" }
  ];

  window.EXT_DATA = {
    perm: perm, permLabel: permLabel, apptTypes: apptTypes, appts: appts, custInfo: custInfo,
    invoices: invoices, otherLine: otherLine, expCats: expCats, expAcct: expAcct, expenses: expenses,
    salary: salary, salaryBonusMonths: salaryBonusMonths, accounts: accounts, mapping: mapping, journal: journal, sends: sends,
    employees: employees, leaveTypes: leaveTypes, leave: leave, audit: audit
  };
})();
