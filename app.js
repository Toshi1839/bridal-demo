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
    up: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>'
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
    try { localStorage.setItem(KEY, JSON.stringify({ role: state.role, authed: state.authed, entries: state.entries })); } catch (e) { /* 保存できなくても動く */ }
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
    { id: "confirm", grp: "実績", label: "実績の確定", crumb: "実績", title: "実績の確定", ico: "check", ok: function (a) { return a.confirm; } }
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

  // ---------- 描画 ----------
  function render() {
    if (!state.authed) {
      app.innerHTML = state.stage === "code" ? viewCode() : viewLogin();
      return;
    }
    var r = route();
    if (!allowed(r)) { location.replace("#/home"); r = "home"; }
    var inner = r === "ai" ? viewAI() : r === "docs" ? viewDocs() : r === "input" ? viewInput() : r === "confirm" ? viewConfirm() : r === "results" ? viewResults() : viewHome();
    app.innerHTML = shell(r, inner);
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
      state.entries = seedEntries(); state.chat = []; state.openDoc = null; save(); render();
      toast("デモのデータを元に戻しました。");
    }
  };

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]");
    if (!el || el.tagName === "SELECT" || el.tagName === "FORM" || (el.tagName === "INPUT" && el.type !== "checkbox")) return;
    var f = acts[el.getAttribute("data-act")];
    if (f) { if (el.tagName === "A") ev.preventDefault(); f(el, ev); }
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (!el.matches("select[data-act]")) return;
    var f = acts[el.getAttribute("data-act")];
    if (f) f(el, ev);
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
