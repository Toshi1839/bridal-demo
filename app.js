/* マリエ・やしろ 業務ポータル（デモ）— 画面の動き
   データは data.js・data-p3.js・data-ext.js。店舗・式場・フェア・衣装・体験レポートの名前と写真は、御社と式場のサイトの公開情報。氏名・数字・規程はサンプル。
   本物の AI にはつないでいない：質問はサンプルの条文から当てはまるものを探して表示する。
   見た目は御社サイト（yashiro-dress.com）に寄せている（明朝の見出し・広い字間・金の丸ボタン・右端の縦のつまみ）。 */
(function () {
  "use strict";

  var D = window.DEMO_DATA;
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var KEY = "bridal-demo-v3"; // v2（A〜C店の版）の保存は読まない

  // ---------- 小道具 ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function monthKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  function addYears(d, n) { var x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; }
  function shiftMonth(key, n) { var p = key.split("-"); return monthKey(new Date(+p[0], +p[1] - 1 + n, 1)); }
  function jpMonth(key) { var p = key.split("-"); return +p[0] + "年" + +p[1] + "月"; }
  function mNum(key) { return +key.split("-")[1]; }
  function slashDate(s) { return s.replace(/-/g, "/"); }
  function yen(n) { return Math.round(n).toLocaleString("ja-JP") + "円"; }
  function mil(n) { return (n / 1e6).toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "百万円"; }
  function man(n) { return Math.round(n / 10000).toLocaleString("ja-JP") + "万円"; }
  function ratio(a, b) { return b > 0 ? a / b : null; }
  function pct(r) { return r == null || !isFinite(r) ? "—" : (r * 100).toFixed(1) + "%"; }
  function upDn(r) { return r == null ? "" : r >= 1 ? "up" : "dn"; }
  function arrow(r) { return r == null ? "" : r >= 1 ? "▲ " : "▼ "; }
  function timeLabel(iso) { var d = new Date(iso); return (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function mask(name) { return String(name).charAt(0) + "＊＊ 様"; }
  function family(name) { return String(name).split(" ")[0]; }
  function greeting() { var h = new Date().getHours(); return h < 11 ? "おはようございます" : h < 18 ? "こんにちは" : "こんばんは"; }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, 3200);
  }

  // 線の絵（アイコン）
  var ICON = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    out: '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4M18 12H9"/>',
    up: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
    table: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 10h18M9 5v14"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.2-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7.5 13.5h3v3h-3z"/>',
    receipt: '<path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.4z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.7 1.7-2.5 3.2-2.5s2.6.8 3.2 2.5M14.5 10h4M14.5 13.5h3"/>',
    leave: '<path d="M5 20c0-8 5-14 14-15-1 9-7 14-14 15z"/><path d="M5 20l8-8"/>',
    shield: '<path d="M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z"/><path d="M9 12l2 2 4-4"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    undo: '<path d="M9 8H4V3"/><path d="M4.6 8A8 8 0 1 1 4 13"/>',
    send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 20h16"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
    inbox: '<path d="M3 13l2.5-7h13L21 13v6H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>',
    ring: '<circle cx="12" cy="14.5" r="5.5"/><path d="M9.5 4.5h5L13 8h-2z"/>',
    hanger: '<path d="M12 8.5V8c0-1.2 2-1.7 2-3a2 2 0 1 0-4 0"/><path d="M12 8.5 3 16h18z"/>',
    ext: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5H5V6h5"/>',
    arrow: '<circle cx="12" cy="12" r="9"/><path d="M10.5 8.5 14 12l-3.5 3.5"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    meal: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-2 2-2.5 5-2.5 7.5H17V21"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    live: '<circle cx="12" cy="12" r="2.5"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    quote: '<path d="M9.5 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1.5v3l3-3V9a2 2 0 0 0-1-2zM19.5 7H16a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1.5v3l3-3V9a2 2 0 0 0-1-2z"/>',
    share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4"/>'
  };
  function icon(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + "</svg>"; }

  // ---------- 日付（前日までの数字を、今朝6:00に集計した形にする） ----------
  var TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  var YEST = addDays(TODAY, -1);
  var TODAY_S = ymd(TODAY);
  var YEST_S = ymd(YEST);
  var CUR = monthKey(TODAY);
  var FY_Y = TODAY.getMonth() >= 3 ? TODAY.getFullYear() : TODAY.getFullYear() - 1; // 年度は4月〜3月
  var FY_START = new Date(FY_Y, 3, 1);
  var FY_START_S = ymd(FY_START);
  var FY_END_S = ymd(new Date(FY_Y + 1, 2, 31));
  var FY_LABEL = FY_Y + "年度（4〜3月）";
  var FY_MONTHS = []; for (var fm = 0; fm < 12; fm++) FY_MONTHS.push(monthKey(addMonths(FY_START, fm)));
  var DIM_CUR = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
  var CUR_FRAC = monthKey(YEST) === CUR ? YEST.getDate() / DIM_CUR : 0; // 今月のうち、集計に入った日の割合

  // ---------- 保存（このブラウザの中だけ） ----------
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ role: state.role, authed: state.authed, entries: state.entries, orders: state.orders, costumes: state.costumes, ext: state.ext })); } catch (e) { /* 保存できなくても動く */ }
  }
  function seedEntries() {
    function d(n) { return ymd(addDays(TODAY, n)); }
    function t(n, h, m) { var x = addDays(TODAY, n); x.setHours(h, m, 0, 0); return x.toISOString(); }
    return [
      { id: "e1", created: t(-1, 18, 20), store: "matsue", kind: "seiyaku", contract: d(-1), event: d(200), product: "ウェディングドレス", amount: 328000, customer: "石川 結衣", staff: "坂本 結衣", status: "pending" },
      { id: "e2", created: t(-1, 19, 5), store: "matsue", kind: "sekou", contract: d(-150), event: d(-1), product: "カラードレス", amount: 214000, customer: "大野 彩花", staff: "木村 遥", status: "pending" },
      { id: "e3", created: t(-1, 17, 42), store: "izumo", kind: "seiyaku", contract: d(-1), event: d(240), product: "白無垢・色打掛", amount: 396000, customer: "岡本 真央", staff: "小林 美穂", status: "pending" },
      { id: "e4", created: t(0, 10, 15), store: "tottori", kind: "seiyaku", contract: d(0), event: d(180), product: "タキシード", amount: 98000, customer: "村上 優花", staff: "前田 真由", status: "pending" }
    ];
  }

  var saved = load();
  var startRole = D.access[saved.role] ? saved.role : "exec";
  var state = {
    role: startRole,
    authed: !!saved.authed,
    pick: startRole,
    stage: "login",
    entries: Array.isArray(saved.entries) ? saved.entries : seedEntries(),
    chat: [],
    busy: false,
    docTab: "all",
    openDoc: null,
    res: { basis: "sekou", month: monthKey(addMonths(TODAY, -1)), view: "store", store: "all", mode: "chart" }
  };
  if (FY_MONTHS.indexOf(state.res.month) < 0) state.res.month = CUR; // 4月は前月が前の年度になる

  function U() { return D.users[state.role]; }
  function A() { return D.access[state.role]; }
  function roleLabel(id) { for (var i = 0; i < D.roles.length; i++) if (D.roles[i].id === id) return D.roles[i].label; return id; }
  function storeName(id) { for (var i = 0; i < D.stores.length; i++) if (D.stores[i].id === id) return D.stores[i].name; return id; }

  // ---------- 実績のサンプル（3年分の成約と、その施行日） ----------
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pick(list, r) { return list[Math.floor(r() * list.length)]; }

  // 商品の並び（重みの割合で20件を1巡）。月ごとにずらして、売上が月ごとに極端にぶれないようにする
  var CYCLE = (function () {
    var seq = [], left = D.products.map(function (p) { return { p: p, n: Math.round(p.w / 5) }; });
    while (seq.length < 20) left.forEach(function (x) { if (x.n > 0) { seq.push(x.p); x.n--; } });
    return seq.slice(0, 20);
  })();

  var DEALS = (function build() {
    var r = rng(20261008);
    var out = [];
    var start = addMonths(TODAY, -36);
    for (var i = 0; i <= 36; i++) {
      var ms = addMonths(start, i);
      var ago = 36 - i;
      var yi = ago >= 24 ? 0 : ago >= 12 ? 1 : 2;
      var dim = new Date(ms.getFullYear(), ms.getMonth() + 1, 0).getDate();
      D.stores.forEach(function (st, si) {
        var n = Math.round(st.base * D.season[ms.getMonth()] * st.growth[yi] * (0.96 + r() * 0.08));
        var people = D.staff.filter(function (s) { return s.store === st.id; });
        for (var k = 0; k < n; k++) {
          var cd = new Date(ms.getFullYear(), ms.getMonth(), 1 + Math.floor(r() * dim));
          var lagM = 2 + Math.floor(k * 10 / n); // 施行は成約の2〜11か月後に均して置く（商品の並びと偏らないよう、続き番号でまとめて割り振る）
          var ed = new Date(ms.getFullYear(), ms.getMonth() + lagM, 1 + Math.floor(r() * 28));
          var p = CYCLE[(k + i * 7 + si * 3) % CYCLE.length];
          var amount = Math.round((p.min + r() * (p.max - p.min)) / 1000) * 1000;
          var deal = {
            store: st.id, staff: people[(k + i) % people.length].name, product: p.name, amount: amount,
            gross: Math.round(amount * (0.6 + r() * 0.06)),
            contract: ymd(cd), event: ymd(ed),
            customer: pick(D.familyNames, r) + " " + pick(D.givenNames, r)
          };
          if (deal.contract <= YEST_S) out.push(deal); // 今日の分は、明朝の集計に入る
        }
      });
    }
    return out;
  })();

  // basis: "seiyaku"＝成約月で集計／"sekou"＝施行月で集計（施行がまだ先のものは「予約」）
  function dateOf(d, basis) { return basis === "seiyaku" ? d.contract : d.event; }
  function inScope(d, store, staff) { return (!store || store === "all" || d.store === store) && (!staff || d.staff === staff); }
  function sum(basis, month, store, staff, future) {
    var s = { sales: 0, count: 0, gross: 0 };
    for (var i = 0; i < DEALS.length; i++) {
      var d = DEALS[i];
      if (!inScope(d, store, staff)) continue;
      if (dateOf(d, basis).slice(0, 7) !== month) continue;
      if (basis === "sekou") { var done = d.event <= YEST_S; if (future ? done : !done) continue; }
      s.sales += d.amount; s.count++; s.gross += d.gross;
    }
    return s;
  }
  function sumRange(basis, from, to, store) {
    var s = { sales: 0, count: 0, gross: 0 };
    for (var i = 0; i < DEALS.length; i++) {
      var d = DEALS[i], x = dateOf(d, basis);
      if (!inScope(d, store) || x < from || x > to) continue;
      s.sales += d.amount; s.count++; s.gross += d.gross;
    }
    return s;
  }
  function plan(basis, month, store) { return Math.round(sum(basis, shiftMonth(month, -12), store).sales * 1.05 / 10000) * 10000; }
  function costs(store) {
    var c = { fixed: 0, labor: 0 };
    D.stores.forEach(function (st) { if (store && store !== "all" && st.id !== store) return; c.fixed += st.rent + st.utility; c.labor += st.labor; });
    return c;
  }
  function frac(m) { return m < CUR ? 1 : m === CUR ? CUR_FRAC : 0; } // 月の固定費のうち、集計に入れる割合

  // ---------- 画面の一覧 ----------
  // ph＝提案書のどこに当たるか。p1＝第1段階／p2＝第2段階／p12＝第1・第2段階／opt＝第3段階（オプション）／adv＝発展機能（提案書の外）
  var NAV = [
    { id: "home", grp: "概要", label: "ホーム", en: "Home", ico: "home" },
    { id: "ai", grp: "ナレッジ", label: "規程アシスタント", en: "Assistant", ico: "chat", ph: "p1" },
    { id: "docs", grp: "ナレッジ", label: "社内規程", en: "Documents", ico: "book", ph: "p1" },
    { id: "voice", grp: "ナレッジ", label: "お客様の声", en: "Voice", ico: "quote", ph: "adv" },
    { id: "results", grp: "実績", label: "実績の表示", en: "Results", ico: "chart", ph: "p1" },
    { id: "input", grp: "実績", label: "実績の入力", en: "Input", ico: "edit", ph: "p1" },
    { id: "confirm", grp: "実績", label: "実績の確定", en: "Approval", ico: "check", ph: "p1" },
    { id: "inbox", grp: "ご予約", label: "予約の受付", en: "Reservation", ico: "inbox", ph: "adv" },
    { id: "calendar", grp: "ご予約", label: "来店予約", en: "Schedule", ico: "cal", ph: "opt" },
    { id: "fairs", grp: "ご予約", label: "フェア・お食事", en: "Bridal Fair", ico: "ring", ph: "adv" },
    { id: "customers", grp: "顧客・受注", label: "顧客", en: "Customers", ico: "users", ph: "opt" },
    { id: "orders", grp: "顧客・受注", label: "受注管理", en: "Orders", ico: "list", ph: "opt" },
    { id: "inventory", grp: "顧客・受注", label: "衣装在庫", en: "Costume", ico: "hanger", ph: "opt" },
    { id: "invoices", grp: "会計・経理", label: "請求・入金", en: "Invoice", ico: "receipt", ph: "opt" },
    { id: "expenses", grp: "会計・経理", label: "経費", en: "Expense", ico: "wallet", ph: "opt" },
    { id: "tkc", grp: "会計・経理", label: "TKC連携", en: "TKC", ico: "link", ph: "p2" },
    { id: "employees", grp: "人事", label: "従業員", en: "Staff", ico: "id", ph: "adv" },
    { id: "leave", grp: "人事", label: "休暇", en: "Leave", ico: "leave", ph: "adv" },
    { id: "users", grp: "管理", label: "ユーザー・権限", en: "Users", ico: "shield", ph: "p12" }
  ];
  function navOf(id) { for (var i = 0; i < NAV.length; i++) if (NAV[i].id === id) return NAV[i]; return NAV[0]; }
  function route() { var h = location.hash.replace(/^#\/?/, ""); return h || "home"; }
  function allowed(id) { for (var i = 0; i < NAV.length; i++) if (NAV[i].id === id) return perm(id) !== "none"; return false; }
  function go(id) { if (location.hash === "#/" + id) render(); else location.hash = "#/" + id; }
  function pendingCount() { return state.entries.filter(function (e) { return e.status === "pending"; }).length; }

  // ---------- ログイン ----------
  function brandBlock(cls, sub) {
    return '<div class="' + cls + '"><span class="bscript">Yashiro</span><span class="btxt"><b>MARIE YASHIRO</b><small>' + esc(sub || "業務ポータル · デモ版") + "</small></span></div>";
  }
  function hpair(ja, en, tag) { return '<div class="hpair"><' + (tag || "h2") + ">" + esc(ja) + "</" + (tag || "h2") + '><span class="en">' + esc(en) + "</span></div>"; }
  // 右下の白い帯（御社サイトのトップと同じ形）：次のフェア
  function newsStrip(asLink) {
    var f = fairSchedule().filter(function (x) { return x.date >= TODAY_S; })[0];
    if (!f) return "";
    var inner = '<span class="nd">' + esc(f.date.replace(/-/g, " / ")) + '</span><span class="ntag">' + esc(f.v.short) + '</span><span class="nt">' + esc(f.f.title) + "</span>" + icon("arrow");
    return asLink ? '<a class="nstrip" href="#/fairs" data-act="fair-jump" data-v="' + f.v.id + '" data-d="' + f.date + '">' + inner + "</a>" : '<div class="nstrip">' + inner + "</div>";
  }
  function loginArt() {
    var tdy = apptList().filter(function (a) { return a.d === 0 && !a.venue; }).length, closed = storeClosedOn(TODAY);
    var nw = state.ext.inbox.filter(function (x) { return x.st === "new"; }).length;
    var wk = fairSchedule().filter(function (x) { return x.i < 7; }).length;
    return '<section class="login-art"><span class="mv" aria-hidden="true"></span><span class="mv-shade" aria-hidden="true"></span>' +
      '<div class="lg-hero"><span class="script">Yashiro</span>' +
      '<p class="en">You will surely find the perfect dress<br>for your special occasion here.</p><p class="brand-en">MARIE YASHIRO</p>' +
      '<h1 class="catch">幸せ溢れる最良の１日を。</h1>' +
      '<p class="lead">社内規程の AI と実績の管理を中心に、ご予約・受注・衣装・請求までを、ひとつの画面で。</p>' +
      '<div class="lg-stats"><span><b>' + (closed ? "定休日" : tdy + "件") + "</b>本日のご来店</span><span><b>" + nw + "件</b>新しいご予約</span><span><b>" + wk + "回</b>今週のブライダルフェア</span></div></div>" +
      newsStrip(false) + "</section>";
  }
  function loginWrap(card) { return '<main class="login">' + loginArt() + '<section class="login-form"><div class="login-card">' + card + "</div></section></main>"; }
  function viewLogin() {
    var u = D.users[state.pick];
    var accts = D.roles.map(function (r) {
      var x = D.users[r.id];
      return '<button type="button" class="acct' + (r.id === state.pick ? " on" : "") + '" data-act="acct" data-role="' + r.id + '">' +
        '<span class="av">' + esc(x.name.charAt(0)) + "</span><span><b>" + esc(x.name) + '<span class="role-tag">' + esc(r.label) + "</span></b><small>" + esc(x.title) + "</small></span>" +
        '<span class="go">' + icon("arrow") + "</span></button>";
    }).join("");
    return loginWrap(brandBlock("login-brand", "業務ポータル · デモ版") + hpair("ログイン", "Login") +
      '<p class="sub">社員アカウントでログインしてください。表示内容は役職と所属店舗で変わります。</p>' +
      '<label class="field-label">メールアドレス<input type="email" value="' + esc(u.email) + '" readonly></label>' +
      '<label class="field-label">パスワード<input type="password" value="demo-password" readonly></label>' +
      '<button class="btn pri big" data-act="login">ログイン' + icon("arrow") + "</button>" +
      '<p class="note-sm">すべてのアカウントで2段階認証が必要です。</p>' +
      '<div class="divider">デモ用アカウント · 役職別</div>' +
      '<div class="demo-accts">' + accts + "</div>" +
      '<p class="note-sm">氏名はサンプルです。実在の方とは関係ありません。</p>');
  }
  function viewCode() {
    var u = D.users[state.pick];
    return loginWrap(brandBlock("login-brand", "業務ポータル · デモ版") + hpair("2段階認証", "Verification") +
      '<p class="sub">' + esc(u.name) + "さん（" + esc(u.title) + "）。登録したスマートフォンの認証アプリに表示された、6桁の確認コードを入力してください。</p>" +
      '<label class="field-label">確認コード<input type="text" class="code-input" inputmode="numeric" maxlength="6" value="123456" aria-label="確認コード"></label>' +
      '<p class="note-sm">デモでは確認コードが入っています。</p>' +
      '<button class="btn pri big" data-act="verify">確認してログイン' + icon("arrow") + "</button>" +
      '<button class="btn" data-act="back-login">戻る</button>');
  }

  // ---------- 全体の枠 ----------
  function isDark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  function roleOptions() {
    return D.roles.map(function (r) {
      return '<option value="' + r.id + '"' + (r.id === state.role ? " selected" : "") + ">" + esc(r.label) + "（" + esc(D.users[r.id].name) + "）</option>";
    }).join("");
  }
  function navCount(id) {
    if (id === "confirm") return pendingCount();
    if (id === "inbox") return inboxNew().length;
    if (id === "leave" && (state.role === "exec" || state.role === "manager")) return leaveScope().filter(function (l) { return l.st === "申請中" && l.name !== U().name; }).length;
    if (id === "expenses" && approver()) return expList().filter(function (e) { return e.st === "承認待ち" || e.st === "要確認"; }).length;
    return 0;
  }
  function navHtml(current) {
    var groups = [];
    NAV.forEach(function (x) {
      if (!allowed(x.id)) return;
      var g = groups.filter(function (y) { return y.name === x.grp; })[0];
      if (!g) { g = { name: x.grp, items: [] }; groups.push(g); }
      var n = navCount(x.id);
      g.items.push('<a class="nav' + (x.id === current ? " on" : "") + '" href="#/' + x.id + '">' + icon(x.ico) + '<span class="nl">' + esc(x.label) + "</span>" +
        (n ? '<span class="cnt">' + n + "</span>" : "") + badge(x.ph === "opt" || x.ph === "adv" ? x.ph : "") + "</a>");
    });
    return groups.map(function (g) { return '<div class="navgrp"><h6>' + esc(g.name) + "</h6>" + g.items.join("") + "</div>"; }).join("");
  }
  function shell(current, inner) {
    var u = U(), n = navOf(current), w = workItems(), dark = isDark();
    return '<div class="app"><aside class="side">' +
      '<a href="#/home" class="brand-a">' + brandBlock("brand", "業務ポータル · デモ版") + "</a>" + '<nav class="navs" aria-label="メニュー">' + navHtml(current) + "</nav>" +
      '<div class="side-foot">デモ版（画面のイメージ）。店舗・式場・フェア・衣装の名前と写真は、御社と式場のサイトから。お客様・従業員の氏名と数字はサンプルです。<br>Terveys Technology Solutions 日本支店<br><button class="linklike" data-act="reset">デモのデータを元に戻す</button></div>' +
      "</aside>" +
      '<div class="main"><header class="top">' +
      '<div class="ttl"><span class="crumb"><span class="en">' + esc(n.en || "") + "</span>" + esc(n.id === "home" ? "概要" : n.grp) + "</span><h1>" + esc(n.label) + phaseChip(n.ph) + "</h1></div>" +
      '<button type="button" class="search" data-act="pal-open" aria-label="画面をさがす・規程に質問（⌘K）">' + icon("search") + '<span class="ph">画面をさがす・規程に質問…</span><kbd>⌘K</kbd></button>' +
      '<span class="sp"></span>' +
      '<button type="button" class="iconbtn tbtn" data-act="theme" title="' + (dark ? "ライト表示にする" : "ダーク表示にする") + '" aria-label="表示の切り替え">' + icon(dark ? "sun" : "moon") + "</button>" +
      '<div class="bell-wrap"><button type="button" class="bell" data-act="bell" aria-label="確認待ち ' + workCount(w) + '件" aria-expanded="' + (state.ui.bell ? "true" : "false") + '">' + icon("bell") + (workCount(w) ? "<i>" + workCount(w) + "</i>" : "") + "</button>" + (state.ui.bell ? bellPop(w) : "") + "</div>" +
      '<label class="role-switch"><span class="rs-label">役職を切り替え</span><select data-act="switch-role" aria-label="役職を切り替え" title="役職を切り替え">' + roleOptions() + "</select></label>" +
      '<div class="userchip"><span class="av">' + esc(u.name.charAt(0)) + "</span><div><b>" + esc(u.name) + "</b><small>" + esc(u.title) + "</small></div>" +
      '<button class="iconbtn" data-act="logout" title="ログアウト" aria-label="ログアウト">' + icon("out") + "</button></div>" +
      "</header>" +
      '<main class="content' + (state.anim ? " anim" : "") + '">' + inner + "</main></div>" + bottomNav(current) + "</div>" +
      (current !== "ai" ? '<a class="vtab" href="#/ai" aria-label="規程AIに聞く">' + '<span class="vt">規程AIに聞く</span>' + icon("arrow") + "</a>" : "") + sheetHtml(current) + palHtml();
  }
  function bellPop(w) {
    return '<div class="pop" role="dialog" aria-label="確認待ち"><div class="pop-h">確認待ち</div>' + (w.length ? w.map(function (x) {
      return '<a class="pop-it" href="#/' + x.page + '" data-act="go" data-v="' + x.page + '"><span class="wn ' + x.tone + '">' + x.n + "<small>" + esc(x.unit) + '</small></span><span class="wt"><b>' + esc(x.label) + "</b><small>" + esc(x.sub) + "</small></span></a>";
    }).join("") : '<p class="note-sm" style="padding:10px 14px">確認待ちはありません。</p>') + "</div>";
  }
  // スマートフォン：下のタブと、全部の画面を出すメニュー
  function bottomNav(current) {
    var items = [["home", "ホーム", "home"], ["ai", "規程AI", "spark"]];
    items.push(allowed("inbox") ? ["inbox", "受付", "inbox"] : allowed("calendar") ? ["calendar", "予約", "cal"] : ["leave", "休暇", "leave"]);
    items.push(allowed("results") ? ["results", "実績", "chart"] : allowed("input") ? ["input", "入力", "edit"] : ["orders", "受注", "list"]);
    return '<nav class="bnav" aria-label="よく使う画面">' + items.map(function (x) {
      var n = navCount(x[0]);
      return '<a href="#/' + x[0] + '" class="' + (current === x[0] ? "on" : "") + '">' + icon(x[2]) + (n ? '<i class="bdot">' + n + "</i>" : "") + "<span>" + x[1] + "</span></a>";
    }).join("") + '<button type="button" data-act="sheet" class="' + (state.ui.sheet ? "on" : "") + '">' + icon("menu") + "<span>メニュー</span></button></nav>";
  }
  function sheetHtml(current) {
    if (!state.ui.sheet) return "";
    var dark = isDark();
    return '<div class="overlay" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="メニュー">' +
      '<div class="sheet-h"><b>メニュー</b><button type="button" class="iconbtn" data-act="sheet-close" aria-label="閉じる">' + icon("x") + "</button></div>" +
      '<label class="role-switch sheet-role"><span>役職を切り替え</span><select data-act="switch-role" aria-label="役職を切り替え">' + roleOptions() + "</select></label>" +
      '<div class="sheet-nav">' + navHtml(current) + "</div>" +
      '<div class="sheet-foot"><button type="button" class="btn" data-act="theme">' + icon(dark ? "sun" : "moon") + (dark ? "ライト表示" : "ダーク表示") + "</button>" +
      '<button type="button" class="btn" data-act="reset">' + icon("undo") + "デモを元に戻す</button>" +
      '<button type="button" class="btn" data-act="logout">' + icon("out") + "ログアウト</button></div>" +
      '<p class="note-sm">デモ版：店舗・式場・フェア・衣装の名前と写真は御社と式場のサイトから。氏名・数字・規程はサンプルです。</p></div>';
  }

  // ---------- 規程アシスタント ----------
  function docById(id) { for (var i = 0; i < D.docs.length; i++) if (D.docs[i].id === id) return D.docs[i]; return null; }
  function docLabel(doc) { return doc.name + (doc.version ? " " + doc.version : ""); }
  function scopeLabel(doc) { return doc.roles.length === D.roles.length ? "全員" : doc.roles.map(roleLabel).join("・"); }
  function norm(s) {
    return String(s).replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/\s+/g, "").toLowerCase();
  }
  function findAnswer(q) {
    var nq = norm(q), best = null, bestScore = 0;
    D.articles.forEach(function (a) {
      var s = 0;
      a.keys.forEach(function (k) { if (nq.indexOf(norm(k)) >= 0) s += k.length; });
      if (s > bestScore) { best = a; bestScore = s; }
    });
    if (!best || bestScore < 2) return { kind: "none" };
    var doc = docById(best.doc);
    if (doc.roles.indexOf(state.role) < 0) return { kind: "restricted", doc: doc };
    return { kind: "hit", art: best, doc: doc };
  }
  function botHtml(m) {
    if (m.kind === "welcome") {
      return '<div class="msg bot">' + esc(family(U().name)) + "さん、こんにちは。社内規程・業務マニュアルをもとにお答えし、根拠となる箇所をお示しします。記載がない場合は、その旨をお伝えします。</div>";
    }
    if (m.kind === "hit") {
      return '<div class="msg bot">' + esc(m.art.answer) +
        '<div class="src"><b>出典：</b>' + esc(docLabel(m.doc)) + "　" + esc(m.art.no) + "（" + esc(m.art.title) + '）<span class="q">' + esc(m.art.text) + "</span></div>" +
        (m.art.note ? '<p class="aside">' + esc(m.art.note) + "</p>" : "") + (m.art.no === "第12条" && m.doc.id === "rules" ? leaveProc() : "") + "</div>";
    }
    if (m.kind === "leave-done") {
      return '<div class="msg bot">申請しました。' + esc(slashDate(m.date)) + "の" + esc(m.type) + "を、" + esc(m.approver) + "さんに承認を依頼しました。承認されると、お知らせします。" +
        (allowed("leave") ? '<div class="proc-acts"><a class="btn sm" href="#/leave">' + icon("leave") + "休暇の画面で確かめる</a></div>" : "") + "</div>";
    }
    if (m.kind === "restricted") {
      return '<div class="msg bot">この質問に関係する内容は「' + esc(m.doc.name) + "」にあります。この文書は" + esc(roleLabel(state.role)) +
        "の方の閲覧範囲に入っていないため、お答えできません。必要な場合は、店長にご確認ください。" +
        '<p class="aside">文書ごとの閲覧範囲は「社内規程」の画面で設定します。</p></div>';
    }
    return '<div class="msg bot">登録されている文書には、このご質問についての記載がありません。推測ではお答えしません。' +
      '<p class="aside">規程やマニュアルに書き足して登録すれば、答えられるようになります。</p></div>';
  }
  function viewAI() {
    var visible = D.docs.filter(function (d) { return d.status === "公開中" && d.roles.indexOf(state.role) >= 0; });
    var msgs = [{ who: "bot", kind: "welcome" }].concat(state.chat).map(function (m) {
      return m.who === "me" ? '<div class="msg me">' + esc(m.text) + "</div>" : botHtml(m);
    }).join("");
    if (state.busy) msgs += '<div class="msg bot"><span class="typing">規程を確認しています</span></div>';
    var exs = D.suggestions.map(function (s) { return '<button class="ex" type="button" data-act="ask-ex" data-q="' + esc(s) + '">' + esc(s) + "</button>"; }).join("");
    var scope = visible.map(function (d) { return "<li>" + esc(d.name) + "（" + esc(d.kind) + "）</li>"; }).join("");
    return '<div class="chat"><div class="card chat-card">' +
      '<div class="card-h"><h3>規程アシスタント</h3><span class="sub">社内文書のみをもとに回答</span></div>' +
      '<div class="msgs" id="msgs">' + msgs + "</div>" +
      '<form class="ask" data-act="ask"><input type="text" name="q" placeholder="休暇・服装・経費などについて質問…" autocomplete="off" aria-label="質問">' +
      '<button class="btn pri" type="submit"' + (state.busy ? " disabled" : "") + ">質問する</button></form></div>" +
      '<div style="display:grid;gap:18px">' +
      '<div class="card"><div class="card-h"><h3>質問の例</h3></div><div class="card-b exs">' + exs + "</div></div>" +
      '<div class="card"><div class="card-h"><h3>' + esc(roleLabel(state.role)) + 'の方が参照できる文書</h3></div><div class="card-b scope-list"><ul>' + scope + "</ul></div></div>" +
      '<div class="notice">デモ版：本番では AI（Azure OpenAI）が文章で答えます。このデモでは、サンプルの規程から当てはまる条文を探して表示します。</div>' +
      "</div></div>";
  }
  function ask(q) {
    q = String(q || "").trim();
    if (!q || state.busy) return;
    state.chat.push({ who: "me", text: q });
    state.busy = true;
    render();
    setTimeout(function () {
      var res = findAnswer(q);
      res.who = "bot";
      state.chat.push(res);
      state.busy = false;
      render();
    }, 700);
  }

  // ---------- 社内規程 ----------
  function viewDocs() {
    var edit = A().docs === "edit";
    var tabs = [["all", "すべて"], ["社内規程", "社内規程"], ["業務マニュアル", "業務マニュアル"]].map(function (t) {
      return '<button type="button" data-act="doc-tab" data-v="' + t[0] + '" class="' + (state.docTab === t[0] ? "on" : "") + '">' + t[1] + "</button>";
    }).join("");
    var rows = D.docs.filter(function (d) { return state.docTab === "all" || d.kind === state.docTab; }).map(function (d) {
      var can = d.roles.indexOf(state.role) >= 0;
      var reg = d.status === "公開中";
      var meta = reg ? esc(d.version) + " · 更新 " + esc(d.updated) : "未登録（就業規則 第30条から参照）";
      var btn = !reg ? (edit ? '<button class="btn sm" data-act="doc-op">登録</button>' : '<span class="pill mute">未登録</span>')
        : can ? '<button class="btn sm" data-act="doc-open" data-id="' + d.id + '">' + (state.openDoc === d.id ? "閉じる" : "開く") + "</button>"
          : '<span class="pill mute">閲覧範囲外</span>';
      var open = "";
      if (state.openDoc === d.id && can && reg) {
        open = '<div class="doc-open">' + D.articles.filter(function (a) { return a.doc === d.id; }).map(function (a) {
          return "<p><b>" + esc(a.no) + "（" + esc(a.title) + "）</b>　" + esc(a.text) + "</p>";
        }).join("") + "<p>（サンプルの抜粋です）</p></div>";
      }
      return '<div class="doc"><span class="ico">' + esc(d.type) + '</span><div><div class="t">' + esc(d.name) + '</div><div class="m">' + meta + "</div></div>" +
        '<span class="sp"></span><span class="scope">閲覧範囲：' + esc(scopeLabel(d)) + "</span>" + btn + open + "</div>";
    }).join("");
    return '<div class="card"><div class="tabs">' + tabs + "</div>" +
      '<div class="doc-bar">規程アシスタントは、閲覧権限のある文書だけをもとに回答します。<span class="sp"></span>' +
      (edit ? '<button class="btn pri" data-act="doc-op">' + icon("up") + "文書をアップロード</button>" : '<span class="note-sm">文書の追加・差し替えは管理者（このデモでは役員）が行います。</span>') +
      "</div>" + rows + "</div>";
  }

  // ---------- 実績の入力 ----------
  function statusPill(s) {
    return s === "pending" ? '<span class="pill pending">確認待ち</span>' : s === "confirmed" ? '<span class="pill confirmed">確定</span>' : '<span class="pill returned">差し戻し</span>';
  }
  function kindLabel(k) { return k === "seiyaku" ? "成約" : "施行"; }
  function viewInput() {
    var u = U();
    var people = D.staff.filter(function (s) { return s.store === u.store; }).map(function (s) {
      return "<option" + (s.name === u.name ? " selected" : "") + ">" + esc(s.name) + "</option>";
    }).join("");
    var products = D.products.map(function (p) { return "<option>" + esc(p.name) + "</option>"; }).join("");
    var mine = state.entries.filter(function (e) { return e.store === u.store; }).sort(function (a, b) { return a.created < b.created ? 1 : -1; });
    var rows = mine.map(function (e) {
      return "<tr><td>" + statusPill(e.status) + "</td><td>" + esc(timeLabel(e.created)) + "</td><td>" + kindLabel(e.kind) + "</td><td>" + esc(slashDate(e.contract)) +
        "</td><td>" + esc(slashDate(e.event)) + "</td><td>" + esc(e.product) + '</td><td class="num">' + yen(e.amount) + "</td><td>" + esc(mask(e.customer)) + "</td><td>" + esc(e.staff) + "</td></tr>";
    }).join("") || '<tr><td colspan="9">まだ入力はありません。</td></tr>';
    return '<div class="card"><div class="card-h"><h3>実績を入力</h3><span class="sub">成約したとき、挙式などの施行が終わったときに入力します。入力した数字は、経理が確認して確定します。</span></div>' +
      '<form class="card-b" data-act="entry" novalidate><div class="form-grid">' +
      '<div class="field"><label for="f-store">店舗</label><select id="f-store" disabled><option>' + esc(storeName(u.store)) + '</option></select><p class="help">ご自分の店舗が入っています。</p></div>' +
      '<div class="field"><span class="label">区分</span><div class="radio-seg" role="radiogroup" aria-label="区分">' +
      '<label><input type="radio" name="kind" value="seiyaku" checked>成約（予約の数字）</label><label><input type="radio" name="kind" value="sekou">施行（実績の数字）</label></div>' +
      '<p class="help">ご契約いただいた日に「成約」で入力します。挙式などが終わったら「施行」で入力します。</p></div>' +
      '<div class="field"><label for="f-contract">成約日<span class="req">必須</span></label><input type="date" id="f-contract" name="contract" value="' + TODAY_S + '"><p class="help">ご契約いただいた日です。</p></div>' +
      '<div class="field"><label for="f-event">施行日（お日取り）<span class="req">必須</span></label><input type="date" id="f-event" name="event"><p class="help">挙式・撮影などを行う日です。</p></div>' +
      '<div class="field"><label for="f-product">商品</label><select id="f-product" name="product">' + products + '</select><p class="help">いちばん大きな商品を選びます。</p></div>' +
      '<div class="field"><label for="f-amount">金額（税別）<span class="req">必須</span></label><input type="number" id="f-amount" name="amount" min="0" step="1000" inputmode="numeric" placeholder="例：280000"><p class="help">税別の金額を、円で入力します。</p></div>' +
      '<div class="field"><label for="f-customer">お客様のお名前<span class="req">必須</span></label><input type="text" id="f-customer" name="customer" placeholder="例：佐々木 美咲" autocomplete="off"><p class="help">お名前は、経理以外の画面では伏せて表示されます。</p></div>' +
      '<div class="field"><label for="f-staff">担当</label><select id="f-staff" name="staff">' + people + "</select></div>" +
      '</div><div class="form-actions"><button class="btn pri" type="submit">入力する</button><span class="note-sm">入力すると「確認待ち」になり、経理が確定します。</span></div></form></div>' +
      '<div class="card"><div class="card-h"><h3>' + esc(storeName(u.store)) + "の最近の入力</h3></div>" +
      '<div class="tbl-wrap"><table><thead><tr><th>状態</th><th>入力日時</th><th>区分</th><th>成約日</th><th>施行日</th><th>商品</th><th class="num">金額（税別）</th><th>お客様</th><th>担当</th></tr></thead><tbody>' +
      rows + "</tbody></table></div></div>";
  }
  function submitEntry(form) {
    var f = new FormData(form);
    var amount = Number(f.get("amount"));
    var customer = String(f.get("customer") || "").trim();
    var contract = String(f.get("contract") || "");
    var event = String(f.get("event") || "");
    if (!contract || !event) { toast("成約日と施行日を入力してください。"); return; }
    if (!(amount > 0)) { toast("金額（税別）を入力してください。"); return; }
    if (!customer) { toast("お客様のお名前を入力してください。"); return; }
    if (event < contract) { toast("施行日は、成約日より後の日付にしてください。"); return; }
    state.entries.push({
      id: "e" + Date.now(), created: new Date().toISOString(), store: U().store, kind: f.get("kind"),
      contract: contract, event: event, product: f.get("product"), amount: amount, customer: customer, staff: f.get("staff"), status: "pending"
    });
    audit("実績を入力（" + kindLabel(f.get("kind")) + " · " + storeName(U().store) + "）");
    save();
    render();
    toast("入力しました。経理の確認を待っています。");
  }

  // ---------- 実績の確定（経理） ----------
  function viewConfirm() {
    var list = state.entries.slice().sort(function (a, b) {
      if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
      return a.created < b.created ? 1 : -1;
    });
    var n = pendingCount();
    var rows = list.map(function (e) {
      var p = e.status === "pending";
      return "<tr><td>" + (p ? '<input type="checkbox" class="pick" value="' + esc(e.id) + '" aria-label="選ぶ">' : "") + "</td><td>" + statusPill(e.status) + "</td><td>" + esc(timeLabel(e.created)) +
        "</td><td>" + esc(storeName(e.store)) + "</td><td>" + kindLabel(e.kind) + "</td><td>" + esc(slashDate(e.contract)) + "</td><td>" + esc(slashDate(e.event)) +
        "</td><td>" + esc(e.product) + '</td><td class="num">' + yen(e.amount) + "</td><td>" + esc(e.customer) + " 様</td><td>" + esc(e.staff) + "</td><td>" +
        (p ? '<button class="btn sm good" data-act="confirm-one" data-id="' + esc(e.id) + '">確定</button> <button class="btn sm badline" data-act="return-one" data-id="' + esc(e.id) + '">差し戻し</button>' : "") +
        "</td></tr>";
    }).join("");
    return '<div class="card"><div class="card-h"><h3>現場からの入力</h3><span class="sub">確認して確定します。確定した数字は、翌朝6:00の集計に入ります（集計は1日1回）。</span><span class="sp"></span>' +
      '<span class="pill ' + (n ? "pending" : "confirmed") + '">確認待ち ' + n + " 件</span>" +
      '<button class="btn pri" data-act="confirm-picked"' + (n ? "" : " disabled") + ">選んだ入力を確定する</button></div>" +
      '<div class="tbl-wrap"><table><thead><tr><th><input type="checkbox" data-act="pick-all" aria-label="すべて選ぶ"></th><th>状態</th><th>入力日時</th><th>店舗</th><th>区分</th><th>成約日</th><th>施行日</th><th>商品</th><th class="num">金額（税別）</th><th>お客様</th><th>担当</th><th>操作</th></tr></thead><tbody>' +
      rows + '</tbody></table></div><p class="hint">経理の方には、お客様のお名前がそのまま表示されます。ほかの役職の画面では、お名前を伏せて表示します。</p></div>';
  }
  function setStatus(ids, status) {
    var n = 0;
    state.entries.forEach(function (e) { if (ids.indexOf(e.id) >= 0 && e.status === "pending") { e.status = status; n++; } });
    save();
    render();
    return n;
  }

  // ---------- 実績の表示 ----------
  function scopeStore() { return A().results === "full" ? state.res.store : U().store; }
  function monthRows(basis, store, full) {
    var c = costs(store);
    return FY_MONTHS.map(function (m) {
      var act = m <= CUR ? sum(basis, m, store) : { sales: 0, count: 0, gross: 0 };
      var fut = basis === "sekou" && m >= CUR ? sum(basis, m, store, null, true) : { sales: 0, count: 0 };
      var f = frac(m);
      var exp = (act.sales - act.gross) + (c.fixed + c.labor) * f;
      return {
        key: m, done: m < CUR, cur: m === CUR, future: m > CUR, act: act, fut: fut,
        last: sum(basis, shiftMonth(m, -12), store).sales, plan: plan(basis, m, store),
        exp: full && m <= CUR ? exp : null, profit: full && m <= CUR ? act.sales - exp : null, fixed: c.fixed * f
      };
    });
  }
  function chart(rows, full, basis, selected) {
    var W = 780, H = 300, L = 66, R = 12, T = 30, B = 30;
    var max = 1;
    rows.forEach(function (r) { max = Math.max(max, r.act.sales + r.fut.sales, r.exp || 0, full ? 0 : r.last, full ? 0 : r.plan); });
    var step = Math.pow(10, Math.floor(Math.log10(max)));
    var nice = [1, 2, 2.5, 4, 5, 8, 10].map(function (k) { return k * step; }).filter(function (v) { return v >= max; })[0] || max;
    var iw = W - L - R, ih = H - T - B, bw = iw / rows.length;
    function y(v) { return T + ih - (v / nice) * ih; }
    function cx(i) { return L + i * bw + bw / 2; }
    var g = "";
    rows.forEach(function (r, i) { if (r.key === selected) g += '<rect class="colsel" x="' + (L + i * bw).toFixed(1) + '" y="' + T + '" width="' + bw.toFixed(1) + '" height="' + ih + '" rx="4"/>'; });
    for (var k = 0; k <= 4; k++) {
      var v = nice * k / 4, yy = y(v).toFixed(1);
      var lbl = (v / 1e6) % 1 === 0 ? (v / 1e6).toFixed(0) : (v / 1e6).toFixed(1);
      g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="axis" x="' + (L - 8) + '" y="' + (+yy + 4) + '" text-anchor="end">' + lbl + "百万円</text>";
    }
    var firstFut = -1;
    rows.forEach(function (r, i) {
      var click = r.future ? "" : ' data-act="pick-month" data-m="' + r.key + '" style="cursor:pointer"';
      var t = "<title>" + esc(jpMonth(r.key) + "　売上 " + yen(r.act.sales) + (r.fut.sales ? "　予約 " + yen(r.fut.sales) : "") + (r.exp != null ? "　経費 " + yen(r.exp) : "")) + "</title>";
      if (r.future && firstFut < 0 && r.fut.sales) firstFut = i;
      var w = full ? bw * 0.27 : bw * 0.46, gap = bw * 0.04;
      var xr = full ? cx(i) - gap / 2 - w : cx(i) - w / 2;
      if (r.act.sales) g += '<rect class="rev"' + click + ' x="' + xr.toFixed(1) + '" y="' + y(r.act.sales).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(0) - y(r.act.sales)).toFixed(1) + '" rx="2">' + t + "</rect>";
      if (r.fut.sales) g += '<rect class="rev fut"' + click + ' x="' + xr.toFixed(1) + '" y="' + y(r.act.sales + r.fut.sales).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(r.act.sales) - y(r.act.sales + r.fut.sales)).toFixed(1) + '" rx="2">' + t + "</rect>";
      if (full && r.exp != null) g += '<rect class="exp"' + click + ' x="' + (cx(i) + gap / 2).toFixed(1) + '" y="' + y(r.exp).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(0) - y(r.exp)).toFixed(1) + '" rx="2">' + t + "</rect>";
      g += '<text class="axis' + (r.key === selected ? " on" : "") + '" x="' + cx(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + mNum(r.key) + "月" + (r.cur ? "（途中）" : "") + "</text>";
    });
    if (basis === "sekou") {
      var curIdx = rows.map(function (r) { return r.cur; }).indexOf(true);
      if (curIdx >= 0 && curIdx < rows.length - 1) {
        var dx = (L + (curIdx + 1) * bw).toFixed(1);
        g += '<line class="divider" x1="' + dx + '" x2="' + dx + '" y1="' + (T - 14) + '" y2="' + (T + ih) + '"/><text class="divlbl" x="' + (+dx + 6) + '" y="' + (T - 4) + '">予約済み（今後のお日取り）→</text>';
      }
    }
    if (full) {
      var pts = rows.filter(function (r) { return r.profit != null; }).map(function (r) { var i = rows.indexOf(r); return { x: cx(i), y: y(Math.max(0, r.profit)), sel: r.key === selected }; });
      g += '<polyline class="pro" points="' + pts.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ") + '"/>';
      pts.forEach(function (p) { g += '<circle class="prodot" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (p.sel ? 5 : 3.5) + '"/>'; });
    } else {
      g += '<polyline class="last" points="' + rows.map(function (r, i) { return cx(i).toFixed(1) + "," + y(r.last).toFixed(1); }).join(" ") + '"/>';
      g += '<polyline class="plan" points="' + rows.map(function (r, i) { return cx(i).toFixed(1) + "," + y(r.plan).toFixed(1); }).join(" ") + '"/>';
    }
    return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="月別の売上のグラフ">' + g + "</svg>";
  }
  function kpi(l, v, d, cls) { return '<div class="card kpi"><div class="l">' + esc(l) + '</div><div class="v">' + esc(v) + '</div><div class="d' + (cls ? " " + cls : "") + '">' + esc(d) + "</div></div>"; }

  function viewResults() {
    var a = A(), u = U(), r = state.res;
    var full = a.results === "full";
    var store = scopeStore();
    var basis = r.basis;
    var rows = monthRows(basis, store, full);
    var c = costs(store);

    // 今期の累計（4月1日〜昨日）
    var ytd = sumRange(basis, FY_START_S, YEST_S, store);
    var lastYtd = sumRange(basis, ymd(addYears(FY_START, -1)), ymd(addYears(YEST, -1)), store);
    var planYtd = 0, monthsIn = 0;
    rows.forEach(function (x) { var f = frac(x.key); planYtd += x.plan * f; monthsIn += f; });
    var expYtd = (ytd.sales - ytd.gross) + (c.fixed + c.labor) * monthsIn;
    var book = sumRange("sekou", TODAY_S, FY_END_S, store);
    var yoy = ratio(ytd.sales, lastYtd.sales);

    var where = store === "all" ? "全店舗（松江本店・出雲店・米子店・鳥取店）" : storeName(store);
    var storeSel = full ? '<select data-act="store" aria-label="店舗" style="width:auto;min-height:34px;padding:5px 8px;font-size:12.5px">' +
      ['<option value="all"' + (store === "all" ? " selected" : "") + ">全店舗</option>"].concat(D.stores.map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === store ? " selected" : "") + ">" + esc(s.name) + "</option>";
      })).join("") + "</select>" : "";

    var head = '<div class="welcome"><div><h2>' + greeting() + "、" + esc(family(u.name)) + "さん</h2>" +
      '<p class="sub">' + esc(where) + " · 衣装（第1段階の対象） · 毎朝6:00に更新 · " + FY_LABEL + "</p></div>" +
      '<span class="sp"></span><div class="acts">' + storeSel +
      '<div class="seg" role="group" aria-label="集計の基準"><button type="button" data-act="basis" data-v="sekou" class="' + (basis === "sekou" ? "on" : "") + '">施行月ベース</button>' +
      '<button type="button" data-act="basis" data-v="seiyaku" class="' + (basis === "seiyaku" ? "on" : "") + '">成約月ベース</button></div>' +
      '<button class="btn" data-act="csv-hq">Excel（CSV）に出力</button></div></div>';

    var kpis = '<div class="kpis">' +
      kpi("売上（今期累計）", mil(ytd.sales), arrow(yoy) + "前年比 " + pct(yoy), upDn(yoy)) +
      kpi("計画達成率", pct(ratio(ytd.sales, planYtd)), "計画 " + mil(planYtd)) +
      (full
        ? kpi("経費（累計）", mil(expYtd), "売上比 " + pct(ratio(expYtd, ytd.sales))) + kpi("利益（累計）", mil(ytd.sales - expYtd), "利益率 " + pct(ratio(ytd.sales - expYtd, ytd.sales)), "up")
        : kpi("成約件数（今期）", ytd.count + "件", "平均 " + (ytd.count ? man(ytd.sales / ytd.count) : "—")) +
          kpi("固定費（今期・家賃・光熱費）", mil(c.fixed * monthsIn), "経費・利益は役員と経理の方だけに表示")) +
      kpi("予約済み（" + mNum(CUR) + "〜3月）", mil(book.sales), "今後のお日取り · " + book.count + "件") +
      "</div>";

    var legend = '<div class="legend"><span><i style="background:var(--rev)"></i>売上</span>' +
      (full ? '<span><i style="background:var(--exp)"></i>経費</span><span><i class="ln" style="background:var(--pro)"></i>利益</span>'
        : '<span><i class="ln" style="background:var(--muted)"></i>前年</span><span><i class="dash"></i>計画</span>') +
      (basis === "sekou" ? '<span><i style="background:var(--rev);opacity:.38"></i>予約</span>' : "") + "</div>";

    var monthTable = '<div class="tbl-wrap"><table><thead><tr><th>月</th><th>区分</th><th class="num">売上（税別）</th><th class="num">件数</th><th class="num">前年比</th><th class="num">計画比</th>' +
      (full ? '<th class="num">経費</th><th class="num">利益</th>' : "") + "</tr></thead><tbody>" +
      rows.map(function (x) {
        if (x.future && !x.fut.sales) return "";
        var isF = x.future;
        var sales = isF ? x.fut.sales : x.act.sales;
        return '<tr class="' + (isF ? "future" : "") + '"><td>' + jpMonth(x.key) + "</td><td>" + (isF ? "予約" : x.cur ? "実績（途中）" : "実績") + '</td><td class="num">' + yen(sales) +
          '</td><td class="num">' + (isF ? x.fut.count : x.act.count) + "件</td>" +
          '<td class="num ' + (isF ? "" : upDn(ratio(sales, x.last))) + '">' + (isF ? "—" : pct(ratio(sales, x.last))) + "</td>" +
          '<td class="num ' + (isF ? "" : upDn(ratio(sales, x.plan))) + '">' + (isF ? "—" : pct(ratio(sales, x.plan))) + "</td>" +
          (full ? '<td class="num">' + (x.exp != null ? yen(x.exp) : "—") + '</td><td class="num">' + (x.profit != null ? yen(x.profit) : "—") + "</td>" : "") + "</tr>";
      }).join("") +
      '<tr class="tot"><td>今期累計</td><td>実績</td><td class="num">' + yen(ytd.sales) + '</td><td class="num">' + ytd.count + '件</td><td class="num ' + upDn(yoy) + '">' + pct(yoy) +
      '</td><td class="num ' + upDn(ratio(ytd.sales, planYtd)) + '">' + pct(ratio(ytd.sales, planYtd)) + "</td>" +
      (full ? '<td class="num">' + yen(expYtd) + '</td><td class="num">' + yen(ytd.sales - expYtd) + "</td>" : "") + "</tr></tbody></table></div>";

    var chartCard = '<div class="card"><div class="card-h"><h3>' + (full ? "月別 売上・経費・利益" : "月別 売上") + "</h3>" +
      '<div class="seg" role="group" aria-label="表示"><button type="button" data-act="mode" data-v="chart" class="' + (r.mode === "chart" ? "on" : "") + '">グラフ</button>' +
      '<button type="button" data-act="mode" data-v="table" class="' + (r.mode === "table" ? "on" : "") + '">表</button></div><span class="sp"></span>' + legend + "</div>" +
      (r.mode === "chart" ? '<div class="chart-scroll">' + chart(rows, full, basis, r.month) + "</div>" : monthTable) +
      '<p class="hint">' + (basis === "sekou" ? "施行月ベース：挙式などを行う月で集計します。薄い色は、成約済みで施行がまだの「予約」です。" : "成約月ベース：ご契約いただいた月で集計します。") +
      (r.mode === "chart" ? "　棒を押すと、その月の内訳を下に表示します。" : "") + (full ? "" : "　経費・利益は、役員と経理の方だけに表示されます。") + "</p></div>";

    // 選んだ月の内訳と明細
    var m = r.month;
    var table = r.view === "store" ? htmlTable(storeRows(basis, m, store, full)) : htmlTable(staffRows(basis, m, store));
    var breakdown = '<div class="card"><div class="card-h"><h3>' + jpMonth(m) + (m === CUR ? "（昨日まで）" : "") + "の内訳</h3>" +
      '<div class="seg" role="group" aria-label="内訳"><button type="button" data-act="view" data-v="store" class="' + (r.view === "store" ? "on" : "") + '">店舗別</button>' +
      '<button type="button" data-act="view" data-v="staff" class="' + (r.view === "staff" ? "on" : "") + '">担当者別</button></div><span class="sp"></span>' +
      '<button class="btn sm" data-act="csv-table">表を出力（CSV）</button></div>' + table + "</div>";

    var showName = state.role === "accounting";
    var det = DEALS.filter(function (d) {
      return inScope(d, store) && dateOf(d, basis).slice(0, 7) === m && (basis === "seiyaku" || d.event <= YEST_S);
    }).sort(function (x, z) { return dateOf(x, basis) < dateOf(z, basis) ? 1 : -1; }).slice(0, 12).map(function (d) {
      return "<tr><td>" + esc(slashDate(d.contract)) + "</td><td>" + esc(slashDate(d.event)) + "</td><td>" + esc(storeName(d.store)) + "</td><td>" + esc(d.staff) +
        "</td><td>" + esc(d.product) + '</td><td class="num">' + yen(d.amount) + "</td><td>" + esc(showName ? d.customer + " 様" : mask(d.customer)) + "</td></tr>";
    }).join("") || '<tr><td colspan="7">この月の明細はありません。</td></tr>';
    var detail = '<div class="card"><div class="card-h"><h3>明細</h3><span class="sub">' + jpMonth(m) + "・新しい順・12件まで</span></div>" +
      '<div class="tbl-wrap"><table><thead><tr><th>成約日</th><th>施行日</th><th>店舗</th><th>担当</th><th>商品</th><th class="num">金額（税別）</th><th>お客様</th></tr></thead><tbody>' + det +
      '</tbody></table></div><p class="hint">' + (showName ? "経理の方には、お客様のお名前がそのまま表示されます。" : "お客様のお名前は、部署に応じて伏せて表示します（経理の方には表示されます）。") + "</p></div>";

    return head + kpis + chartCard + breakdown + detail + aiCard(store);
  }

  function storeRows(basis, m, store, full) {
    var f = frac(m) || 1;
    var list = D.stores.filter(function (s) { return store === "all" || s.id === store; });
    var rows = list.map(function (s) {
      var cur = sum(basis, m, s.id), last = sum(basis, shiftMonth(m, -12), s.id), c = costs(s.id);
      return { name: s.name, cur: cur, last: last, pl: plan(basis, m, s.id), fixed: c.fixed * f, labor: c.labor * f };
    });
    if (rows.length > 1) {
      var t = { name: "合計", cur: { sales: 0, count: 0, gross: 0 }, last: { sales: 0 }, pl: 0, fixed: 0, labor: 0, total: true };
      rows.forEach(function (x) { t.cur.sales += x.cur.sales; t.cur.count += x.cur.count; t.cur.gross += x.cur.gross; t.last.sales += x.last.sales; t.pl += x.pl; t.fixed += x.fixed; t.labor += x.labor; });
      rows.push(t);
    }
    return rows.map(function (x) {
      var o = { "店舗": x.name, "売上（税別）": x.cur.sales, "件数": x.cur.count, "前年比": ratio(x.cur.sales, x.last.sales), "計画比": ratio(x.cur.sales, x.pl), "固定費（家賃・光熱費）": x.fixed };
      if (full) { var exp = (x.cur.sales - x.cur.gross) + x.fixed + x.labor; o["経費（合計）"] = exp; o["利益"] = x.cur.sales - exp; }
      o._total = !!x.total;
      return o;
    });
  }
  function staffRows(basis, m, store) {
    return D.staff.filter(function (p) { return store === "all" || p.store === store; }).map(function (p) {
      var cur = sum(basis, m, p.store, p.name), last = sum(basis, shiftMonth(m, -12), p.store, p.name);
      return { "担当": p.name, "店舗": storeName(p.store), "売上（税別）": cur.sales, "件数": cur.count, "平均単価": cur.count ? Math.round(cur.sales / cur.count) : 0, "前年比": ratio(cur.sales, last.sales) };
    }).sort(function (a, b) { return b["売上（税別）"] - a["売上（税別）"]; });
  }
  function htmlTable(rows) {
    if (!rows.length) return "";
    var cols = Object.keys(rows[0]).filter(function (k) { return k.charAt(0) !== "_"; });
    var head = cols.map(function (k) { return '<th class="' + (typeof rows[0][k] === "number" || rows[0][k] === null ? "num" : "") + '">' + esc(k) + "</th>"; }).join("");
    var body = rows.map(function (r) {
      return '<tr class="' + (r._total ? "tot" : "") + '">' + cols.map(function (k) {
        var v = r[k];
        if (k === "前年比" || k === "計画比") return '<td class="num ' + upDn(v) + '">' + pct(v) + "</td>";
        if (k === "件数") return '<td class="num">' + v + "件</td>";
        if (typeof v === "number") return '<td class="num' + (v < 0 ? " dn" : "") + '">' + yen(v) + "</td>";
        return "<td>" + esc(v) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="tbl-wrap"><table><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  // ---------- CSV ----------
  function csvCell(v) {
    if (v == null) return "";
    var s = typeof v === "number" ? String(Math.round(v)) : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function download(name, rows) {
    var cols = Object.keys(rows[0]).filter(function (k) { return k.charAt(0) !== "_"; });
    var lines = [cols.map(csvCell).join(",")].concat(rows.map(function (r) {
      return cols.map(function (k) {
        var v = r[k];
        if ((k === "前年比" || k === "計画比") && v != null) return (v * 100).toFixed(1) + "%";
        return csvCell(v);
      }).join(",");
    }));
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("CSV を書き出しました（" + name + "）。Excel で開けます。");
  }
  function basisName() { return state.res.basis === "sekou" ? "施行月" : "成約月"; }
  function csvTable() {
    var r = state.res, store = scopeStore(), full = A().results === "full";
    var rows = r.view === "store" ? storeRows(r.basis, r.month, store, full) : staffRows(r.basis, r.month, store);
    download("実績_" + (r.view === "store" ? "店舗別" : "担当者別") + "_" + basisName() + "_" + r.month + ".csv", rows);
  }
  function csvHQ() {
    var r = state.res, store = scopeStore(), full = A().results === "full";
    var rows = [];
    FY_MONTHS.forEach(function (mk) {
      if (mk > CUR) return;
      storeRows(r.basis, mk, store, full).forEach(function (x) {
        var o = { "年月": mk }; Object.keys(x).forEach(function (k) { o[k] = x[k]; }); rows.push(o);
      });
    });
    download("本社提出用_" + basisName() + "_" + FY_Y + "年度_" + (store === "all" ? "全店舗" : storeName(store)) + ".csv", rows);
  }

  // ======================================================================
  // 第3段階（オプション）：受注管理・衣装在庫（提案書の第3段階の画面を、操作できる形にしたもの）
  // ======================================================================
  var P = window.P3_DATA;
  var ST_FIRST = P.stages[0], ST_DONE = P.stages[P.stages.length - 1], ST_CONTRACT = "ご成約", ST_SIZE = "サイズ補正";
  function dayStr(n) { return ymd(addDays(TODAY, n)); }
  function toDate(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayDiff(a, b) { return Math.round((toDate(a) - toDate(b)) / 86400000); }
  function noReq() { return { colors: [], colorNote: "", design: "", m: { bust: "", waist: "", hip: "", height: "", shoe: "" }, parts: [], detail: "", acc: "", other: "" }; }

  function seedOrders() {
    return P.orders.map(function (o) {
      var x = JSON.parse(JSON.stringify(o));
      x.date = dayStr(o.day);
      x.contractDate = o.contract == null ? null : dayStr(o.contract);
      var created = o.contract == null ? -7 : o.contract - 21;
      x.history = [[dayStr(created), "ご来店予約を受付（" + o.source + "）"]];
      if (o.contract != null) x.history.push([dayStr(o.contract), "ご成約（内金を請求）"]);
      if (o.stage !== ST_FIRST) x.history.push([dayStr(o.day < 0 ? o.day + 1 : -2), "ステージを「" + o.stage + "」に変更"]);
      delete x.day; delete x.contract;
      return x;
    });
  }
  function seedCostumes() {
    return P.costumes.map(function (c) {
      var x = JSON.parse(JSON.stringify(c));
      x.backDate = c.back == null ? null : dayStr(c.back);
      delete x.back;
      return x;
    });
  }
  state.orders = Array.isArray(saved.orders) ? saved.orders : seedOrders();
  state.costumes = Array.isArray(saved.costumes) ? saved.costumes : seedCostumes();
  state.p3 = { view: "list", store: "all", biz: "all", stage: "all", inv: { store: "all", cat: "all", status: "all", q: "", view: "gallery" }, drawer: null };

  function bizOf(id) { for (var i = 0; i < P.businesses.length; i++) if (P.businesses[i].id === id) return P.businesses[i]; return P.businesses[0]; }
  function catOf(code) { var c = cosOf(code), id = c ? c.cat : String(code).split("-")[0]; for (var i = 0; i < P.categories.length; i++) if (P.categories[i].id === id) return P.categories[i]; return P.categories[0]; }
  function cosOf(code) { for (var i = 0; i < state.costumes.length; i++) if (state.costumes[i].code === code) return state.costumes[i]; return null; }
  function orderOf(no) { for (var i = 0; i < state.orders.length; i++) if (state.orders[i].no === no) return state.orders[i]; return null; }
  function stageIdx(s) { return P.stages.indexOf(s); }
  function stagePill(s) { return '<span class="pill ' + (P.stageTone[s] || "mute") + '">' + esc(s) + "</span>"; }
  function bizTag(id) { var b = bizOf(id); return '<span class="tag ' + b.tone + '">' + esc(b.name) + "</span>"; }
  function staffOf(store) { return D.staff.filter(function (s) { return s.store === store; }).map(function (s) { return s.name; }); }

  // 衣装の絵（線と色だけの簡単なシルエット）
  function mix(hex, to, t) {
    var n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255];
    return "rgb(" + c.map(function (v) { return Math.round(v + (to - v) * t); }).join(",") + ")";
  }
  function light(hex) { var n = parseInt(hex.slice(1), 16); return ((n >> 16) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114) / 255 > 0.78; }
  function silhouette(shape, hex) {
    var fill = hex, line = light(hex) ? "#B9AD94" : mix(hex, 0, 0.3);
    var a = ' fill="' + fill + '" stroke="' + line + '" stroke-width="1.6" stroke-linejoin="round"';
    var body;
    if (shape === "tux") {
      body = '<path' + a + ' d="M28 26 L42 18 L50 30 L58 18 L72 26 L74 100 L26 100 Z"/>' +
        '<path fill="none" stroke="' + line + '" stroke-width="1.6" d="M42 18 L50 52 L58 18"/><circle cx="50" cy="64" r="1.8" fill="' + line + '"/><circle cx="50" cy="74" r="1.8" fill="' + line + '"/>';
    } else if (shape === "kimono") {
      body = '<path' + a + ' d="M20 26 L42 18 L50 26 L58 18 L80 26 L82 58 L66 58 L65 104 L35 104 L34 58 L18 58 Z"/>' +
        '<path fill="none" stroke="' + line + '" stroke-width="1.6" d="M42 18 L50 44 L58 18"/><rect x="35" y="60" width="30" height="9" fill="' + mix(hex, 0, 0.18) + '" stroke="' + line + '" stroke-width="1.2"/>';
    } else if (shape === "acc") {
      body = '<path' + a + ' d="M24 74 Q50 34 76 74 L70 80 Q50 50 30 80 Z"/><circle cx="50" cy="44" r="4"' + a + '/><circle cx="36" cy="56" r="3"' + a + '/><circle cx="64" cy="56" r="3"' + a + "/>";
    } else {
      body = '<path' + a + ' d="M43 14 L57 14 L56 30 L44 30 Z"/><path' + a + ' d="M44 30 L56 30 L74 104 L26 104 Z"/>';
    }
    return '<svg viewBox="0 0 100 120" aria-hidden="true">' + body + "</svg>";
  }
  function cosImg(c, big) {
    if (c.img) return '<div class="cimg photo" style="background:' + mix(c.hex, 255, 0.82) + '"><img src="' + esc(c.img[big ? 1 : 0]) + '" alt="' + esc(c.name) + '" loading="lazy" decoding="async"></div>';
    return '<div class="cimg" style="background:linear-gradient(165deg,' + mix(c.hex, 255, 0.88) + "," + mix(c.hex, 255, 0.7) + ')">' + silhouette(catOf(c.code).shape, c.hex) + "</div>";
  }
  function dot(c) { return '<span class="dot" style="background:' + c.hex + '" title="' + esc(c.color) + '"></span>'; }

  // 空き状況：同じ衣装の予約（お日取りの前後3日）と、戻る日を見る
  function reservations(code, exceptNo) {
    return state.orders.filter(function (o) { return o.no !== exceptNo && o.stage !== ST_DONE && o.costumes.indexOf(code) >= 0; });
  }
  function availability(c, date, exceptNo) {
    var clash = reservations(c.code, exceptNo).filter(function (o) { return Math.abs(dayDiff(o.date, date)) <= 3; })[0];
    if (clash) return { ok: false, text: "この日は予約済み（" + clash.no + "）", cls: "av-bad" };
    if (c.status !== "avail" && c.backDate) {
      var label = c.status === "rented" ? "貸出中" : c.status === "cleaning" ? "クリーニング中" : "お直し中";
      if (dayDiff(date, c.backDate) >= 2) return { ok: true, text: label + "・お日取り前に戻り", cls: "av-warn" };
      return { ok: false, text: label + "・お日取りに間に合いません", cls: "av-bad" };
    }
    return { ok: true, text: "この日は貸出可", cls: "av-good" };
  }
  function cosStatus(c) {
    if (c.status === "cleaning") return { label: "クリーニング中", tone: "info" };
    if (c.status === "repair") return { label: "お直し中", tone: "info" };
    if (c.status === "rented") return { label: "貸出中", tone: "rose" };
    if (reservations(c.code).some(function (o) { return o.date >= TODAY_S; })) return { label: "予約済", tone: "gold" };
    return { label: "貸出可", tone: "good" };
  }

  function p3Note() { return scopeNote("opt", "提案書の「第3段階（オプション）の画面」を、操作できる形にしました。"); }
  function sel(act, key, value, opts) {
    return '<select data-act="' + act + '" data-k="' + key + '">' + opts.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("") + "</select>";
  }
  var STORE_OPTS = [["all", "全店舗"]].concat(D.stores.map(function (s) { return [s.id, s.name]; }));

  // ---------- 受注管理 ----------
  function viewOrders() {
    var f = state.p3, edit = canEdit("orders"), fs = U().store ? "all" : f.store;
    var base = state.orders.filter(function (o) { return mine(o.store); });
    var list = base.filter(function (o) {
      return (fs === "all" || o.store === fs) && (f.biz === "all" || o.biz === f.biz) && (f.stage === "all" || o.stage === f.stage);
    });
    var active = base.filter(function (o) { return o.stage !== ST_DONE; }).length;
    var soon = base.filter(function (o) { return o.stage !== ST_DONE && !o.dateTbd && o.date >= TODAY_S && o.date <= dayStr(30); }).length;
    var waiting = base.filter(function (o) { return o.stage === ST_CONTRACT && !o.paid; }).length;
    var done = base.filter(function (o) { return o.stage === ST_DONE && o.date >= dayStr(-30); }).length;
    var kpis = '<div class="kpis k4">' + kpi("進行中の受注", active + "件", "ご返却・完了を除く") + kpi("30日以内のお日取り", soon + "件", "準備の確認を") +
      kpi("内金待ち", waiting + "件", "ご成約・入金なし") + kpi("直近30日の完了", done + "件", "ご返却・残金の入金まで") + "</div>";
    var filters = '<div class="filters">' + (U().store ? storeChip() : sel("p3-filter", "store", f.store, STORE_OPTS)) +
      sel("p3-filter", "biz", f.biz, [["all", "全事業"]].concat(P.businesses.map(function (b) { return [b.id, b.name]; }))) +
      sel("p3-filter", "stage", f.stage, [["all", "全ステージ"]].concat(P.stages.map(function (s) { return [s, s]; }))) +
      '<div class="seg" role="group" aria-label="表示"><button type="button" data-act="p3-view" data-v="list" class="' + (f.view === "list" ? "on" : "") + '">' + icon("list") + "一覧</button>" +
      '<button type="button" data-act="p3-view" data-v="board" class="' + (f.view === "board" ? "on" : "") + '">' + icon("board") + "ボード</button></div>" +
      '<span class="sp"></span>' + (edit ? '<button class="btn pri" data-act="order-new">' + icon("plus") + "新規受注</button>" : '<span class="note-sm">閲覧のみ（' + esc(roleLabel(state.role)) + "）</span>") + "</div>";
    var body;
    if (f.view === "board") {
      body = '<div class="board">' + P.stages.map(function (s) {
        var cards = list.filter(function (o) { return o.stage === s; }).map(function (o) {
          return '<button type="button" class="ocard" data-act="order-open" data-no="' + o.no + '"><span class="ono">' + o.no + "</span><b>" + esc(o.customer) + "</b><small>" +
            esc(oDate(o)) + " · " + esc(storeName(o.store)) + "</small>" + (o.venue ? '<small class="venue">' + icon("pin") + esc(o.venue) + "</small>" : "") + bizTag(o.biz) + "<small>" + amt(o.amount) + "</small></button>";
        }).join("");
        return '<div class="bcol"><div class="bcol-h">' + stagePill(s) + "<span>" + list.filter(function (o) { return o.stage === s; }).length + "件</span></div>" + cards + "</div>";
      }).join("") + "</div>";
    } else {
      var rows = list.map(function (o) {
        var cs = o.costumes.map(cosOf).filter(Boolean);
        return '<tr class="click" data-act="order-open" data-no="' + o.no + '"><td><span class="ono">' + o.no + "</span></td><td><b>" + esc(o.customer) + "</b>" +
          (o.venue ? '<div class="sub2">' + esc(o.venue + (o.style ? " · " + o.style : "")) + "</div>" : "") + "</td><td>" + bizTag(o.biz) +
          "</td><td>" + esc(storeName(o.store)) + "</td><td>" + (cs.length ? costumeStrip(cs) : "—") +
          "</td><td>" + esc(oDate(o)) + "</td><td>" + stagePill(o.stage) + '</td><td class="num">' + amt(o.amount) + "</td><td>" + esc(o.staff) + "</td><td>" +
          '<button class="ibtn" data-act="order-open" data-no="' + o.no + '" title="表示" aria-label="表示">' + icon("eye") + "</button> " +
          (edit ? '<button class="ibtn" data-act="order-edit" data-no="' + o.no + '" title="編集" aria-label="編集">' + icon("edit") + "</button>" : "") + "</td></tr>";
      }).join("") || '<tr><td colspan="10">条件に合う受注はありません。</td></tr>';
      body = '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>受注番号</th><th>お客様</th><th>事業</th><th>店舗</th><th>衣装</th><th>お日取り</th><th>ステージ</th><th class="num">金額</th><th>担当</th><th>操作</th></tr></thead><tbody>' +
        rows + "</tbody></table></div></div>";
    }
    return p3Note() + kpis + filters + body;
  }
  function amt(n) { return n ? yen(n) : "未定"; }
  function oDate(o) { return o.dateTbd ? "未定" : o.dateLabel || slashDate(o.date); }
  // ご予約フォームの「挙式日・会場（学校）・ご使用日など」から、お日取りと会場を読み取る
  function parseWhen(t) {
    t = String(t || "");
    var m = t.match(/(20\d\d)年\s*(\d{1,2})月(?:\s*(\d{1,2})日)?/);
    if (m) return { date: ymd(new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 15)), label: +m[1] + "年" + +m[2] + "月" + (m[3] ? +m[3] + "日" : "頃") };
    var k = t.match(/(20\d\d)年\s*(春|夏|秋|冬)/);
    if (k) return { date: ymd(new Date(+k[1], { 春: 3, 夏: 6, 秋: 9, 冬: 11 }[k[2]], 15)), label: k[1] + "年" + k[2] + "頃" };
    return null;
  }
  function parseVenue(t) {
    t = String(t || "");
    for (var i = 0; i < P.venues.length; i++) if (t.indexOf(P.venues[i].name) >= 0 || t.indexOf(P.venues[i].short) >= 0) return P.venues[i];
    var m = t.match(/二十歳の集い（[^）]*）|二十歳の集い|成人式|卒業式|七五三参り|七五三/);
    return m ? { name: m[0], kind: "" } : null;
  }
  function costumeStrip(cs) {
    return cs.length ? '<span class="cstrip">' + cs.slice(0, 3).map(function (c) { return c.img ? '<img src="' + esc(c.img[0]) + '" alt="" loading="lazy">' : dot(c); }).join("") + "</span>" : "";
  }

  function orderDrawer(o) {
    var idx = stageIdx(o.stage), next = P.stages[idx + 1], edit = canEdit("orders");
    var cs = o.costumes.map(cosOf).filter(Boolean);
    var steps = P.stages.map(function (s, i) {
      return '<div class="stp' + (i < idx ? " done" : i === idx ? " cur" : "") + '"><span class="c">' + (i < idx ? "✓" : i + 1) + '</span><span class="l">' + esc(s) + "</span></div>";
    }).join("");
    var nextCard;
    if (next) {
      var items = P.checklists[o.stage] || [];
      var checks = o.checks || [];
      var all = items.every(function (t, i) { return !!checks[i]; });
      nextCard = '<div class="card"><div class="card-h"><h3>次のステップ：' + esc(next) + '</h3><span class="sub">' + (edit ? "チェックリストを完了すると次へ進めます" : "閲覧のみ（" + esc(roleLabel(state.role)) + "）") + '</span></div><div class="card-b"><div class="checklist">' +
        items.map(function (t, i) { return '<label class="ck"><input type="checkbox" data-act="order-check" data-no="' + o.no + '" data-i="' + i + '"' + (checks[i] ? " checked" : "") + (edit ? "" : " disabled") + ">" + esc(t) + "</label>"; }).join("") +
        "</div>" + (edit ? '<div class="ck-acts"><button class="btn' + (all ? " pri" : "") + '" data-act="order-next" data-no="' + o.no + '"' + (all ? "" : " disabled") + ">次へ：" + esc(next) + "</button>" +
        '<span class="sp"></span><button class="linkbtn" data-act="order-cancel">受注をキャンセル</button></div>' : "") + "</div></div>";
    } else {
      nextCard = '<div class="notice">この受注は完了しています（ご返却・残金の入金まで確認済み）。</div>';
    }
    var tiles = '<div class="itiles">' + itile("お日取り", o.dateTbd ? (/ブライダルフェア/.test(o.source) ? "未定（式場のご成約で決まります）" : "未定（ご来店の際に伺います）") : oDate(o)) + itile("会場・用途", o.venue || "—") + itile("式の形態", o.style || "—") +
      itile("成約日", o.contractDate ? slashDate(o.contractDate) : "まだご成約前です") + itile("受注金額", amt(o.amount)) + itile("入金済み", yen(o.paid || 0)) +
      itile("残金", o.amount ? yen(o.amount - (o.paid || 0)) : "—") + itile("経路", o.source || "—") + itile("担当", o.staff) + "</div>" +
      (o.plan ? '<div class="plan-line">' + icon("spark") + "<span><b>プラン・キャンペーン</b>" + esc(o.plan) + "</span></div>" : "");
    var total = cs.reduce(function (s, c) { return s + c.price; }, 0);
    var cosCard = '<div class="card"><div class="card-h"><h3>在庫から選んだ衣装</h3><span class="sub">' + cs.length + " 点 · " + yen(total) + "</span></div><div class=\"card-b\">" +
      (cs.length ? '<div class="cgrid">' + cs.map(function (c) {
        return '<button type="button" class="cpick" data-act="cos-open" data-code="' + esc(c.code) + '">' + cosImg(c) + '<div class="cmeta"><span class="code">' + esc(c.code) + " · " + esc(catOf(c.code).name) + " · " + esc(c.size) + '</span><span class="nm">' + esc(c.name) +
          '</span><span class="pr">' + esc(c.color) + " · " + yen(c.price) + "</span></div></button>";
      }).join("") + "</div>" : '<p class="note-sm">まだ衣装を選んでいません。「編集」から、在庫の衣装を空き状況を見ながら選べます。</p>') + "</div></div>";
    var r = o.req || noReq(), m = r.m || {};
    var reqRows = [
      ["色の希望", (r.colors || []).join("・") + (r.colorNote ? "（" + r.colorNote + "）" : "")],
      ["デザインの希望", r.design],
      ["採寸（cm）", [["バスト", m.bust], ["ウエスト", m.waist], ["ヒップ", m.hip], ["身長", m.height], ["靴", m.shoe]].filter(function (x) { return x[1]; }).map(function (x) { return x[0] + " " + x[1]; }).join(" · ")],
      ["お直し", (r.parts || []).join("・") + (r.detail ? "：" + r.detail : "")],
      ["小物のご希望", r.acc], ["その他のご要望", r.other]
    ].filter(function (x) { return x[1]; });
    var reqCard = '<div class="card"><div class="card-h"><h3>お客様のご要望</h3><span class="sub">色・デザイン・採寸・お直し</span></div>' +
      (reqRows.length ? '<div class="tbl-wrap"><table class="sumtbl"><tbody>' + reqRows.map(function (x) { return "<tr><td>" + esc(x[0]) + "</td><td>" + esc(x[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>"
        : '<div class="card-b note-sm">まだ記録がありません。「編集」の「ご要望・お直し」から記録できます。</div>') + "</div>";
    var ex = state.ext.expenses.filter(function (x) { return x.order === o.no; });
    var exCard = '<div class="card"><div class="card-h"><h3>関連する経費</h3><span class="sub">税込</span><span class="sp"></span>' +
      (canEdit("expenses") ? '<button class="btn sm" data-act="exp-new" data-order="' + o.no + '">' + icon("plus") + "経費を追加</button>" : "") + "</div>" +
      (ex.length ? '<div class="tbl-wrap"><table><tbody>' + ex.map(function (x) {
        return "<tr><td>" + esc(slashDate(x.date)) + '</td><td class="wrap">' + esc(x.cat + " · " + x.desc) + "</td><td>" + stPill(x.st) + '</td><td class="num">' + yen(x.amount) + "</td></tr>";
      }).join("") + '<tr class="tot"><td colspan="3">合計</td><td class="num">' + yen(ex.reduce(function (s, x) { return s + x.amount; }, 0)) + "</td></tr></tbody></table></div>"
        : '<div class="card-b note-sm">関連する経費はまだありません。</div>') + "</div>";
    var invs = state.ext.invoices.filter(function (v) { return v.order === o.no; });
    var invCard = !allowed("invoices") ? "" : '<div class="card"><div class="card-h"><h3>請求と入金</h3><span class="sub">税込</span><span class="sp"></span>' +
      (invs.length ? '<button class="linkbtn" data-act="inv-goto" data-no="' + invs[0].no + '">請求・入金の画面へ →</button>' : "") + "</div>" +
      (invs.length ? '<div class="tbl-wrap"><table><tbody>' + invs.map(function (v) {
        var st = invStatus(v);
        return '<tr><td><span class="ono">' + v.no + "</span></td><td>" + esc(v.type) + "</td><td>期限 " + esc(slashDate(v.due)) + '</td><td class="num">' + yen(invAmount(v)) + "</td><td>" + pill(st[0], st[1]) + "</td><td>" +
          (!v.paid && canEdit("invoices") ? '<button class="btn sm" data-act="inv-pay" data-no="' + v.no + '">入金を登録</button>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<div class="card-b note-sm">まだ請求書はありません。</div>') + "</div>";
    var aps = allowed("calendar") ? apptList().filter(function (a) { return a.o && a.o.no === o.no; }) : [];
    var apCard = !aps.length ? "" : '<div class="card"><div class="card-h"><h3>来店予約</h3><span class="sub">今後7日間</span></div><div class="card-b rlist">' + aps.map(function (a) {
      var t = X.apptTypes[a.type];
      return '<div class="r" data-act="cal-goto"><span class="ap-when">' + esc(mdw(a.date)) + " " + a.t + '</span><span class="tag t-' + t.tone + '">' + esc(t.name) + '</span><span class="sp" style="flex:1"></span><span class="note-sm">' + esc(a.staff) + "</span></div>";
    }).join("") + "</div></div>";
    var hist = '<div class="card"><div class="card-h"><h3>履歴</h3></div><div class="card-b"><ul class="tl">' + o.history.slice().reverse().map(function (h) {
      return '<li><span class="d">' + esc(slashDate(h[0])) + "</span><br>" + esc(h[1]) + "</li>";
    }).join("") + "</ul></div></div>";
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">' + esc(o.no + " · " + storeName(o.store) + " · 担当: " + o.staff) + "</div><h2>" + esc(o.customer) + '</h2><div class="dh-tags">' +
      bizTag(o.biz) + stagePill(o.stage) + '<span class="tag plain">' + esc(o.source) + "</span></div></div>" +
      '<div class="dh-acts">' + (edit ? '<button class="btn" data-act="order-edit" data-no="' + o.no + '">' + icon("edit") + "編集</button>" : "") + '<button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    return head + '<div class="drawer-b"><div class="card"><div class="stepper">' + steps + '</div><p class="stage-help">' + icon("spark") + esc((P.stageHelp || {})[o.stage] || "") + "</p></div>" + nextCard + tiles + apCard + cosCard + reqCard + invCard + exCard + hist + "</div>";
  }
  function itile(k, v) { return '<div class="itile"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + "</div></div>"; }

  // ---------- 受注の登録・編集（4つの手順） ----------
  var WIZ = ["お客様・お日取り", "衣装を選択", "ご要望・お直し", "確認"];
  function draftFrom(o) {
    if (o) return JSON.parse(JSON.stringify({ no: o.no, customer: o.customer, biz: o.biz, store: o.store, date: o.date, venue: o.venue, style: o.style || "", plan: o.plan || "", staff: o.staff, source: o.source, amount: String(o.amount || ""), costumes: o.costumes, req: o.req || noReq() }));
    var store = U().store || "matsue";
    return { no: null, customer: "", biz: "bridal", store: store, date: dayStr(120), venue: "", style: "", plan: "", staff: staffOf(store)[0], source: "ご来店", amount: "", costumes: [], req: noReq() };
  }
  function draftTotal(dr) { return dr.costumes.map(cosOf).filter(Boolean).reduce(function (s, c) { return s + c.price; }, 0); }
  function editDrawer(d) {
    var dr = d.draft, step = d.step;
    var tabs = '<div class="wsteps">' + WIZ.map(function (t, i) {
      return '<button type="button" class="wst' + (step === i + 1 ? " on" : "") + '" data-act="wiz-step" data-s="' + (i + 1) + '">' + (i + 1) + ". " + t + "</button>";
    }).join("") + "</div>";
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">' + esc(dr.no || "新しい受注") + "</div><h2>" + (dr.no ? "受注を編集" : "新規受注") + "</h2>" + tabs + "</div>" +
      '<div class="dh-acts"><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    var body = "";
    if (step === 1) {
      var opt = function (list, v) { return list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === v ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join(""); };
      body = '<div class="card"><div class="card-b"><div class="form-grid">' +
        '<div class="field"><label for="w-cus">お客様のお名前<span class="req">必須</span></label><input type="text" id="w-cus" data-draft="customer" value="' + esc(dr.customer) + '" placeholder="例：佐藤様・田中様"></div>' +
        '<div class="field"><label for="w-biz">事業</label><select id="w-biz" data-draft="biz">' + opt(P.businesses.map(function (b) { return [b.id, b.name]; }), dr.biz) + "</select></div>" +
        '<div class="field"><label for="w-store">店舗</label><select id="w-store" data-draft="store">' + opt(D.stores.map(function (s) { return [s.id, s.name]; }), dr.store) + "</select></div>" +
        '<div class="field"><label for="w-date">お日取り<span class="req">必須</span></label><input type="date" id="w-date" data-draft="date" value="' + esc(dr.date) + '"><p class="help">衣装の空き状況は、この日で確かめます。</p></div>' +
        '<div class="field"><label for="w-venue">会場・用途</label><input type="text" id="w-venue" data-draft="venue" value="' + esc(dr.venue) + '" list="venue-list" placeholder="例：ヴィラ・ノッツェ コルティーレ出雲、出雲大社">' +
        '<datalist id="venue-list">' + P.venues.map(function (v) { return '<option value="' + esc(v.name) + '">'; }).join("") + "</datalist></div>" +
        '<div class="field"><label for="w-style">式の形態</label><select id="w-style" data-draft="style">' + opt([["", "（選ぶ）"]].concat(P.styles.map(function (x) { return [x, x]; })), dr.style) + "</select></div>" +
        '<div class="field"><label for="w-plan">プラン・キャンペーン</label><select id="w-plan" data-draft="plan">' + opt([["", "なし"]].concat(P.plans.map(function (x) { return [x, x]; })), dr.plan) + "</select></div>" +
        '<div class="field"><label for="w-staff">担当</label><select id="w-staff" data-draft="staff">' + opt(staffOf(dr.store).map(function (n) { return [n, n]; }), dr.staff) + "</select></div>" +
        '<div class="field"><label for="w-src">経路</label><select id="w-src" data-draft="source">' + opt(P.sources.map(function (s) { return [s, s]; }), dr.source) + "</select></div>" +
        '<div class="field"><label for="w-amt">受注金額（税別・見込み）</label><input type="number" id="w-amt" data-draft="amount" value="' + esc(dr.amount) + '" min="0" step="1000" placeholder="空欄なら、選んだ衣装の合計"></div>' +
        "</div></div></div>";
    } else if (step === 2) {
      var cats = P.categories.filter(function (c) { return c.biz.indexOf(dr.biz) >= 0; });
      var cat = d.cat || "all";
      var chips = '<div class="chips"><button type="button" class="chip' + (cat === "all" ? " on" : "") + '" data-act="wiz-cat" data-c="all">すべて：' + esc(bizOf(dr.biz).name) + "</button>" +
        cats.map(function (c) { return '<button type="button" class="chip' + (cat === c.id ? " on" : "") + '" data-act="wiz-cat" data-c="' + c.id + '">' + esc(c.name) + "</button>"; }).join("") + "</div>";
      var items = state.costumes.filter(function (c) { var k = catOf(c.code); return k.biz.indexOf(dr.biz) >= 0 && (cat === "all" || k.id === cat); });
      var cards = items.map(function (c) {
        var av = availability(c, dr.date, dr.no), on = dr.costumes.indexOf(c.code) >= 0;
        return '<button type="button" class="cpick' + (on ? " sel" : "") + (!av.ok && !on ? " na" : "") + '" data-act="wiz-pick" data-code="' + esc(c.code) + '">' + (on ? '<span class="chk">✓</span>' : "") + cosImg(c) +
          '<div class="cmeta"><span class="code">' + esc(c.code + " · " + c.size + " · " + storeName(c.store)) + '</span><span class="nm">' + esc(c.name) + '</span><span class="pr">' + esc(c.color) + " · " + yen(c.price) +
          '</span><span class="' + av.cls + '">' + esc(av.text) + "</span></div></button>";
      }).join("");
      body = '<div class="card"><div class="card-b" style="display:grid;gap:12px">' + chips +
        '<div class="filters"><span class="note-sm">選んだ衣装：' + dr.costumes.length + " 点 · " + yen(draftTotal(dr)) + '</span><span class="sp"></span><span class="note-sm">空き状況の確認日：' + esc(slashDate(dr.date)) + "</span></div>" +
        '<div class="cgrid">' + cards + "</div></div></div>";
    } else if (step === 3) {
      var r = dr.req;
      var colorChips = P.colorChoices.map(function (c) { return '<button type="button" class="chip' + (r.colors.indexOf(c) >= 0 ? " on" : "") + '" data-act="wiz-color" data-v="' + c + '">' + c + "</button>"; }).join("");
      var partChips = P.alterParts.map(function (c) { return '<button type="button" class="chip' + (r.parts.indexOf(c) >= 0 ? " on" : "") + '" data-act="wiz-part" data-v="' + c + '">' + c + "</button>"; }).join("");
      var mf = [["bust", "バスト"], ["waist", "ウエスト"], ["hip", "ヒップ"], ["height", "身長"], ["shoe", "靴"]].map(function (x) {
        return "<label>" + x[1] + '<input type="number" data-draft="req.m.' + x[0] + '" value="' + esc(r.m[x[0]]) + '" inputmode="decimal"></label>';
      }).join("");
      body = '<div class="card"><div class="card-b" style="display:grid;gap:14px">' +
        '<div class="field"><span class="label">色の希望</span><div class="chips">' + colorChips + '</div><input type="text" data-draft="req.colorNote" value="' + esc(r.colorNote) + '" placeholder="例：純白よりアイボリー、カラードレスはダスティピンク"></div>' +
        '<div class="field"><label for="w-design">デザインの希望</label><input type="text" id="w-design" data-draft="req.design" value="' + esc(r.design) + '" placeholder="例：Aライン、レース袖、ロングトレーン"></div>' +
        '<div class="field"><span class="label">採寸（cm）</span><div class="mgrid">' + mf + "</div></div>" +
        '<div class="field"><span class="label">お直しの箇所</span><div class="chips">' + partChips + "</div></div>" +
        '<div class="field"><label for="w-detail">お直しの詳細</label><textarea id="w-detail" data-draft="req.detail" placeholder="例：5cmヒール用に裾−3cm、ウエスト1.5cm詰め">' + esc(r.detail) + "</textarea></div>" +
        '<div class="form-grid"><div class="field"><label for="w-acc">小物のご希望</label><input type="text" id="w-acc" data-draft="req.acc" value="' + esc(r.acc) + '"></div>' +
        '<div class="field"><label for="w-other">その他のご要望</label><input type="text" id="w-other" data-draft="req.other" value="' + esc(r.other) + '"></div></div>' +
        '<p class="p3-note" style="margin:0">お直しの詳細は、お直し依頼書と関連する経費にそのまま引き継がれ、縫製担当と経理が同じ内容を確認できます。</p></div></div>';
    } else {
      var cs = dr.costumes.map(cosOf).filter(Boolean);
      var amt = Number(dr.amount) || draftTotal(dr);
      var rows = [["お客様", dr.customer || "（未入力）"], ["事業", bizOf(dr.biz).name], ["店舗", storeName(dr.store)], ["お日取り", dr.date ? slashDate(dr.date) : "（未入力）"],
        ["会場・用途", dr.venue || "—"], ["式の形態", dr.style || "—"], ["プラン・キャンペーン", dr.plan || "なし"], ["担当", dr.staff], ["経路", dr.source], ["受注金額（税別）", yen(amt)],
        ["衣装", cs.length ? cs.map(function (c) { return c.code + " " + c.name; }).join("、") : "選んでいません"],
        ["ご要望", [dr.req.colors.join("・"), dr.req.design, dr.req.parts.length ? "お直し：" + dr.req.parts.join("・") : ""].filter(Boolean).join(" / ") || "—"]];
      body = '<div class="card"><div class="tbl-wrap"><table class="sumtbl"><tbody>' + rows.map(function (x) { return "<tr><td>" + esc(x[0]) + "</td><td>" + esc(x[1]) + "</td></tr>"; }).join("") +
        '</tbody></table></div><p class="hint">保存すると、選んだ衣装をお日取りに仮押さえします。ほかの受注では、その前後の日に選べなくなります。</p></div>';
    }
    var foot = '<div class="wfoot">' + (step > 1 ? '<button class="btn" data-act="wiz-step" data-s="' + (step - 1) + '">戻る</button>' : '<button class="btn" data-act="drawer-close">閉じる</button>') +
      (step < 4 ? '<button class="btn pri" data-act="wiz-step" data-s="' + (step + 1) + '">次へ</button>' : '<button class="btn pri" data-act="wiz-save">保存して仮押さえ</button>') + "</div>";
    return head + '<div class="drawer-b">' + body + foot + "</div>";
  }
  function setDraft(path, value) {
    var dr = state.p3.drawer && state.p3.drawer.draft;
    if (!dr) return;
    var keys = path.split("."), o = dr;
    for (var i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  }
  function nextNo() {
    var max = state.orders.reduce(function (m, o) { return Math.max(m, +o.no.split("-")[2]); }, 0);
    return "OR-26-" + String(max + 1).padStart(4, "0");
  }
  function saveDraft() {
    var d = state.p3.drawer, dr = d.draft;
    if (!String(dr.customer).trim() || !dr.date) { d.step = 1; render(); toast("お客様のお名前とお日取りを入力してください。"); return; }
    var o = dr.no ? orderOf(dr.no) : null;
    if (!o) {
      o = { no: nextNo(), stage: "打合せ・試着", paid: 0, contractDate: null, history: [[TODAY_S, "受注を登録"]], style: "", plan: "" };
      o.checks = (P.checklists[o.stage] || []).map(function () { return false; });
      state.orders.unshift(o);
    } else {
      o.history.push([TODAY_S, "受注を編集"]);
    }
    if (o.date !== dr.date) o.dateTbd = false;
    ["customer", "biz", "store", "date", "venue", "style", "plan", "staff", "source"].forEach(function (k) { o[k] = dr[k]; });
    o.amount = Number(dr.amount) || draftTotal(dr);
    var added = dr.costumes.filter(function (c) { return (o.costumes || []).indexOf(c) < 0; });
    o.costumes = dr.costumes.slice();
    o.req = JSON.parse(JSON.stringify(dr.req));
    if (added.length) o.history.push([TODAY_S, "衣装を仮押さえ（" + added.join("・") + "）"]);
    audit("受注を" + (dr.no ? "編集" : "登録") + "（" + o.no + "）");
    save();
    state.p3.drawer = { type: "order", no: o.no };
    render();
    toast(added.length ? "受注を保存し、選んだ衣装をお日取りに仮押さえしました。" : "受注を保存しました。");
  }

  // ---------- 衣装在庫 ----------
  function invFiltered() {
    var f = state.p3.inv, q = norm(f.q);
    return state.costumes.filter(function (c) {
      var st = cosStatus(c).label;
      return (f.store === "all" || c.store === f.store) && (f.cat === "all" || catOf(c.code).id === f.cat) && (f.status === "all" || st === f.status) &&
        (!q || norm(c.code + c.name + c.color + catOf(c.code).name).indexOf(q) >= 0);
    });
  }
  function invListHtml() {
    var f = state.p3.inv, list = invFiltered();
    var head = '<p class="note-sm" style="margin-bottom:10px">' + list.length + " 点を表示 · 名前・品番・写真は御社サイトから（紋付袴・卒業式袴・七五三・小物はサンプル）。料金と状態はサンプルです</p>";
    if (!list.length) return head + '<div class="notice">条件に合う衣装はありません。</div>';
    if (f.view === "table") {
      return head + '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>品番</th><th>名称</th><th>カテゴリ</th><th>色</th><th>サイズ</th><th class="num">レンタル料</th><th>店舗</th><th>状態</th><th class="num">貸出回数</th><th>次の予約</th></tr></thead><tbody>' +
        list.map(function (c) {
          var st = cosStatus(c), nx = reservations(c.code).filter(function (o) { return o.date >= TODAY_S; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
          return '<tr class="click" data-act="cos-open" data-code="' + esc(c.code) + '"><td><span class="ono">' + esc(c.code) + "</span></td><td><b>" + esc(c.name) + "</b>" + (c.pick ? ' <span class="pickb">おすすめ</span>' : "") + "</td><td>" + esc(catOf(c.code).name) +
            '</td><td><span class="colorline">' + dot(c) + esc(c.color) + "</span></td><td>" + esc(c.size) + '</td><td class="num">' + yen(c.price) + "</td><td>" + esc(storeName(c.store)) +
            '</td><td><span class="pill ' + st.tone + '">' + st.label + '</span></td><td class="num">' + c.rentals + "回</td><td>" + (nx ? esc(slashDate(nx.date)) + " " + esc(nx.no) : "—") + "</td></tr>";
        }).join("") + "</tbody></table></div></div>";
    }
    return head + '<div class="inv-grid">' + list.map(function (c) {
      var st = cosStatus(c);
      return '<button type="button" class="cpick icard" data-act="cos-open" data-code="' + esc(c.code) + '"><span class="pill ' + st.tone + ' st">' + st.label + "</span>" + (c.pick ? '<span class="pickb on-img">おすすめ</span>' : "") + cosImg(c) +
        '<div class="cmeta"><span class="code">' + esc(c.code + " · " + catOf(c.code).name) + '</span><span class="nm">' + esc(c.name) + "</span>" +
        '<span class="colorline">' + dot(c) + esc(c.color + " · " + c.size) + '<span style="margin-left:auto">' + yen(c.price) + "</span></span>" +
        '<span class="code">' + esc(storeName(c.store)) + " · " + c.rentals + "回貸出</span></div></button>";
    }).join("") + "</div>";
  }
  function viewInventory() {
    var f = state.p3.inv, all = state.costumes;
    var avail = all.filter(function (c) { return c.status === "avail" && availability(c, TODAY_S).ok; }).length;
    var busy = all.filter(function (c) { return c.status === "rented" || reservations(c.code).some(function (o) { return o.date >= TODAY_S && o.date <= dayStr(30); }); }).length;
    var maint = all.filter(function (c) { return c.status === "cleaning" || c.status === "repair"; });
    var backSoon = maint.filter(function (c) { return c.backDate && c.backDate <= dayStr(7); }).length;
    var kpis = '<div class="kpis k4">' + kpi("デモの在庫", all.length + "点", "御社の衣裳は全体で10,000点以上") + kpi("本日貸出可", avail + "点", "在庫の " + Math.round(avail / all.length * 100) + "%") +
      kpi("貸出中・予約済", busy + "点", "今後30日") + kpi("お直し・クリーニング中", maint.length + "点", "今週戻り予定 " + backSoon + "点") + "</div>";
    var statuses = ["貸出可", "予約済", "貸出中", "クリーニング中", "お直し中"];
    var filters = '<div class="filters">' + sel("inv-filter", "store", f.store, STORE_OPTS) +
      sel("inv-filter", "cat", f.cat, [["all", "全カテゴリ"]].concat(P.categories.map(function (c) { return [c.id, c.name]; }))) +
      sel("inv-filter", "status", f.status, [["all", "全ての状態"]].concat(statuses.map(function (s) { return [s, s]; }))) +
      '<label class="srch">' + icon("search") + '<input type="text" data-act="inv-q" value="' + esc(f.q) + '" placeholder="品番・名称・色" aria-label="品番・名称・色で探す"></label>' +
      '<div class="seg" role="group" aria-label="表示"><button type="button" data-act="inv-view" data-v="gallery" class="' + (f.view === "gallery" ? "on" : "") + '">' + icon("grid") + "ギャラリー</button>" +
      '<button type="button" data-act="inv-view" data-v="table" class="' + (f.view === "table" ? "on" : "") + '">' + icon("table") + "表</button></div>" +
      '<span class="sp"></span>' + (canEdit("inventory") ? '<button class="btn" data-act="p3-demo" data-msg="デモでは取り込めません。本番では、Excel の在庫リストをそのまま取り込めます。">' + icon("up") + "在庫リストを取込</button>" +
      '<button class="btn pri" data-act="p3-demo" data-msg="デモでは登録できません。本番では、写真・サイズ・料金を入れて衣装を登録します。">' + icon("plus") + "衣装を登録</button>" : '<span class="note-sm">閲覧のみ（' + esc(roleLabel(state.role)) + "）</span>") + "</div>";
    var banner = '<div class="photo-band" style="background-image:url(img/site/top-reason-01.jpg)"><div><span class="en">Costume</span><b>山陰No.1の豊富なバリエーション。</b>' +
      "<small>ウェディングドレス・メンズ衣裳・和装など、トータルで10,000点以上（ヴィラ・ノッツェ コルティーレ出雲のサイトより）。写真で選べるので、お客様にもスタッフにも一目で伝わります。</small></div></div>";
    return p3Note() + banner + kpis + filters + '<div id="inv-list">' + invListHtml() + "</div>";
  }
  function costumeDrawer(c) {
    var st = cosStatus(c), cat = catOf(c.code);
    var ws = addDays(TODAY, -TODAY.getDay());
    var cells = [], first = ymd(ws), last = ymd(addDays(ws, 13 * 7 - 1));
    var res = reservations(c.code);
    for (var i = 0; i < 13; i++) {
      var a = ymd(addDays(ws, i * 7)), b = ymd(addDays(ws, i * 7 + 6));
      var r = res.some(function (o) { return o.date >= a && o.date <= b; });
      var mnt = c.status !== "avail" && c.backDate && a <= c.backDate;
      cells.push('<span class="wk' + (r ? " res" : mnt ? " mnt" : "") + '" title="' + esc(slashDate(a) + "〜" + slashDate(b)) + '"></span>');
    }
    var resRows = res.slice().sort(function (x, y) { return x.date < y.date ? -1 : 1; }).map(function (o) {
      return '<div class="r" data-act="order-open" data-no="' + o.no + '"><span>' + esc(slashDate(o.date)) + ' · <span class="ono">' + o.no + "</span> " + esc(o.customer) + '</span><span class="sp" style="flex:1"></span>' + stagePill(o.stage) + "</div>";
    }).join("") || '<p class="note-sm">予約はありません。</p>';
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">' + esc(c.code + " · " + cat.name + " · " + storeName(c.store)) + "</div><h2>" + esc(c.name) + '</h2><div class="dh-tags"><span class="pill ' + st.tone + '">' + st.label + "</span></div></div>" +
      '<div class="dh-acts"><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    return head + '<div class="drawer-b"><div class="cos-top">' + cosImg(c, true) + '<div class="itiles">' +
      '<div class="itile"><div class="k">色</div><div class="v"><span class="colorline">' + dot(c) + esc(c.color) + "</span></div></div>" +
      itile("サイズ", c.size) + itile("レンタル料（サンプル）", yen(c.price)) + itile("貸出回数", c.rentals + "回") + itile("保管場所", storeName(c.store)) + itile("カテゴリ", catOf(c.code).name) + "</div></div>" +
      (c.pick ? '<div class="plan-line">' + icon("spark") + "<span><b>御社サイトの「おすすめ」</b>" + (c.img ? "写真は御社サイトの写真です。" : "") + "</span></div>" : "") +
      '<div class="card"><div class="card-h"><h3>空き状況 · 今後13週</h3><span class="sp"></span><span class="lg"><span><i style="background:var(--good-bg)"></i>空き</span><span><i style="background:var(--gold)"></i>予約</span><span><i style="background:var(--warn-bg)"></i>メンテナンス</span></span></div>' +
      '<div class="card-b"><div class="weeks">' + cells.join("") + '</div><div class="wk-dates"><span>' + esc(slashDate(first)) + "</span><span>" + esc(slashDate(last)) + "</span></div></div></div>" +
      '<div class="card"><div class="card-h"><h3>予約</h3><span class="sub">受注ごとの仮押さえ</span></div><div class="card-b rlist">' + resRows + "</div></div>" +
      '<div class="card"><div class="card-h"><h3>メンテナンス履歴</h3></div><div class="card-b"><ul class="tl">' + c.log.map(function (h) { return '<li><span class="d">' + esc(h[0]) + "</span><br>" + esc(h[1]) + "</li>"; }).join("") + "</ul></div></div>" +
      (canEdit("inventory") ? '<div class="form-actions" style="margin-top:0"><button class="btn" data-act="cos-clean" data-code="' + c.code + '">クリーニングに出す</button><button class="btn" data-act="cos-avail" data-code="' + c.code + '">貸出可にする</button></div>' : "") + "</div>";
  }
  function drawerHtml() {
    var d = state.p3.drawer;
    if (!d) return "";
    var inner = "";
    if (d.type === "order") { var o = orderOf(d.no); if (!o) return ""; inner = orderDrawer(o); }
    if (d.type === "edit") inner = editDrawer(d);
    if (d.type === "costume") { var c = cosOf(d.code); if (!c) return ""; inner = costumeDrawer(c); }
    if (d.type === "customer") inner = customerDrawer(d.no);
    if (d.type === "exp-new") inner = expNewDrawer(d);
    if (d.type === "leave-new") inner = leaveDrawer(d);
    if (d.type === "inbox") inner = inboxDrawer(d);
    if (d.type === "book") inner = bookDrawer(d);
    if (d.type === "storeres") inner = storeResDrawer(d);
    if (!inner) return "";
    return '<div class="overlay" data-act="drawer-close"></div><aside class="drawer' + (d.type === "exp-new" || d.type === "leave-new" || d.type === "book" ? " narrow" : "") + '" role="dialog" aria-modal="true">' + inner + "</aside>";
  }
  var p3Acts = {
    "p3-filter": function (el) { state.p3[el.getAttribute("data-k")] = el.value; render(); },
    "p3-view": function (el) { state.p3.view = el.getAttribute("data-v"); render(); },
    "p3-demo": function (el) { toast(el.getAttribute("data-msg")); },
    "order-open": function (el) { state.p3.drawer = { type: "order", no: el.getAttribute("data-no") }; render(); },
    "order-edit": function (el) { state.p3.drawer = { type: "edit", step: 1, cat: "all", draft: draftFrom(orderOf(el.getAttribute("data-no"))) }; render(); },
    "order-new": function () { state.p3.drawer = { type: "edit", step: 1, cat: "all", draft: draftFrom(null) }; render(); },
    "order-check": function (el) {
      var o = orderOf(el.getAttribute("data-no")); if (!o) return;
      o.checks = o.checks || []; o.checks[+el.getAttribute("data-i")] = el.checked; save(); render();
    },
    "order-next": function (el) {
      var o = orderOf(el.getAttribute("data-no")); if (!o) return;
      var next = P.stages[stageIdx(o.stage) + 1]; if (!next) return;
      if (next === ST_CONTRACT && !o.contractDate) o.contractDate = TODAY_S;
      if (next === ST_SIZE && !o.paid) o.paid = Math.round(o.amount * 0.3 / 1000) * 1000;
      if (next === ST_DONE) o.paid = o.amount;
      o.stage = next; o.checks = (P.checklists[next] || []).map(function () { return false; });
      o.history.push([TODAY_S, "ステージを「" + next + "」に変更"]);
      audit("受注のステージを「" + next + "」に（" + o.no + "）");
      save(); render(); toast("ステージを「" + next + "」に進めました。");
    },
    "order-cancel": function () { toast("デモではキャンセルできません。本番では、キャンセルすると仮押さえした衣装も自動で解放されます。"); },
    "drawer-close": function () { state.p3.drawer = null; render(); },
    "wiz-step": function (el) { state.p3.drawer.step = +el.getAttribute("data-s"); render(); var dw = document.querySelector(".drawer"); if (dw) dw.scrollTop = 0; },
    "wiz-cat": function (el) { state.p3.drawer.cat = el.getAttribute("data-c"); render(); },
    "wiz-pick": function (el) {
      var dr = state.p3.drawer.draft, code = el.getAttribute("data-code"), i = dr.costumes.indexOf(code);
      if (i >= 0) { dr.costumes.splice(i, 1); render(); return; }
      var av = availability(cosOf(code), dr.date, dr.no);
      if (!av.ok) { toast(av.text + "。ほかの衣装を選んでください。"); return; }
      dr.costumes.push(code); render();
    },
    "wiz-color": function (el) { var a = state.p3.drawer.draft.req.colors, v = el.getAttribute("data-v"), i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); render(); },
    "wiz-part": function (el) { var a = state.p3.drawer.draft.req.parts, v = el.getAttribute("data-v"), i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); render(); },
    "wiz-save": function () { saveDraft(); },
    "inv-filter": function (el) { state.p3.inv[el.getAttribute("data-k")] = el.value; render(); },
    "inv-view": function (el) { state.p3.inv.view = el.getAttribute("data-v"); render(); },
    "cos-open": function (el) { state.p3.drawer = { type: "costume", code: el.getAttribute("data-code") }; render(); },
    "cos-clean": function (el) {
      var c = cosOf(el.getAttribute("data-code")); c.status = "cleaning"; c.backDate = dayStr(5); c.log.unshift([slashDate(TODAY_S), "クリーニングに出す（" + slashDate(c.backDate) + " に戻り予定）"]);
      save(); render(); toast("クリーニングに出しました。戻る日まで、空き状況に「メンテナンス」と表示されます。");
    },
    "cos-avail": function (el) {
      var c = cosOf(el.getAttribute("data-code")); c.status = "avail"; c.backDate = null; c.log.unshift([slashDate(TODAY_S), "検品済み・貸出可にする"]);
      save(); render(); toast("貸出可にしました。");
    }
  };

  // ======================================================================
  // 画面を足した分（Remya さんのデモにある機能）：顧客・来店予約・請求と入金・経費・TKC連携・従業員・休暇・ユーザーと権限
  // あわせて、ホームのダッシュボード・AIのお知らせ・検索（⌘K）。データは data-ext.js（すべてサンプル）
  // ======================================================================
  var X = window.EXT_DATA;
  var WD = "日月火水木金土";
  var SHARE = { matsue: 0.34, izumo: 0.26, yonago: 0.23, tottori: 0.17 };
  function mdw(s) { var d = toDate(s); return (d.getMonth() + 1) + "/" + d.getDate() + "（" + WD.charAt(d.getDay()) + "）"; }
  function perm(page, role) { var p = X.perm[page]; return p ? p[role || state.role] || "none" : "none"; }
  function canEdit(page) { var p = perm(page); return p === "full" || p === "own"; }
  function mine(store) { return !U().store || store === U().store; }
  function approver() { return state.role === "exec" || state.role === "manager" || state.role === "accounting"; }
  function empOf(name) { for (var i = 0; i < X.employees.length; i++) if (X.employees[i].name === name) return X.employees[i]; return null; }
  function storeLabel(id) { return id ? storeName(id) : "本社"; }
  function storeOf(id) { for (var i = 0; i < D.stores.length; i++) if (D.stores[i].id === id) return D.stores[i]; return {}; }
  function pill(text, tone) { return '<span class="pill ' + (tone || "mute") + '">' + esc(text) + "</span>"; }
  function badge(kind) {
    return kind === "opt" ? '<span class="nb opt">オプション</span>' : kind === "adv" ? '<span class="nb adv">発展機能</span>' : kind === "sep" ? '<span class="nb sep">別項目</span>' : "";
  }
  function demoBtn(ic, label, msg, pri) { return '<button class="btn' + (pri ? " pri" : "") + '" data-act="p3-demo" data-msg="' + esc(msg) + '">' + icon(ic) + esc(label) + "</button>"; }
  function share(total) { return U().store ? Math.round(total * (SHARE[U().store] || 0.3)) : total; }
  function num(n) { return Math.round(n).toLocaleString("ja-JP"); }
  function storeChip() { return U().store ? '<span class="chip static">' + icon("home") + esc(storeName(U().store)) + "の分を表示</span>" : ""; }
  function relDay(v) {
    var y = TODAY.getFullYear(), m = TODAY.getMonth();
    if (v === "m1") return ymd(new Date(y, m, 1));
    if (v === "p1") return ymd(new Date(y, m - 1, 1));
    if (v === "pe1") return ymd(new Date(y, m, 0));
    if (v === "pe2") return ymd(new Date(y, m - 1, 0));
    return dayStr(v);
  }
  function tpl(s) {
    return String(s).replace(/\{m\}/g, TODAY.getMonth() + 1).replace(/\{m1\}/g, mNum(monthKey(addMonths(TODAY, -1)))).replace(/\{m2\}/g, mNum(monthKey(addMonths(TODAY, -2))));
  }
  function acctName(k) { return (X.accounts[k] || [k])[0]; }
  function acctCode(k) { return (X.accounts[k] || ["", ""])[1]; }

  // 提案書のどこに当たるかの印
  var PH = { p1: ["第1段階", "base"], p2: ["第2段階", "base"], p12: ["第1・第2段階", "base"], opt: ["第3段階・オプション", "opt"], adv: ["発展機能", "adv"] };
  function phaseChip(ph) { var x = PH[ph]; return x ? '<span class="phase ' + x[1] + '">' + esc(x[0]) + "</span>" : ""; }
  var NOTE = {
    opt: ["第3段階（オプション）", "ご依頼の範囲（第1・第2段階）の外にある、弊社からの追加のご提案です。"],
    adv: ["発展機能", "提案書のお見積りには含まない、これからのご提案です。ご関心に応じて、後の段階で作れます。"],
    p2: ["第2段階（ご依頼の範囲）", ""],
    base: ["ご依頼の範囲（第1・第2段階）", ""]
  };
  function scopeNote(kind, extra) { var n = NOTE[kind]; return '<div class="snote ' + kind + '"><b>' + esc(n[0]) + "</b>" + esc(n[1] + (extra || "")) + "</div>"; }

  // ======================================================================
  // ご予約（予約の受付・フェアとお食事）・お客様の声・いまの会社（ライブ）— 発展機能
  // フェアの題名・中身・写真、式場の住所と営業時間、体験レポートは式場のサイトの公開情報（2026-10-08 に確認）。日付・空席・予約の数はサンプル
  // ======================================================================
  function holi(s) { return X.holidays[s] || ""; }
  function storeClosedOn(d) { return d.getDay() === 2 && !holi(ymd(d)); } // 衣装店：毎週火曜（祝日は営業）
  function venueClosedOn(d) { var w = d.getDay(); return (w === 2 || w === 3) && !holi(ymd(d)); } // 式場：火・水（祝日は営業）
  function venueOf(id) { for (var i = 0; i < X.fairVenues.length; i++) if (X.fairVenues[i].id === id) return X.fairVenues[i]; return null; }
  function fairOf(vid, fid) { var l = X.fairs[vid] || []; for (var i = 0; i < l.length; i++) if (l[i].id === fid) return l[i]; return null; }
  function mealOf(id) { for (var i = 0; i < X.meals.length; i++) if (X.meals[i].id === id) return X.meals[i]; return null; }
  function endTime(t, mins) { var p = t.split(":"), m = +p[0] * 60 + +p[1] + mins; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function openDay(n, venue) { var d = addDays(TODAY, n); for (var k = 0; k < 7 && (venue ? venueClosedOn(d) : storeClosedOn(d)); k++) d = addDays(d, 1); return ymd(d); }
  function nextOpenAfter(s) { var d = addDays(toDate(s), 1); for (var k = 0; k < 7 && storeClosedOn(d); k++) d = addDays(d, 1); return ymd(d); }
  var FAIR_DAYS = 14;
  function fairSchedule() { // 今日から14日間の、会場ごとのフェア
    if (fairSchedule.c) return fairSchedule.c;
    var out = [];
    for (var i = 0; i < FAIR_DAYS; i++) {
      var d = addDays(TODAY, i), s = ymd(d);
      X.fairVenues.forEach(function (v) {
        if (venueClosedOn(d)) return;
        var plan = X.fairPlan[v.id], ids = holi(s) ? plan.hol : plan[d.getDay()];
        (ids || []).forEach(function (spec) {
          var alt = spec.split("|"), f = fairOf(v.id, alt[Math.floor(i / 7) % alt.length]);
          if (f) out.push({ v: v, f: f, date: s, i: i });
        });
      });
    }
    return (fairSchedule.c = out);
  }
  function fairDateFor(vid, fid) { var l = fairSchedule().filter(function (x) { return x.v.id === vid && x.f.id === fid && x.i > 0; }); return l.length ? l[0].date : null; }
  // 時間枠の予約の数：見本の数（日付と枠で決まる）＋このデモで入った予約
  function slotKey(kind, vid, id, date, t) { return [kind, vid, id, date, t].join("|"); }
  function slotSeed(key, cap, busy) {
    var h = 7; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    var r = rng(h)(), n = r < (busy ? 0.35 : 0.6) ? 0 : r < (busy ? 0.8 : 0.9) ? 1 : 2;
    return Math.min(cap, n);
  }
  function slotCount(kind, vid, id, date, t, cap) {
    var key = slotKey(kind, vid, id, date, t), d = toDate(date), busy = d.getDay() === 0 || d.getDay() === 6 || !!holi(date);
    return Math.min(cap, slotSeed(key, cap, busy) + ((state.ext.fairBook || {})[key] || []).length);
  }
  function slotState(n, cap) { return n >= cap ? ["×", "満席", "full"] : cap - n <= 1 ? ["△", "残り" + (cap - n) + "組", "few"] : ["○", "空席あり", "ok"]; }
  function addBooking(kind, vid, id, date, t, ref) { var key = slotKey(kind, vid, id, date, t); state.ext.fairBook[key] = (state.ext.fairBook[key] || []).concat([ref]); }

  // ---------- 予約の受付 ----------
  var CH = {
    store: { name: "ご来店予約", ico: "cal", tone: "gold", src: "御社サイト（yashiro-dress.com）のご来店予約" },
    fair: { name: "ブライダルフェア予約", ico: "ring", tone: "ver", src: "式場のブライダルフェア予約" },
    tour: { name: "見学予約", ico: "pin", tone: "ver", src: "式場の見学予約" },
    request: { name: "資料請求", ico: "mail", tone: "info", src: "式場の資料請求" },
    contact: { name: "お問い合わせ", ico: "chat", tone: "mute", src: "お問い合わせ" },
    meal: { name: "お食事のご予約", ico: "meal", tone: "teal", src: "お食事のご予約（例）" }
  };
  function resolveItem(src, atIso) {
    var x = JSON.parse(JSON.stringify(src)); x.at = atIso;
    if (x.ch === "store") x.prefs = (x.prefs || []).map(function (p) { return [openDay(p[0]), p[1]]; });
    if (x.ch === "fair") x.date = fairDateFor(x.venue, x.fair) || openDay(3, true);
    if (x.ch === "tour" || x.ch === "meal") { x.date = openDay(x.d || 3, true); x.time = x.t; delete x.d; delete x.t; }
    delete x.m;
    return x;
  }
  function seedBookings(e) {
    e.appts = seedAppts(); e.fairBook = {}; e.voice = {};
    e.inbox = X.inbox.map(function (src) { return resolveItem(src, new Date(Date.now() + src.m * 60000).toISOString()); });
    e.inbox.forEach(function (x) {
      if (x.ch === "fair") { var k = slotKey("fair", x.venue, x.fair, x.date, x.slot); e.fairBook[k] = (e.fairBook[k] || []).concat([x.id]); }
      if (x.st === "done" && (x.ch === "fair" || x.ch === "tour" || x.ch === "meal")) {
        var v = venueOf(x.venue);
        e.appts.push({ id: "a" + x.id, date: x.date, t: x.ch === "fair" ? x.slot : x.time, type: x.ch, venue: x.venue, store: v ? v.store : null, name: x.name, inbox: x.id, staff: "" });
      }
    });
  }
  function itemOf(id) { for (var i = 0; i < state.ext.inbox.length; i++) if (state.ext.inbox[i].id === id) return state.ext.inbox[i]; return null; }
  function itemStore(x) { if (x.store) return x.store; var v = venueOf(x.venue); return v ? v.store : null; }
  function itemWhere(x) { return x.store ? storeName(x.store) : (venueOf(x.venue) || {}).short || ""; }
  function inboxList() {
    return state.ext.inbox.filter(function (x) { return mine(itemStore(x)); }).sort(function (a, b) {
      if ((a.st === "new") !== (b.st === "new")) return a.st === "new" ? -1 : 1;
      return a.at < b.at ? 1 : a.at > b.at ? -1 : 0;
    });
  }
  function inboxNew() { return inboxList().filter(function (x) { return x.st === "new"; }); }
  function agoLabel(iso) { var m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return m < 1 ? "たった今" : m < 60 ? m + "分前" : m < 1440 ? Math.floor(m / 60) + "時間前" : Math.floor(m / 1440) + "日前"; }
  function itemSummary(x) {
    if (x.ch === "store") return (x.wants || []).join("・") + " · 第1希望 " + mdw(x.prefs[0][0]) + " " + x.prefs[0][1] + "〜";
    if (x.ch === "fair") { var f = fairOf(x.venue, x.fair); return (f ? f.title : "") + " · " + mdw(x.date) + " " + x.slot + "〜 · " + x.people + "名"; }
    if (x.ch === "tour") return "式場の見学 · " + mdw(x.date) + " " + x.time + "〜 · " + x.people + "名";
    if (x.ch === "meal") { var m = mealOf(x.meal); return (m ? m.title : "お食事") + " · " + mdw(x.date) + " " + x.time + "〜 · " + x.people + "名"; }
    if (x.ch === "request") return x.items;
    return x.msg;
  }
  function nextStep(x) {
    if (x.st === "done") return (x.ch === "request" ? "発送済み" : x.ch === "contact" ? "回答済み" : "確認済み") + (x.by ? "（" + x.by + "）" : "");
    if (x.st === "hold") return "お電話で日時を調整中";
    return { store: "希望の日時を選んで予約を確定 → 確認のメール", fair: "予約を確かめる → 確認のメール。近くの衣装店でのご試着もご案内", tour: "見学の予約を確定 → 確認のメール",
      request: "資料を発送して「発送済み」にする", contact: "回答して「回答済み」にする", meal: "お食事の予約を確定 → 確認のメール" }[x.ch];
  }
  function stPillIn(x) { return x.st === "new" ? pill("新着", "bad") : x.st === "hold" ? pill("お電話で調整中", "warn") : pill(x.ch === "request" ? "発送済み" : x.ch === "contact" ? "回答済み" : "確認済み", "good"); }
  function srcOf(x) { return /Instagram/.test(x.via) ? "Instagram の DM（@yashiro_wedding）" : x.via === "LINE" ? "公式LINE" : x.via === "お電話" ? "お電話（スタッフが入力）" : x.via === "ご来館" ? "ご来館（スタッフが入力）" : CH[x.ch].src; }
  function chTag(ch) { var c = CH[ch]; return '<span class="tag t-' + c.tone + ' ict">' + icon(c.ico) + esc(c.name) + "</span>"; }
  function phoneRule(date) { var dd = dayDiff(date, TODAY_S), w = toDate(date).getDay(); return dd <= 1 || w === 3 ? "当日・翌日・水曜日のご予約は、お電話で確かめてから確定します（御社サイトのご予約フォームの決まり）。" : ""; }
  function isToday(iso) { return ymd(new Date(iso)) === TODAY_S; }
  function viewInbox() {
    var all = inboxList(), tab = state.ui.inboxTab, open = all.filter(function (x) { return x.st !== "done"; }), nw = all.filter(function (x) { return x.st === "new"; });
    var list = all.filter(function (x) { return tab === "all" || (tab === "new" ? x.st !== "done" : tab === "store" ? !!x.store : !x.store); });
    var kpis = '<div class="kpis k4">' + kpi("新着（まだ確認していない）", nw.length + "件", nw.length ? "いちばん古いのは " + agoLabel(nw[nw.length - 1].at) : "ありません", nw.length ? "dn" : "") +
      kpi("今日の受付", all.filter(function (x) { return isToday(x.at); }).length + "件", "Web・LINE・お電話") + kpi("確認までの時間", "平均 18分", "今月（サンプル）") +
      kpi("フェアのご予約", all.filter(function (x) { return x.ch === "fair"; }).length + "件", "ヴィラ・ノッツェの2会場") + "</div>";
    var tabs = '<div class="tabs">' + [["all", "すべて", all.length], ["new", "新着・調整中", open.length], ["store", "衣装店", all.filter(function (x) { return x.store; }).length], ["venue", "式場", all.filter(function (x) { return !x.store; }).length]].map(function (t) {
      return '<button type="button" data-act="inbox-tab" data-v="' + t[0] + '" class="' + (tab === t[0] ? "on" : "") + '">' + t[1] + ' <span class="tcount">' + t[2] + "</span></button>";
    }).join("") + "</div>";
    var bar = '<div class="doc-bar">御社サイトのご来店予約と、ヴィラ・ノッツェのフェア予約・見学予約・資料請求・お問い合わせを、1か所で受け付けます。<span class="sp"></span>' +
      (canEdit("inbox") ? '<button class="btn" data-act="inbox-sim">' + icon("live") + "Web から予約が入ったとき（デモ）</button>" : "") + "</div>";
    var rows = list.map(function (x) {
      return '<button type="button" class="ibx' + (x.st === "new" ? " new" : x.st === "hold" ? " hold" : "") + '" data-act="inbox-open" data-id="' + x.id + '">' +
        '<span class="ibx-ic t-' + CH[x.ch].tone + '">' + icon(CH[x.ch].ico) + "</span>" +
        '<span class="ibx-m"><span class="ibx-top">' + chTag(x.ch) + '<span class="ibx-where">' + esc(itemWhere(x)) + '</span><span class="ibx-at">' + esc(agoLabel(x.at) + " · " + x.via) + "</span></span>" +
        "<b>" + esc(sama(x.name)) + "</b><small>" + esc(itemSummary(x)) + '</small><span class="ibx-next">' + icon("arrow") + esc(nextStep(x)) + "</span></span>" +
        '<span class="ibx-st">' + stPillIn(x) + (x.st !== "done" ? '<span class="btn sm pri">確認する</span>' : "") + "</span></button>";
    }).join("") || '<p class="note-sm" style="padding:18px">該当する受付はありません。</p>';
    return scopeNote("adv", "予約やお問い合わせが入ると、ここに「新着」で届き、上のベルとスマートフォンにもお知らせします。今お使いの予約の仕組み（式場の予約ページなど）とのつなぎ方は、打合せで伺います。") +
      kpis + '<div class="card">' + tabs + bar + '<div class="ibx-list">' + rows + "</div></div>";
  }
  function inboxDrawer(d) {
    var x = itemOf(d.id); if (!x) return "";
    var c = CH[x.ch], v = venueOf(x.venue), edit = canEdit("inbox"), rows = [];
    rows.push(["受け付けた日時", timeLabel(x.at) + "（" + agoLabel(x.at) + " · " + x.via + "）"]);
    rows.push(["お名前", sama(x.name) + (x.kana ? "（" + x.kana + "）" : "")]);
    if (x.tel) rows.push(["電話番号", x.tel]);
    if (x.mail) rows.push(["メールアドレス", x.mail]);
    if (x.store) rows.push(["ご来店店舗", storeName(x.store)]);
    if (v) rows.push(["式場", v.name]);
    if (x.ch === "store") { rows.push(["ご希望衣装", (x.wants || []).join("・")]); rows.push(["挙式日・会場（学校）・ご使用日など", x.detail || "—"]); }
    if (x.ch === "fair") { var f = fairOf(x.venue, x.fair); rows.push(["フェア", f ? f.title : ""]); rows.push(["日時", mdw(x.date) + " " + x.slot + "〜" + endTime(x.slot, 120) + "（120分・無料）"]); rows.push(["人数", x.people + "名"]); }
    if (x.ch === "tour") { rows.push(["見学の日時", mdw(x.date) + " " + x.time + "〜"]); rows.push(["人数", x.people + "名"]); }
    if (x.ch === "meal") { var m = mealOf(x.meal); rows.push(["お食事", m ? m.title : ""]); rows.push(["日時", mdw(x.date) + " " + x.time + "〜"]); rows.push(["人数", x.people + "名"]); }
    if (x.ch === "request") rows.push(["ご希望の資料", x.items]);
    if (x.ch === "contact") rows.push(["お問い合わせの内容", x.msg]);
    if (x.note) rows.push(["ご要望・メモ", x.note]);
    if (x.st === "done" && x.ch === "contact" && x.reply) rows.push(["回答", x.reply]);
    var detail = '<div class="card"><div class="card-h"><h3>受け付けた内容</h3><span class="sub">' + esc(srcOf(x)) + '</span></div><div class="tbl-wrap"><table class="sumtbl"><tbody>' +
      rows.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    var guide = '<div class="next-box' + (x.st === "done" ? " done" : "") + '"><span class="nb-ic">' + icon(x.st === "done" ? "check" : "arrow") + "</span><div><b>" + (x.st === "done" ? "このご予約は対応済みです" : "次にやること") + "</b><p>" + esc(nextStep(x)) + "</p></div></div>";
    var action = "";
    if (x.st !== "done" && edit) {
      if (x.ch === "store") {
        var pick = d.pick == null ? 0 : d.pick, staffNow = d.staff || staffOf(x.store)[0];
        var cards = x.prefs.map(function (p, i) {
          var n = state.ext.appts.filter(function (a) { return a.store === x.store && a.date === p[0] && a.t === p[1]; }).length, s2 = storeClosedOn(toDate(p[0])) ? ["−", "定休日", "full"] : slotState(n, 2);
          return '<button type="button" class="pref' + (i === pick ? " on" : "") + (s2[2] === "full" ? " full" : "") + '" data-act="in-pick" data-i="' + i + '"><span class="pn">第' + (i + 1) + "希望</span><b>" + esc(mdw(p[0])) + " " + p[1] + "〜" + endTime(p[1], 60) + "</b>" +
            '<span class="ps ' + s2[2] + '">' + s2[0] + " " + s2[1] + "</span>" + (phoneRule(p[0]) ? '<span class="pr">' + icon("phone") + "お電話で確認</span>" : "") + "</button>";
        }).join("");
        action = '<div class="card"><div class="card-h"><h3>日時を選んで確定する</h3><span class="sub">1時間枠 · 1枠2組まで（サンプル）</span></div><div class="card-b stack"><div class="prefs">' + cards + "</div>" +
          '<label class="field-label">担当<select data-inf="staff">' + staffOf(x.store).map(function (n) { return "<option" + (n === staffNow ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + "</select></label>" +
          (phoneRule(x.prefs[pick][0]) ? '<p class="lc warn">' + esc(phoneRule(x.prefs[pick][0])) + "</p>" : "") +
          '<div class="form-actions"><button class="btn pri big" data-act="in-confirm" data-id="' + x.id + '">' + icon("check") + "この日時で予約を確定する</button>" +
          '<button class="btn" data-act="in-hold" data-id="' + x.id + '">' + icon("phone") + "お電話で調整する</button></div>" +
          '<p class="note-sm">確定すると、来店予約の予定表と受注（ご来店予約のステージ）に入り、お客様に確認のメールを送ります（デモでは送りません）。</p></div></div>';
      } else if (x.ch === "fair" || x.ch === "tour" || x.ch === "meal") {
        var near = v ? storeName(v.store) : "";
        action = '<div class="card"><div class="card-b stack">' + (x.ch === "fair" ? '<label class="ckline"><input type="checkbox" data-inf="dress"' + (d.dress === false ? "" : " checked") + ">近くの衣装店（" + esc(near) + "）でのドレスのご試着も予約する（フェアの次の営業日 14:00）</label>" : "") +
          '<div class="form-actions"><button class="btn pri big" data-act="in-confirm" data-id="' + x.id + '">' + icon("check") + (x.ch === "fair" ? "予約を確認する" : x.ch === "tour" ? "見学の予約を確定する" : "お食事の予約を確定する") + "</button>" +
          '<button class="btn" data-act="in-hold" data-id="' + x.id + '">' + icon("phone") + "お電話で確かめる</button></div>" +
          '<p class="note-sm">確定すると、来店予約の予定表に入り、お客様に確認のメールを送ります（デモでは送りません）。</p></div></div>';
      } else if (x.ch === "request") {
        action = '<div class="form-actions"><button class="btn pri big" data-act="in-confirm" data-id="' + x.id + '">' + icon("mail") + "資料を発送して、発送済みにする</button></div>";
      } else {
        action = '<div class="card"><div class="card-h"><h3>回答</h3>' + (x.reply ? '<span class="sub">回答の例が入っています</span>' : "") + '</div><div class="card-b stack"><textarea data-inf="reply">' + esc(d.reply != null ? d.reply : x.reply || "") + "</textarea>" +
          '<div class="form-actions"><button class="btn pri big" data-act="in-confirm" data-id="' + x.id + '">' + icon("send") + "回答を送って、回答済みにする</button></div></div></div>";
      }
    }
    var links = [];
    if (x.st === "done" && state.ext.appts.some(function (a) { return a.inbox === x.id; })) links.push('<button class="btn" data-act="cal-goto">' + icon("cal") + "来店予約で見る</button>");
    if (x.order && orderOf(x.order)) links.push('<button class="btn" data-act="order-open" data-no="' + x.order + '">' + icon("list") + "受注を開く（" + x.order + "）</button>");
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">' + esc(c.name + " · " + itemWhere(x)) + "</div><h2>" + esc(sama(x.name)) + '</h2><div class="dh-tags">' + stPillIn(x) + chTag(x.ch) + '<span class="tag plain">' + esc(x.via) + "</span></div></div>" +
      '<div class="dh-acts"><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    return head + '<div class="drawer-b">' + guide + action + (links.length ? '<div class="form-actions" style="margin-top:0">' + links.join("") + "</div>" : "") + detail + "</div>";
  }
  function bizFromWants(w) {
    w = w || [];
    if (w.indexOf("振袖") >= 0) return "furisode"; if (w.indexOf("卒業式袴") >= 0) return "hakama"; if (w.indexOf("七五三") >= 0) return "shichigosan";
    if (w.indexOf("白無垢") >= 0 || w.indexOf("色打掛") >= 0 || w.indexOf("紋付") >= 0) return "shrine";
    return "bridal";
  }
  function newLead(o) { // 受付から受注を作る（ご来店予約のステージ）
    var x = { no: nextNo(), customer: sama(o.customer).replace(/ 様$/, "様"), biz: o.biz, store: o.store, costumes: [], date: o.date || dayStr(200), dateTbd: !o.date, dateLabel: o.dateLabel || "", stage: ST_FIRST, amount: 0, paid: 0, staff: o.staff,
      venue: o.venue || "", style: o.style || "", plan: o.plan || "", contractDate: null, source: o.source, checks: [true, false], req: noReq(), history: [[TODAY_S, "ご来店予約を受付（" + o.source + "）"]] };
    state.orders.unshift(x);
    return x;
  }
  function addAppt(a) { a.id = "a" + (state.ext.seq.a++); state.ext.appts.push(a); return a; }
  function confirmItem(x, d) {
    var v = venueOf(x.venue), msg = "";
    if (x.ch === "store") {
      var p = x.prefs[d.pick || 0], staff = d.staff || staffOf(x.store)[0];
      var o = x.order ? orderOf(x.order) : null;
      var when = parseWhen(x.detail), ven = parseVenue(x.detail);
      if (!o) o = newLead({ customer: x.name, biz: bizFromWants(x.wants), store: x.store, staff: staff, source: x.via === "LINE" ? "公式LINE" : x.via === "お電話" ? "お電話" : /Instagram/.test(x.via) ? "Instagram" : "Web（ご来店予約）",
        date: when ? when.date : null, dateLabel: when ? when.label : "", venue: ven ? ven.name : "", style: ven && ven.kind === "神前式" ? "神前式" : "" });
      x.order = o.no;
      addAppt({ date: p[0], t: p[1], type: "visit", order: o.no, staff: staff, store: x.store, inbox: x.id });
      msg = mdw(p[0]) + " " + p[1] + "〜で予約を確定しました。来店予約と受注（" + o.no + "）に入りました" + (when ? "（お日取り " + when.label + (ven ? "・" + ven.name : "") + "）" : "") + "。";
    } else if (x.ch === "fair" || x.ch === "tour" || x.ch === "meal") {
      addAppt({ date: x.date, t: x.ch === "fair" ? x.slot : x.time, type: x.ch, venue: x.venue, store: v ? v.store : null, name: x.name, inbox: x.id, staff: "" });
      msg = (x.ch === "fair" ? "フェアの予約" : x.ch === "tour" ? "見学の予約" : "お食事の予約") + "を確定しました。来店予約の予定表に入りました。";
      if (x.ch === "fair" && d.dress !== false && v) {
        var day = nextOpenAfter(x.date), sf = staffOf(v.store)[0];
        var o2 = newLead({ customer: x.name, biz: "bridal", store: v.store, staff: sf, source: "ブライダルフェア（ヴィラ・ノッツェ）", venue: v.name });
        x.order = o2.no;
        addAppt({ date: day, t: "14:00", type: "fitting", order: o2.no, staff: sf, store: v.store, inbox: x.id });
        msg += storeName(v.store) + "でのご試着（" + mdw(day) + " 14:00）も予約しました。";
      }
    } else if (x.ch === "request") msg = "資料を発送済みにしました。";
    else { x.reply = d.reply != null ? d.reply : x.reply; msg = "回答を送り、回答済みにしました。"; }
    x.st = "done"; x.by = U().name; x.doneAt = new Date().toISOString();
    audit(CH[x.ch].name + "を確認（" + sama(x.name) + " · " + itemWhere(x) + "）");
    return msg;
  }
  function safeToRender() { var a = document.activeElement; return !state.p3.drawer && !state.ui.pal && !state.ui.sheet && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)); }
  function simulateArrival(auto) {
    var pool = X.inboxPool, src = pool[state.ext.seq.pool % pool.length];
    state.ext.seq.pool++;
    var x = resolveItem(src, new Date().toISOString());
    x.id = "in" + (state.ext.seq.inb++); x.st = "new";
    if (x.ch === "fair") addBooking("fair", x.venue, x.fair, x.date, x.slot, x.id);
    if (x.ch === "meal") addBooking("meal", x.venue, x.meal, x.date, x.time, x.id);
    state.ext.inbox.push(x);
    save();
    if (!auto || safeToRender()) render();
    push(x);
  }
  // スマートフォンの通知のような知らせ（#push は描画の外にあるので、画面を描き直しても消えない）
  var pushEl = document.getElementById("push");
  function push(x) {
    if (!pushEl || !state.authed) return;
    var c = CH[x.ch];
    pushEl.innerHTML = '<div class="push-in"><span class="pi t-' + c.tone + '">' + icon(c.ico) + '</span><div class="pt"><span class="pk"><i class="live-dot"></i>いま届きました</span><b>' + esc(c.name + " · " + itemWhere(x)) + "</b><small>" + esc(sama(x.name) + " · " + itemSummary(x)) + "</small></div>" +
      '<div class="pa"><button type="button" class="btn sm pri" data-act="push-open" data-id="' + x.id + '">確認する</button><button type="button" class="iconbtn" data-act="push-close" aria-label="閉じる">' + icon("x") + "</button></div></div>";
    pushEl.classList.remove("show"); void pushEl.offsetWidth; pushEl.classList.add("show");
    clearTimeout(push.t); push.t = setTimeout(function () { pushEl.classList.remove("show"); }, 9000);
  }
  // 役員のホームを開いたままにすると、予約が届く（このページを開いている間に3件まで）
  function liveTick() {
    if (!state.authed || route() !== "home" || state.role !== "exec" || document.hidden) return;
    if (state.ui.liveN >= 3 || !safeToRender()) return;
    state.ui.liveN++;
    simulateArrival(true);
  }
  setInterval(liveTick, 40000);

  // ---------- フェア・お食事 ----------
  function slotRows(kind, v, item, date, mins, cap, edit) {
    var now = pad(new Date().getHours()) + ":" + pad(new Date().getMinutes());
    return item.slots.map(function (t) {
      var n = slotCount(kind, v.id, item.id, date, t, cap), s = slotState(n, cap), past = date === TODAY_S && t <= now;
      return '<div class="slotrow ' + s[2] + '"><span class="tr">' + t + "〜" + endTime(t, mins) + '</span><span class="ss ' + s[2] + '"><i>' + s[0] + "</i>" + s[1] + '</span><span class="bk">予約 ' + n + " / " + cap + "組</span>" +
        (edit && s[2] !== "full" && !past ? '<button class="btn sm pri" data-act="book-open" data-k="' + kind + '" data-v="' + v.id + '" data-f="' + item.id + '" data-d="' + date + '" data-t="' + t + '">予約する</button>'
          : '<span class="btn sm dis">' + (past ? "受付終了" : s[2] === "full" ? "満席" : "閲覧のみ") + "</span>") + "</div>";
    }).join("");
  }
  function fairCard(v, f, date) {
    return '<article class="fcard"><div class="fimg" style="background-image:url(\'' + f.img + '\')">' + (f.pick ? '<span class="pickb on-img">イチオシ</span>' : "") + "</div>" +
      '<div class="fbody"><div class="fmeta"><span>' + icon("cal") + esc(mdw(date)) + '</span><span>所要時間 120分</span><span class="free">無料</span>' + (f.online ? '<span class="tag t-info">オンライン</span>' : "") + "</div>" +
      "<h3>" + esc(f.title) + "</h3><p>" + esc(f.desc) + '</p><div class="chips">' + f.items.map(function (i) { return '<span class="chip static">' + esc(i) + "</span>"; }).join("") + "</div>" +
      (f.perks ? '<ul class="perks">' + f.perks.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") +
      '<div class="slots">' + slotRows("fair", v, f, date, 120, f.cap || 2, canEdit("fairs")) + "</div></div></article>";
  }
  function mealCard(v, m, date) {
    return '<article class="fcard"><div class="fimg" style="background-image:url(\'' + m.img + '\')"><span class="pickb on-img">例</span></div><div class="fbody"><div class="fmeta"><span>' + icon("cal") + esc(mdw(date)) + "</span><span>" + esc(m.people) + "</span></div>" +
      "<h3>" + esc(m.title) + "</h3><p>" + esc(m.desc) + '</p><div class="slots">' + slotRows("meal", v, m, date, 120, m.cap || 1, canEdit("fairs")) + "</div></div></article>";
  }
  function viewFairs() {
    var tab = state.ui.fairTab, v = venueOf(state.ui.fairVenue) || X.fairVenues[0], sched = fairSchedule(), wk = sched.filter(function (x) { return x.i < 7; });
    var booked = 0, open = 0;
    wk.forEach(function (x) { var cap = x.f.cap || 2; x.f.slots.forEach(function (t) { var n = slotCount("fair", x.v.id, x.f.id, x.date, t, cap); booked += n; open += cap - n; }); });
    var toDress = state.orders.filter(function (o) { return /ブライダルフェア/.test(o.source) && o.stage !== ST_DONE; }).length;
    var kpis = '<div class="kpis k4">' + kpi("今週のフェア", wk.length + "回", "2会場 · 今日から7日間") + kpi("フェアのご予約", booked + "組", "今週の合計（サンプル）") + kpi("空いている枠", open + "組分", "○・△の枠") + kpi("フェアから衣装のご試着へ", toDress + "件", "受注（ご来店予約〜）") + "</div>";
    var vtabs = '<div class="vtabs">' + X.fairVenues.map(function (x) {
      return '<button type="button" class="vtb' + (x.id === v.id ? " on" : "") + '" data-act="fair-venue" data-v="' + x.id + '"><span class="vimg" style="background-image:url(\'' + x.img + '\')"></span><span class="vtx"><b>' + esc(x.short) + "</b><small>" + esc(x.name) + "</small></span></button>";
    }).join("") + "</div>";
    var info = '<div class="vinfo">' + (v.addr ? "<span>" + icon("pin") + esc(v.addr) + "</span>" : "") + "<span>" + icon("phone") + esc(v.tel) + "</span><span>" + icon("cal") + esc(v.hours) + "</span><span>定休日 " + esc(v.closed) + "</span>" +
      '<span class="sp"></span><a class="extlink" href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">今のフェア予約ページ（式場）' + icon("ext") + "</a></div>";
    var seg = '<div class="seg big" role="group" aria-label="予約の種類"><button type="button" data-act="fair-tab" data-v="fair" class="' + (tab === "fair" ? "on" : "") + '">' + icon("ring") + "ブライダルフェア</button>" +
      '<button type="button" data-act="fair-tab" data-v="meal" class="' + (tab === "meal" ? "on" : "") + '">' + icon("meal") + "お食事のご予約（例）</button></div>";
    var vs = sched.filter(function (x) { return x.v.id === v.id; }), days = [];
    for (var i = 0; i < FAIR_DAYS; i++) days.push(addDays(TODAY, i));
    var sel = state.ui.fairDate;
    if (!sel || !days.some(function (d) { return ymd(d) === sel; }) || venueClosedOn(toDate(sel))) sel = tab === "fair" && vs[0] ? vs[0].date : openDay(0, true);
    var strip = '<div class="dstrip">' + days.map(function (d) {
      var s = ymd(d), closed = venueClosedOn(d), n = vs.filter(function (x) { return x.date === s; }).length;
      return '<button type="button" class="ds' + (s === sel ? " on" : "") + (closed ? " closed" : "") + (holi(s) ? " hol" : "") + (d.getDay() === 0 ? " sun" : d.getDay() === 6 ? " sat" : "") + '" data-act="fair-date" data-d="' + s + '"' + (closed ? " disabled" : "") + ">" +
        '<span class="m">' + (d.getMonth() + 1) + "/" + d.getDate() + '</span><span class="w">' + WD.charAt(d.getDay()) + (holi(s) ? "・祝" : "") + '</span><span class="n">' + (closed ? "定休" : tab === "fair" ? (n ? n + "件" : "—") : "○") + "</span></button>";
    }).join("") + "</div>";
    var body = tab === "fair" ? vs.filter(function (x) { return x.date === sel; }).map(function (x) { return fairCard(x.v, x.f, x.date); }).join("") || '<div class="notice">この日のフェアはありません。</div>'
      : X.meals.filter(function (m) { return m.venue === v.id; }).map(function (m) { return mealCard(v, m, sel); }).join("") || '<div class="notice">この会場のお食事の例はありません。</div>';
    return scopeNote("adv", "フェアの名前・中身・写真は、式場のサイトとフェアの予約ページから。日付・空席・予約の数はサンプルです。お食事のご予約は例として示しています（今お使いの受付にあるかは、打合せで伺います）。") +
      kpis + '<div class="card fair-wrap">' + vtabs + info + '<div class="fair-bar">' + seg + '<span class="sp"></span><span class="note-sm">' + esc(mdw(sel)) + (holi(sel) ? "（" + esc(holi(sel)) + "）" : "") + "</span></div>" + strip + "</div>" + '<div class="fairs">' + body + "</div>";
  }
  function bkField(label, key, val, ph, req) { return '<div class="field"><label>' + esc(label) + (req ? '<span class="req">必須</span>' : "") + '</label><input type="text" data-bk="' + key + '" value="' + esc(val || "") + '" placeholder="' + esc(ph || "") + '"></div>'; }
  function bookDrawer(d) {
    var dr = d.draft, v = venueOf(dr.venue), it = dr.kind === "fair" ? fairOf(dr.venue, dr.item) : mealOf(dr.item);
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">' + esc((dr.kind === "fair" ? "ブライダルフェア予約" : "お食事のご予約（例）") + " · " + v.short) + "</div><h2>" + esc(it.title) + "</h2>" +
      '<div class="dh-tags"><span class="tag gold ict">' + icon("cal") + esc(mdw(dr.date) + " " + dr.t + "〜" + endTime(dr.t, 120)) + "</span>" + (dr.kind === "fair" ? '<span class="tag plain">120分 · 無料</span>' : "") + "</div></div>" +
      '<div class="dh-acts"><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    var via = ["お電話", "ご来館", "LINE"].map(function (x) { return '<button type="button" class="chip' + (dr.via === x ? " on" : "") + '" data-act="bk-via" data-v="' + x + '">' + x + "</button>"; }).join("");
    var form = '<div class="card"><div class="card-b stack"><div class="form-grid">' +
      bkField("お名前", "name", dr.name, "例：三浦 遥", true) + bkField("ふりがな", "kana", dr.kana, "例：みうら はるか") + bkField("電話番号", "tel", dr.tel, "例：090-0000-0000", true) + bkField("メールアドレス", "mail", dr.mail, "例：name@example.com") +
      '<div class="field"><label>人数</label><select data-bk="people">' + [1, 2, 3, 4, 6, 8, 10, 12].map(function (n) { return '<option value="' + n + '"' + (+dr.people === n ? " selected" : "") + ">" + n + "名</option>"; }).join("") + "</select></div>" +
      '<div class="field"><span class="label">受付の方法</span><div class="chips">' + via + "</div></div></div>" +
      '<div class="field"><label>ご要望・メモ</label><input type="text" data-bk="note" value="' + esc(dr.note) + '" placeholder="' + (dr.kind === "fair" ? "例：出雲大社での挙式を考えています" : "例：両家の顔合わせ。甲殻類のアレルギーあり") + '"></div>' +
      (dr.kind === "fair" ? '<label class="ckline"><input type="checkbox" data-bk="dress"' + (dr.dress ? " checked" : "") + ">近くの衣装店（" + esc(storeName(v.store)) + "）でのドレスのご試着も予約する</label>" : "") + "</div></div>";
    return head + '<div class="drawer-b">' + form + '<div class="guide"><b>登録すると</b>' + (dr.kind === "fair" ? "フェアの予約に入り、来店予約の予定表と「予約の受付」に記録されます。ご試着も予約すると、" + esc(storeName(v.store)) + "の予定と受注（ご来店予約）に入ります。"
      : "お食事の予約に入り、来店予約の予定表と「予約の受付」に記録されます。") + "</div>" +
      '<div class="wfoot"><button class="btn" data-act="drawer-close">キャンセル</button><button class="btn pri" data-act="bk-save">予約を登録する</button></div></div>';
  }
  function srField(label, key, val, ph, req) { return '<div class="field"><label>' + esc(label) + (req ? '<span class="req">必須</span>' : "") + '</label><input type="text" data-sr="' + key + '" value="' + esc(val || "") + '" placeholder="' + esc(ph || "") + '"></div>'; }
  function storeResDrawer(d) {
    var dr = d.draft, closed = storeClosedOn(toDate(dr.date));
    var slots = X.storeSlots.map(function (t) {
      var n = state.ext.appts.filter(function (a) { return a.store === dr.store && a.date === dr.date && a.t === t; }).length, s2 = closed ? ["−", "定休日", "full"] : slotState(n, 2);
      return '<button type="button" class="slot ' + s2[2] + (dr.t === t ? " on" : "") + '" data-act="sr-slot" data-t="' + t + '"' + (s2[2] === "full" ? " disabled" : "") + "><b>" + t + "〜" + endTime(t, 60) + "</b><span>" + s2[0] + " " + s2[1] + "</span></button>";
    }).join("");
    var wants = X.wants.map(function (w) { return '<button type="button" class="chip' + (dr.wants.indexOf(w) >= 0 ? " on" : "") + '" data-act="sr-want" data-v="' + esc(w) + '">' + esc(w) + "</button>"; }).join("");
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">来店予約</div><h2>ご来店予約を受ける</h2><div class="dh-tags"><span class="tag plain">御社サイトのご予約フォームと同じ項目</span></div></div>' +
      '<div class="dh-acts"><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    return head + '<div class="drawer-b"><div class="card"><div class="card-b stack">' +
      '<div class="field"><span class="label">ご希望衣装（複数可）</span><div class="chips">' + wants + "</div></div>" +
      '<div class="form-grid"><div class="field"><label>ご来店店舗</label><select data-sr="store"' + (U().store ? " disabled" : "") + ">" + D.stores.map(function (s) { return '<option value="' + s.id + '"' + (s.id === dr.store ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>ご来店日</label><input type="date" data-sr="date" value="' + esc(dr.date) + '" min="' + TODAY_S + '"></div></div>' +
      '<div class="field"><span class="label">時間（1時間枠 · 1枠2組まで）' + (closed ? "　定休日（火曜。祝日は営業）です" : "") + '</span><div class="slotgrid">' + slots + "</div>" + (phoneRule(dr.date) ? '<p class="lc warn">' + esc(phoneRule(dr.date)) + "</p>" : "") + "</div>" +
      '<div class="form-grid">' + srField("お名前", "name", dr.name, "例：青山 美咲", true) + srField("ふりがな", "kana", dr.kana, "例：あおやま みさき") + srField("電話番号", "tel", dr.tel, "例：090-0000-0000", true) +
      '<div class="field"><label>担当</label><select data-sr="staff">' + staffOf(dr.store).map(function (n) { return "<option" + (n === dr.staff ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field"><label>その他詳細（挙式日・会場（学校）・ご使用日など）</label><input type="text" data-sr="detail" value="' + esc(dr.detail) + '" placeholder="例：2027年5月 挙式予定・ヴィラ・ノッツェ レガール松江"></div>' +
      "</div></div>" + '<div class="wfoot"><button class="btn" data-act="drawer-close">キャンセル</button><button class="btn pri" data-act="sr-save">予約を登録する</button></div></div>';
  }

  // ---------- お客様の声 ----------
  function voiceState(id) { return state.ext.voice[id] || {}; }
  function voiceStaff() { var out = []; X.voices.forEach(function (v) { (v.staff || []).forEach(function (n) { if (out.indexOf(n) < 0) out.push(n); }); }); return out; }
  function markStaff(text, v) { var h = esc(text); (v.staff || []).forEach(function (n) { h = h.split(esc(n)).join("<mark>" + esc(n) + "</mark>"); }); return h; }
  function viewVoice() {
    var tag = state.ui.voiceTag, vs = X.voices, counts = {};
    vs.forEach(function (v) { v.tags.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var tags = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var list = vs.filter(function (v) { return tag === "all" || v.tags.indexOf(tag) >= 0; });
    var shared = vs.filter(function (v) { return voiceState(v.id).shared; }).length;
    var kpis = '<div class="kpis k4">' + kpi("集めた声", vs.length + "件", "体験レポート（コルティーレ出雲）") + kpi("スタッフへの感謝", (counts["スタッフ"] || 0) + "件", voiceStaff().join("・") + "の名前が出ています") +
      kpi("料理をほめる声", (counts["料理"] || 0) + "件", "試食フェアの決め手にも") + kpi("従業員に共有", shared + "件", "全員のホームに出ます") + "</div>";
    var summary = '<div class="card ai-card"><div class="card-h"><h3><span class="ai-ic">' + icon("spark") + "</span>選ばれた理由のまとめ</h3>" + badge("adv") + '<span class="sub">AI が声を読み、テーマごとに数えます（このデモは決まった計算）</span></div><div class="card-b"><div class="themes">' +
      tags.map(function (t) { return '<button type="button" class="theme' + (tag === t ? " on" : "") + '" data-act="voice-tag" data-v="' + esc(t) + '"><b>' + esc(t) + "</b><span>" + counts[t] + '件</span><i style="width:' + Math.round(counts[t] / vs.length * 100) + '%"></i></button>'; }).join("") +
      '</div><p class="ai-sum">「スタッフの対応」と「料理」が、選ばれる理由の上位です。出雲大社での挙式と披露宴を同じ日にできること、ホームページの分かりやすさも決め手になっています。</p></div></div>';
    var chips = '<div class="chips"><button type="button" class="chip' + (tag === "all" ? " on" : "") + '" data-act="voice-tag" data-v="all">すべて ' + vs.length + "</button>" +
      tags.map(function (t) { return '<button type="button" class="chip' + (tag === t ? " on" : "") + '" data-act="voice-tag" data-v="' + esc(t) + '">' + esc(t) + " " + counts[t] + "</button>"; }).join("") + "</div>";
    var cards = list.map(function (v) {
      var st = voiceState(v.id);
      return '<article class="vcard' + (st.shared ? " shared" : "") + '"><div class="vhead"><span class="vwho">' + esc(v.who) + '</span><span class="vroom">' + esc(v.room + " · " + slashDate(v.date)) + "</span>" + (st.shared ? pill("共有済み", "good") : "") + "</div>" +
        '<p class="vq">' + icon("quote") + "<span>" + markStaff(v.quote, v) + "</span></p>" +
        '<dl class="vdl"><dt>決めたきっかけ</dt><dd>' + markStaff(v.why, v) + "</dd><dt>こだわり・印象に残ったこと</dt><dd>" + markStaff(v.memo, v) + "</dd></dl>" +
        '<div class="vtags">' + v.tags.map(function (t) { return '<span class="chip static">' + esc(t) + "</span>"; }).join("") + "</div>" +
        '<div class="vacts"><button type="button" class="btn sm' + (st.liked ? " liked" : "") + '" data-act="voice-like" data-id="' + v.id + '">' + icon("heart") + "ありがとう " + (st.likes || 0) + "</button>" +
        (v.staff || []).map(function (n) { return '<button type="button" class="btn sm" data-act="voice-send" data-id="' + v.id + '" data-n="' + esc(n) + '">' + icon("send") + esc(n) + "に届ける</button>"; }).join("") +
        (st.shared ? "" : '<button type="button" class="btn sm pri" data-act="voice-share" data-id="' + v.id + '">' + icon("share") + "従業員に共有</button>") +
        '<a class="extlink" href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">元の記事' + icon("ext") + "</a></div></article>";
    }).join("");
    var sources = '<div class="notice"><b>集める先</b><ul><li>式場のサイトの「体験レポート」（ここの6件。抜き書きは原文のまま・一部）</li><li>挙式のあとのアンケート・Google の口コミ・Instagram（例。つなぎ方は打合せで伺います）</li>' +
      "<li>スタッフの名前が出た声は、ご本人と店長に届けます。共有した声は、全員のホームに出ます。</li></ul></div>";
    var ig = X.insta, igCard = '<div class="card"><div class="card-h"><h3>' + icon("heart") + "Instagram</h3>" + '<span class="sub">@' + esc(ig.account) + "（マリエ・やしろ松江本店）· 投稿" + ig.posts + "件 · フォロワー" + ig.followers + "人（10月8日時点）</span>" +
      '<span class="sp"></span><a class="extlink" href="https://www.instagram.com/' + esc(ig.account) + '/" target="_blank" rel="noopener noreferrer">Instagram を開く' + icon("ext") + "</a></div>" +
      '<div class="card-b"><div class="igrow">' + ig.recent.map(function (c) { return '<iframe src="https://www.instagram.com/p/' + esc(c) + '/embed" loading="lazy" title="Instagram の投稿" scrolling="no"></iframe>'; }).join("") + "</div>" +
      '<p class="note-sm">Instagram 公式の埋め込みで、いまの投稿をそのまま表示しています。投稿へのコメントや、DM での試着のご予約（投稿に「試着のご予約はインスタのDM、公式LINEから」とあります）も、「予約の受付」に集めるイメージです（つなぎ方は打合せで伺います）。</p></div></div>';
    return scopeNote("adv", "お客様の声を集めて、従業員みんなで読めるようにします。良い声は励みに、改善の声は次のご案内に。") + kpis + summary + '<div class="filters">' + chips + "</div>" + '<div class="vgrid">' + cards + "</div>" + igCard + sources;
  }

  // ---------- いまの会社（役員のホーム）----------
  function liveFeed() {
    var ev = [], since = YEST_S;
    state.ext.inbox.forEach(function (x) {
      var t = new Date(x.at); if (ymd(t) < since) return;
      ev.push({ t: t.getTime(), ico: CH[x.ch].ico, tone: CH[x.ch].tone, title: CH[x.ch].name + " · " + itemWhere(x), sub: sama(x.name) + " · " + itemSummary(x), act: 'data-act="inbox-open" data-id="' + x.id + '"', isNew: x.st === "new" });
    });
    state.ext.audit.forEach(function (a) { var t = new Date(a.t); if (ymd(t) >= since && !/ログイン/.test(a.what)) ev.push({ t: t.getTime(), ico: "check", tone: "mute", title: a.what, sub: a.who, act: "" }); });
    state.ext.invoices.forEach(function (v) {
      if (!v.paid || v.paid < since) return;
      var o = orderOf(v.order), t = toDate(v.paid); t.setHours(10, 5, 0, 0);
      ev.push({ t: t.getTime(), ico: "wallet", tone: "good", title: "入金 · " + (o ? storeName(o.store) : ""), sub: (o ? o.customer : "") + " · " + v.type + " " + yen(invAmount(v)), act: "" });
    });
    return ev.sort(function (a, b) { return b.t - a.t; }).slice(0, 9);
  }
  function liveCard() {
    var ev = liveFeed();
    return '<div class="card live-card"><div class="card-h"><h3><span class="live-dot"></span>いまの動き</h3><span class="sub">予約・入金・確定が入ると、ここに流れます</span><span class="sp"></span>' +
      (canEdit("inbox") ? '<button class="linkbtn" data-act="inbox-sim">' + icon("live") + "予約が入ったとき（デモ）</button>" : "") + '</div><div class="feed">' +
      ev.map(function (e) {
        var d = new Date(e.t);
        return '<button type="button" class="fe' + (e.isNew ? " new" : "") + '" ' + e.act + '><span class="fe-t">' + (ymd(d) === TODAY_S ? "" : "昨日 ") + pad(d.getHours()) + ":" + pad(d.getMinutes()) + "</span>" +
          '<span class="fe-ic t-' + e.tone + '">' + icon(e.ico) + '</span><span class="fe-m"><b>' + esc(e.title) + "</b><small>" + esc(e.sub) + "</small></span>" + (e.isNew ? pill("新着", "bad") : "") + "</button>";
      }).join("") + "</div></div>";
  }
  function siteTiles() {
    var out = D.stores.map(function (s) {
      var closed = storeClosedOn(TODAY), tdy = state.ext.appts.filter(function (a) { return a.store === s.id && a.date === TODAY_S && !a.venue; }).length;
      var nw = state.ext.inbox.filter(function (x) { return x.st === "new" && x.store === s.id; }).length;
      var ytd = sumRange("sekou", FY_START_S, YEST_S, s.id), ly = sumRange("sekou", ymd(addYears(FY_START, -1)), ymd(addYears(YEST, -1)), s.id), r = ratio(ytd.sales, ly.sales);
      var staffN = X.employees.filter(function (e) { return e.store === s.id; }).length, off = state.ext.leave.filter(function (l) { var e = empOf(l.name); return e && e.store === s.id && l.date === TODAY_S && l.st === "承認済"; }).length;
      return '<a class="site" href="#/calendar" data-act="site-go" data-s="' + s.id + '"><div class="site-h"><span class="site-ic">' + icon("hanger") + "</span><b>" + esc(s.name) + '</b><span class="site-st ' + (closed ? "off" : "on") + '">' + (closed ? "定休日" : "営業中") + "</span></div>" +
        '<div class="site-n"><span><b>' + (closed ? "—" : tdy) + "</b>本日のご来店</span><span><b" + (nw ? ' class="dn"' : "") + ">" + nw + "</b>新着のご予約</span><span><b>" + (closed ? "—" : staffN - off) + "</b>出勤</span></div>" +
        '<div class="site-f"><span>今期 ' + mil(ytd.sales) + '</span><span class="' + upDn(r) + '">' + arrow(r) + "前年比 " + pct(r) + "</span></div></a>";
    });
    X.fairVenues.forEach(function (v) {
      var closed = venueClosedOn(TODAY), today = fairSchedule().filter(function (x) { return x.v.id === v.id && x.date === TODAY_S; }), wk = fairSchedule().filter(function (x) { return x.v.id === v.id && x.i < 7; }), bk = 0;
      wk.forEach(function (x) { x.f.slots.forEach(function (t) { bk += slotCount("fair", v.id, x.f.id, x.date, t, x.f.cap || 2); }); });
      var nw = state.ext.inbox.filter(function (x) { return x.st === "new" && x.venue === v.id; }).length;
      out.push('<a class="site ven" href="#/fairs" data-act="fair-venue-go" data-v="' + v.id + '"><div class="site-h"><span class="site-ic">' + icon("ring") + "</span><b>" + esc(v.short) + '</b><span class="site-st ' + (closed ? "off" : "on") + '">' + (closed ? "定休日" : "営業中") + "</span></div>" +
        '<div class="site-n"><span><b>' + (closed ? "—" : today.length) + "</b>本日のフェア</span><span><b" + (nw ? ' class="dn"' : "") + ">" + nw + "</b>新着のご予約</span><span><b>" + bk + "</b>今週のフェア予約（組）</span></div>" +
        '<div class="site-f"><span>ヴィラ・ノッツェ · ' + esc(storeName(v.store)) + "と連携</span></div></a>");
    });
    return '<div class="sites">' + out.join("") + "</div>";
  }
  function digestCard() {
    var nw = state.ext.inbox.filter(function (x) { return x.st === "new"; }), by = {};
    nw.forEach(function (x) { by[CH[x.ch].name] = (by[CH[x.ch].name] || 0) + 1; });
    var od = state.ext.invoices.filter(function (v) { return !v.paid && v.due < TODAY_S; }), fz = fairSchedule().filter(function (x) { return x.date === TODAY_S; });
    var items = [["live", "新しいご予約・お問い合わせが " + nw.length + "件", Object.keys(by).map(function (k) { return k + " " + by[k] + "件"; }).join("・") || "ありません"],
      ["ring", "本日のブライダルフェア " + fz.length + "回", fz.map(function (x) { return x.v.short + "「" + x.f.title + "」"; }).join(" / ") || "本日はありません"]];
    if (od.length) items.push(["wallet", "期限を過ぎた請求 " + od.length + "件", od.map(function (v) { var o = orderOf(v.order); return (o ? o.customer : "") + " " + yen(invAmount(v)); }).join("・")]);
    items.push(["quote", "お客様の声：スタッフへの感謝 " + X.voices.filter(function (v) { return v.tags.indexOf("スタッフ") >= 0; }).length + "件", voiceStaff().join("・") + "の名前が出ています（体験レポート）"]);
    var al = aiAlerts("all")[0]; if (al) items.push(["chart", al[2], al[3]]);
    return '<div class="card ai-card"><div class="card-h"><h3><span class="ai-ic">' + icon("spark") + "</span>今日の要点</h3>" + badge("adv") + '<span class="sub">朝6:00の集計と、いま入った予約から</span></div><div class="card-b stack">' +
      items.map(function (x) { return '<div class="dg"><span class="dg-ic">' + icon(x[0]) + "</span><div><b>" + esc(x[1]) + "</b><small>" + esc(x[2]) + "</small></div></div>"; }).join("") + "</div></div>";
  }
  function fairFunnelCard() {
    var st = [["フェアのご予約", 42], ["ご来場", 36], ["式場のご成約", 14], ["衣装のご成約", 11]];
    return '<div class="card"><div class="card-h"><h3>' + icon("ring") + "フェアから衣装まで（今月）</h3>" + badge("adv") + '<span class="sub">2会場の合計（サンプル）</span></div><div class="card-b funnel">' +
      st.map(function (s, i) { return '<div class="fstep"><span>' + s[0] + '</span><div class="t"><i style="width:' + Math.round(s[1] / st[0][1] * 100) + '%"></i></div><span class="num">' + s[1] + '組</span><span class="num muted">' + (i ? pct(s[1] / st[i - 1][1]) : "—") + "</span></div>"; }).join("") +
      '<p class="note-sm">式場のプランに含まれるドレス（1点・2点）も、衣装店の受注として数えます。</p></div></div>';
  }
  function inboxCard() {
    var nw = inboxNew();
    return '<div class="card"><div class="card-h"><h3>' + icon("inbox") + "新しいご予約</h3>" + badge("adv") + (nw.length ? pill(nw.length + "件", "bad") : "") + '<span class="sp"></span><a class="linkbtn" href="#/inbox">予約の受付へ →</a></div>' +
      (nw.length ? '<div class="wl">' + nw.slice(0, 4).map(function (x) {
        return '<button type="button" class="wli" data-act="inbox-open" data-id="' + x.id + '"><span class="wn ib t-' + CH[x.ch].tone + '">' + icon(CH[x.ch].ico) + '</span><span class="wt"><b>' + esc(sama(x.name) + " · " + CH[x.ch].name) + "</b><small>" + esc(itemWhere(x) + " · " + agoLabel(x.at) + " · " + itemSummary(x)) + "</small></span>" + icon("chev") + "</button>";
      }).join("") + "</div>" : '<div class="card-b"><p class="note-sm">新しいご予約はありません。</p></div>') + "</div>";
  }
  function voiceCard() {
    var sh = X.voices.filter(function (v) { return voiceState(v.id).shared; }), v = (sh.length ? sh : X.voices)[0];
    return '<div class="card voice-mini"><div class="card-h"><h3>' + icon("quote") + (sh.length ? "共有されたお客様の声" : "お客様の声") + "</h3>" + badge("adv") + '<span class="sp"></span><a class="linkbtn" href="#/voice">お客様の声へ →</a></div>' +
      '<div class="card-b"><p class="vq">' + icon("quote") + "<span>" + markStaff(v.quote, v) + '</span></p><p class="note-sm">' + esc(v.who + " · " + v.room + "（ヴィラ・ノッツェ コルティーレ出雲の体験レポート）") + "</p></div></div>";
  }
  function eventsCard() {
    return '<div class="card"><div class="card-h"><h3>' + icon("bell") + 'イベント・お知らせ</h3><span class="sub">御社サイトのトップから</span></div><div class="card-b evlist">' +
      X.events.map(function (e) { return '<div class="ev"><span class="nd">' + esc(e.date.replace(/-/g, " / ")) + '</span><span class="ntag">' + esc(e.store) + '</span><span class="nt">' + esc(e.title) + "</span></div>"; }).join("") +
      X.news.map(function (e) { return '<div class="ev news"><span class="nd">' + esc(e.date.replace(/-/g, ".")) + '</span><span class="ntag">' + esc(e.store) + '</span><span class="nt">' + esc(e.title) + "</span></div>"; }).join("") + "</div></div>";
  }

  // ---------- 保存するデータ（請求・経費・仕訳・休暇・操作の記録） ----------
  var SAL_ROWS = [["matsue", "松江本店"], ["izumo", "出雲店"], ["yonago", "米子店"], ["tottori", "鳥取店"], ["HQ", "本社"]];
  function salaryOf(mk) {
    var mn = mNum(mk), bonus = X.salaryBonusMonths.indexOf(mn) >= 0, f = 1 + ((mn % 3) - 1) * 0.003, out = {};
    SAL_ROWS.forEach(function (r) {
      var b = X.salary[r[0]], sal = Math.round(b[0] * f / 1000) * 1000, bo = bonus ? Math.round(b[0] * 1.2 / 10000) * 10000 : 0;
      out[r[0]] = [sal, bo, Math.round((b[1] * f + bo * 0.15) / 100) * 100, b[2]];
    });
    return out;
  }
  function salaryTotals(mk) {
    var d = salaryOf(mk), t = [0, 0, 0, 0];
    SAL_ROWS.forEach(function (r) { for (var j = 0; j < 4; j++) t[j] += d[r[0]][j]; });
    return t;
  }
  function seedExt() {
    var e = {};
    e.invoices = X.invoices.map(function (v) { return { no: v.no, order: v.order, type: v.type, base: v.base, issued: dayStr(v.issued), due: dayStr(v.due), paid: v.paid == null ? null : dayStr(v.paid) }; });
    e.expenses = X.expenses.map(function (x) { return { no: x.no, date: relDay(x.d), store: x.store, cat: x.cat, desc: tpl(x.desc), order: x.order, amount: x.amount, st: x.st, chk: x.chk, quote: x.quote || null }; });
    var m2 = monthKey(addMonths(TODAY, -2)), t2 = salaryTotals(m2);
    e.journal = X.journal.map(function (j, i) {
      var amt = j.dr === "sal" && j.d === "pe2" ? t2[0] : j.dr === "wel" && j.d === "pe2" ? t2[2] : j.amount;
      return { id: "j" + i, date: relDay(j.d), dr: j.dr, cr: j.cr, src: tpl(j.src), amount: amt, st: j.st };
    });
    e.sends = X.sends.map(function (x) { return { date: relDay(x.d), text: tpl(x.text) }; });
    e.leave = X.leave.map(function (l, i) {
      var d = addDays(TODAY, l.d); if (storeClosedOn(d)) d = addDays(d, 1); // 定休日（火。祝日は営業）に当たる見本は翌日へ
      return { id: "l" + i, name: l.name, type: l.type, date: ymd(d), days: l.days, st: l.st, note: l.note || "" };
    });
    e.posted = {};
    e.posted[m2] = true; e.posted[monthKey(addMonths(TODAY, -3))] = true;
    e.audit = X.audit.map(function (a) { var t = addDays(TODAY, a.d); t.setHours(a.h, a.m, 0, 0); return { t: t.toISOString(), who: a.who, what: a.what }; });
    e.seq = { ex: 122, j: 100, l: 100, a: 100, inb: 100, pool: 0, b: 100 };
    seedBookings(e);
    return e;
  }
  state.ext = saved.ext && Array.isArray(saved.ext.invoices) && saved.ext.seq && Array.isArray(saved.ext.inbox) && Array.isArray(saved.ext.appts) ? saved.ext : seedExt();
  state.ui = { expTab: "all", salMonth: monthKey(addMonths(TODAY, -1)), invSel: null, tkcMode: "api", custQ: "", calStore: "all", sheet: false, bell: false, pal: null,
    inboxTab: "all", fairVenue: "cortile", fairDate: null, fairTab: "fair", voiceTag: "all", liveN: 0 };
  function audit(what) {
    state.ext.audit.push({ t: new Date().toISOString(), who: U().name, what: what });
    if (state.ext.audit.length > 60) state.ext.audit.splice(0, state.ext.audit.length - 60);
  }
  function addJournal(dr, cr, src, amount) {
    state.ext.journal.push({ id: "j" + (state.ext.seq.j++), date: TODAY_S, dr: dr, cr: cr, src: src, amount: Math.round(amount), st: "送信可" });
  }

  // ---------- 顧客 ----------
  function custOf(o) {
    var ci = X.custInfo[o.no] || { id: "C-" + o.no.slice(-4), since: 0, past: [], next: "前撮り・記念日フォトのご案内" };
    var past = ci.past || [];
    return { o: o, ci: ci, past: past, ltv: o.amount + past.reduce(function (s, p) { return s + p[1]; }, 0), repeat: past.length > 0 };
  }
  function custListHtml() {
    var q = norm(state.ui.custQ || "");
    var rows = state.orders.filter(function (o) { return mine(o.store); }).map(custOf).filter(function (r) {
      return !q || norm(r.o.customer + r.ci.id + r.o.no).indexOf(q) >= 0;
    });
    var body = rows.map(function (r) {
      return '<tr class="click" data-act="cust-open" data-no="' + r.o.no + '"><td><div class="who"><span class="av sm">' + esc(r.o.customer.charAt(0)) + "</span><div><b>" + esc(r.o.customer) + "</b>" +
        (r.repeat ? ' <span class="tag gold">リピーター</span>' : "") + '<div class="sub2">' + esc(r.ci.id) + "</div></div></div></td><td>" + esc(storeName(r.o.store)) + "</td><td>" + esc(r.o.source) +
        '</td><td><span class="ono">' + r.o.no + "</span> · " + esc(bizOf(r.o.biz).name) + "</td><td>" + stagePill(r.o.stage) + '</td><td class="num">' + yen(r.ltv) + '</td><td class="muted">' + esc(r.ci.next) + "</td></tr>";
    }).join("") || '<tr><td colspan="7">条件に合うお客様はいません。</td></tr>';
    return '<div class="tbl-wrap"><table><thead><tr><th>お客様</th><th>店舗</th><th>経路</th><th>今の受注</th><th>ステージ</th><th class="num">累計のご利用額</th><th>次のご提案の機会</th></tr></thead><tbody>' + body + "</tbody></table></div>";
  }
  function viewCustomers() {
    var kpis = '<div class="kpis k4">' + kpi("顧客数", num(share(2418)) + "名", "直近3年にご利用") + kpi("今月の新規", num(share(64)) + "名", "うち Web予約 " + num(share(38)) + "名") +
      kpi("リピート率", "23%", "振袖 → 袴 → ウェディング", "up") + kpi("ヴィラ・ノッツェから", "31%", "自社の式場のフェア・ご紹介から") + "</div>";
    var bar = '<div class="filters">' + storeChip() + '<label class="srch">' + icon("search") + '<input type="text" data-act="cust-q" value="' + esc(state.ui.custQ) + '" placeholder="お名前・顧客番号・受注番号" aria-label="お客様を探す"></label><span class="sp"></span>' +
      (canEdit("customers") ? demoBtn("up", "Excelから取込", "デモでは取り込めません。本番では、今の顧客台帳（Excel）をそのまま取り込めます。") +
        demoBtn("plus", "顧客を追加", "デモでは追加できません。本番では、お名前・ご連絡先・ご希望を登録し、受注とひも付けます。", true) : "") + "</div>";
    return scopeNote("opt", "お客様ごとに、過去のご利用と、次のご提案の機会をまとめます（人数・割合はサンプル）。") + kpis + bar +
      '<div class="card"><div class="card-h"><h3>顧客一覧</h3><span class="sub">お客様ごとに、これまでの受注をまとめて見られます</span></div><div id="cust-list">' + custListHtml() + "</div></div>";
  }
  function customerDrawer(no) {
    var o = orderOf(no); if (!o) return "";
    var r = custOf(o), ci = r.ci;
    var hist = [{ date: o.date, tbd: o.dateTbd, what: bizOf(o.biz).name + "（" + (o.venue || "—") + "）", amt: o.amount, no: o.no, st: o.stage }].concat(r.past.map(function (p) {
      return { date: dayStr(p[2]), what: p[0], amt: p[1], no: null, st: ST_DONE };
    }));
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">' + esc(ci.id + " · " + storeName(o.store) + " · " + o.source) + "</div><h2>" + esc(o.customer) + '</h2><div class="dh-tags">' + bizTag(o.biz) +
      (r.repeat ? '<span class="tag gold">リピーター</span>' : "") + '<span class="tag plain">メールでのご案内：同意あり</span></div></div>' +
      '<div class="dh-acts"><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    var tiles = '<div class="itiles">' + itile("はじめてのご来店", slashDate(dayStr(ci.since))) + itile("累計のご利用額", yen(r.ltv)) + itile("ご利用の回数", hist.length + "回") +
      itile("担当", o.staff) + itile("経路", o.source) + itile("次のお日取り", oDate(o)) + "</div>";
    var histCard = '<div class="card"><div class="card-h"><h3>ご利用の履歴</h3></div><div class="tbl-wrap"><table><tbody>' + hist.map(function (h) {
      return "<tr" + (h.no ? ' class="click" data-act="order-open" data-no="' + h.no + '"' : "") + "><td>" + esc(h.tbd ? "未定" : slashDate(h.date)) + '</td><td class="wrap"><b>' + esc(h.what) + "</b>" + (h.no ? ' <span class="ono">' + h.no + "</span>" : "") +
        "</td><td>" + stagePill(h.st) + '</td><td class="num">' + yen(h.amt) + "</td></tr>";
    }).join("") + "</tbody></table></div></div>";
    var nextCard = '<div class="card"><div class="card-h"><h3>次のご提案の機会</h3><span class="sub">ご利用の流れから</span></div><div class="card-b"><div class="next-op"><span class="ic">' + icon("spark") + "</span><div><b>" + esc(ci.next) + "</b>" +
      (ci.note ? "<p>" + esc(ci.note) + "</p>" : "<p>時期が来たら、担当者にお知らせします。</p>") + "</div>" +
      demoBtn("bell", "時期が来たら知らせる", "デモでは設定できません。本番では、次のご提案の時期をメモすると、その時期に担当者へお知らせします。") + "</div></div></div>";
    var req = o.req || noReq(), memo = [req.colorNote, req.design, req.other].filter(Boolean).join(" / ");
    var memoCard = '<div class="card"><div class="card-h"><h3>ご要望のメモ</h3></div><div class="card-b note-sm">' + (memo ? esc(memo) : "まだ記録がありません。受注の「編集」から記録できます。") + "</div></div>";
    return head + '<div class="drawer-b">' + tiles + nextCard + histCard + memoCard + "</div>";
  }

  // ---------- 来店予約 ----------
  // 予約：{ id, date, t, type, order（受注番号）, staff, store, venue（式場）, name, inbox（受付の番号） }
  function seedAppts() {
    return X.appts.map(function (a, i) {
      var o = P.orders.filter(function (x) { return x.no === a.order; })[0];
      var d = addDays(TODAY, a.d); if (storeClosedOn(d)) d = addDays(d, 1); // 定休日（火。祝日は営業）は翌日へ
      return { id: "a" + i, date: ymd(d), t: a.t, type: a.type, order: a.order, staff: a.staff, store: o ? o.store : null };
    });
  }
  function calDays() { var out = []; for (var i = 0; i < 7; i++) { var d = addDays(TODAY, i), s = ymd(d); out.push({ i: i, s: s, closed: storeClosedOn(d), hol: holi(s) }); } return out; }
  function sama(n) { return /様$/.test(n) ? n : n + " 様"; }
  function apptView(a) {
    var o = a.order ? orderOf(a.order) : null, v = a.venue ? venueOf(a.venue) : null;
    return { id: a.id, date: a.date, d: dayDiff(a.date, TODAY_S), t: a.t, type: a.type, o: o, name: o ? o.customer : sama(a.name || ""), staff: a.staff || "",
      store: a.store || (v ? v.store : null), venue: v, inbox: a.inbox || null };
  }
  function apptList() {
    var last = dayStr(6);
    return state.ext.appts.filter(function (a) { return a.date >= TODAY_S && a.date <= last; }).map(apptView)
      .filter(function (a) { return mine(a.store); }).sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : x.t < y.t ? -1 : x.t > y.t ? 1 : 0; });
  }
  function apptAct(a) { return a.o ? 'data-act="order-open" data-no="' + a.o.no + '"' : a.inbox ? 'data-act="inbox-open" data-id="' + a.inbox + '"' : ""; }
  function apptChip(a) {
    var t = X.apptTypes[a.type], where = a.venue ? a.venue.short : storeName(a.store);
    return '<button type="button" class="appt t-' + t.tone + (a.venue ? " ven" : "") + '" ' + apptAct(a) + '><span class="tm">' + a.t + '</span><span class="ty">' + esc(t.name) + "</span><b>" + esc(a.name) + "</b><small>" + esc(where + (a.staff ? " · " + a.staff : "")) + "</small></button>";
  }
  function viewCalendar() {
    var f = U().store ? "all" : state.ui.calStore, days = calDays();
    var list = apptList().filter(function (a) { return f === "all" || a.store === f; });
    var today = list.filter(function (a) { return a.d === 0; }), fit = list.filter(function (a) { return a.type === "fitting" || a.type === "size"; }), ven = list.filter(function (a) { return a.venue; });
    var kpis = '<div class="kpis k4">' + kpi("今週の予約", list.length + "件", slashDate(days[0].s) + "〜" + slashDate(days[6].s)) +
      kpi("本日の予約", days[0].closed ? "定休日" : today.length + "件", days[0].closed ? "火曜日（祝日は営業）" : today.length ? "最初は " + today[0].t : "予約はありません") +
      kpi("ご試着・サイズ補正", fit.length + "件", "衣装の準備が要ります") + kpi("式場のフェア・見学・お食事", ven.length + "件", "ヴィラ・ノッツェ") + "</div>";
    var legend = '<div class="legend">' + Object.keys(X.apptTypes).filter(function (k) { return k !== "tour"; }).map(function (k) { var t = X.apptTypes[k]; return '<span><i class="lg-' + t.tone + '"></i>' + esc(t.name) + "</span>"; }).join("") + "</div>";
    var filters = '<div class="filters">' + (U().store ? storeChip() : sel("cal-store", "calStore", state.ui.calStore, STORE_OPTS)) +
      '<span class="note-sm">営業 ' + esc(D.storeHours) + " · 定休日 " + esc(D.storeClosed) + " · ご来店は完全予約制</span><span class=\"sp\"></span>" +
      (canEdit("calendar") ? '<button class="btn pri" data-act="store-res">' + icon("plus") + "ご来店予約を受ける</button>" : "") + "</div>";
    var cols = days.map(function (d) {
      var items = list.filter(function (a) { return a.date === d.s; });
      return '<div class="day' + (d.i === 0 ? " today" : "") + (d.closed ? " closed" : "") + (d.hol ? " hol" : "") + '"><div class="day-h"><span>' + esc(mdw(d.s)) + (d.hol ? '<em class="holi">' + esc(d.hol) + "</em>" : "") + "</span>" +
        (d.i === 0 ? "<small>本日</small>" : "") + '</div><div class="day-b">' +
        (d.closed ? '<p class="closed-l">定休日</p>' : items.map(apptChip).join("") || '<p class="empty-s">予約なし</p>') + "</div></div>";
    }).join("");
    return scopeNote("opt", "来店予約は、受注のステージとつながっています。予約を押すと、その受注を開きます。式場のフェア・見学・お食事の予約も、同じ予定表に入ります（発展機能）。") +
      kpis + filters + legend + '<div class="cal-wrap"><div class="cal">' + cols + "</div></div>";
  }

  // ---------- 請求と入金 ----------
  function invAmount(v) { return v.base + Math.round(v.base * 0.1); }
  function invStatus(v) { if (v.paid) return ["入金済", "good"]; if (v.due < TODAY_S) return ["期限超過", "bad"]; if (v.due === TODAY_S) return ["本日期限", "warn"]; return ["発行済", "mute"]; }
  function invOf(no) { for (var i = 0; i < state.ext.invoices.length; i++) if (state.ext.invoices[i].no === no) return state.ext.invoices[i]; return null; }
  function invList() { return state.ext.invoices.filter(function (v) { var o = orderOf(v.order); return o && mine(o.store); }); }
  function invLines(v, o) {
    if (v.type === "内金") return [["内金（ご成約のとき） · " + bizOf(o.biz).name, v.base]];
    var cs = (o.costumes || []).map(cosOf).filter(Boolean);
    var lines = cs.map(function (c) { return ["レンタル · " + c.code + " " + c.name, c.price]; });
    var rest = o.amount - cs.reduce(function (s, c) { return s + c.price; }, 0);
    if (!cs.length) lines = [[bizOf(o.biz).name + " 一式", o.amount]];
    else if (rest > 0) lines.push([X.otherLine[o.biz] || "着付け・小物など", rest]);
    if (o.amount - v.base > 0) lines.push(["内金（入金済み）", -(o.amount - v.base)]);
    return lines;
  }
  function viewInvoices() {
    var list = invList(), open = list.filter(function (v) { return !v.paid; }), edit = canEdit("invoices");
    var od = open.filter(function (v) { return v.due < TODAY_S; }), wk = open.filter(function (v) { return v.due >= TODAY_S && v.due <= dayStr(7); });
    var paidM = list.filter(function (v) { return v.paid && v.paid.slice(0, 7) === CUR; });
    var tot = function (a) { return a.reduce(function (s, v) { return s + invAmount(v); }, 0); };
    var kpis = '<div class="kpis k4">' + kpi("未入金", yen(tot(open)), open.length + "件") + kpi("7日以内に期限", yen(tot(wk)), wk.length + "件 · 内金・残金") +
      kpi("期限超過", yen(tot(od)), od.length ? od.length + "件 · お客様へご連絡を" : "ありません", od.length ? "dn" : "") + kpi("今月の入金", yen(tot(paidM)), paidM.length + "件 · 振込・カード", "up") + "</div>";
    var cur = invOf(state.ui.invSel);
    if (!cur || !orderOf(cur.order) || !mine(orderOf(cur.order).store)) cur = open[0] || list[0];
    var rows = list.slice().sort(function (a, b) { return a.issued < b.issued ? 1 : a.issued > b.issued ? -1 : 0; }).map(function (v) {
      var o = orderOf(v.order), st = invStatus(v);
      return '<tr class="click' + (cur && cur.no === v.no ? " sel" : "") + '" data-act="inv-sel" data-no="' + v.no + '"><td><span class="ono">' + v.no + "</span></td><td><b>" + esc(o.customer) + '</b><div class="sub2">' + o.no + " · " + esc(storeName(o.store)) +
        "</div></td><td>" + esc(v.type) + "</td><td>" + esc(slashDate(v.issued)) + "</td><td>" + esc(slashDate(v.due)) + '</td><td class="num">' + yen(invAmount(v)) + "</td><td>" + pill(st[0], st[1]) + "</td><td>" +
        (!v.paid && edit ? '<button class="btn sm" data-act="inv-pay" data-no="' + v.no + '">入金を登録</button>' : v.paid ? '<span class="note-sm">' + esc(slashDate(v.paid)) + " 入金</span>" : "") + "</td></tr>";
    }).join("") || '<tr><td colspan="8">請求書はありません。</td></tr>';
    var table = '<div class="card"><div class="card-h"><h3>請求書</h3><span class="sub">成約のときに内金、お日取りの前に残金をご請求します</span><span class="sp"></span>' +
      (edit ? demoBtn("plus", "請求書を作成", "デモでは作成できません。本番では、受注の金額と入金済みの内金から、残金の請求書を作ります。", true) : '<span class="note-sm">閲覧のみ（' + esc(roleLabel(state.role)) + "）</span>") + "</div>" +
      '<div class="tbl-wrap"><table><thead><tr><th>請求書番号</th><th>お客様</th><th>種類</th><th>発行日</th><th>お支払期限</th><th class="num">金額（税込）</th><th>状態</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
    return scopeNote("opt", "インボイス制度に合った請求書（適格請求書）を、受注の内容から作ります。") + kpis + table + (cur ? invPreview(cur) : "");
  }
  function invPreview(v) {
    var o = orderOf(v.order), lines = invLines(v, o), sub = v.base, tax = Math.round(sub * 0.1), st = invStatus(v);
    var body = lines.map(function (l) { return "<tr><td>" + esc(l[0]) + '</td><td class="num' + (l[1] < 0 ? " neg" : "") + '">' + (l[1] < 0 ? "−" + yen(-l[1]) : yen(l[1])) + "</td></tr>"; }).join("");
    return '<div class="card"><div class="card-h"><h3>プレビュー · ' + esc(v.no) + "</h3>" + pill(st[0], st[1]) + '<span class="sub">適格請求書（インボイス制度）の形</span><span class="sp"></span>' +
      demoBtn("download", "PDFで保存", "デモでは PDF を作りません。本番では、この形の PDF を作り、お客様にメールでお送りします。") +
      (canEdit("invoices") ? '<button class="btn pri" data-act="p3-demo" data-msg="デモではメールを送りません。本番では、この請求書の PDF を、お客様のメールアドレスへ送ります。">' + icon("mail") + "お客様へメールで送る</button>" : "") + "</div>" +
      '<div class="card-b paper-wrap"><div class="paper"><h2>請 求 書</h2><div class="paper-top"><div class="to-box"><span class="to">' + esc(o.customer) + '</span><div class="pmeta">受注 ' + o.no + " · お日取り " + esc(slashDate(o.date)) + "</div>" +
      '<div class="amt-box"><span>ご請求金額（税込）</span><b>' + yen(sub + tax) + '</b></div><div class="pmeta">お支払期限 ' + esc(slashDate(v.due)) + "</div></div>" +
      '<div class="from"><span class="stamp" aria-hidden="true">印</span><b>マリエ・やしろ株式会社</b><span>' + esc(storeName(o.store)) + "</span><span class=\"pmeta\">" + esc(storeOf(o.store).addr || "") + "<br>TEL " + esc(storeOf(o.store).tel || "") + "</span>" +
      '<span class="reg">登録番号 T0000000000000（サンプル）</span><span class="pmeta">請求書番号 ' + esc(v.no) + "<br>発行日 " + esc(slashDate(v.issued)) + "</span></div></div>" +
      '<table><thead><tr><th>品目</th><th class="num">金額（税抜）</th></tr></thead><tbody>' + body + "</tbody></table>" +
      '<div class="tot"><table><tbody><tr><td>小計（10%対象）</td><td class="num">' + yen(sub) + '</td></tr><tr><td>消費税（10%）</td><td class="num">' + yen(tax) + '</td></tr><tr class="gt"><td>合計</td><td class="num">' + yen(sub + tax) + "</td></tr></tbody></table></div>" +
      '<p class="paper-note">お振込先：〇〇銀行 〇〇支店 普通 0000000（サンプル）。金額・登録番号・お振込先はサンプルです（社名・店舗の住所と電話は御社サイトから）。</p></div></div></div>';
  }

  // ---------- 経費 ----------
  function expList() {
    return state.ext.expenses.filter(function (e) { return mine(e.store); }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.no < b.no ? 1 : -1; });
  }
  function expOf(no) { for (var i = 0; i < state.ext.expenses.length; i++) if (state.ext.expenses[i].no === no) return state.ext.expenses[i]; return null; }
  function chkPill(e) { return e.chk === "金額相違" ? pill("金額相違", "bad") : e.chk === "定期" ? pill("定期", "mute") : e.chk === "確認済" ? pill("確認済", "info") : pill("一致", "good"); }
  function stPill(s) { return s === "承認済" ? pill(s, "good") : s === "承認待ち" ? pill(s, "warn") : s === "要確認" ? pill(s, "bad") : pill(s, "mute"); }
  function viewExpenses() {
    var list = expList(), canSal = state.role === "exec" || state.role === "accounting", tab = state.ui.expTab;
    if (tab === "salary" && !canSal) tab = "all";
    var mon = list.filter(function (e) { return e.date.slice(0, 7) === CUR; });
    var wait = list.filter(function (e) { return e.st === "承認待ち"; }).length, diff = list.filter(function (e) { return e.st === "要確認"; }).length;
    var linked = list.filter(function (e) { return e.order; }).length;
    var kpis = '<div class="kpis k4">' + kpi("今月の経費（税込）", yen(mon.reduce(function (s, e) { return s + e.amount; }, 0)), mon.length + "件") +
      kpi("承認待ち", wait + "件", wait ? "承認すると TKC への仕訳に入ります" : "ありません") +
      kpi("業者の請求書と相違", diff + "件", diff ? "見積と請求の差を確かめます" : "ありません", diff ? "dn" : "") +
      kpi("受注にひも付け", list.length ? Math.round(linked / list.length * 100) + "%" : "—", "受注ごとの粗利が分かります") + "</div>";
    var tabs = '<div class="tabs">' + [["all", "経費の一覧"], ["order", "受注ごとの粗利"]].concat(canSal ? [["salary", "月次の給与費"]] : []).map(function (t) {
      return '<button type="button" data-act="exp-tab" data-v="' + t[0] + '" class="' + (tab === t[0] ? "on" : "") + '">' + t[1] + "</button>";
    }).join("") + "</div>";
    var body = tab === "order" ? expByOrder(list) : tab === "salary" ? salaryHtml() : expTable(list);
    return scopeNote("opt", "受注に関わる費用はその受注にひも付けるので、受注ごとの粗利が分かります。") + kpis + '<div class="card">' + tabs + body + "</div>";
  }
  function expTable(list) {
    var ap = approver();
    var bar = '<div class="doc-bar">店舗の家賃などは、受注にひも付けずに登録します。<span class="sp"></span>' +
      (canEdit("expenses") ? demoBtn("up", "領収書を読み取る", "デモでは読み取れません。本番では、領収書や請求書の写真から、日付・金額・支払先を読み取って入力します。") +
        '<button class="btn pri" data-act="exp-new">' + icon("plus") + "経費を追加</button>" : "") + "</div>";
    var rows = list.map(function (e) {
      var o = e.order ? orderOf(e.order) : null;
      var act = e.st === "承認待ち" && ap ? '<button class="btn sm good" data-act="exp-ok" data-no="' + e.no + '">承認</button>' :
        e.st === "要確認" && ap ? '<button class="btn sm" data-act="exp-resolve" data-no="' + e.no + '">差を確かめて承認</button>' : stPill(e.st);
      return '<tr><td><b>' + esc(slashDate(e.date)) + '</b><div class="sub2">' + esc(e.no) + "</div></td><td>" + esc(e.cat) + '<div class="sub2">' + esc(storeName(e.store)) + '</div></td><td class="wrap">' + esc(e.desc) +
        (e.quote && e.chk === "金額相違" ? '<span class="diff">見積 ' + yen(e.quote) + " → 請求 " + yen(e.amount) + "（差 " + yen(e.amount - e.quote) + "）</span>" : "") + '<div class="sub2">' +
        (o ? '<button class="linkbtn ono" data-act="order-open" data-no="' + o.no + '">' + o.no + "</button> · " + esc(o.customer) : "店舗の経費（受注にひも付けない）") + '</div></td><td class="num">' + yen(e.amount) + "</td><td>" + chkPill(e) + "</td><td>" + act + "</td></tr>";
    }).join("") || '<tr><td colspan="6">経費はありません。</td></tr>';
    return bar + '<div class="tbl-wrap"><table><thead><tr><th>日付</th><th>費目</th><th>内容 · 受注</th><th class="num">金額（税込）</th><th>請求書との照合 ' + badge("sep") + "</th><th>承認</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<p class="hint">「業者の請求書との照合」は、提案書の別項目（業者の請求書の突き合わせ）です。見積と請求の金額が違うものを見つけてお知らせします。</p>';
  }
  function expByOrder(list) {
    var full = state.role === "exec" || state.role === "accounting", ids = [];
    list.forEach(function (e) { if (e.order && ids.indexOf(e.order) < 0) ids.push(e.order); });
    var rows = ids.map(function (id) {
      var o = orderOf(id); if (!o) return "";
      var net = Math.round(list.filter(function (e) { return e.order === id; }).reduce(function (s, e) { return s + e.amount; }, 0) / 1.1);
      return '<tr class="click" data-act="order-open" data-no="' + id + '"><td><span class="ono">' + id + "</span></td><td>" + esc(o.customer) + "</td><td>" + stagePill(o.stage) + '</td><td class="num">' + yen(o.amount) + '</td><td class="num">' + yen(net) + "</td>" +
        (full ? '<td class="num">' + yen(o.amount - net) + '</td><td class="num up">' + pct(ratio(o.amount - net, o.amount)) + "</td>" : "") + "</tr>";
    }).join("");
    return '<div class="tbl-wrap"><table><thead><tr><th>受注</th><th>お客様</th><th>ステージ</th><th class="num">受注金額（税別）</th><th class="num">関連する経費（税別）</th>' + (full ? '<th class="num">粗利</th><th class="num">粗利率</th>' : "") + "</tr></thead><tbody>" +
      (rows || '<tr><td colspan="7">受注にひも付いた経費はありません。</td></tr>') + "</tbody></table></div>" +
      '<p class="hint">' + (full ? "粗利は、受注金額から関連する経費を引いたものです（衣装の購入費の配分は含みません）。" : "粗利は、役員と経理の方だけに表示します。") + "</p>";
  }
  function salaryHtml() {
    var months = [1, 2, 3].map(function (n) { return monthKey(addMonths(TODAY, -n)); });
    var m = months.indexOf(state.ui.salMonth) >= 0 ? state.ui.salMonth : months[0];
    var posted = !!state.ext.posted[m], data = salaryOf(m), cols = ["給与", "賞与", "法定福利費", "通勤手当"];
    var rows = SAL_ROWS.map(function (r) {
      var v = data[r[0]];
      return "<tr><td>" + r[1] + "</td>" + v.map(function (x) { return '<td class="num">' + (posted ? yen(x) : '<input type="text" inputmode="numeric" value="' + num(x) + '" aria-label="' + r[1] + 'の金額">') + "</td>"; }).join("") +
        '<td class="num"><b>' + yen(v.reduce(function (s, x) { return s + x; }, 0)) + "</b></td></tr>";
    }).join("");
    var t = salaryTotals(m), g = t.reduce(function (s, x) { return s + x; }, 0);
    return '<div class="card-b" style="display:grid;gap:12px"><div class="guide"><b>月に一度、給与費の合計だけを入力します</b>給与の計算は、今お使いの給与計算サービスのままです。店舗・部門ごとの合計を入力して計上すると、経費に入り、店舗別の利益と TKC への仕訳に反映されます。</div>' +
      '<div class="filters"><select data-act="sal-month" aria-label="月">' + months.map(function (x) { return '<option value="' + x + '"' + (x === m ? " selected" : "") + ">" + jpMonth(x) + "分</option>"; }).join("") + "</select>" +
      (posted ? pill("計上済み", "good") : pill("下書き", "warn")) + '<span class="sp"></span>' +
      (posted ? "" : demoBtn("up", "給与計算の CSV を取り込む", "デモでは取り込めません。本番では、給与計算サービスの CSV から、店舗・部門ごとの合計を取り込みます。") + '<button class="btn pri" data-act="sal-post" data-m="' + m + '">経費に計上する</button>') + "</div></div>" +
      '<div class="tbl-wrap salary"><table><thead><tr><th>店舗・部門</th>' + cols.map(function (c) { return '<th class="num">' + c + "</th>"; }).join("") + '<th class="num">合計</th></tr></thead><tbody>' + rows +
      '<tr class="tot"><td>合計</td>' + t.map(function (x) { return '<td class="num">' + yen(x) + "</td>"; }).join("") + '<td class="num">' + yen(g) + "</td></tr></tbody></table></div>";
  }
  function expNewDrawer(d) {
    var dr = d.draft, os = state.orders.filter(function (o) { return mine(o.store) && o.stage !== ST_DONE || o.no === dr.order; });
    var opt = function (list, v) { return list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === v ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join(""); };
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">経費</div><h2>経費を追加</h2></div><div class="dh-acts"><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    return head + '<div class="drawer-b"><div class="card"><div class="card-b"><div class="form-grid one">' +
      '<div class="field"><label for="x-order">受注（ひも付け）</label><select id="x-order" data-xf="order">' + opt([["", "受注にひも付けない（店舗の経費）"]].concat(os.map(function (o) { return [o.no, o.no + " · " + o.customer + " · " + bizOf(o.biz).name]; })), dr.order) + '</select><p class="help">受注にひも付けると、その受注の粗利に入ります。</p></div>' +
      '<div class="field"><label for="x-cat">費目</label><select id="x-cat" data-xf="cat">' + opt(X.expCats.map(function (c) { return [c, c]; }), dr.cat) + "</select></div>" +
      '<div class="field"><label for="x-date">日付</label><input type="date" id="x-date" data-xf="date" value="' + esc(dr.date) + '"></div>' +
      '<div class="field"><label for="x-sup">支払先<span class="req">必須</span></label><input type="text" id="x-sup" data-xf="supplier" value="' + esc(dr.supplier) + '" placeholder="例：アトリエ・ブラン（お直し）"></div>' +
      '<div class="field"><label for="x-amt">金額（税込）<span class="req">必須</span></label><input type="number" id="x-amt" data-xf="amount" value="' + esc(dr.amount) + '" min="0" step="100" inputmode="numeric" placeholder="例：33000"></div>' +
      '<div class="field"><label for="x-file">領収書・請求書</label><input type="file" id="x-file" accept="image/*,application/pdf"><p class="help">デモでは、選んだファイルは保存しません。</p></div>' +
      '</div></div></div><div class="guide"><b>承認のあと、TKC への仕訳に入ります</b>店長または経理が承認すると、費目に合った勘定科目で仕訳を作ります。業者の請求書と見積の金額が違うときは「要確認」になります。</div>' +
      '<div class="wfoot"><button class="btn" data-act="drawer-close">キャンセル</button><button class="btn pri" data-act="exp-save">承認を申請する</button></div></div>';
  }

  // ---------- TKC連携 ----------
  function viewTkc() {
    var j = state.ext.journal.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var ready = j.filter(function (x) { return x.st === "送信可"; }), hold = j.filter(function (x) { return x.st === "科目要確認"; });
    var sentM = j.filter(function (x) { return (x.st === "送信済" || x.st === "書出済") && x.date.slice(0, 7) === CUR; }).length;
    var sends = state.ext.sends.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }), last = sends[0];
    var mode = state.ui.tkcMode, edit = canEdit("tkc");
    var kpis = '<div class="kpis k4">' + kpi("送れる仕訳", ready.length + "件", "承認・入金・計上が済んだもの") + kpi("科目の確認待ち", hold.length + "件", hold.length ? "経理が確かめてから送ります" : "ありません", hold.length ? "dn" : "") +
      kpi("今月の仕訳（送った分）", sentM + "件", "API か CSV で") + kpi("最後に送った日", last ? slashDate(last.date) : "—", last ? last.text : "") + "</div>";
    var head = '<div class="card-h"><h3>TKC への仕訳</h3><span class="sub">新しい仕組みから TKC へ、一方向で渡します</span><span class="sp"></span>' +
      '<div class="seg" role="group" aria-label="渡し方"><button type="button" data-act="tkc-mode" data-v="api" class="' + (mode === "api" ? "on" : "") + '">FXクラウドの API</button>' +
      '<button type="button" data-act="tkc-mode" data-v="csv" class="' + (mode === "csv" ? "on" : "") + '">CSV ファイル</button></div>' +
      (edit ? '<button class="btn pri" data-act="tkc-send"' + (ready.length ? "" : " disabled") + ">" + icon(mode === "api" ? "send" : "download") + (mode === "api" ? "送れる仕訳を送る（" : "CSV に書き出す（") + ready.length + "件）</button>"
        : '<span class="note-sm">送るのは経理の方です</span>') + "</div>";
    var rows = j.map(function (x) {
      var tone = x.st === "送信可" ? "good" : x.st === "科目要確認" ? "warn" : "mute";
      return "<tr><td>" + esc(slashDate(x.date)) + "</td><td>" + esc(acctName(x.dr)) + ' <span class="sub2">' + acctCode(x.dr) + "</span></td><td>" + esc(acctName(x.cr)) + ' <span class="sub2">' + acctCode(x.cr) +
        "</span></td><td>" + esc(x.src) + '</td><td class="num">' + yen(x.amount) + "</td><td>" + pill(x.st, tone) + "</td></tr>";
    }).join("");
    var table = '<div class="card">' + head + '<div class="tbl-wrap"><table><thead><tr><th>日付</th><th>借方</th><th>貸方</th><th>元のデータ</th><th class="num">金額</th><th>状態</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
    var map = '<div class="card"><div class="card-h"><h3>勘定科目の対応表</h3><span class="sub">導入のときに会計事務所と決めます</span></div><div class="tbl-wrap"><table><thead><tr><th>新しい仕組みの項目</th><th>TKC の勘定科目</th><th>コード（サンプル）</th></tr></thead><tbody>' +
      X.mapping.map(function (m) { return '<tr><td class="wrap">' + esc(m[0]) + "</td><td>" + esc(acctName(m[1])) + "</td><td>" + acctCode(m[1]) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    var hist = '<div class="card"><div class="card-h"><h3>送った記録</h3></div><div class="card-b"><ul class="tl">' + sends.map(function (x) {
      return '<li><span class="d">' + esc(slashDate(x.date)) + "</span><br>" + esc(x.text) + "</li>";
    }).join("") + "</ul></div></div>";
    return scopeNote("p2", "会計事務所がお使いの TKC へ、仕訳を一方向で渡します。TKC の FX クラウドシリーズの公開 API でつなぐ前提で、API が使えない場合は CSV で渡します。") + kpis + table + '<div class="row g2e">' + map + hist + "</div>";
  }

  // ---------- 従業員 ----------
  function viewEmployees() {
    var st = U().store, list = X.employees.filter(function (e) { return !st || e.store === st; });
    var ft = list.filter(function (e) { return e.type === "正社員"; }).length;
    var kpis = '<div class="kpis k4">' + kpi("従業員数", st ? list.length + "名" : "140名", st ? "正社員 " + ft + "名・パート/アルバイト " + (list.length - ft) + "名（サンプル）" : "会社概要の人数（式場・フォトスタジオを含む）") +
      kpi("今年度の入社", st ? "1名" : "9名", st ? "今月 0名" : "今月 3名") + kpi("本日の休暇", st ? "1名" : "4名", "承認済みの休暇から") + kpi("契約の更新予定", st ? "1名" : "6名", "パート・アルバイト · 月末まで") + "</div>";
    var rows = list.map(function (e) {
      return '<tr><td class="muted">' + e.id + '</td><td><div class="who"><span class="av sm">' + esc(e.name.charAt(0)) + "</span><b>" + esc(e.name) + "</b></div></td><td>" + esc(storeLabel(e.store)) + "</td><td>" + esc(e.pos) + "</td><td>" + esc(e.type) +
        "</td><td>" + esc(e.joined) + '</td><td class="num">' + e.leave.toFixed(1) + '日</td><td><span class="chip static">' + esc(roleLabel(e.role)) + "</span></td></tr>";
    }).join("");
    var bar = (state.role === "exec" ? demoBtn("up", "Excelから取込", "デモでは取り込めません。本番では、今の従業員台帳（Excel）をそのまま取り込めます。") + demoBtn("plus", "従業員を追加", "デモでは追加できません。本番では、入社の手続きに合わせて登録し、システムの権限も同時に決めます。", true) : "");
    return scopeNote("adv", "従業員の台帳と、有給の残り・システムの権限を一か所で管理します（下の一覧の氏名はサンプル）。") + kpis +
      '<div class="card"><div class="card-h"><h3>従業員一覧</h3><span class="sub">' + (st ? esc(storeName(st)) + "の方（サンプル）" : "サンプルの " + list.length + "名を表示") + '</span><span class="sp"></span>' + bar + "</div>" +
      '<div class="tbl-wrap"><table><thead><tr><th>ID</th><th>氏名</th><th>所属</th><th>役職</th><th>雇用の形</th><th>入社日</th><th class="num">有給の残り</th><th>システムの権限</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  }

  // ---------- 休暇 ----------
  function leaveScope() {
    var r = state.role;
    return state.ext.leave.filter(function (l) {
      if (r === "exec") return true;
      if (r === "manager") { var e = empOf(l.name); return e && e.store === U().store; }
      return l.name === U().name;
    });
  }
  function leaveApprover(name) {
    var e = empOf(name), st = e ? e.store : null;
    if (e && e.role === "manager") return "石田 誠";
    var m = X.employees.filter(function (x) { return x.store === st && x.role === "manager"; })[0];
    return m ? m.name : "藤田 里奈";
  }
  function leaveChecks(date) {
    var out = [];
    if (!date) return [["warn", "日付を選んでください。"]];
    var diff = dayDiff(date, TODAY_S), dow = toDate(date).getDay();
    if (diff < 0) out.push(["bad", "過ぎた日は申請できません。"]);
    else if (diff < 3) out.push(["warn", "原則として3日前までに店長へ申し出ます（就業規則 第12条）。"]);
    if (storeClosedOn(toDate(date))) out.push(["info", "火曜日は定休日です。休暇の申請は要りません。"]);
    else if (dow === 2) out.push(["warn", "この火曜日は祝日（" + holi(date) + "）のため営業日です。"]);
    else if (dow === 0 || dow === 6) out.push(["warn", "土日は挙式・ブライダルフェアが多い日です。店長と相談のうえで申請してください（第12条）。"]);
    if (!out.length) out.push(["good", "この日は、取得を控える日に当たりません。"]);
    return out;
  }
  function leaveProc() {
    var me = empOf(U().name);
    return '<div class="proc"><div class="proc-h">' + badge("sep") + "<b>手続きの支援</b><span class=\"sub2\">答えのあと、そのまま申請まで</span></div>" +
      "<p>" + esc(family(U().name)) + "さんの有給休暇の残りは <b>" + (me ? me.leave.toFixed(1) : "—") + "日</b> です" + (me ? "（今年度の取得 " + me.taken + "日）" : "") + "。</p>" +
      '<div class="proc-acts"><button type="button" class="btn pri sm" data-act="leave-new" data-from="ai">' + icon("leave") + "有給休暇を申請する</button></div></div>";
  }
  function viewLeave() {
    var me = empOf(U().name), ap = state.role === "exec" || state.role === "manager", list = leaveScope().slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var top = '<div class="row g3">' +
      '<div class="card kpi"><div class="l">自分の有給の残り</div><div class="v">' + (me ? me.leave.toFixed(1) : "—") + '日</div><div class="d">繰越の分を含みます</div></div>' +
      '<div class="card kpi"><div class="l">今年度に取った日数</div><div class="v">' + (me ? me.taken : 0) + '日</div><div class="d">' + (me && me.grant10 ? "年5日以上の取得が必要です" : "年5日の取得義務の対象外") + "</div></div>" +
      '<div class="card kpi act-card"><button class="btn pri" data-act="leave-new">' + icon("plus") + "休暇を申請する</button><span class=\"note-sm\">規程アシスタントからも申請できます（" + badge("sep") + "手続きの支援）</span></div></div>";
    var rows = list.map(function (l) {
      var e = empOf(l.name), tone = l.st === "承認済" ? "good" : l.st === "却下" ? "bad" : "warn";
      return "<tr><td><b>" + esc(l.name) + '</b><div class="sub2">' + esc(storeLabel(e ? e.store : null)) + "</div></td><td>" + esc(l.type) + "</td><td>" + esc(mdw(l.date)) + '</td><td class="num">' + l.days + '日</td><td class="wrap st-cell">' + pill(l.st, tone) +
        (l.note ? '<div class="sub2">' + esc(l.note) + "</div>" : "") + "</td><td>" +
        (ap && l.st === "申請中" && l.name !== U().name ? '<button class="btn sm good" data-act="leave-ok" data-id="' + l.id + '">承認</button> <button class="btn sm badline" data-act="leave-ng" data-id="' + l.id + '">却下</button>' : "") + "</td></tr>";
    }).join("") || '<tr><td colspan="6">申請はありません。</td></tr>';
    var reqCard = '<div class="card"><div class="card-h"><h3>' + (ap ? "休暇の申請" : "自分の申請") + '</h3><span class="sub">申請 → 店長が承認 → 総務・人事に記録</span></div>' +
      '<div class="tbl-wrap"><table><thead><tr><th>従業員</th><th>種類</th><th>日付</th><th class="num">日数</th><th>状態</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
    var art = D.articles.filter(function (a) { return a.no === "第12条"; })[0];
    var rules = '<div class="card"><div class="card-h"><h3>もとにする規程</h3><span class="sub">就業規則 第12条</span></div><div class="card-b stack small">' +
      "<div><b>年次有給休暇</b><br>" + esc(art ? art.answer : "") + "</div>" +
      "<div><b>年5日の取得</b><br>10日以上もらえる方は、年5日以上取ります。足りない方は、下の表でお知らせします。</div>" +
      "<div><b>取得を控える日</b><br>挙式・ブライダルフェアの当日など、業務に大きな支障がある日は、日を変えてもらうことがあります。</div></div></div>";
    var track = "";
    if (ap) {
      var ppl = X.employees.filter(function (e) { return e.grant10 && (state.role === "exec" || e.store === U().store); });
      track = '<div class="card"><div class="card-h"><h3>年5日の取得の状況</h3><span class="sub">' + FY_LABEL + '</span></div><div class="card-b stack">' + ppl.map(function (e) {
        var p = Math.min(1, e.taken / 5);
        return '<div class="trk"><span>' + esc(e.name) + '</span><div class="bar"><i class="' + (e.taken < 3 ? "low" : "") + '" style="width:' + (p * 100).toFixed(0) + '%"></i></div><span class="' + (e.taken >= 5 ? "up" : "muted") + '">' + e.taken + " / 5日</span></div>";
      }).join("") + "</div></div>";
    }
    return scopeNote("adv", "休暇の申請・承認と、残りの日数の管理です。規程アシスタントから申請へ進む機能は、提案書の別項目（手続きの支援）です。") + top +
      '<div class="row g2">' + reqCard + rules + "</div>" + track;
  }
  function leaveDrawer(d) {
    var dr = d.draft, me = empOf(U().name), bal = me ? me.leave : 0;
    var days = dr.type === "年次有給休暇（半日）" ? 0.5 : 1, after = dr.type.indexOf("年次有給") === 0 ? bal - days : bal;
    var checks = leaveChecks(dr.date);
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">休暇' + (d.from === "ai" ? " · 規程アシスタントから" : "") + "</div><h2>休暇を申請する</h2>" +
      (d.from === "ai" ? '<div class="dh-tags">' + badge("sep") + '<span class="tag plain">手続きの支援</span></div>' : "") + '</div><div class="dh-acts"><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    return head + '<div class="drawer-b"><div class="card"><div class="card-b"><div class="form-grid one">' +
      '<div class="field"><label for="lv-type">種類</label><select id="lv-type" data-lv="type">' + X.leaveTypes.map(function (t) { return "<option" + (t === dr.type ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="lv-date">日付<span class="req">必須</span></label><input type="date" id="lv-date" data-lv="date" value="' + esc(dr.date) + '"></div>' +
      '<div class="field"><label for="lv-reason">理由（任意）</label><input type="text" id="lv-reason" data-lv="reason" value="' + esc(dr.reason) + '" placeholder="例：私用のため"></div>' +
      '</div></div></div><div class="lv-check">' + checks.map(function (c) { return '<div class="lc ' + c[0] + '">' + esc(c[1]) + "</div>"; }).join("") +
      '<div class="lc info">申請したあとの残り：<b>' + after.toFixed(1) + "日</b> · 承認する方：" + esc(leaveApprover(U().name)) + "さん</div></div>" +
      '<div class="wfoot"><button class="btn" data-act="drawer-close">キャンセル</button><button class="btn pri" data-act="leave-save">申請する</button></div></div>';
  }

  // ---------- ユーザー・権限 ----------
  var PERM_ROWS = ["ai", "docs", "voice", "results", "input", "confirm", "inbox", "calendar", "fairs", "customers", "orders", "inventory", "invoices", "expenses", "tkc", "employees", "leave", "users"];
  function viewUsers() {
    var matrix = '<div class="card"><div class="card-h"><h3>役職ごとの権限</h3><span class="sub">利益の数字は、役員と経理の方だけに表示します</span></div><div class="tbl-wrap"><table class="matrix"><thead><tr><th>機能</th>' +
      D.roles.map(function (r) { return "<th>" + esc(r.label) + "</th>"; }).join("") + "</tr></thead><tbody>" + PERM_ROWS.map(function (id) {
        var n = navOf(id);
        return "<tr><td>" + esc(n.label) + badge(n.ph === "opt" || n.ph === "adv" ? n.ph : "") + "</td>" + D.roles.map(function (r) { var p = perm(id, r.id); return '<td><span class="mx ' + p + '">' + esc(X.permLabel[p]) + "</span></td>"; }).join("") + "</tr>";
      }).join("") + '</tbody></table></div><p class="hint">店舗に属する方（役職者・従業員・アルバイト）には、自分の店舗の分だけを表示します。</p></div>';
    var users = '<div class="card"><div class="card-h"><h3>ユーザー</h3><span class="sub">すべてのアカウントで2段階認証が必要です</span><span class="sp"></span>' +
      demoBtn("plus", "ユーザーを招待", "デモでは招待できません。本番では、メールで招待し、はじめのログインで2段階認証を設定していただきます。", true) + "</div>" +
      '<div class="tbl-wrap"><table><thead><tr><th>氏名</th><th>メール</th><th>権限</th><th>所属</th><th>2段階認証</th><th>最後のログイン</th></tr></thead><tbody>' + X.employees.map(function (e) {
        return '<tr><td><div class="who"><span class="av sm">' + esc(e.name.charAt(0)) + "</span><b>" + esc(e.name) + '</b></div></td><td class="muted">' + esc(e.mail) + "@example.com</td><td>" + '<span class="chip static">' + esc(roleLabel(e.role)) + "</span></td><td>" + esc(storeLabel(e.store)) +
          "</td><td>" + (e.tfa ? pill("有効", "good") : pill("設定待ち", "warn")) + '</td><td class="muted">' + (e.last == null ? "—" : esc(slashDate(dayStr(e.last)))) + "</td></tr>";
      }).join("") + "</tbody></table></div></div>";
    var log = state.ext.audit.slice().sort(function (a, b) { return a.t < b.t ? 1 : -1; }).slice(0, 14);
    var logCard = '<div class="card"><div class="card-h"><h3>操作の記録</h3><span class="sub">誰が・いつ・何をしたかを残します（新しい順）</span></div><div class="tbl-wrap"><table><tbody>' + log.map(function (x) {
      return '<tr><td class="muted">' + esc(timeLabel(x.t)) + "</td><td><b>" + esc(x.who) + '</b></td><td class="wrap">' + esc(x.what) + "</td></tr>";
    }).join("") + '</tbody></table></div><p class="hint">このデモで操作した内容（ログイン・確定・承認・入金など）も、ここに記録されます。</p></div>';
    return scopeNote("base", "役職に応じた権限と、すべてのアカウントの2段階認証、操作の記録は、ご依頼の範囲に入っています。") + matrix + '<div class="row g2">' + users + logCard + "</div>";
  }

  // ---------- AIのお知らせ（発展機能） ----------
  function aiAlerts(store) {
    var out = [], lastM = monthKey(addMonths(TODAY, -1)), nm = monthKey(addMonths(TODAY, 1)), scope = store && store !== "all" ? store : null;
    var rows = D.stores.filter(function (s) { return !scope || s.id === scope; }).map(function (s) {
      var c = sum("sekou", lastM, s.id).sales, l = sum("sekou", shiftMonth(lastM, -12), s.id).sales;
      return { s: s, c: c, l: l, r: ratio(c, l) };
    }).filter(function (x) { return x.r != null; }).sort(function (a, b) { return a.r - b.r; });
    var worst = rows[0], best = rows[rows.length - 1];
    if (worst && worst.r < 0.98) out.push(["bad", "!", worst.s.name + "・" + mNum(lastM) + "月の売上が前年を下回りました（前年比 " + pct(worst.r) + "）", "施行月ベースで " + mil(worst.c) + "（前年 " + mil(worst.l) + "）。成約月ベースでも確かめると、原因を絞り込めます。"]);
    var nowB = 0, lyB = 0, lyEnd = ymd(addYears(YEST, -1)), nmLy = shiftMonth(nm, -12);
    DEALS.forEach(function (d) {
      if (scope && d.store !== scope) return;
      if (d.event.slice(0, 7) === nm) nowB += d.amount;
      if (d.event.slice(0, 7) === nmLy && d.contract <= lyEnd) lyB += d.amount;
    });
    var rb = ratio(nowB, lyB);
    if (rb != null) out.push([rb >= 1 ? "good" : "warn", rb >= 1 ? "▲" : "≈", mNum(nm) + "月の予約が、前年の同じ時期を" + (rb >= 1 ? "上回っています" : "下回っています") + "（" + pct(rb) + "）",
      "予約 " + mil(nowB) + "（前年の同じ時期 " + mil(lyB) + "）。" + (rb >= 1 ? "衣装の空き状況を早めに確かめておくと安心です。" : "フェアやご案内の時期を見直す目安になります。")]);
    if (best && best !== worst && best.r > 1.02) out.push(["good", "▲", best.s.name + "・" + mNum(lastM) + "月の売上が前年を上回りました（前年比 " + pct(best.r) + "）", "担当者別に見ると、伸びた方の取り組みを、ほかの店舗と共有できます。"]);
    D.stores.filter(function (s) { return !scope || s.id === scope; }).forEach(function (s) {
      var last = state.entries.filter(function (e) { return e.store === s.id; }).map(function (e) { return e.created; }).sort().pop();
      if (!last || (TODAY - new Date(last)) / 86400000 > 2) out.push(["warn", "!", s.name + "の実績の入力が、2日以上ありません", "入力の抜けがないか、店長に確かめてください。"]);
    });
    return out.slice(0, 4);
  }
  function aiCard(store) {
    var al = aiAlerts(store);
    return '<div class="card ai-card"><div class="card-h"><h3><span class="ai-ic">' + icon("spark") + "</span>AIのお知らせ</h3>" + badge("adv") + '<span class="sub">例年と違う動きを見つけてお知らせします</span></div><div class="card-b stack">' +
      (al.map(function (x) { return '<div class="alert"><span class="ic ' + x[0] + '">' + x[1] + "</span><div><h4>" + esc(x[2]) + "</h4><p>" + esc(x[3]) + "</p></div></div>"; }).join("") || '<p class="note-sm">いまお知らせすることはありません。</p>') +
      '<p class="note-sm">デモでは、サンプルの数字から決まった計算で出しています。数字への AI の活用は、第1段階の評価のあとにご提案します。</p></div></div>';
  }

  // ---------- ホーム（ダッシュボード） ----------
  function workItems() {
    var r = state.role, out = [];
    function add(page, label, n, unit, sub, tone) { if (n > 0 && allowed(page)) out.push({ page: page, label: label, n: n, unit: unit, sub: sub, tone: tone }); }
    add("inbox", "新しいご予約・お問い合わせ", inboxNew().length, "件", "確かめて、日時を確定します", "bad");
    if (r === "accounting") add("confirm", "実績の確定", pendingCount(), "件", "現場からの入力を確かめて確定します", "warn");
    if (approver()) {
      var ex = expList();
      add("expenses", "経費の承認", ex.filter(function (e) { return e.st === "承認待ち"; }).length, "件", "承認すると TKC への仕訳に入ります", "warn");
      add("expenses", "請求書と金額が違う経費", ex.filter(function (e) { return e.st === "要確認"; }).length, "件", "見積と請求の差を確かめます", "bad");
    }
    if (r === "exec" || r === "manager") add("leave", "休暇の申請", leaveScope().filter(function (l) { return l.st === "申請中" && l.name !== U().name; }).length, "件", "承認するか、日を変えてもらいます", "info");
    if (r === "exec" || r === "accounting") {
      var open = invList().filter(function (v) { return !v.paid; });
      var od = open.filter(function (v) { return v.due < TODAY_S; }), td = open.filter(function (v) { return v.due === TODAY_S; });
      add("invoices", "期限を過ぎた請求", od.length, "件", od.length ? orderOf(od[0].order).customer + " · " + yen(invAmount(od[0])) : "", "bad");
      add("invoices", "今日が期限の請求", td.length, "件", td.length ? orderOf(td[0].order).customer + " · " + yen(invAmount(td[0])) : "", "warn");
    }
    if (r === "accounting") add("tkc", "TKC へ送れる仕訳", state.ext.journal.filter(function (j) { return j.st === "送信可"; }).length, "件", "まとめて送れます", "good");
    if (r === "manager" || r === "staff") add("orders", "30日以内のお日取り", state.orders.filter(function (o) { return mine(o.store) && o.stage !== ST_DONE && o.date >= TODAY_S && o.date <= dayStr(30); }).length, "件", "準備の進み具合を確かめます", "gold");
    if (r === "staff" || r === "parttime" || r === "accounting") add("leave", "自分の休暇の申請", state.ext.leave.filter(function (l) { return l.name === U().name && l.st === "申請中"; }).length, "件", "店長の承認待ちです", "info");
    if (r !== "accounting") add("inventory", "今週戻る予定の衣装", state.costumes.filter(function (c) { return (c.status === "cleaning" || c.status === "repair") && c.backDate && c.backDate <= dayStr(7) && mine(c.store); }).length, "点", "クリーニング・お直しから戻ります", "mute");
    return out;
  }
  function workCount(w) { return w.filter(function (x) { return x.unit === "件"; }).reduce(function (s, x) { return s + x.n; }, 0); }
  var DESC = {
    ai: "質問すると、根拠の箇所を示して答えます", docs: "答えに使う文書と、文書ごとの閲覧範囲", voice: "体験レポートなどの声を集めて、みんなで共有", results: "施行月・成約月で、前年比・計画比", input: "成約・施行の数字を入力します", confirm: "現場の入力を確かめて確定します",
    inbox: "Web・LINE・お電話のご予約を1か所で", fairs: "ヴィラ・ノッツェのフェアの空席とご予約",
    orders: "ご来店予約からご返却までを8つのステージで", customers: "お客様ごとのご利用と、次のご提案", calendar: "1週間の来店予約（ご試着・補正・フェア）", inventory: "写真で選べる衣装の空き状況・予約",
    invoices: "内金・残金の請求と入金（適格請求書）", expenses: "経費の承認と、受注ごとの粗利", tkc: "TKC へ仕訳を一方向で渡します", employees: "従業員の台帳・有給の残り・権限", leave: "休暇の申請と承認、年5日の取得", users: "役職ごとの権限・2段階認証・操作の記録"
  };
  function todayCard(list, closed) {
    var body = closed ? '<div class="card-b"><p class="note-sm">本日は定休日です（火曜日。祝日は営業）。</p></div>' : list.length ? '<div class="wl">' + list.map(function (a) {
      var t = X.apptTypes[a.type];
      return '<button type="button" class="wli" ' + apptAct(a) + '><span class="tm">' + a.t + '</span><span class="wt"><b>' + esc(a.name) + '</b><small><i class="dotc lg-' + t.tone + '"></i>' + esc(t.name + " · " + (a.venue ? a.venue.short : storeName(a.store)) + (a.staff ? " · " + a.staff : "")) + "</small></span>" + icon("chev") + "</button>";
    }).join("") + "</div>" : '<div class="card-b"><p class="note-sm">本日の予約はありません。</p></div>';
    return '<div class="card"><div class="card-h"><h3>' + icon("cal") + "本日のご来店</h3>" + badge("opt") + '<span class="sp"></span><a class="linkbtn" href="#/calendar">来店予約へ →</a></div>' + body + "</div>";
  }
  function workCard(w) {
    var body = w.length ? '<div class="wl">' + w.map(function (x) {
      return '<a class="wli" href="#/' + x.page + '" data-act="go" data-v="' + x.page + '"><span class="wn ' + x.tone + '">' + x.n + "<small>" + esc(x.unit) + '</small></span><span class="wt"><b>' + esc(x.label) + "</b><small>" + esc(x.sub) + "</small></span>" + icon("chev") + "</a>";
    }).join("") + "</div>" : '<div class="card-b"><p class="note-sm">確認待ちはありません。</p></div>';
    return '<div class="card"><div class="card-h"><h3>' + icon("check") + "確認待ち</h3></div>" + body + "</div>";
  }
  function funnelCard() {
    var os = state.orders.filter(function (o) { return mine(o.store) && o.stage !== "完了"; }), max = 1;
    var st = P.stages.slice(0, 7).map(function (s) {
      var l = os.filter(function (o) { return o.stage === s; }); max = Math.max(max, l.length);
      return { s: s, n: l.length, amt: l.reduce(function (t, o) { return t + o.amount; }, 0) };
    });
    return '<div class="card"><div class="card-h"><h3>' + icon("list") + "受注のステージ</h3>" + badge("opt") + '<span class="sub">進行中 ' + os.length + '件</span><span class="sp"></span><a class="linkbtn" href="#/orders">受注管理へ →</a></div><div class="card-b funnel">' +
      st.map(function (x) { return '<div class="fstep"><span>' + esc(x.s) + '</span><div class="t"><i style="width:' + (x.n / max * 100).toFixed(0) + '%"></i></div><span class="num">' + x.n + '件</span><span class="num muted">' + (x.amt ? man(x.amt) : "—") + "</span></div>"; }).join("") + "</div></div>";
  }
  function stockCard() {
    var cs = state.costumes, cnt = {};
    cs.forEach(function (c) { var l = cosStatus(c).label; cnt[l] = (cnt[l] || 0) + 1; });
    var labels = [["貸出可", "good"], ["予約済", "gold"], ["貸出中", "rose"], ["クリーニング中", "info"], ["お直し中", "warn"]];
    var picks = cs.filter(function (c) { return c.pick && c.img; }).slice(0, 6);
    return '<div class="card"><div class="card-h"><h3>' + icon("hanger") + "本日の衣装在庫</h3>" + badge("opt") + '<span class="sub">デモの在庫 ' + cs.length + '点</span><span class="sp"></span><a class="linkbtn" href="#/inventory">衣装在庫へ →</a></div><div class="card-b stack">' +
      '<div class="pickrow">' + picks.map(function (c) { return '<button type="button" class="pk" data-act="cos-open" data-code="' + esc(c.code) + '" title="' + esc(c.name) + '"><img src="' + esc(c.img[0]) + '" alt="' + esc(c.name) + '" loading="lazy"><span>' + esc(cosStatus(c).label) + "</span></button>"; }).join("") + "</div>" +
      labels.map(function (l) { var n = cnt[l[0]] || 0; return '<div class="hbar"><span>' + l[0] + '</span><div class="t"><i class="bg-' + l[1] + '" style="width:' + (n / cs.length * 100).toFixed(0) + '%"></i></div><span class="num">' + n + "点</span></div>"; }).join("") + "</div></div>";
  }
  function modsHtml() {
    var groups = [];
    NAV.forEach(function (n) {
      if (n.id === "home" || !allowed(n.id)) return;
      var g = groups.filter(function (x) { return x.name === n.grp; })[0];
      if (!g) { g = { name: n.grp, items: [] }; groups.push(g); }
      g.items.push(n);
    });
    return '<div class="sec-h center">' + hpair("すべての機能", "Menu", "h3") + '<span class="sub">業務ごとに並べています。印のないものが、ご依頼の範囲（第1・第2段階）です。</span></div><div class="mods">' + groups.map(function (g) {
      return '<div class="card mod"><h4>' + esc(g.name) + "</h4>" + g.items.map(function (n) {
        return '<a href="#/' + n.id + '"><span class="mi">' + icon(n.ico) + '</span><span class="mt"><b>' + esc(n.label) + badge(n.ph === "opt" || n.ph === "adv" ? n.ph : "") + "</b><small>" + esc(DESC[n.id] || "") + "</small></span></a>";
      }).join("") + "</div>";
    }).join("") + "</div>";
  }
  function viewHome() {
    var u = U(), a = A(), w = workItems(), closed = storeClosedOn(TODAY), exec = state.role === "exec";
    var tdy = allowed("calendar") ? apptList().filter(function (x) { return x.d === 0; }) : [], tdyStore = tdy.filter(function (x) { return !x.venue; });
    var stats = [];
    if (allowed("inbox")) { var nw = inboxNew(); stats.push(["新しいご予約", nw.length + "件", nw.length ? "確認を待っています" : "ありません"]); }
    if (allowed("calendar")) stats.push(["本日のご来店", closed ? "定休日" : tdyStore.length + "件", closed ? "火曜日（祝日は営業）" : tdyStore.length ? "最初は " + tdyStore[0].t : "予約なし"]);
    if (a.results) {
      var st = a.results === "full" ? "all" : u.store;
      var ytd = sumRange("sekou", FY_START_S, YEST_S, st), ly = sumRange("sekou", ymd(addYears(FY_START, -1)), ymd(addYears(YEST, -1)), st);
      stats.push(["今期の売上" + (st === "all" ? "" : "（" + storeName(st) + "）"), mil(ytd.sales), arrow(ratio(ytd.sales, ly.sales)) + "前年比 " + pct(ratio(ytd.sales, ly.sales))]);
    } else {
      var me = empOf(u.name);
      if (me) stats.push(["有給の残り", me.leave.toFixed(1) + "日", "今年度 " + me.taken + "日取得"]);
    }
    if (stats.length < 3) stats.push(["確認待ち", workCount(w) + "件", w.length ? w[0].label : "ありません"]);
    var hero = '<section class="hero"><span class="mv" aria-hidden="true"></span><span class="mv-shade" aria-hidden="true"></span>' +
      '<div class="hero-t"><span class="script sm">Yashiro</span><span class="hero-date">' + esc(TODAY.getFullYear() + "年" + (TODAY.getMonth() + 1) + "月" + TODAY.getDate() + "日（" + WD.charAt(TODAY.getDay()) + "）" + (holi(TODAY_S) ? " " + holi(TODAY_S) : "")) + "</span>" +
      "<h2>" + greeting() + "、" + esc(family(u.name)) + "さん</h2><p>" + esc(roleLabel(state.role)) + (u.store ? "（" + esc(storeName(u.store)) + "）" : "") + "としてログインしています · 見られる画面と数字は、役職によって変わります</p></div>" +
      '<div class="hero-s">' + stats.map(function (s) { return '<div class="stat"><span class="l">' + esc(s[0]) + '</span><span class="v">' + esc(s[1]) + '</span><span class="d">' + esc(s[2]) + "</span></div>"; }).join("") + "</div>" + newsStrip(true) + "</section>";
    var live = exec ? '<div class="sec-h center">' + hpair("いまの会社", "Live", "h3") + '<span class="sub"><span class="live-dot"></span>4店舗と2つの式場の、いまの様子です。予約が入ると、そのまま流れてきます（数字はサンプル）。</span></div>' +
      siteTiles() + '<div class="row g2e">' + liveCard() + '<div class="stack">' + digestCard() + fairFunnelCard() + "</div></div>" : "";
    var row1 = [];
    if (allowed("inbox") && !exec) row1.push(inboxCard());
    if (allowed("calendar")) row1.push(todayCard(tdy, closed));
    row1.push(workCard(w));
    if (a.results) row1.push(aiCard(a.results === "full" ? "all" : u.store));
    var row2 = [];
    if (allowed("orders")) row2.push(funnelCard());
    if (allowed("inventory")) row2.push(stockCard());
    var row3 = [voiceCard(), eventsCard()];
    return hero + live + '<div class="row auto">' + row1.join("") + "</div>" + (row2.length ? '<div class="row g2e">' + row2.join("") + "</div>" : "") + '<div class="row g2e">' + row3.join("") + "</div>" + modsHtml() +
      '<div class="notice"><b>このデモについて</b><ul>' +
      "<li>店舗・式場・フェア・衣装・体験レポートの名前と写真は、御社と式場のサイトから（2026年10月8日時点）。お客様・従業員の氏名、金額・実績の数字、規程はサンプルです。</li>" +
      "<li>規程アシスタントは、本番では AI（Azure OpenAI）が文章で答えます。このデモでは、サンプルの規程から当てはまる条文を探して表示します。</li>" +
      "<li>印のない機能が、ご依頼の範囲（第1・第2段階）です。「オプション」は第3段階、「発展機能」はこれからのご提案です。</li>" +
      "<li>「予約の受付」の「Web から予約が入ったとき（デモ）」で、予約が届く様子を試せます。役員のホームを開いたままにすると、予約が届きます。</li>" +
      "<li>上部の役職の欄を切り替えると、ほかの役職の見え方を確かめられます。⌘K（Windows は Ctrl+K）で、画面をさがしたり規程に質問したりできます。</li>" +
      "<li>このデモで入力した内容は、お使いのブラウザの中だけに残ります。</li></ul></div>";
  }

  // ---------- 検索（⌘K） ----------
  var PAL_ACTS = [
    ["inbox-sim", "Web から予約が入ったとき（デモ）", "予約の受付", "live", function () { return canEdit("inbox"); }, null],
    ["store-res", "ご来店予約を受ける", "来店予約", "cal", function () { return canEdit("calendar"); }, "calendar"],
    ["order-new", "新規受注を登録", "受注管理", "plus", function () { return canEdit("orders"); }, "orders"],
    ["leave-new", "休暇を申請する", "休暇", "leave", function () { return allowed("leave"); }, "leave"],
    ["exp-new", "経費を追加", "経費", "wallet", function () { return canEdit("expenses"); }, "expenses"],
    ["theme", "表示を切り替える（ライト・ダーク）", "表示", "moon", function () { return true; }, null],
    ["reset", "デモのデータを元に戻す", "デモ", "undo", function () { return true; }, null]
  ];
  function palList() {
    var p = state.ui.pal, q = norm(p.q || ""), items = [];
    NAV.forEach(function (n) { if (allowed(n.id)) items.push({ k: "page", id: n.id, label: n.label, sub: n.grp + " · " + (DESC[n.id] || "ダッシュボード"), ico: n.ico, ph: n.ph }); });
    PAL_ACTS.forEach(function (x) { if (x[4]()) items.push({ k: "act", act: x[0], label: x[1], sub: x[2], ico: x[3], route: x[5] }); });
    if (q) items = items.filter(function (it) { return norm(it.label + it.sub).indexOf(q) >= 0; });
    if (p.q && p.q.trim()) items.push({ k: "ask", q: p.q.trim(), label: "規程アシスタントにきく：「" + p.q.trim() + "」", sub: "ナレッジ · 根拠の箇所を示して答えます", ico: "spark" });
    return items;
  }
  function palListHtml(items, idx) {
    return items.map(function (it, i) {
      return '<button type="button" class="pal-it' + (i === idx ? " on" : "") + '" data-act="pal-go" data-i="' + i + '"><span class="mi">' + icon(it.ico) + '</span><span class="mt"><b>' + esc(it.label) + "</b><small>" + esc(it.sub) + "</small></span>" +
        (it.ph === "opt" || it.ph === "adv" ? badge(it.ph) : "") + '<span class="kb">' + (it.k === "page" ? "移動" : it.k === "ask" ? "質問" : "操作") + "</span></button>";
    }).join("") || '<p class="note-sm" style="padding:14px 16px">見つかりませんでした。</p>';
  }
  function palHtml() {
    var p = state.ui.pal; if (!p) return "";
    var items = palList(); if (p.i >= items.length) p.i = Math.max(0, items.length - 1);
    return '<div class="overlay pal-ov" data-act="pal-close"></div><div class="pal" role="dialog" aria-modal="true" aria-label="画面をさがす・規程に質問">' +
      '<div class="pal-in">' + icon("search") + '<input type="text" id="pal-q" value="' + esc(p.q) + '" placeholder="画面の名前・操作、または規程への質問" autocomplete="off" aria-label="さがす"><kbd>Esc</kbd></div>' +
      '<div class="pal-list" id="pal-list">' + palListHtml(items, p.i) + '</div><div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> えらぶ</span><span><kbd>Enter</kbd> ひらく</span><span><kbd>⌘</kbd><kbd>K</kbd> いつでも</span></div></div>';
  }
  function palRefresh() {
    var box = document.getElementById("pal-list"); if (!box || !state.ui.pal) return;
    var items = palList(); if (state.ui.pal.i >= items.length) state.ui.pal.i = Math.max(0, items.length - 1);
    box.innerHTML = palListHtml(items, state.ui.pal.i);
    var on = box.querySelector(".pal-it.on"); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest" });
  }
  var NOEL = { getAttribute: function () { return null; } };
  function palRun(i) {
    var items = palList(), it = items[i]; if (!it) return;
    state.ui.pal = null;
    if (it.k === "page") { go(it.id); render(); return; }
    if (it.k === "ask") { go("ai"); render(); ask(it.q); return; }
    if (it.route && route() !== it.route) { state.keepDrawer = true; location.hash = "#/" + it.route; }
    acts[it.act](NOEL);
  }
  function openPal() { if (!state.authed) return; state.ui.pal = { q: "", i: 0 }; state.ui.bell = false; render(); }

  // ---------- 表示（ライト・ダーク） ----------
  var THEME_KEY = "bridal-demo-theme";
  function getTheme() { try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; } catch (e) { return "light"; } }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", t === "dark" ? "#141413" : "#FFFFFF");
  }
  applyTheme(getTheme());

  // ---------- 数字を数え上げる（画面を開いたときだけ） ----------
  function countUp(root) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Array.prototype.forEach.call(root.querySelectorAll(".kpi .v, .stat .v"), function (el) {
      var txt = el.textContent, m = txt.match(/-?[\d,]+(\.\d+)?/); if (!m) return;
      var target = parseFloat(m[0].replace(/,/g, "")), dec = m[1] ? m[1].length - 1 : 0, comma = m[0].indexOf(",") >= 0;
      var pre = txt.slice(0, m.index), post = txt.slice(m.index + m[0].length), t0 = null, done = false;
      function fmt(v) { return pre + (comma ? v.toLocaleString("ja-JP", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)) + post; }
      function step(ts) {
        if (done || !el.isConnected) return;
        if (t0 == null) t0 = ts;
        var p = Math.min(1, (ts - t0) / 750), e = 1 - Math.pow(1 - p, 3);
        el.textContent = p < 1 ? fmt(target * e) : txt;
        if (p < 1) requestAnimationFrame(step); else done = true;
      }
      el.textContent = fmt(0); requestAnimationFrame(step);
      setTimeout(function () { if (!done) { done = true; el.textContent = txt; } }, 1000); // 画面が裏にあって動きが止まっても、最後の数字は出す
    });
  }

  // ---------- 操作（足した画面の分） ----------
  var extActs = {
    "cust-open": function (el) { state.p3.drawer = { type: "customer", no: el.getAttribute("data-no") }; render(); },
    "cal-goto": function () { state.p3.drawer = null; go("calendar"); },
    "inv-sel": function (el, ev) { if (ev && ev.target.closest && ev.target.closest("button")) return; state.ui.invSel = el.getAttribute("data-no"); render(); var pv = document.querySelector(".paper"); if (pv && pv.scrollIntoView) pv.scrollIntoView({ behavior: "smooth", block: "nearest" }); },
    "inv-goto": function (el) { state.ui.invSel = el.getAttribute("data-no"); state.p3.drawer = null; go("invoices"); },
    "inv-pay": function (el) {
      var v = invOf(el.getAttribute("data-no")); if (!v || v.paid) return;
      var o = orderOf(v.order);
      v.paid = TODAY_S;
      if (o) {
        if (v.type === "内金") { o.paid = (o.paid || 0) + v.base; if (o.stage === ST_CONTRACT) { o.checks = o.checks || []; o.checks[1] = true; } o.history.push([TODAY_S, "内金の入金を確認（" + v.no + "）"]); }
        else { o.paid = o.amount; if (o.stage === "当日") { o.checks = o.checks || []; o.checks[1] = true; } o.history.push([TODAY_S, "残金の入金を確認（" + v.no + "）"]); }
      }
      addJournal("bank", v.type === "内金" ? "adv" : "ar", v.no + " · " + v.order, invAmount(v));
      audit("入金を登録（" + v.no + " · " + yen(invAmount(v)) + "）");
      state.ui.invSel = v.no; save(); render();
      toast("入金を登録しました。受注の入金額と、TKC への仕訳に反映しました。");
    },
    "exp-tab": function (el) { state.ui.expTab = el.getAttribute("data-v"); render(); },
    "sal-month": function (el) { state.ui.salMonth = el.value; render(); },
    "sal-post": function (el) {
      var m = el.getAttribute("data-m"), t = salaryTotals(m), lbl = mNum(m) + "月分の給与";
      state.ext.posted[m] = true;
      addJournal("sal", "accr", lbl, t[0]); if (t[1]) addJournal("bonus", "accr", lbl, t[1]); addJournal("wel", "accr", lbl, t[2]);
      audit("給与費を計上（" + jpMonth(m) + "分 · " + yen(t[0] + t[1] + t[2] + t[3]) + "）");
      save(); render(); toast("給与費を経費に計上し、TKC への仕訳に入れました。");
    },
    "exp-new": function (el) {
      var no = el.getAttribute("data-order") || "";
      var back = state.p3.drawer && state.p3.drawer.type === "order" ? state.p3.drawer.no : null;
      state.p3.drawer = { type: "exp-new", back: back, draft: { order: no, cat: no ? "お直し外注" : "地代家賃", date: TODAY_S, supplier: "", amount: "" } };
      render();
    },
    "exp-save": function () {
      var d = state.p3.drawer, dr = d.draft, amt = Number(dr.amount);
      if (!String(dr.supplier).trim()) { toast("支払先を入力してください。"); return; }
      if (!(amt > 0)) { toast("金額（税込）を入力してください。"); return; }
      var o = dr.order ? orderOf(dr.order) : null;
      var no = "EX-26-0" + (state.ext.seq.ex++);
      state.ext.expenses.push({ no: no, date: dr.date || TODAY_S, store: o ? o.store : U().store || "matsue", cat: dr.cat, desc: String(dr.supplier).trim() + (o ? " · " + o.customer : ""), order: o ? o.no : null, amount: amt, st: "承認待ち", chk: "一致", quote: null });
      audit("経費を申請（" + no + " · " + yen(amt) + "）");
      state.p3.drawer = d.back ? { type: "order", no: d.back } : null;
      save(); render(); toast("経費を申請しました。承認されると、TKC への仕訳に入ります。");
    },
    "exp-ok": function (el) {
      var e = expOf(el.getAttribute("data-no")); if (!e) return;
      e.st = "承認済";
      addJournal(X.expAcct[e.cat] || "out", e.cat === "地代家賃" || e.cat === "水道光熱費" || e.cat === "広告宣伝費" ? "accr" : "ap", e.no + (e.order ? " · " + e.order : ""), e.amount);
      audit("経費を承認（" + e.no + " · " + yen(e.amount) + "）");
      save(); render(); toast("承認しました。TKC への仕訳に入りました。");
    },
    "exp-resolve": function (el) {
      var e = expOf(el.getAttribute("data-no")); if (!e) return;
      var diff = e.quote ? e.amount - e.quote : 0;
      e.st = "承認済"; e.chk = "確認済";
      var j = state.ext.journal.filter(function (x) { return x.st === "科目要確認" && x.src.indexOf(e.no) === 0; })[0];
      if (j) j.st = "送信可"; else addJournal(X.expAcct[e.cat] || "out", "ap", e.no + (e.order ? " · " + e.order : ""), e.amount);
      audit("請求書との差（" + yen(diff) + "）を確かめて承認（" + e.no + "）");
      save(); render(); toast("差（" + yen(diff) + "）を確かめて承認しました。TKC へ送れるようになりました。");
    },
    "tkc-mode": function (el) { state.ui.tkcMode = el.getAttribute("data-v"); render(); },
    "tkc-send": function () {
      var ready = state.ext.journal.filter(function (x) { return x.st === "送信可"; }); if (!ready.length) return;
      var hold = state.ext.journal.filter(function (x) { return x.st === "科目要確認"; }).length, csv = state.ui.tkcMode === "csv";
      if (csv) {
        download("TKC仕訳_" + TODAY_S.replace(/-/g, "") + ".csv", ready.map(function (x) {
          return { "日付": slashDate(x.date), "借方科目": acctName(x.dr), "借方コード": acctCode(x.dr), "貸方科目": acctName(x.cr), "貸方コード": acctCode(x.cr), "金額": x.amount, "摘要": x.src };
        }));
      }
      ready.forEach(function (x) { x.st = csv ? "書出済" : "送信済"; });
      state.ext.sends.push({ date: TODAY_S, text: (csv ? "CSV に書き出し · " : "API で送信 · ") + ready.length + "件" });
      audit("TKC へ仕訳を" + (csv ? "CSV に書き出し" : "送信") + "（" + ready.length + "件）");
      save(); render();
      if (!csv) toast(ready.length + "件を TKC に送りました。" + (hold ? "科目の確認待ちの " + hold + "件は、確かめてから送ります。" : ""));
    },
    "leave-new": function (el) {
      var from = el.getAttribute("data-from");
      state.p3.drawer = { type: "leave-new", from: from, draft: { type: "年次有給休暇", date: dayStr(7), reason: "" } };
      render();
    },
    "leave-save": function () {
      var d = state.p3.drawer, dr = d.draft;
      if (!dr.date || dr.date < TODAY_S) { toast("日付を選んでください（今日より後の日）。"); return; }
      if (storeClosedOn(toDate(dr.date))) { toast("火曜日は定休日です。ほかの日を選んでください。"); return; }
      var days = dr.type === "年次有給休暇（半日）" ? 0.5 : 1, ap = leaveApprover(U().name);
      state.ext.leave.push({ id: "l" + (state.ext.seq.l++), name: U().name, type: dr.type, date: dr.date, days: days, st: "申請中", note: dr.reason || "" });
      audit("休暇を申請（" + dr.type + " · " + slashDate(dr.date) + "）");
      if (d.from === "ai") state.chat.push({ who: "bot", kind: "leave-done", date: dr.date, type: dr.type, approver: ap });
      state.p3.drawer = null; save(); render();
      toast(ap + "さんに承認を依頼しました。");
    },
    "leave-ok": function (el) { var l = state.ext.leave.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; if (!l) return; l.st = "承認済"; audit("休暇を承認（" + l.name + " · " + slashDate(l.date) + "）"); save(); render(); toast(l.name + "さんの休暇を承認しました。"); },
    "leave-ng": function (el) { var l = state.ext.leave.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; if (!l) return; l.st = "却下"; l.note = "日を変えてもらう（店長より）"; audit("休暇を却下（" + l.name + " · " + slashDate(l.date) + "）"); save(); render(); toast("却下しました。" + l.name + "さんに、日を変えてもらうようお知らせします。"); },
    "cal-store": function (el) { state.ui.calStore = el.value; render(); },
    "inbox-open": function (el) { state.ui.bell = false; state.p3.drawer = { type: "inbox", id: el.getAttribute("data-id"), pick: 0 }; render(); },
    "inbox-tab": function (el) { state.ui.inboxTab = el.getAttribute("data-v"); render(); },
    "inbox-sim": function () { simulateArrival(false); },
    "in-pick": function (el) { state.p3.drawer.pick = +el.getAttribute("data-i"); render(); },
    "in-hold": function (el) { var x = itemOf(el.getAttribute("data-id")); if (!x) return; x.st = "hold"; audit(CH[x.ch].name + "をお電話で調整（" + sama(x.name) + "）"); save(); render(); toast("「お電話で調整中」にしました。日時が決まったら、ここで確定します。"); },
    "in-confirm": function (el) { var x = itemOf(el.getAttribute("data-id")); if (!x) return; var msg = confirmItem(x, state.p3.drawer || {}); save(); render(); toast(msg + "（デモではメールを送りません）"); },
    "push-open": function (el) {
      if (pushEl) pushEl.classList.remove("show");
      state.p3.drawer = { type: "inbox", id: el.getAttribute("data-id"), pick: 0 };
      if (route() !== "inbox") { state.keepDrawer = true; location.hash = "#/inbox"; } else render();
    },
    "push-close": function () { if (pushEl) pushEl.classList.remove("show"); },
    "fair-venue": function (el) { state.ui.fairVenue = el.getAttribute("data-v"); state.ui.fairDate = null; render(); },
    "fair-venue-go": function (el) { state.ui.fairVenue = el.getAttribute("data-v"); state.ui.fairDate = null; state.ui.fairTab = "fair"; go("fairs"); },
    "fair-jump": function (el) { state.ui.fairVenue = el.getAttribute("data-v"); state.ui.fairDate = el.getAttribute("data-d"); state.ui.fairTab = "fair"; go("fairs"); },
    "site-go": function (el) { state.ui.calStore = el.getAttribute("data-s"); go("calendar"); },
    "fair-date": function (el) { state.ui.fairDate = el.getAttribute("data-d"); render(); },
    "fair-tab": function (el) { state.ui.fairTab = el.getAttribute("data-v"); render(); },
    "book-open": function (el) {
      state.p3.drawer = { type: "book", draft: { kind: el.getAttribute("data-k"), venue: el.getAttribute("data-v"), item: el.getAttribute("data-f"), date: el.getAttribute("data-d"), t: el.getAttribute("data-t"),
        name: "", kana: "", tel: "", mail: "", people: el.getAttribute("data-k") === "meal" ? 6 : 2, via: "お電話", note: "", dress: true } };
      render();
    },
    "bk-via": function (el) { state.p3.drawer.draft.via = el.getAttribute("data-v"); render(); },
    "bk-save": function () {
      var d = state.p3.drawer, dr = d.draft;
      if (!String(dr.name).trim() || !String(dr.tel).trim()) { toast("お名前と電話番号を入力してください。"); return; }
      var id = "in" + (state.ext.seq.inb++);
      var x = { id: id, ch: dr.kind === "fair" ? "fair" : "meal", via: dr.via, st: "new", name: String(dr.name).trim(), kana: dr.kana, tel: dr.tel, mail: dr.mail, people: +dr.people, venue: dr.venue, date: dr.date, note: dr.note, dress: !!dr.dress, at: new Date().toISOString() };
      if (dr.kind === "fair") { x.fair = dr.item; x.slot = dr.t; } else { x.meal = dr.item; x.time = dr.t; }
      addBooking(dr.kind, dr.venue, dr.item, dr.date, dr.t, id);
      state.ext.inbox.push(x);
      var msg = confirmItem(x, { dress: dr.kind === "fair" ? !!dr.dress : false });
      state.p3.drawer = { type: "inbox", id: id };
      save(); render(); toast(msg);
    },
    "store-res": function () {
      var st = U().store || "matsue";
      state.p3.drawer = { type: "storeres", draft: { store: st, date: openDay(2), t: "", wants: [], name: "", kana: "", tel: "", detail: "", staff: staffOf(st)[0] } };
      render();
    },
    "sr-slot": function (el) { state.p3.drawer.draft.t = el.getAttribute("data-t"); render(); },
    "sr-want": function (el) { var a = state.p3.drawer.draft.wants, v = el.getAttribute("data-v"), i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); render(); },
    "sr-save": function () {
      var dr = state.p3.drawer.draft;
      if (!dr.wants.length) { toast("ご希望衣装を選んでください。"); return; }
      if (storeClosedOn(toDate(dr.date))) { toast("火曜日は定休日です（祝日は営業）。ほかの日を選んでください。"); return; }
      if (!dr.t) { toast("時間を選んでください。"); return; }
      if (!String(dr.name).trim() || !String(dr.tel).trim()) { toast("お名前と電話番号を入力してください。"); return; }
      var id = "in" + (state.ext.seq.inb++);
      var x = { id: id, ch: "store", via: "お電話", st: "new", name: String(dr.name).trim(), kana: dr.kana, tel: dr.tel, mail: "", store: dr.store, wants: dr.wants.slice(), detail: dr.detail, prefs: [[dr.date, dr.t]], at: new Date().toISOString() };
      state.ext.inbox.push(x);
      var msg = confirmItem(x, { pick: 0, staff: dr.staff });
      state.p3.drawer = null; save(); go("calendar"); toast(msg);
    },
    "voice-tag": function (el) { state.ui.voiceTag = el.getAttribute("data-v"); render(); },
    "voice-like": function (el) { var id = el.getAttribute("data-id"), v = state.ext.voice[id] = state.ext.voice[id] || {}; v.liked = !v.liked; v.likes = (v.likes || 0) + (v.liked ? 1 : -1); save(); render(); },
    "voice-share": function (el) {
      var id = el.getAttribute("data-id"), v = state.ext.voice[id] = state.ext.voice[id] || {}, src = X.voices.filter(function (x) { return x.id === id; })[0];
      v.shared = true; v.by = U().name; v.at = new Date().toISOString();
      audit("お客様の声を共有（" + (src ? src.who : id) + "）");
      save(); render(); toast("従業員に共有しました。全員のホームに表示されます。");
    },
    "voice-send": function (el) { toast(el.getAttribute("data-n") + "とご本人の店長に届けました（デモでは送りません）。"); },
    "bell": function () { state.ui.bell = !state.ui.bell; render(); },
    "sheet": function () { state.ui.sheet = !state.ui.sheet; render(); },
    "sheet-close": function () { state.ui.sheet = false; render(); },
    "pal-open": function () { openPal(); },
    "pal-close": function () { state.ui.pal = null; render(); },
    "pal-go": function (el) { palRun(+el.getAttribute("data-i")); },
    "theme": function () { var t = getTheme() === "dark" ? "light" : "dark"; try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* 保存できなくても切り替える */ } applyTheme(t); render(); }
  };

  // ---------- 描画 ----------
  var VIEWS = {
    ai: viewAI, docs: viewDocs, input: viewInput, confirm: viewConfirm, results: viewResults, orders: viewOrders, inventory: viewInventory,
    customers: viewCustomers, calendar: viewCalendar, invoices: viewInvoices, expenses: viewExpenses, tkc: viewTkc, employees: viewEmployees, leave: viewLeave, users: viewUsers,
    inbox: viewInbox, fairs: viewFairs, voice: viewVoice
  };
  function render() {
    if (!state.authed) {
      app.innerHTML = state.stage === "code" ? viewCode() : viewLogin();
      state.lastRoute = null;
      document.body.classList.remove("noscroll");
      return;
    }
    var r = route();
    if (!allowed(r)) { location.replace("#/home"); r = "home"; }
    var changed = state.lastRoute !== r;
    if (changed) {
      if (!state.keepDrawer) state.p3.drawer = null;
      state.ui.sheet = false; state.ui.bell = false;
      state.lastRoute = r;
    }
    state.keepDrawer = false;
    state.anim = changed;
    var oldDw = document.querySelector(".drawer"), dwTop = oldDw ? oldDw.scrollTop : 0, dwKey = oldDw ? oldDw.getAttribute("data-key") : null;
    var inner = (VIEWS[r] || viewHome)();
    app.innerHTML = shell(r, inner) + drawerHtml();
    var dw = document.querySelector(".drawer");
    document.body.classList.toggle("noscroll", !!dw || state.ui.sheet || !!state.ui.pal);
    if (dw) {
      var d = state.p3.drawer, key = d.type + ":" + (d.no || d.code || d.id || (d.draft && d.draft.no) || "new") + ":" + (d.step || "");
      dw.setAttribute("data-key", key);
      if (key === dwKey) dw.scrollTop = dwTop;
    }
    if (changed) {
      window.scrollTo(0, 0);
      var content = app.querySelector(".content");
      if (content) countUp(content);
    }
    if (r === "ai") {
      var box = document.getElementById("msgs");
      if (box) box.scrollTop = box.scrollHeight;
      var q = app.querySelector('.ask input[name="q"]');
      if (q && !state.busy && state.chat.length && !dw) q.focus({ preventScroll: true });
    }
    if (state.ui.pal) {
      var pi = document.getElementById("pal-q");
      if (pi) { pi.focus(); pi.setSelectionRange(pi.value.length, pi.value.length); }
    }
  }

  // ---------- 操作 ----------
  var acts = {
    "acct": function (el) { state.pick = el.getAttribute("data-role"); state.stage = "code"; render(); },
    "login": function () { state.stage = "code"; render(); },
    "back-login": function () { state.stage = "login"; render(); },
    "verify": function () {
      state.role = state.pick; state.authed = true; state.stage = "login"; state.chat = []; state.openDoc = null;
      audit("ログイン（2段階認証）");
      save(); go("home"); toast(D.users[state.role].name + "さん（" + roleLabel(state.role) + "）としてログインしました。");
    },
    "logout": function () {
      state.authed = false; state.stage = "login"; state.pick = state.role; state.ui.sheet = false; state.ui.bell = false; state.ui.pal = null; state.p3.drawer = null;
      save(); location.hash = ""; render();
    },
    "switch-role": function (el) {
      state.role = el.value; state.chat = []; state.openDoc = null; state.ui.sheet = false; state.ui.bell = false; state.p3.drawer = null; save();
      if (!allowed(route())) go("home"); else render();
      toast("「" + roleLabel(state.role) + "」に切り替えました（" + U().name + "さん）。");
    },
    "go": function (el) { state.ui.bell = false; state.ui.sheet = false; go(el.getAttribute("data-v")); },
    "ask-ex": function (el) { ask(el.getAttribute("data-q")); },
    "doc-tab": function (el) { state.docTab = el.getAttribute("data-v"); render(); },
    "doc-open": function (el) { var id = el.getAttribute("data-id"); state.openDoc = state.openDoc === id ? null : id; render(); },
    "doc-op": function () { toast("デモでは文書を登録できません。本番では PDF や Word を登録すると、規程アシスタントがすぐに参照できるようになります。"); },
    "confirm-one": function (el) { audit("実績を確定（1件）"); setStatus([el.getAttribute("data-id")], "confirmed"); toast("確定しました。翌朝の集計に入ります。"); },
    "return-one": function (el) { audit("実績を差し戻し（1件）"); setStatus([el.getAttribute("data-id")], "returned"); toast("差し戻しました。入力した方の画面に「差し戻し」と表示されます。"); },
    "confirm-picked": function () {
      var ids = Array.prototype.map.call(app.querySelectorAll("input.pick:checked"), function (x) { return x.value; });
      if (!ids.length) { toast("確定する入力を選んでください。"); return; }
      audit("実績を確定（" + ids.length + "件）");
      var n = setStatus(ids, "confirmed");
      toast(n + " 件を確定しました。翌朝の集計に入ります。");
    },
    "pick-all": function (el) { Array.prototype.forEach.call(app.querySelectorAll("input.pick"), function (x) { x.checked = el.checked; }); },
    "basis": function (el) { state.res.basis = el.getAttribute("data-v"); render(); },
    "mode": function (el) { state.res.mode = el.getAttribute("data-v"); render(); },
    "view": function (el) { state.res.view = el.getAttribute("data-v"); render(); },
    "store": function (el) { state.res.store = el.value; render(); },
    "pick-month": function (el) { state.res.month = el.getAttribute("data-m"); render(); },
    "csv-table": function () { csvTable(); },
    "csv-hq": function () { csvHQ(); },
    "reset": function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* 何もしない */ }
      state.entries = seedEntries(); state.chat = []; state.openDoc = null;
      state.orders = seedOrders(); state.costumes = seedCostumes(); state.p3.drawer = null;
      state.ext = seedExt(); state.ui.sheet = false; state.ui.bell = false; state.ui.pal = null; state.ui.invSel = null; state.ui.liveN = 0;
      save(); render();
      toast("デモのデータを元に戻しました。");
    }
  };

  Object.keys(p3Acts).forEach(function (k) { acts[k] = p3Acts[k]; });
  Object.keys(extActs).forEach(function (k) { acts[k] = extActs[k]; });

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    var sheetLink = t.closest(".sheet a.nav");
    if (sheetLink) {
      state.ui.sheet = false;
      if (location.hash === sheetLink.getAttribute("href")) { ev.preventDefault(); render(); }
      return;
    }
    var el = t.closest("[data-act]");
    if (state.ui.bell && !t.closest(".bell-wrap") && (!el || el.getAttribute("data-act") === "drawer-close")) { state.ui.bell = false; if (!el) { render(); return; } }
    if (!el || el.tagName === "SELECT" || el.tagName === "FORM" || (el.tagName === "INPUT" && el.type !== "checkbox")) return;
    var f = acts[el.getAttribute("data-act")];
    if (f) { if (el.tagName === "A") ev.preventDefault(); f(el, ev); }
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (el.hasAttribute("data-draft")) {
      var path = el.getAttribute("data-draft");
      setDraft(path, el.value);
      var dr = state.p3.drawer.draft;
      if (path === "store" && staffOf(dr.store).indexOf(dr.staff) < 0) dr.staff = staffOf(dr.store)[0];
      if (path === "biz") dr.costumes = dr.costumes.filter(function (c) { return catOf(c).biz.indexOf(dr.biz) >= 0; });
      if (el.tagName === "SELECT" || path === "date") render();
      return;
    }
    if (el.hasAttribute("data-xf") && state.p3.drawer) { state.p3.drawer.draft[el.getAttribute("data-xf")] = el.value; return; }
    if (el.hasAttribute("data-lv") && state.p3.drawer) { state.p3.drawer.draft[el.getAttribute("data-lv")] = el.value; render(); return; }
    if (el.hasAttribute("data-bk") && state.p3.drawer) { state.p3.drawer.draft[el.getAttribute("data-bk")] = el.type === "checkbox" ? el.checked : el.value; return; }
    if (el.hasAttribute("data-sr") && state.p3.drawer) {
      var k = el.getAttribute("data-sr"), dr2 = state.p3.drawer.draft; dr2[k] = el.value;
      if (k === "store") { dr2.staff = staffOf(dr2.store)[0]; dr2.t = ""; }
      if (k === "date") dr2.t = "";
      if (el.tagName === "SELECT" || k === "date") render();
      return;
    }
    if (el.hasAttribute("data-inf") && state.p3.drawer) { state.p3.drawer[el.getAttribute("data-inf")] = el.type === "checkbox" ? el.checked : el.value; return; }
    if (!el.matches("select[data-act]")) return;
    var f = acts[el.getAttribute("data-act")];
    if (f) f(el, ev);
  });
  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (el.hasAttribute("data-draft") && el.tagName !== "SELECT") { setDraft(el.getAttribute("data-draft"), el.value); return; }
    if (el.hasAttribute("data-xf") && state.p3.drawer) { state.p3.drawer.draft[el.getAttribute("data-xf")] = el.value; return; }
    if (el.hasAttribute("data-lv") && el.tagName !== "SELECT" && state.p3.drawer) { state.p3.drawer.draft[el.getAttribute("data-lv")] = el.value; return; }
    if (el.hasAttribute("data-bk") && el.type !== "checkbox" && state.p3.drawer) { state.p3.drawer.draft[el.getAttribute("data-bk")] = el.value; return; }
    if (el.hasAttribute("data-sr") && el.tagName !== "SELECT" && el.type !== "date" && state.p3.drawer) { state.p3.drawer.draft[el.getAttribute("data-sr")] = el.value; return; }
    if (el.hasAttribute("data-inf") && el.tagName === "TEXTAREA" && state.p3.drawer) { state.p3.drawer[el.getAttribute("data-inf")] = el.value; return; }
    if (el.id === "pal-q" && state.ui.pal) { state.ui.pal.q = el.value; state.ui.pal.i = 0; palRefresh(); return; }
    if (el.getAttribute("data-act") === "cust-q") {
      state.ui.custQ = el.value;
      var cb = document.getElementById("cust-list");
      if (cb) cb.innerHTML = custListHtml();
      return;
    }
    if (el.getAttribute("data-act") === "inv-q") {
      state.p3.inv.q = el.value;
      var box = document.getElementById("inv-list");
      if (box) box.innerHTML = invListHtml();
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.isComposing || ev.keyCode === 229) return; // 日本語の変換中の Enter・矢印は、変換に使う
    if ((ev.metaKey || ev.ctrlKey) && (ev.key === "k" || ev.key === "K")) {
      if (!state.authed) return;
      ev.preventDefault();
      if (state.ui.pal) { state.ui.pal = null; render(); } else openPal();
      return;
    }
    if (state.ui.pal) {
      var n = palList().length;
      if (ev.key === "Escape") { ev.preventDefault(); state.ui.pal = null; render(); return; }
      if (ev.key === "ArrowDown") { ev.preventDefault(); state.ui.pal.i = Math.min(n - 1, state.ui.pal.i + 1); palRefresh(); return; }
      if (ev.key === "ArrowUp") { ev.preventDefault(); state.ui.pal.i = Math.max(0, state.ui.pal.i - 1); palRefresh(); return; }
      if (ev.key === "Enter") { ev.preventDefault(); palRun(state.ui.pal.i); return; }
      return;
    }
    if (ev.key === "Escape") {
      if (state.p3.drawer) { state.p3.drawer = null; render(); return; }
      if (state.ui.sheet || state.ui.bell) { state.ui.sheet = false; state.ui.bell = false; render(); }
    }
  });
  document.addEventListener("submit", function (ev) {
    var form = ev.target, act = form.getAttribute("data-act");
    if (!act) return;
    ev.preventDefault();
    if (act === "ask") ask(form.querySelector('input[name="q"]').value);
    if (act === "entry") submitEntry(form);
  });
  window.addEventListener("hashchange", render);

  render();
})();
