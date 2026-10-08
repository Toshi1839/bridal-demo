/* 社内規程AI・実績管理（デモ）— 画面の動き
   データは data.js（すべてサンプル）。本物の AI にはつないでいない：質問はサンプルの条文から当てはまるものを探して表示する。
   画面の作りは、提案書（TEJDOC-2026-002）に貼った画面イメージに合わせている。 */
(function () {
  "use strict";

  var D = window.DEMO_DATA;
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var KEY = "bridal-demo-v2";

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
    table: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 10h18M9 5v14"/>'
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
    try { localStorage.setItem(KEY, JSON.stringify({ role: state.role, authed: state.authed, entries: state.entries, orders: state.orders, costumes: state.costumes })); } catch (e) { /* 保存できなくても動く */ }
  }
  function seedEntries() {
    function d(n) { return ymd(addDays(TODAY, n)); }
    function t(n, h, m) { var x = addDays(TODAY, n); x.setHours(h, m, 0, 0); return x.toISOString(); }
    return [
      { id: "e1", created: t(-1, 18, 20), store: "A", kind: "seiyaku", contract: d(-1), event: d(200), product: "ウェディングドレス", amount: 328000, customer: "石川 結衣", staff: "坂本 結衣", status: "pending" },
      { id: "e2", created: t(-1, 19, 5), store: "A", kind: "sekou", contract: d(-150), event: d(-1), product: "カラードレス", amount: 214000, customer: "大野 彩花", staff: "木村 遥", status: "pending" },
      { id: "e3", created: t(-1, 17, 42), store: "B", kind: "seiyaku", contract: d(-1), event: d(240), product: "白無垢・色打掛", amount: 396000, customer: "岡本 真央", staff: "小林 美穂", status: "pending" },
      { id: "e4", created: t(0, 10, 15), store: "C", kind: "seiyaku", contract: d(0), event: d(180), product: "タキシード", amount: 98000, customer: "村上 優花", staff: "松本 愛", status: "pending" }
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
  var NAV = [
    { id: "home", grp: "メニュー", label: "ホーム", crumb: "概要", title: "ホーム", ico: "home", ok: function () { return true; } },
    { id: "ai", grp: "ナレッジ", label: "規程アシスタント", crumb: "ナレッジ", title: "規程アシスタント", ico: "chat", ok: function (a) { return a.ai; } },
    { id: "docs", grp: "ナレッジ", label: "社内規程", crumb: "ナレッジ", title: "社内規程", ico: "book", ok: function (a) { return !!a.docs; } },
    { id: "results", grp: "実績", label: "実績の表示", crumb: "実績", title: "実績の表示", ico: "chart", ok: function (a) { return !!a.results; } },
    { id: "input", grp: "実績", label: "実績の入力", crumb: "実績", title: "実績の入力", ico: "edit", ok: function (a) { return a.input; } },
    { id: "confirm", grp: "実績", label: "実績の確定", crumb: "実績", title: "実績の確定", ico: "check", ok: function (a) { return a.confirm; } },
    { id: "orders", grp: "第3段階（オプション）", label: "受注管理", crumb: "第3段階（オプション） · 営業・顧客管理", title: "受注管理", ico: "list", ok: function () { return true; } },
    { id: "inventory", grp: "第3段階（オプション）", label: "衣装在庫", crumb: "第3段階（オプション） · 在庫管理", title: "衣装在庫", ico: "box", ok: function () { return true; } }
  ];
  function navOf(id) { for (var i = 0; i < NAV.length; i++) if (NAV[i].id === id) return NAV[i]; return NAV[0]; }
  function route() { var h = location.hash.replace(/^#\/?/, ""); return h || "home"; }
  function allowed(id) { for (var i = 0; i < NAV.length; i++) if (NAV[i].id === id) return NAV[i].ok(A()); return false; }
  function go(id) { if (location.hash === "#/" + id) render(); else location.hash = "#/" + id; }
  function pendingCount() { return state.entries.filter(function (e) { return e.status === "pending"; }).length; }

  // ---------- ログイン ----------
  function brandBlock(cls, sub) {
    return '<div class="' + cls + '"><span class="mark">業</span><span><b>業務ポータル</b><small>' + (sub || "社内規程AI・実績管理　デモ版") + "</small></span></div>";
  }
  function viewLogin() {
    var u = D.users[state.pick];
    var accts = D.roles.map(function (r) {
      var x = D.users[r.id];
      return '<button type="button" class="acct' + (r.id === state.pick ? " on" : "") + '" data-act="acct" data-role="' + r.id + '">' +
        '<span class="av">' + esc(x.name.charAt(0)) + "</span><span><b>" + esc(x.name) + '<span class="role-tag">' + esc(r.label) + "</span></b><small>" + esc(x.title) + "</small></span>" +
        '<span class="go">ログイン →</span></button>';
    }).join("");
    return '<main class="login"><div class="login-card">' + brandBlock("login-brand") +
      "<h2>ログイン</h2>" +
      '<p class="sub">社員アカウントでログインしてください。表示内容は役職と所属店舗で変わります。</p>' +
      '<label class="field-label">メールアドレス<input type="email" value="' + esc(u.email) + '" readonly></label>' +
      '<label class="field-label">パスワード<input type="password" value="demo-password" readonly></label>' +
      '<button class="btn pri" data-act="login">ログイン</button>' +
      '<p class="note-sm">すべてのアカウントで2段階認証が必要です。</p>' +
      '<div class="divider">デモ用アカウント · 役職別</div>' +
      '<div class="demo-accts">' + accts + "</div>" +
      '<p class="note-sm">サンプルのアカウントです。実在の方とは関係ありません。</p>' +
      "</div></main>";
  }
  function viewCode() {
    var u = D.users[state.pick];
    return '<main class="login"><div class="login-card">' + brandBlock("login-brand") +
      "<h2>2段階認証</h2>" +
      '<p class="sub">' + esc(u.name) + "さん（" + esc(u.title) + "）。登録したスマートフォンの認証アプリに表示された、6桁の確認コードを入力してください。</p>" +
      '<label class="field-label">確認コード<input type="text" class="code-input" inputmode="numeric" maxlength="6" value="123456" aria-label="確認コード"></label>' +
      '<p class="note-sm">デモでは確認コードが入っています。</p>' +
      '<button class="btn pri" data-act="verify">確認してログイン</button>' +
      '<button class="btn" data-act="back-login">戻る</button>' +
      "</div></main>";
  }

  // ---------- 全体の枠 ----------
  function shell(current, inner) {
    var u = U(), a = A(), n = navOf(current);
    var groups = [];
    NAV.forEach(function (x) {
      if (!x.ok(a)) return;
      var g = groups.filter(function (y) { return y.name === x.grp; })[0];
      if (!g) { g = { name: x.grp, items: [] }; groups.push(g); }
      var cnt = x.id === "confirm" && pendingCount() ? '<span class="cnt">' + pendingCount() + "</span>" : "";
      g.items.push('<a class="nav' + (x.id === current ? " on" : "") + '" href="#/' + x.id + '">' + icon(x.ico) + esc(x.label) + cnt + "</a>");
    });
    var nav = groups.map(function (g) { return '<div class="navgrp"><h6>' + esc(g.name) + "</h6>" + g.items.join("") + "</div>"; }).join("");
    var roleOpts = D.roles.map(function (r) {
      return '<option value="' + r.id + '"' + (r.id === state.role ? " selected" : "") + ">" + esc(r.label) + "（" + esc(D.users[r.id].name) + "）</option>";
    }).join("");
    return '<div class="app"><aside class="side">' +
      '<a href="#/home" style="text-decoration:none">' + brandBlock("brand", "デモ版") + "</a>" + nav +
      '<div class="side-foot">デモ版（画面のイメージ）。規程・氏名・数字はすべてサンプルです。<br>Terveys Technology Solutions 日本支店<br><button class="linklike" data-act="reset">デモのデータを元に戻す</button></div>' +
      "</aside>" +
      '<div class="main"><header class="top">' +
      '<div class="ttl"><span class="crumb">' + esc(n.crumb) + "</span><h1>" + esc(n.title) + "</h1></div>" +
      (a.ai ? '<form class="search" data-act="search">' + icon("search") + '<input name="q" placeholder="規程について質問…" autocomplete="off" aria-label="規程アシスタントに質問"></form>' : "") +
      '<span class="sp"></span>' +
      '<label class="role-switch"><span class="rs-label">役職を切り替え</span><select data-act="switch-role" aria-label="役職を切り替え">' + roleOpts + "</select></label>" +
      '<div class="userchip"><span class="av">' + esc(u.name.charAt(0)) + "</span><div><b>" + esc(u.name) + "</b><small>" + esc(u.title) + "</small></div>" +
      '<button class="iconbtn" data-act="logout" title="ログアウト" aria-label="ログアウト">' + icon("out") + "</button></div>" +
      "</header>" +
      '<main class="content">' + inner + "</main></div></div>";
  }

  // ---------- ホーム ----------
  function viewHome() {
    var a = A(), u = U();
    var cards = [];
    if (a.ai) cards.push(["ai", "規程アシスタント", "社内規程や業務マニュアルについて質問すると、根拠の箇所を示してお答えします。"]);
    if (a.docs) cards.push(["docs", "社内規程", "規程アシスタントが答えに使う文書と、文書ごとの閲覧範囲です。"]);
    if (a.results) cards.push(["results", "実績の表示", "施行月・成約月で、前年比・計画比を見られます。毎朝6:00に更新します。"]);
    if (a.input) cards.push(["input", "実績の入力", "成約・施行の数字を入力します。入力のしかたは画面に表示されます。"]);
    if (a.confirm) cards.push(["confirm", "実績の確定", "現場が入力した数字を確認して確定します（確認待ち " + pendingCount() + " 件）。"]);
    cards.push(["orders", "受注管理（第3段階・オプション）", "問合せから完了までを8つのステージで管理し、在庫の衣装を空き状況を見ながら仮押さえします。"]);
    cards.push(["inventory", "衣装在庫（第3段階・オプション）", "衣装ごとの空き状況（今後13週）・予約・メンテナンスを確かめます。"]);
    var html = cards.map(function (c) {
      return '<a href="#/' + c[0] + '"><div class="card"><div class="card-h"><h3>' + esc(c[1]) + '</h3></div><div class="card-b"><p>' + esc(c[2]) +
        '</p><span class="go">開く →</span></div></div></a>';
    }).join("");
    return '<div class="welcome"><div><h2>' + greeting() + "、" + esc(family(u.name)) + "さん</h2>" +
      '<p class="sub">' + esc(roleLabel(state.role)) + "としてログインしています · 見られる画面と数字は、役職によって変わります</p></div></div>" +
      '<div class="home-cards">' + html + "</div>" +
      '<div class="notice"><b>このデモについて</b><ul>' +
      "<li>規程・氏名・店舗・数字は、すべてサンプルです。</li>" +
      "<li>規程アシスタントは、本番では AI（Azure OpenAI）が文章で答えます。このデモでは、サンプルの規程から当てはまる条文を探して表示します。</li>" +
      "<li>上部の「役職を切り替え」で、ほかの役職の見え方を確かめられます。</li>" +
      "<li>このデモで入力した内容は、お使いのブラウザの中だけに残ります。</li></ul></div>";
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
        (m.art.note ? '<p class="aside">' + esc(m.art.note) + "</p>" : "") + "</div>";
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

    var where = store === "all" ? "全店舗（A〜C店）" : storeName(store);
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
        : '<span><i class="ln" style="background:#9C988F"></i>前年</span><span><i class="dash"></i>計画</span>') +
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

    return head + kpis + chartCard + breakdown + detail;
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
      x.history = [[dayStr(created), "問合せを受付"]];
      if (o.contract != null) x.history.push([dayStr(o.contract), "成約（内金を請求）"]);
      if (o.stage !== "問合せ") x.history.push([dayStr(o.day < 0 ? o.day + 1 : -2), "ステージを「" + o.stage + "」に変更"]);
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
  function catOf(code) { var id = code.split("-")[0]; for (var i = 0; i < P.categories.length; i++) if (P.categories[i].id === id) return P.categories[i]; return P.categories[0]; }
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
  function cosImg(c) {
    return '<div class="cimg" style="background:linear-gradient(165deg,' + mix(c.hex, 255, 0.88) + "," + mix(c.hex, 255, 0.7) + ')">' + silhouette(catOf(c.code).shape, c.hex) + "</div>";
  }
  function dot(c) { return '<span class="dot" style="background:' + c.hex + '" title="' + esc(c.color) + '"></span>'; }

  // 空き状況：同じ衣装の予約（お日取りの前後3日）と、戻る日を見る
  function reservations(code, exceptNo) {
    return state.orders.filter(function (o) { return o.no !== exceptNo && o.stage !== "完了" && o.costumes.indexOf(code) >= 0; });
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

  function p3Note() {
    return '<div class="p3-note"><b>第3段階（オプション）</b>ご依頼の範囲（第1・第2段階）の外にある、弊社からの追加のご提案です。提案書の「第3段階（オプション）の画面」を、操作できる形にしました。</div>';
  }
  function sel(act, key, value, opts) {
    return '<select data-act="' + act + '" data-k="' + key + '">' + opts.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("") + "</select>";
  }
  var STORE_OPTS = [["all", "全店舗"]].concat(D.stores.map(function (s) { return [s.id, s.name]; }));

  // ---------- 受注管理 ----------
  function viewOrders() {
    var f = state.p3;
    var list = state.orders.filter(function (o) {
      return (f.store === "all" || o.store === f.store) && (f.biz === "all" || o.biz === f.biz) && (f.stage === "all" || o.stage === f.stage);
    });
    var active = state.orders.filter(function (o) { return o.stage !== "完了"; }).length;
    var soon = state.orders.filter(function (o) { return o.stage !== "完了" && o.date >= TODAY_S && o.date <= dayStr(30); }).length;
    var waiting = state.orders.filter(function (o) { return o.stage === "成約" && !o.paid; }).length;
    var done = state.orders.filter(function (o) { return o.stage === "完了" && o.date >= dayStr(-30); }).length;
    var kpis = '<div class="kpis k4">' + kpi("進行中の受注", active + "件", "完了を除く") + kpi("30日以内のお日取り", soon + "件", "準備の確認を") +
      kpi("内金待ち", waiting + "件", "成約済み・入金なし") + kpi("直近30日の完了", done + "件", "返却・残金の入金まで") + "</div>";
    var filters = '<div class="filters">' + sel("p3-filter", "store", f.store, STORE_OPTS) +
      sel("p3-filter", "biz", f.biz, [["all", "全事業"]].concat(P.businesses.map(function (b) { return [b.id, b.name]; }))) +
      sel("p3-filter", "stage", f.stage, [["all", "全ステージ"]].concat(P.stages.map(function (s) { return [s, s]; }))) +
      '<div class="seg" role="group" aria-label="表示"><button type="button" data-act="p3-view" data-v="list" class="' + (f.view === "list" ? "on" : "") + '">' + icon("list") + "一覧</button>" +
      '<button type="button" data-act="p3-view" data-v="board" class="' + (f.view === "board" ? "on" : "") + '">' + icon("board") + "ボード</button></div>" +
      '<span class="sp"></span><button class="btn pri" data-act="order-new">' + icon("plus") + "新規受注</button></div>";
    var body;
    if (f.view === "board") {
      body = '<div class="board">' + P.stages.map(function (s) {
        var cards = list.filter(function (o) { return o.stage === s; }).map(function (o) {
          return '<button type="button" class="ocard" data-act="order-open" data-no="' + o.no + '"><span class="ono">' + o.no + "</span><b>" + esc(o.customer) + "</b><small>" +
            esc(slashDate(o.date)) + " · " + esc(storeName(o.store)) + "</small>" + bizTag(o.biz) + "<small>" + yen(o.amount) + "</small></button>";
        }).join("");
        return '<div class="bcol"><div class="bcol-h">' + stagePill(s) + "<span>" + list.filter(function (o) { return o.stage === s; }).length + "件</span></div>" + cards + "</div>";
      }).join("") + "</div>";
    } else {
      var rows = list.map(function (o) {
        var cs = o.costumes.map(cosOf).filter(Boolean);
        return '<tr class="click" data-act="order-open" data-no="' + o.no + '"><td><span class="ono">' + o.no + "</span></td><td><b>" + esc(o.customer) + "</b></td><td>" + bizTag(o.biz) +
          "</td><td>" + esc(storeName(o.store)) + "</td><td>" + (cs.length ? '<span class="dots">' + cs.map(dot).join("") + " " + cs.length + "</span>" : "—") +
          "</td><td>" + esc(slashDate(o.date)) + "</td><td>" + stagePill(o.stage) + '</td><td class="num">' + yen(o.amount) + "</td><td>" + esc(o.staff) + "</td><td>" +
          '<button class="ibtn" data-act="order-open" data-no="' + o.no + '" title="表示" aria-label="表示">' + icon("eye") + "</button> " +
          '<button class="ibtn" data-act="order-edit" data-no="' + o.no + '" title="編集" aria-label="編集">' + icon("edit") + "</button></td></tr>";
      }).join("") || '<tr><td colspan="10">条件に合う受注はありません。</td></tr>';
      body = '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>受注番号</th><th>お客様</th><th>事業</th><th>店舗</th><th>衣装</th><th>お日取り</th><th>ステージ</th><th class="num">金額</th><th>担当</th><th>操作</th></tr></thead><tbody>' +
        rows + "</tbody></table></div></div>";
    }
    return p3Note() + kpis + filters + body;
  }

  function orderDrawer(o) {
    var idx = stageIdx(o.stage), next = P.stages[idx + 1];
    var cs = o.costumes.map(cosOf).filter(Boolean);
    var steps = P.stages.map(function (s, i) {
      return '<div class="stp' + (i < idx ? " done" : i === idx ? " cur" : "") + '"><span class="c">' + (i < idx ? "✓" : i + 1) + '</span><span class="l">' + esc(s) + "</span></div>";
    }).join("");
    var nextCard;
    if (next) {
      var items = P.checklists[o.stage] || [];
      var checks = o.checks || [];
      var all = items.every(function (t, i) { return !!checks[i]; });
      nextCard = '<div class="card"><div class="card-h"><h3>次のステップ：' + esc(next) + '</h3><span class="sub">チェックリストを完了すると次へ進めます</span></div><div class="card-b"><div class="checklist">' +
        items.map(function (t, i) { return '<label class="ck"><input type="checkbox" data-act="order-check" data-no="' + o.no + '" data-i="' + i + '"' + (checks[i] ? " checked" : "") + ">" + esc(t) + "</label>"; }).join("") +
        '</div><div class="ck-acts"><button class="btn' + (all ? " pri" : "") + '" data-act="order-next" data-no="' + o.no + '"' + (all ? "" : " disabled") + ">次へ：" + esc(next) + "</button>" +
        '<span class="sp"></span><button class="linkbtn" data-act="order-cancel">受注をキャンセル</button></div></div></div>';
    } else {
      nextCard = '<div class="notice">この受注は完了しています（返却・残金の入金まで確認済み）。</div>';
    }
    var tiles = '<div class="itiles">' + itile("お日取り", slashDate(o.date)) + itile("会場・用途", o.venue || "—") + itile("成約日", o.contractDate ? slashDate(o.contractDate) : "まだ成約していません") +
      itile("受注金額", yen(o.amount)) + itile("入金済み", yen(o.paid || 0)) + itile("残金", yen(o.amount - (o.paid || 0))) + "</div>";
    var total = cs.reduce(function (s, c) { return s + c.price; }, 0);
    var cosCard = '<div class="card"><div class="card-h"><h3>在庫から選んだ衣装</h3><span class="sub">' + cs.length + " 点 · " + yen(total) + "</span></div><div class=\"card-b\">" +
      (cs.length ? '<div class="cgrid">' + cs.map(function (c) {
        return '<button type="button" class="cpick" data-act="cos-open" data-code="' + c.code + '">' + cosImg(c) + '<div class="cmeta"><span class="code">' + esc(c.code) + " · " + esc(c.size) + '</span><span class="nm">' + esc(c.name) +
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
    var ex = o.expenses || [];
    var exCard = '<div class="card"><div class="card-h"><h3>関連する経費</h3><span class="sp"></span><button class="btn sm" data-act="p3-demo" data-msg="デモでは経費を追加できません。本番では、お直しの外注費などをこの受注にひも付けて記録します。">' + icon("plus") + "経費を追加</button></div>" +
      (ex.length ? '<div class="tbl-wrap"><table><tbody>' + ex.map(function (x) { return "<tr><td>" + esc(x[0]) + '</td><td class="num">' + yen(x[1]) + "</td></tr>"; }).join("") +
        '<tr class="tot"><td>合計</td><td class="num">' + yen(ex.reduce(function (s, x) { return s + x[1]; }, 0)) + "</td></tr></tbody></table></div>" : '<div class="card-b note-sm">関連する経費はまだありません。</div>') + "</div>";
    var hist = '<div class="card"><div class="card-h"><h3>履歴</h3></div><div class="card-b"><ul class="tl">' + o.history.slice().reverse().map(function (h) {
      return '<li><span class="d">' + esc(slashDate(h[0])) + "</span><br>" + esc(h[1]) + "</li>";
    }).join("") + "</ul></div></div>";
    var head = '<div class="drawer-h"><div class="dh-main"><div class="crumb">' + esc(o.no + " · " + storeName(o.store) + " · 担当: " + o.staff) + "</div><h2>" + esc(o.customer) + '</h2><div class="dh-tags">' +
      bizTag(o.biz) + stagePill(o.stage) + '<span class="tag plain">' + esc(o.source) + "</span></div></div>" +
      '<div class="dh-acts"><button class="btn" data-act="order-edit" data-no="' + o.no + '">' + icon("edit") + '編集</button><button class="btn" data-act="drawer-close">閉じる</button></div></div>';
    return head + '<div class="drawer-b"><div class="card"><div class="stepper">' + steps + "</div></div>" + nextCard + tiles + cosCard + reqCard + exCard + hist + "</div>";
  }
  function itile(k, v) { return '<div class="itile"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + "</div></div>"; }

  // ---------- 受注の登録・編集（4つの手順） ----------
  var WIZ = ["お客様・お日取り", "衣装を選択", "ご要望・お直し", "確認"];
  function draftFrom(o) {
    if (o) return JSON.parse(JSON.stringify({ no: o.no, customer: o.customer, biz: o.biz, store: o.store, date: o.date, venue: o.venue, staff: o.staff, source: o.source, amount: String(o.amount), costumes: o.costumes, req: o.req || noReq() }));
    var store = U().store || "A";
    return { no: null, customer: "", biz: "bridal", store: store, date: dayStr(120), venue: "", staff: staffOf(store)[0], source: "来店", amount: "", costumes: [], req: noReq() };
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
        '<div class="field"><label for="w-venue">会場・用途</label><input type="text" id="w-venue" data-draft="venue" value="' + esc(dr.venue) + '" placeholder="例：ホテル挙式、前撮り（スタジオ）"></div>' +
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
        return '<button type="button" class="cpick' + (on ? " sel" : "") + (!av.ok && !on ? " na" : "") + '" data-act="wiz-pick" data-code="' + c.code + '">' + (on ? '<span class="chk">✓</span>' : "") + cosImg(c) +
          '<div class="cmeta"><span class="code">' + esc(c.code + " · " + c.size + " · " + storeName(c.store)) + '</span><span class="nm">' + esc(c.name) + '</span><span class="pr">' + yen(c.price) +
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
        ["会場・用途", dr.venue || "—"], ["担当", dr.staff], ["経路", dr.source], ["受注金額（税別）", yen(amt)],
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
      o = { no: nextNo(), stage: "打合せ・試着", paid: 0, contractDate: null, expenses: [], history: [[TODAY_S, "受注を登録"]] };
      o.checks = (P.checklists[o.stage] || []).map(function () { return false; });
      state.orders.unshift(o);
    } else {
      o.history.push([TODAY_S, "受注を編集"]);
    }
    ["customer", "biz", "store", "date", "venue", "staff", "source"].forEach(function (k) { o[k] = dr[k]; });
    o.amount = Number(dr.amount) || draftTotal(dr);
    var added = dr.costumes.filter(function (c) { return (o.costumes || []).indexOf(c) < 0; });
    o.costumes = dr.costumes.slice();
    o.req = JSON.parse(JSON.stringify(dr.req));
    if (added.length) o.history.push([TODAY_S, "衣装を仮押さえ（" + added.join("・") + "）"]);
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
        (!q || norm(c.code + c.name + c.color).indexOf(q) >= 0);
    });
  }
  function invListHtml() {
    var f = state.p3.inv, list = invFiltered();
    var head = '<p class="note-sm" style="margin-bottom:10px">サンプル ' + list.length + " 点を表示</p>";
    if (!list.length) return head + '<div class="notice">条件に合う衣装はありません。</div>';
    if (f.view === "table") {
      return head + '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>品番</th><th>名称</th><th>カテゴリ</th><th>色</th><th>サイズ</th><th class="num">レンタル料</th><th>店舗</th><th>状態</th><th class="num">貸出回数</th><th>次の予約</th></tr></thead><tbody>' +
        list.map(function (c) {
          var st = cosStatus(c), nx = reservations(c.code).filter(function (o) { return o.date >= TODAY_S; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
          return '<tr class="click" data-act="cos-open" data-code="' + c.code + '"><td><span class="ono">' + esc(c.code) + "</span></td><td><b>" + esc(c.name) + "</b></td><td>" + esc(catOf(c.code).name) +
            '</td><td><span class="colorline">' + dot(c) + esc(c.color) + "</span></td><td>" + esc(c.size) + '</td><td class="num">' + yen(c.price) + "</td><td>" + esc(storeName(c.store)) +
            '</td><td><span class="pill ' + st.tone + '">' + st.label + '</span></td><td class="num">' + c.rentals + "回</td><td>" + (nx ? esc(slashDate(nx.date)) + " " + esc(nx.no) : "—") + "</td></tr>";
        }).join("") + "</tbody></table></div></div>";
    }
    return head + '<div class="inv-grid">' + list.map(function (c) {
      var st = cosStatus(c);
      return '<button type="button" class="cpick icard" data-act="cos-open" data-code="' + c.code + '"><span class="pill ' + st.tone + ' st">' + st.label + "</span>" + cosImg(c) +
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
    var kpis = '<div class="kpis k4">' + kpi("在庫点数", all.length + "点", "サンプル · ドレス・和装・タキシード・小物") + kpi("本日貸出可", avail + "点", "在庫の " + Math.round(avail / all.length * 100) + "%") +
      kpi("貸出中・予約済", busy + "点", "今後30日") + kpi("お直し・クリーニング中", maint.length + "点", "今週戻り予定 " + backSoon + "点") + "</div>";
    var statuses = ["貸出可", "予約済", "貸出中", "クリーニング中", "お直し中"];
    var filters = '<div class="filters">' + sel("inv-filter", "store", f.store, STORE_OPTS) +
      sel("inv-filter", "cat", f.cat, [["all", "全カテゴリ"]].concat(P.categories.map(function (c) { return [c.id, c.name]; }))) +
      sel("inv-filter", "status", f.status, [["all", "全ての状態"]].concat(statuses.map(function (s) { return [s, s]; }))) +
      '<label class="srch">' + icon("search") + '<input type="text" data-act="inv-q" value="' + esc(f.q) + '" placeholder="品番・名称・色" aria-label="品番・名称・色で探す"></label>' +
      '<div class="seg" role="group" aria-label="表示"><button type="button" data-act="inv-view" data-v="gallery" class="' + (f.view === "gallery" ? "on" : "") + '">' + icon("grid") + "ギャラリー</button>" +
      '<button type="button" data-act="inv-view" data-v="table" class="' + (f.view === "table" ? "on" : "") + '">' + icon("table") + "表</button></div>" +
      '<span class="sp"></span><button class="btn" data-act="p3-demo" data-msg="デモでは取り込めません。本番では、Excel の在庫リストをそのまま取り込めます。">' + icon("up") + "在庫リストを取込</button>" +
      '<button class="btn pri" data-act="p3-demo" data-msg="デモでは登録できません。本番では、写真・サイズ・料金を入れて衣装を登録します。">' + icon("plus") + "衣装を登録</button></div>";
    return p3Note() + kpis + filters + '<div id="inv-list">' + invListHtml() + "</div>";
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
    return head + '<div class="drawer-b"><div class="cos-top">' + cosImg(c) + '<div class="itiles">' +
      '<div class="itile"><div class="k">色</div><div class="v"><span class="colorline">' + dot(c) + esc(c.color) + "</span></div></div>" +
      itile("サイズ", c.size) + itile("レンタル料", yen(c.price)) + itile("貸出回数", c.rentals + "回") + itile("保管場所", storeName(c.store)) + itile("購入日", c.bought) + "</div></div>" +
      '<div class="card"><div class="card-h"><h3>空き状況 · 今後13週</h3><span class="sp"></span><span class="lg"><span><i style="background:#E3F1EA"></i>空き</span><span><i style="background:var(--gold)"></i>予約</span><span><i style="background:#F6E3C8"></i>メンテナンス</span></span></div>' +
      '<div class="card-b"><div class="weeks">' + cells.join("") + '</div><div class="wk-dates"><span>' + esc(slashDate(first)) + "</span><span>" + esc(slashDate(last)) + "</span></div></div></div>" +
      '<div class="card"><div class="card-h"><h3>予約</h3><span class="sub">受注ごとの仮押さえ</span></div><div class="card-b rlist">' + resRows + "</div></div>" +
      '<div class="card"><div class="card-h"><h3>メンテナンス履歴</h3></div><div class="card-b"><ul class="tl">' + c.log.map(function (h) { return '<li><span class="d">' + esc(h[0]) + "</span><br>" + esc(h[1]) + "</li>"; }).join("") + "</ul></div></div>" +
      '<div class="form-actions" style="margin-top:0"><button class="btn" data-act="cos-clean" data-code="' + c.code + '">クリーニングに出す</button><button class="btn" data-act="cos-avail" data-code="' + c.code + '">貸出可にする</button></div></div>';
  }
  function drawerHtml() {
    var d = state.p3.drawer;
    if (!d) return "";
    var inner = "";
    if (d.type === "order") { var o = orderOf(d.no); if (!o) return ""; inner = orderDrawer(o); }
    if (d.type === "edit") inner = editDrawer(d);
    if (d.type === "costume") { var c = cosOf(d.code); if (!c) return ""; inner = costumeDrawer(c); }
    return '<div class="overlay" data-act="drawer-close"></div><aside class="drawer" role="dialog" aria-modal="true">' + inner + "</aside>";
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
      if (next === "成約" && !o.contractDate) o.contractDate = TODAY_S;
      if (next === "確定" && !o.paid) o.paid = Math.round(o.amount * 0.3 / 1000) * 1000;
      if (next === "完了") o.paid = o.amount;
      o.stage = next; o.checks = (P.checklists[next] || []).map(function () { return false; });
      o.history.push([TODAY_S, "ステージを「" + next + "」に変更"]);
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

  // ---------- 描画 ----------
  function render() {
    if (!state.authed) {
      app.innerHTML = state.stage === "code" ? viewCode() : viewLogin();
      return;
    }
    var r = route();
    if (!allowed(r)) { location.replace("#/home"); r = "home"; }
    if (r !== "orders" && r !== "inventory") state.p3.drawer = null;
    var oldDw = document.querySelector(".drawer"), dwTop = oldDw ? oldDw.scrollTop : 0, dwKey = oldDw ? oldDw.getAttribute("data-key") : null;
    var inner = r === "ai" ? viewAI() : r === "docs" ? viewDocs() : r === "input" ? viewInput() : r === "confirm" ? viewConfirm() : r === "results" ? viewResults() :
      r === "orders" ? viewOrders() : r === "inventory" ? viewInventory() : viewHome();
    app.innerHTML = shell(r, inner) + drawerHtml();
    var dw = document.querySelector(".drawer");
    document.body.classList.toggle("noscroll", !!dw);
    if (dw) {
      var d = state.p3.drawer, key = d.type + ":" + (d.no || d.code || (d.draft && d.draft.no) || "new") + ":" + (d.step || "");
      dw.setAttribute("data-key", key);
      if (key === dwKey) dw.scrollTop = dwTop;
    }
    if (r === "ai") {
      var box = document.getElementById("msgs");
      if (box) box.scrollTop = box.scrollHeight;
      var q = app.querySelector('.ask input[name="q"]');
      if (q && !state.busy && state.chat.length) q.focus({ preventScroll: true });
    }
  }

  // ---------- 操作 ----------
  var acts = {
    "acct": function (el) { state.pick = el.getAttribute("data-role"); state.stage = "code"; render(); },
    "login": function () { state.stage = "code"; render(); },
    "back-login": function () { state.stage = "login"; render(); },
    "verify": function () {
      state.role = state.pick; state.authed = true; state.stage = "login"; state.chat = []; state.openDoc = null;
      save(); go("home"); toast(D.users[state.role].name + "さん（" + roleLabel(state.role) + "）としてログインしました。");
    },
    "logout": function () { state.authed = false; state.stage = "login"; state.pick = state.role; save(); location.hash = ""; render(); },
    "switch-role": function (el) {
      state.role = el.value; state.chat = []; state.openDoc = null; save();
      if (!allowed(route())) go("home"); else render();
      toast("「" + roleLabel(state.role) + "」に切り替えました（" + U().name + "さん）。");
    },
    "ask-ex": function (el) { ask(el.getAttribute("data-q")); },
    "doc-tab": function (el) { state.docTab = el.getAttribute("data-v"); render(); },
    "doc-open": function (el) { var id = el.getAttribute("data-id"); state.openDoc = state.openDoc === id ? null : id; render(); },
    "doc-op": function () { toast("デモでは文書を登録できません。本番では PDF や Word を登録すると、規程アシスタントがすぐに参照できるようになります。"); },
    "confirm-one": function (el) { setStatus([el.getAttribute("data-id")], "confirmed"); toast("確定しました。翌朝の集計に入ります。"); },
    "return-one": function (el) { setStatus([el.getAttribute("data-id")], "returned"); toast("差し戻しました。入力した方の画面に「差し戻し」と表示されます。"); },
    "confirm-picked": function () {
      var ids = Array.prototype.map.call(app.querySelectorAll("input.pick:checked"), function (x) { return x.value; });
      if (!ids.length) { toast("確定する入力を選んでください。"); return; }
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
      save(); render();
      toast("デモのデータを元に戻しました。");
    }
  };

  Object.keys(p3Acts).forEach(function (k) { acts[k] = p3Acts[k]; });

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]");
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
    if (!el.matches("select[data-act]")) return;
    var f = acts[el.getAttribute("data-act")];
    if (f) f(el, ev);
  });
  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (el.hasAttribute("data-draft") && el.tagName !== "SELECT") { setDraft(el.getAttribute("data-draft"), el.value); return; }
    if (el.getAttribute("data-act") === "inv-q") {
      state.p3.inv.q = el.value;
      var box = document.getElementById("inv-list");
      if (box) box.innerHTML = invListHtml();
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && state.p3.drawer) { state.p3.drawer = null; render(); }
  });
  document.addEventListener("submit", function (ev) {
    var form = ev.target, act = form.getAttribute("data-act");
    if (!act) return;
    ev.preventDefault();
    if (act === "ask") ask(form.querySelector('input[name="q"]').value);
    if (act === "search") { var q = form.querySelector('input[name="q"]').value; if (q.trim()) { go("ai"); ask(q); } }
    if (act === "entry") submitEntry(form);
  });
  window.addEventListener("hashchange", render);

  render();
})();
