/* 足した画面（予約の受付・来店予約・フェアとお食事・お客様の声・顧客・請求と入金・経費・TKC連携・従業員・休暇・ユーザーと権限）のデータ
   店舗・式場・フェア・イベント・体験レポートは、御社と式場のサイトの公開情報（2026-10-08 に確認）。
   フェアの日付・空席・予約、お客様と従業員の氏名、金額はサンプル。日付は「今日から何日後か」で持ち、画面を開いた日に合わせて並べ直す。
   "m1"＝今月1日、"p1"＝先月1日、"pe1"＝先月の末日、"pe2"＝先々月の末日。 */
(function () {
  "use strict";

  // 画面ごとの権限。full＝全権限／own＝自店舗／view＝閲覧／self＝本人の分／use＝利用／none＝なし
  var perm = {
    home:      { exec: "use",  manager: "use",  staff: "use",  parttime: "use",  accounting: "use" },
    ai:        { exec: "use",  manager: "use",  staff: "use",  parttime: "use",  accounting: "use" },
    docs:      { exec: "full", manager: "view", staff: "view", parttime: "view", accounting: "view" },
    voice:     { exec: "full", manager: "full", staff: "use",  parttime: "use",  accounting: "use" },
    results:   { exec: "full", manager: "own",  staff: "none", parttime: "none", accounting: "full" },
    input:     { exec: "none", manager: "own",  staff: "own",  parttime: "none", accounting: "none" },
    confirm:   { exec: "none", manager: "none", staff: "none", parttime: "none", accounting: "full" },
    inbox:     { exec: "full", manager: "own",  staff: "own",  parttime: "view", accounting: "none" },
    calendar:  { exec: "full", manager: "own",  staff: "own",  parttime: "view", accounting: "none" },
    fairs:     { exec: "full", manager: "full", staff: "full", parttime: "view", accounting: "none" },
    customers: { exec: "full", manager: "own",  staff: "own",  parttime: "none", accounting: "none" },
    orders:    { exec: "full", manager: "own",  staff: "own",  parttime: "view", accounting: "view" },
    inventory: { exec: "full", manager: "own",  staff: "own",  parttime: "view", accounting: "view" },
    invoices:  { exec: "full", manager: "view", staff: "none", parttime: "none", accounting: "full" },
    expenses:  { exec: "full", manager: "own",  staff: "own",  parttime: "none", accounting: "full" },
    tkc:       { exec: "view", manager: "none", staff: "none", parttime: "none", accounting: "full" },
    employees: { exec: "full", manager: "view", staff: "none", parttime: "none", accounting: "none" },
    leave:     { exec: "full", manager: "own",  staff: "self", parttime: "self", accounting: "self" },
    users:     { exec: "full", manager: "none", staff: "none", parttime: "none", accounting: "none" }
  };
  var permLabel = { full: "全権限", own: "自店舗", view: "閲覧", self: "本人の分", use: "利用", none: "—" };

  // ---------- 祝日（定休日の火曜でも、祝日は営業） ----------
  var holidays = {
    "2026-01-01": "元日", "2026-01-12": "成人の日", "2026-02-11": "建国記念の日", "2026-02-23": "天皇誕生日", "2026-03-20": "春分の日",
    "2026-04-29": "昭和の日", "2026-05-03": "憲法記念日", "2026-05-04": "みどりの日", "2026-05-05": "こどもの日", "2026-05-06": "振替休日",
    "2026-07-20": "海の日", "2026-08-11": "山の日", "2026-09-21": "敬老の日", "2026-09-22": "国民の休日", "2026-09-23": "秋分の日",
    "2026-10-12": "スポーツの日", "2026-11-03": "文化の日", "2026-11-23": "勤労感謝の日",
    "2027-01-01": "元日", "2027-01-11": "成人の日", "2027-02-11": "建国記念の日", "2027-02-23": "天皇誕生日", "2027-03-21": "春分の日", "2027-03-22": "振替休日",
    "2027-04-29": "昭和の日", "2027-05-03": "憲法記念日", "2027-05-04": "みどりの日", "2027-05-05": "こどもの日", "2027-07-19": "海の日", "2027-08-11": "山の日",
    "2027-09-20": "敬老の日", "2027-09-23": "秋分の日", "2027-10-11": "スポーツの日", "2027-11-03": "文化の日", "2027-11-23": "勤労感謝の日",
    "2028-01-01": "元日", "2028-01-10": "成人の日"
  };

  // ---------- 来店予約 ----------
  var apptTypes = {
    visit: { name: "ご来店・お打ち合わせ", tone: "info" },
    fitting: { name: "ご試着", tone: "gold" },
    size: { name: "サイズ補正", tone: "warn" },
    acc: { name: "小物選び", tone: "rose" },
    shoot: { name: "前撮り", tone: "good" },
    ret: { name: "ご返却・検品", tone: "mute" },
    fair: { name: "ブライダルフェア（式場）", tone: "ver" },
    tour: { name: "式場の見学", tone: "ver" },
    meal: { name: "お食事（式場）", tone: "teal" }
  };
  // 定休日（火曜。祝日は営業）に当たる予約は、画面で翌日に送る
  var appts = [
    { d: 0, t: "10:00", type: "fitting", order: "OR-26-0430", staff: "坂本 結衣" },
    { d: 0, t: "11:00", type: "visit", order: "OR-26-0426", staff: "森本 彩" },
    { d: 0, t: "14:00", type: "acc", order: "OR-26-0415", staff: "中村 由佳" },
    { d: 0, t: "16:00", type: "ret", order: "OR-26-0402", staff: "西田 奈央" },
    { d: 1, t: "13:00", type: "fitting", order: "OR-26-0421", staff: "前田 真由" },
    { d: 1, t: "15:00", type: "visit", order: "OR-26-0425", staff: "森 千尋" },
    { d: 2, t: "10:00", type: "size", order: "OR-26-0412", staff: "森本 彩" },
    { d: 2, t: "16:00", type: "acc", order: "OR-26-0419", staff: "西田 奈央" },
    { d: 3, t: "11:00", type: "visit", order: "OR-26-0428", staff: "松本 愛" },
    { d: 3, t: "14:00", type: "fitting", order: "OR-26-0433", staff: "小林 美穂" },
    { d: 4, t: "10:00", type: "shoot", order: "OR-26-0420", staff: "小林 美穂" },
    { d: 5, t: "10:00", type: "size", order: "OR-26-0417", staff: "中村 由佳" },
    { d: 5, t: "13:00", type: "fitting", order: "OR-26-0409", staff: "木村 遥" },
    { d: 6, t: "11:00", type: "fitting", order: "OR-26-0426", staff: "坂本 結衣" },
    { d: 6, t: "14:00", type: "visit", order: "OR-26-0432", staff: "前田 真由" },
    { d: 6, t: "15:00", type: "acc", order: "OR-26-0412", staff: "坂本 結衣" }
  ];
  // 御社サイトのご来店予約フォームの「ご希望衣装」
  var wants = ["ウェディングドレス", "タキシード", "カラードレス", "白無垢", "紋付", "色打掛", "振袖", "卒業式袴", "七五三", "留袖", "モーニング", "訪問着", "ゲストドレス"];
  var storeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  // ---------- 式場とブライダルフェア（ヴィラ・ノッツェ）----------
  // 名前・住所・電話・営業時間・定休日・フェアの題名と中身・写真は、式場のサイトとフェアの予約ページから
  var FUWEL = "https://fuwel.s3-accelerate.amazonaws.com/img/516/";
  var STUDIO = "https://storage.googleapis.com/studio-design-asset-files/projects/nBW2G7LyOv/";
  var fairVenues = [
    { id: "cortile", name: "ヴィラ・ノッツェ コルティーレ出雲", short: "コルティーレ出雲", store: "izumo", addr: "〒693-0054 島根県出雲市浜町326", tel: "0120-25-8765",
      hours: "月・木・金 12:00〜18:00／土日祝 10:00〜19:00", closed: "火曜日・水曜日（祝日は営業）", room: "グラン・マノワール",
      url: "https://marie-yashiro.crm.oiwaii-taian.com/customer/public/bridal_fair_pages/2eah78tQBt7i4FII9XnCwBBSX278JSdJ/fairs", site: "https://www.cortile-izumo.com/",
      img: STUDIO + "s-1500x1000_v-fms_webp_e88388ce-ebf8-4c07-b696-bff55d681010_middle.webp" },
    { id: "carreau", name: "ヴィラ・ノッツェ カロー鳥取", short: "カロー鳥取", store: "tottori", tel: "0120-05-8743",
      hours: "10:00〜18:00", closed: "火曜日・水曜日（祝日は営業）", url: "https://www.carreau-tottori.com/fair", site: "https://www.carreau-tottori.com/",
      img: FUWEL + "e66cc03b-ba27-4875-9061-469a853ac05f.webp" }
  ];
  var fairs = {
    cortile: [
      { id: "c1", title: "【荘厳な大聖堂で本格挙式】選べる挙式スタイルフェア", pick: true, slots: ["12:00", "13:00", "16:00", "18:00"], items: ["相談会", "模擬挙式", "模擬披露宴", "会場コーディネート"],
        desc: "本物のステンドグラスが輝く大聖堂、または出雲大社から「本格挙式」を選べます。", img: "https://storage.googleapis.com/studio-design-asset-files/projects/moWv1Rx4a6/s-1500x1000_f71ad32d-fa9b-4593-9355-93ce458fe1ca.webp" },
      { id: "c2", title: "【先着３組】特選牛フィレ&絶品スイーツ無料試食◆料理重視必見", pick: true, cap: 3, slots: ["09:00", "16:00"], items: ["試食会", "相談会", "会場コーディネート"],
        desc: "シェフ厳選の特選牛フィレ肉と旬の食材の一皿を、無料で試食できます。", img: STUDIO + "s-1500x998_v-fms_webp_3e271aa7-3d8b-4768-a920-2da24b64193b_small.webp" },
      { id: "c3", title: "＼出雲大社式の方必見／特選牛フィレ肉試食&和婚体験フェア", pick: true, slots: ["10:00", "13:00", "16:00"], items: ["試食会", "相談会", "模擬挙式", "模擬披露宴", "会場コーディネート"],
        desc: "出雲大社での挙式の流れ・移動・当日のスケジュールを、分かりやすくご案内します。", img: STUDIO + "s-1500x998_v-fms_webp_eef3e8b2-bdcf-4897-a76b-27a5df1379c7_small.webp" },
      { id: "c4", title: "【1件目お得】特選牛フィレ肉試食×貸切プライベート空間", pick: true, slots: ["10:00", "13:00", "16:00", "18:00"], items: ["試食会", "相談会", "会場コーディネート"],
        desc: "貸切の邸宅で、特選牛フィレ肉の試食と相談会を。", img: STUDIO + "s-1500x1000_v-fms_webp_c4ecf884-0bab-4d44-a891-3d91e65a5949_small.webp" },
      { id: "c5", title: "【地元婚特典付き！】出雲でご検討の方必見☆地元婚応援フェア♪", pick: true, slots: ["12:00", "13:00", "16:00", "18:00"], items: ["相談会", "模擬挙式", "会場コーディネート"],
        desc: "出雲でご検討の方に、地元婚の特典をご案内します。", img: STUDIO + "s-1500x1000_v-fms_webp_ff12ccec-26b0-4f99-8481-2b6709e5d445_middle.webp" },
      { id: "c6", title: "【パパママ婚・マタニティ婚応援】お子様と一緒に叶えるフェア☆", pick: true, slots: ["18:00"], items: ["相談会", "会場コーディネート"],
        desc: "お子様とご一緒の結婚式・マタニティ婚のご相談に。", img: STUDIO + "s-1500x998_v-fms_webp_91a6fb74-3dcb-4751-873c-bb8d252c8f5d_small.webp" }
    ],
    carreau: [
      { id: "t1", title: "【花嫁人気No.1】光のチャペル×憧れドレス試着", pick: true, slots: ["10:00", "13:00", "15:00"], items: ["模擬挙式", "ドレス試着", "相談会"],
        desc: "光のチャペルで、憧れのドレスを纏って結婚式のイメージを。", img: FUWEL + "99f8be8b-6327-45f5-9d0b-87de3be6b4f0.webp" },
      { id: "t2", title: "【最大60万優待】賢くお得に！予算安心のまるわかり相談会", pick: true, slots: ["10:00", "11:00", "13:00", "14:00", "15:00"], items: ["相談会", "見積り"],
        desc: "お二人のご希望を伺い、賢い見積りのポイントを解説します。", perks: ["HP限定ご成約特典：ブライダルエステ利用券・ジュエリーのご優待", "ゲスト送迎バス無料特典（条件あり）", "ご来館特典：憧れドレス試着も可能"],
        img: FUWEL + "e66cc03b-ba27-4875-9061-469a853ac05f.webp" },
      { id: "t3", title: "【新和婚スタイル】神前式まるわかり相談会×コーディネート見学", slots: ["10:00", "13:00", "15:00"], items: ["相談会", "会場コーディネート"],
        desc: "神前式の流れと、会場のコーディネートをご覧いただけます。", img: FUWEL + "04b52a46-9ad1-4860-bafd-5d8080501cbd.webp" },
      { id: "t4", title: "写真は残したい！【フォト婚】衣裳×見積もり相談フェア", slots: ["11:00", "14:00"], items: ["衣裳", "見積り"],
        desc: "写真で残す結婚式の、衣裳と見積りのご相談に。", img: FUWEL + "7ce8c2b5-533e-43fe-a294-c8583143333c.webp" },
      { id: "t5", title: "【2名～OK！少人数での結婚式】おもてなし×料金相談フェア", slots: ["11:00", "14:00"], items: ["相談会", "見積り"],
        desc: "会食会場も貸切。ご家族との少人数の結婚式のご相談に。", img: FUWEL + "3e6b8d1a-839f-4f47-96a2-571079642f3c.webp" },
      { id: "t6", title: "【マタニティ・お急ぎ婚】最短1ヵ月で準備ＯＫ", slots: ["11:00", "14:00"], items: ["相談会"],
        desc: "ドレスや体調のご不安も、ご相談いただけます。", img: FUWEL + "9b86c9db-1e3b-4050-830d-aa0764d67b83.webp" },
      { id: "t7", title: "【時短で完結】自宅からお手軽にオンラインフェア", online: true, slots: ["10:00", "13:00", "16:00"], items: ["オンライン相談"],
        desc: "ご自宅から、画面越しにご相談いただけます。", img: FUWEL + "7e6aa523-6699-425e-9064-11aca118922d.webp" }
    ]
  };
  // 曜日ごとの開催（0＝日〜6＝土・"hol"＝祝日）。コルティーレ出雲は、予約ページの10月の並び（木＝マタニティ・地元婚、金＝挙式スタイル、土＝試食、日＝和婚体験、祝＝1件目お得）に合わせた
  var fairPlan = {
    cortile: { 0: ["c3"], 1: ["c4"], 4: ["c6|c5"], 5: ["c1"], 6: ["c2"], hol: ["c4"] },
    carreau: { 0: ["t2", "t3"], 1: ["t2", "t4"], 4: ["t5", "t7"], 5: ["t6", "t7"], 6: ["t1", "t2"], hol: ["t1", "t2"] }
  };

  // ---------- お食事のご予約（例）----------
  // 式場の料理（本格派のフレンチ・和とフレンチ）は式場のサイトから。お食事だけのご予約を今受けているかは未確認なので、例として示す
  var meals = [
    { id: "m1", venue: "cortile", title: "ご両家の顔合わせのお食事会", slots: ["11:30", "18:00"], cap: 2, people: "4〜12名",
      desc: "本格派のフレンチシェフのコースで、ご両家の顔合わせを。", img: STUDIO + "s-1500x998_v-fms_webp_67ea6ad1-1d14-48d0-bfeb-3e4eb9119368_small.webp" },
    { id: "m2", venue: "cortile", title: "挙式のあとの会食（出雲大社式・少人数）", slots: ["12:00", "17:00"], cap: 1, people: "6〜30名",
      desc: "出雲大社での挙式のあと、和とフレンチの融合の創作料理で会食を。", img: STUDIO + "s-1500x1000_v-fms_webp_31402d23-7aaa-47b9-8e95-90eff435869a_small.webp" },
    { id: "m3", venue: "carreau", title: "少人数の会食パーティー（会食会場は貸切）", slots: ["12:00", "18:00"], cap: 1, people: "2〜20名",
      desc: "大切なご家族とのお食事会に。会食会場も貸切です。", img: FUWEL + "3e6b8d1a-839f-4f47-96a2-571079642f3c.webp" }
  ];

  // ---------- 予約の受付（御社サイトのご来店予約と、式場の4つの窓口：フェア予約・見学予約・資料請求・お問い合わせ。お食事は例）----------
  // m＝受け付けた時刻（何分前）。st：new＝新着（まだ確認していない）／hold＝お電話で調整中／done＝確認済み
  var inbox = [
    { id: "in01", m: -12, ch: "fair", via: "Web", st: "new", name: "三浦 遥", kana: "みうら はるか", tel: "090-****-2841", mail: "h.miura@example.com", people: 2,
      venue: "cortile", fair: "c3", slot: "13:00", note: "出雲大社での挙式を考えています。母も一緒に参加します。", dress: true },
    { id: "in02", m: -38, ch: "store", via: "Web", st: "new", name: "青山 美咲", kana: "あおやま みさき", tel: "080-****-5512", mail: "misaki.a@example.com",
      store: "matsue", wants: ["ウェディングドレス", "タキシード"], detail: "2027年5月 挙式予定・ヴィラ・ノッツェ レガール松江", prefs: [[2, "14:00"], [3, "11:00"], [5, "10:00"]] },
    { id: "in03", m: -84, ch: "store", via: "LINE", st: "new", name: "石井 奈々", kana: "いしい なな", tel: "090-****-7730", mail: "",
      store: "tottori", wants: ["振袖"], detail: "高校3年生です。2028年1月の二十歳の集い（鳥取市）。母と2人で伺います", prefs: [[4, "13:00"], [5, "15:00"], [6, "10:00"]] },
    { id: "in04", m: -125, ch: "tour", via: "Web", st: "new", name: "藤井 様", kana: "ふじい", tel: "080-****-0419", mail: "fujii@example.com", people: 2,
      venue: "carreau", d: 4, t: "13:00", note: "チャペルとパーティー会場を見たいです" },
    { id: "in05", m: -1290, ch: "fair", via: "Web", st: "done", by: "前田 真由", name: "近藤 彩花", kana: "こんどう あやか", tel: "090-****-3388", mail: "kondo@example.com", people: 2,
      venue: "carreau", fair: "t1", slot: "13:00", note: "ドレスの試着を楽しみにしています", dress: true },
    { id: "in06", m: -1520, ch: "request", via: "Web", st: "done", by: "小林 美穂", name: "福田 様", kana: "ふくだ", tel: "", mail: "fukuda@example.com",
      venue: "cortile", items: "パンフレット・プラン・料理の資料", note: "会場リニューアル記念プランの資料もほしいです" },
    { id: "in07", m: -2700, ch: "contact", via: "Web", st: "done", by: "小林 美穂", name: "斎藤 様", kana: "さいとう", tel: "", mail: "saito@example.com",
      store: "izumo", msg: "ママ振りを着たいのですが、小物だけ借りることはできますか？", reply: "もちろん小物のみのレンタルも可能でございます！（御社サイトの Q&A より）" },
    { id: "in08", m: -4300, ch: "store", via: "お電話", st: "done", by: "森 千尋", name: "渡辺 結菜", kana: "わたなべ ゆいな", tel: "090-****-6620", mail: "",
      store: "yonago", wants: ["七五三"], detail: "7歳の七五三・11月の七五三参り", prefs: [[1, "15:00"]], order: "OR-26-0425" }
  ];
  // 「Web から予約が入ったとき（デモ）」で、順に届く予約
  var inboxPool = [
    { ch: "fair", via: "Web", name: "長尾 真央", kana: "ながお まお", tel: "090-****-1180", mail: "mao.n@example.com", people: 2, venue: "carreau", fair: "t1", slot: "10:00",
      note: "光のチャペルで、ドレスも試着したいです", dress: true },
    { ch: "store", via: "Web", name: "上田 さくら", kana: "うえだ さくら", tel: "080-****-2290", mail: "sakura.u@example.com", store: "izumo", wants: ["振袖"],
      detail: "高校生限定！振袖無料試着体験を見て。2028年1月の二十歳の集い", prefs: [[1, "14:00"], [3, "11:00"], [4, "16:00"]] },
    { ch: "meal", via: "Web", name: "松井 健", kana: "まつい けん", tel: "090-****-4471", mail: "k.matsui@example.com", people: 8, venue: "cortile", meal: "m1", d: 9, t: "11:30",
      note: "両家の顔合わせです。祖母は甲殻類のアレルギーがあります" },
    { ch: "tour", via: "Web", name: "西川 様", kana: "にしかわ", tel: "080-****-3301", mail: "nishikawa@example.com", people: 2, venue: "cortile", d: 5, t: "14:00",
      note: "出雲大社式と披露宴を同じ日にできるか知りたいです" },
    { ch: "store", via: "Web", name: "宮本 理沙", kana: "みやもと りさ", tel: "090-****-8862", mail: "risa.m@example.com", store: "matsue", wants: ["白無垢", "色打掛", "紋付"],
      detail: "出雲大社で挙式予定（2027年春）。和装を見たいです", prefs: [[2, "11:00"], [3, "14:00"], [6, "13:00"]] },
    { ch: "store", via: "Instagram DM", name: "原田 美優", kana: "はらだ みゆ", tel: "", mail: "", store: "matsue", wants: ["ウェディングドレス"],
      detail: "インスタの投稿（ガーデン挙式のレースのドレス）を見て、試着したいです", prefs: [[3, "13:00"], [5, "11:00"], [6, "15:00"]] },
    { ch: "contact", via: "Web", name: "片山 様", kana: "かたやま", tel: "", mail: "katayama@example.com", store: "tottori",
      msg: "式典には出席しないけど、写真撮りのみでレンタルできますか？", reply: "撮影のみのレンタルも可能でございます！（御社サイトの Q&A より）" }
  ];

  // ---------- お客様の声（ヴィラ・ノッツェ コルティーレ出雲の「体験レポート」から。抜き書きは原文のまま・一部）----------
  // staff＝レポートに名前の出てくる方（式場のスタッフ）
  var REPORT = "https://www.cortile-izumo.com/report/";
  var voices = [
    { id: "v1", who: "K & M", room: "グラン・マノワール", date: "2026-07-13", url: REPORT + "jENLCmu4", tags: ["出雲大社", "スタッフ", "料理"], staff: ["三島さん", "内田さん"],
      why: "出雲大社へのアクセス、披露宴会場の雰囲気、式場相談時の三島さんの対応力", quote: "ギリギリにしか準備できない私たちを優しくサポートしてくださったプロデューサーの内田さん。",
      memo: "出雲大社の入場の際のみ、雹が降ったこと。" },
    { id: "v2", who: "A & N", room: "グラン・マノワール", date: "2026-07-13", url: REPORT + "AsDUfX4Q", tags: ["チャペル", "料理", "演出", "スタッフ"], staff: [],
      why: "会場の雰囲気とステンドガラスのチャペル・料理", quote: "色々な要望をプランナーさんが親身になって相談に乗ってくださり叶えてくれました！",
      memo: "旦那さんの大好きな向日葵をブーケに入れたこと" },
    { id: "v3", who: "T & Y", room: "グラン・マノワール", date: "2026-04-20", url: REPORT + "MbUgpNM3", tags: ["見学", "料理", "演出", "スタッフ"], staff: ["尾村さん"],
      why: "初めて式場見学に行った際に、私たちの好きなアーティストの音楽を流して下さったり、対応がとても丁寧で優しく",
      quote: "プランナーの尾村さんをはじめ、美容、お花、料理スタッフの方、皆さんとても親身になって相談に乗ってくださった",
      memo: "料理に使いたい食材があり相談したところ、快く引き受けて下さり" },
    { id: "v4", who: "A & M", room: "グラン・マノワール", date: "2026-04-22", url: REPORT + "r-077", tags: ["出雲大社", "料理", "スタッフ", "ホームページ"], staff: [],
      why: "出雲大社婚と披露宴が同時にできることと、他社と比較した時にホームページがわかりやすかったため",
      quote: "ゲストから本当に楽しかった、ご飯が美味しかったと言ってもらえたこと。", memo: "スタッフの皆様への相談のしやすい雰囲気" },
    { id: "v5", who: "Y & A", room: "グラン・マノワール", date: "2026-04-22", url: REPORT + "r-078", tags: ["スタッフ", "演出"], staff: [],
      why: "雰囲気がかわいい、スタッフの対応", quote: "雰囲気も、スタッフの方もとってもいいのでオススメです！", memo: "結婚証明書（LEGO）" },
    { id: "v6", who: "Y & S", room: "グラン・マノワール", date: "2026-04-22", url: REPORT + "r-070", tags: ["会場", "演出"], staff: [],
      why: "披露宴会場の雰囲気が気に入った", quote: "始まりから終わりまで！全部がすごく思い出です！", memo: "BGM、ゲストへおもてなし" }
  ];

  // ---------- イベント・お知らせ（御社サイトのトップから）----------
  var events = [
    { date: "2026-10-01", store: "松江本店", title: "きもの・帯丸洗いイベント" },
    { date: "2026-09-26", store: "鳥取店", title: "高校生限定！振袖無料試着体験" },
    { date: "2026-07-13", store: "出雲店", title: "夏休み成人式展示会開催！" }
  ];
  // ---------- Instagram（@yashiro_wedding・マリエ・やしろ松江本店）。数は 2026-10-08 時点。投稿は Instagram 公式の埋め込みで表示する ----------
  var insta = { account: "yashiro_wedding", name: "ウェディングドレスレンタル【マリエ・やしろ松江本店】", followers: 572, posts: 196, recent: ["Dd_U9jMH-xQ", "DdWPGThn1qx", "Da7G4t9kUGF"] };
  var news = [
    { date: "2025-12-17", store: "出雲店", title: "振袖ファッションショーのモデル募集中！" },
    { date: "2024-12-08", store: "松江本店", title: "【年末年始休業のお知らせ】" },
    { date: "2024-09-30", store: "鳥取店", title: "新プラン！ 宇倍神社神前結婚式プラン⛩️" }
  ];

  // ---------- 顧客（受注番号ごとの、お客様の情報） ----------
  // past＝過去のご利用 [内容, 金額（税別）, 今日から何日後]
  var custInfo = {
    "OR-26-0412": { id: "C-1021", since: -160, past: [], next: "記念日フォト（スタジオヴィセーヌ）" },
    "OR-26-0415": { id: "C-1034", since: -20, past: [], next: "前撮り（会場リニューアル記念プランに含まれます）" },
    "OR-26-0420": { id: "C-0877", since: -420, past: [["卒業式袴（お姉様のご利用）", 42000, -400]], next: "卒業式の袴セット30％OFF（振袖ご契約の特典）", note: "2025年にお姉様が卒業式袴をご利用" },
    "OR-26-0421": { id: "C-1102", since: -15, past: [], next: "ReFa HEART BRUSH mini（ご成約15万円以上）・袴セット30％OFF" },
    "OR-26-0398": { id: "C-0751", since: -130, past: [], next: "記念日フォト（1年後）" },
    "OR-26-0425": { id: "C-1110", since: -5, past: [], next: "次の七五三（3年後）・ご家族の写真（スタジオヴィセーヌ）" },
    "OR-26-0402": { id: "C-0698", since: -200, past: [], next: "記念日フォト（挙式の1年後）" },
    "OR-26-0409": { id: "C-0923", since: -700, past: [["成人式振袖", 218000, -640]], next: "3〜5年後のウェディング", note: "成人式の振袖もご利用（袴セット30％OFFを適用）" },
    "OR-26-0426": { id: "C-1115", since: -10, past: [], next: "前撮り（フォトウェディング）" },
    "OR-26-0417": { id: "C-0988", since: -70, past: [], next: "記念日フォト" },
    "OR-26-0388": { id: "C-0642", since: -240, past: [], next: "ご家族の七五三" },
    "OR-26-0419": { id: "C-1006", since: -40, past: [], next: "次の七五三（3年後）" },
    "OR-26-0428": { id: "C-1118", since: -8, past: [], next: "前撮り（フォトウェディング）" },
    "OR-26-0430": { id: "C-1120", since: -25, past: [], next: "前撮り（和装・出雲大社）・ご両家の留袖" },
    "OR-26-0431": { id: "C-1124", since: -26, past: [], next: "ご列席の留袖・モーニング（ご両家）" },
    "OR-26-0432": { id: "C-1126", since: -6, past: [], next: "前撮り（和装）" },
    "OR-26-0433": { id: "C-1127", since: -2, past: [], next: "プランのドレス1点のご試着・前撮り" },
    "OR-26-0434": { id: "C-1129", since: -14, past: [], next: "ご列席の留袖・モーニング（ご両家）" }
  };

  // ---------- 請求と入金 ----------
  // base＝税別の金額（税込は1.1倍）。type：内金／残金／一括。paid＝入金日（まだなら null）
  var invoices = [
    { no: "INV-26-0937", order: "OR-26-0428", type: "内金", base: 120000, issued: -3, due: 0, paid: null },
    { no: "INV-26-0935", order: "OR-26-0417", type: "残金", base: 125000, issued: -3, due: 9, paid: null },
    { no: "INV-26-0934", order: "OR-26-0412", type: "残金", base: 336000, issued: -2, due: 23, paid: null },
    { no: "INV-26-0931", order: "OR-26-0402", type: "残金", base: 228000, issued: -15, due: -1, paid: null },
    { no: "INV-26-0928", order: "OR-26-0419", type: "残金", base: 25000, issued: -6, due: 10, paid: null },
    { no: "INV-26-0926", order: "OR-26-0431", type: "内金", base: 60000, issued: -20, due: -13, paid: -15 },
    { no: "INV-26-0919", order: "OR-26-0415", type: "内金", base: 180000, issued: -12, due: -5, paid: -6 },
    { no: "INV-26-0915", order: "OR-26-0420", type: "内金", base: 50000, issued: -30, due: -23, paid: -25 },
    { no: "INV-26-0902", order: "OR-26-0409", type: "一括", base: 33600, issued: -40, due: -30, paid: -33 },
    { no: "INV-26-0887", order: "OR-26-0388", type: "残金", base: 402000, issued: -40, due: -30, paid: -29 },
    { no: "INV-26-0874", order: "OR-26-0398", type: "一括", base: 198000, issued: -45, due: -30, paid: -31 }
  ];
  // 衣装の他にかかる分の書き方（請求書の品目）
  var otherLine = { bridal: "着付け・お直し・小物など", shrine: "挙式の介添え・着付け・ヘアメイク・写真など", photo: "撮影・データ・小物など", furisode: "着付け・前撮り・小物など", shichigosan: "着付け・小物など", hakama: "着付け・小物など" };

  // ---------- 経費 ----------
  // amount は税込。chk＝業者の請求書との照合（一致／金額相違／定期）。quote＝見積の金額（相違があるとき）
  var expCats = ["お直し外注", "ヘアメイク・着付け外注", "撮影外注", "クリーニング", "配送費", "衣装仕入", "販売促進費", "地代家賃", "水道光熱費", "広告宣伝費"];
  var expAcct = { "お直し外注": "out", "ヘアメイク・着付け外注": "out", "撮影外注": "out", "クリーニング": "out", "配送費": "ship", "衣装仕入": "buy", "販売促進費": "promo", "地代家賃": "rent", "水道光熱費": "util", "広告宣伝費": "ads" };
  var expenses = [
    { no: "EX-26-0121", d: -1, store: "matsue", cat: "お直し外注", desc: "アトリエ・ブラン · 裾・ウエスト（NY-0094）", order: "OR-26-0412", amount: 19800, st: "承認済", chk: "一致" },
    { no: "EX-26-0120", d: -1, store: "matsue", cat: "配送費", desc: "配送業者（サンプル） · レガール松江へのお届け", order: "OR-26-0412", amount: 6600, st: "承認待ち", chk: "一致" },
    { no: "EX-26-0118", d: -3, store: "tottori", cat: "ヘアメイク・着付け外注", desc: "着付け（外部スタッフ） · 挙式当日（カロー鳥取）", order: "OR-26-0402", amount: 16500, st: "承認待ち", chk: "一致" },
    { no: "EX-26-0115", d: -4, store: "izumo", cat: "撮影外注", desc: "フリーカメラマン · スタジオ撮影", order: "OR-26-0417", amount: 66000, st: "要確認", chk: "金額相違", quote: 60500 },
    { no: "EX-26-0113", d: -5, store: "izumo", cat: "販売促進費", desc: "ReFa HEART BRUSH mini 20個 · 振袖ご成約のプレゼント（金額はサンプル）", order: null, amount: 52800, st: "承認待ち", chk: "一致" },
    { no: "EX-26-0112", d: -5, store: "izumo", cat: "衣装仕入", desc: "振袖 新規仕入（5点）", order: null, amount: 1650000, st: "承認済", chk: "一致" },
    { no: "EX-26-0109", d: -7, store: "tottori", cat: "クリーニング", desc: "クリーニング店（サンプル） · 使用後のドレス 6点", order: null, amount: 39600, st: "承認済", chk: "一致" },
    { no: "EX-26-0106", d: -12, store: "izumo", cat: "広告宣伝費", desc: "Instagram 広告 · 振袖キャンペーン", order: null, amount: 132000, st: "承認済", chk: "一致" },
    { no: "EX-26-0104", d: -20, store: "tottori", cat: "お直し外注", desc: "お直し外注 · 裾", order: "OR-26-0388", amount: 13200, st: "承認済", chk: "一致" },
    { no: "EX-26-0102", d: -24, store: "matsue", cat: "撮影外注", desc: "撮影データの編集 · 外注（松江城ロケ）", order: "OR-26-0398", amount: 24200, st: "承認済", chk: "一致" },
    { no: "EX-26-0101", d: "m1", store: "yonago", cat: "地代家賃", desc: "米子店 地代家賃（{m}月分・サンプル）", order: null, amount: 935000, st: "承認済", chk: "定期" }
  ];

  // 月次給与費（店舗・部門ごとの合計の元）：[給与, 法定福利費, 通勤手当]。給与計算は今のサービスのまま
  var salary = { matsue: [1650000, 297000, 53000], izumo: [1240000, 223200, 36800], yonago: [1080000, 194400, 33000], tottori: [950000, 171000, 29000], HQ: [2100000, 378000, 42000] };
  var salaryBonusMonths = [7, 12];

  // ---------- TKC連携 ----------
  // 勘定科目とコード（サンプル。導入のときに会計事務所と決める）
  var accounts = {
    bank: ["普通預金", "1112"], ar: ["売掛金", "1135"], adv: ["前受金", "2150"], ap: ["買掛金", "2110"], accr: ["未払金", "2120"],
    sales: ["売上高", "4110"], buy: ["仕入高", "5110"], out: ["外注費", "6120"], ship: ["荷造運賃", "6150"], sal: ["給料手当", "6210"],
    bonus: ["賞与", "6220"], wel: ["法定福利費", "6230"], rent: ["地代家賃", "6310"], util: ["水道光熱費", "6320"], ads: ["広告宣伝費", "6410"], promo: ["販売促進費", "6420"]
  };
  var mapping = [
    ["レンタル売上（施行のとき）", "sales"], ["内金（ご成約のとき）", "adv"], ["お客様の未入金", "ar"], ["入金（振込・カード）", "bank"],
    ["外注費（お直し・着付け・撮影・クリーニング）", "out"], ["配送費", "ship"], ["衣装の仕入", "buy"], ["家賃", "rent"],
    ["給与（月次の合計）", "sal"], ["賞与", "bonus"], ["法定福利費", "wel"], ["広告", "ads"], ["ご成約のプレゼントなど", "promo"]
  ];
  var journal = [
    { d: -1, dr: "ar", cr: "sales", src: "OR-26-0402（施行）", amount: 580800, st: "送信可" },
    { d: -1, dr: "out", cr: "ap", src: "EX-26-0121 · OR-26-0412", amount: 19800, st: "送信可" },
    { d: -4, dr: "out", cr: "ap", src: "EX-26-0115 · OR-26-0417", amount: 66000, st: "科目要確認" },
    { d: -5, dr: "buy", cr: "ap", src: "EX-26-0112", amount: 1650000, st: "送信可" },
    { d: -6, dr: "bank", cr: "adv", src: "INV-26-0919 · OR-26-0415", amount: 198000, st: "送信済" },
    { d: "m1", dr: "rent", cr: "accr", src: "EX-26-0101（米子店 地代家賃）", amount: 935000, st: "送信済" },
    { d: "pe2", dr: "sal", cr: "accr", src: "{m2}月分の給与", amount: 7020000, st: "送信済" },
    { d: "pe2", dr: "wel", cr: "accr", src: "{m2}月分の給与", amount: 1263600, st: "送信済" }
  ];
  var sends = [
    { d: "m1", text: "{m}月分の家賃 · 4件" },
    { d: "p1", text: "{m1}月の売上・経費 · 248件" },
    { d: "pe2", text: "{m2}月分の給与 · 10件" }
  ];

  // ---------- 従業員と休暇（氏名はサンプル）----------
  // leave＝有給の残り（日）、taken＝今年度に取った日数、grant10＝付与が10日以上（年5日の取得義務の対象）
  var employees = [
    { id: "E-0012", name: "石田 誠", mail: "ishida", store: null, pos: "取締役", type: "正社員", joined: "2008/04/01", leave: 16.0, taken: 4, grant10: true, role: "exec", tfa: true, last: 0 },
    { id: "E-0045", name: "森本 彩", mail: "morimoto", store: "matsue", pos: "店長", type: "正社員", joined: "2014/10/01", leave: 11.5, taken: 5, grant10: true, role: "manager", tfa: true, last: 0 },
    { id: "E-0078", name: "坂本 結衣", mail: "sakamoto", store: "matsue", pos: "衣装コーディネーター", type: "正社員", joined: "2019/04/01", leave: 8.0, taken: 3, grant10: true, role: "staff", tfa: true, last: 0 },
    { id: "E-0093", name: "木村 遥", mail: "kimura", store: "matsue", pos: "衣装コーディネーター", type: "正社員", joined: "2022/04/01", leave: 6.5, taken: 2, grant10: true, role: "staff", tfa: true, last: -1 },
    { id: "E-0101", name: "小林 美穂", mail: "kobayashi", store: "izumo", pos: "店長", type: "正社員", joined: "2012/07/01", leave: 14.0, taken: 5, grant10: true, role: "manager", tfa: true, last: 0 },
    { id: "E-0110", name: "中村 由佳", mail: "nakamura", store: "izumo", pos: "着付師", type: "パート", joined: "2022/04/01", leave: 6.5, taken: 5, grant10: true, role: "staff", tfa: true, last: -1 },
    { id: "E-0131", name: "田中 優", mail: "tanaka", store: "izumo", pos: "接客（アルバイト）", type: "アルバイト", joined: "2025/09/01", leave: 3.0, taken: 1, grant10: false, role: "parttime", tfa: true, last: -2 },
    { id: "E-0117", name: "松本 愛", mail: "matsumoto", store: "yonago", pos: "店長", type: "正社員", joined: "2016/04/01", leave: 10.0, taken: 4, grant10: true, role: "manager", tfa: true, last: 0 },
    { id: "E-0126", name: "森 千尋", mail: "mori", store: "yonago", pos: "衣装コーディネーター", type: "正社員", joined: "2023/04/01", leave: 5.0, taken: 2, grant10: true, role: "staff", tfa: true, last: -1 },
    { id: "E-0140", name: "前田 真由", mail: "maeda", store: "tottori", pos: "店長", type: "正社員", joined: "2015/04/01", leave: 12.0, taken: 6, grant10: true, role: "manager", tfa: true, last: 0 },
    { id: "E-0144", name: "西田 奈央", mail: "nishida", store: "tottori", pos: "衣装コーディネーター", type: "正社員", joined: "2021/04/01", leave: 7.0, taken: 3, grant10: true, role: "staff", tfa: true, last: -1 },
    { id: "E-0128", name: "岡田 恵美", mail: "okada", store: "matsue", pos: "縫製・お直し担当", type: "パート", joined: "2024/09/01", leave: 3.0, taken: 1, grant10: false, role: "staff", tfa: false, last: null },
    { id: "E-0124", name: "井上 陽翔", mail: "inoue", store: null, pos: "経理", type: "正社員", joined: "2021/04/01", leave: 9.0, taken: 3, grant10: true, role: "accounting", tfa: true, last: 0 },
    { id: "E-0081", name: "藤田 里奈", mail: "fujita", store: null, pos: "総務・人事", type: "正社員", joined: "2017/04/01", leave: 12.0, taken: 6, grant10: true, role: "manager", tfa: true, last: -1 }
  ];
  var leaveTypes = ["年次有給休暇", "年次有給休暇（半日）", "特別休暇（慶弔）"];
  var leave = [
    { name: "坂本 結衣", type: "年次有給休暇", d: 6, days: 1, st: "申請中" },
    { name: "木村 遥", type: "年次有給休暇", d: 11, days: 2, st: "申請中" },
    { name: "小林 美穂", type: "年次有給休暇", d: 15, days: 1, st: "申請中" },
    { name: "中村 由佳", type: "年次有給休暇（半日）", d: -8, days: 0.5, st: "承認済" },
    { name: "西田 奈央", type: "特別休暇（慶弔）", d: 26, days: 1, st: "承認済", note: "親族の結婚式" },
    { name: "森 千尋", type: "年次有給休暇", d: 4, days: 1, st: "却下", note: "挙式の当日のため、日を変えてもらう（就業規則 第12条）" }
  ];

  // ---------- 操作の記録（実績のサンプル入力と同じ時刻） ----------
  var audit = [
    { d: -1, h: 17, m: 42, who: "小林 美穂", what: "実績を入力（成約 · 出雲店）" },
    { d: -1, h: 18, m: 20, who: "坂本 結衣", what: "実績を入力（成約 · 松江本店）" },
    { d: -1, h: 19, m: 5, who: "木村 遥", what: "実績を入力（施行 · 松江本店）" },
    { d: 0, h: 8, m: 41, who: "井上 陽翔", what: "ログイン（2段階認証）" },
    { d: 0, h: 8, m: 58, who: "森本 彩", what: "ログイン（2段階認証）" },
    { d: 0, h: 10, m: 15, who: "前田 真由", what: "実績を入力（成約 · 鳥取店）" }
  ];

  window.EXT_DATA = {
    perm: perm, permLabel: permLabel, holidays: holidays, apptTypes: apptTypes, appts: appts, wants: wants, storeSlots: storeSlots,
    fairVenues: fairVenues, fairs: fairs, fairPlan: fairPlan, meals: meals, inbox: inbox, inboxPool: inboxPool, voices: voices, events: events, news: news, insta: insta,
    custInfo: custInfo, invoices: invoices, otherLine: otherLine, expCats: expCats, expAcct: expAcct, expenses: expenses,
    salary: salary, salaryBonusMonths: salaryBonusMonths, accounts: accounts, mapping: mapping, journal: journal, sends: sends,
    employees: employees, leaveTypes: leaveTypes, leave: leave, audit: audit
  };
})();
