/* 社内規程AI・実績管理（デモ）— 画面の動き
   データは data.js（すべてサンプル）。本物の AI にはつないでいない：質問はサンプルの条文から当てはまるものを探して表示する。 */
(function () {
  "use strict";

  var D = window.DEMO_DATA;
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var KEY = "bridal-demo-v1";

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
  function shiftMonth(key, n) { var p = key.split("-"); return monthKey(new Date(+p[0], +p[1] - 1 + n, 1)); }
  function slashDate(s) { return s.replace(/-/g, "/"); }
  function jpMonth(key) { var p = key.split("-"); return +p[0] + "年" + +p[1] + "月"; }
  function mOnly(key) { return +key.split("-")[1] + "月"; }
  function yen(n) { return Math.round(n).toLocaleString("ja-JP") + "円"; }
  function man(n) { return (n / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 }) + "万円"; }
  function ratio(a, b) { return b > 0 ? a / b : null; }
  function pct(r) { return r == null || !isFinite(r) ? "—" : (r * 100).toFixed(1) + "%"; }
  function pctCls(r) { return r == null ? "" : r >= 1 ? "up" : "down"; }
  function timeLabel(iso) { var d = new Date(iso); return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function mask(name) { return String(name).charAt(0) + "＊＊ 様"; }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, 3200);
  }

  // ---------- 日付（前日までの数字を、今朝集計した形にする） ----------
  var TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  var YEST = addDays(TODAY, -1);
  var TODAY_S = ymd(TODAY);
  var YEST_S = ymd(YEST);
  var CUR = monthKey(TODAY);

  // ---------- 保存（このブラウザの中だけ） ----------
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ role: state.role, authed: state.authed, entries: state.entries })); } catch (e) { /* 保存できなくても動く */ }
  }

  function seedEntries() {
    function d(n) { return ymd(addDays(TODAY, n)); }
    function t(n, h, m) { var x = addDays(TODAY, n); x.setHours(h, m, 0, 0); return x.toISOString(); }
    return [
      { id: "e1", created: t(-1, 18, 20), store: "A", kind: "seiyaku", contract: d(-1), event: d(200), product: "ウェディングドレス", amount: 328000, customer: "石川 結衣", staff: "井上 さくら", status: "pending" },
      { id: "e2", created: t(-1, 19, 5), store: "A", kind: "sekou", contract: d(-150), event: d(-1), product: "カラードレス", amount: 214000, customer: "大野 彩花", staff: "木村 遥", status: "pending" },
      { id: "e3", created: t(-1, 17, 42), store: "B", kind: "seiyaku", contract: d(-1), event: d(240), product: "白無垢・色打掛", amount: 396000, customer: "岡本 真央", staff: "小林 彩", status: "pending" },
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
    res: { basis: "sekou", month: monthKey(addMonths(TODAY, -1)), view: "store", store: "all" }
  };

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
      if (basis === "sekou") {
        var done = d.event <= YEST_S;
        if (future ? done : !done) continue;
      }
      s.sales += d.amount; s.count++; s.gross += d.gross;
    }
    return s;
  }
  function plan(basis, month, store) {
    return Math.round(sum(basis, shiftMonth(month, -12), store).sales * 1.05 / 10000) * 10000;
  }
  function costs(store) {
    var c = { fixed: 0, labor: 0 };
    D.stores.forEach(function (st) {
      if (store && store !== "all" && st.id !== store) return;
      c.fixed += st.rent + st.utility; c.labor += st.labor;
    });
    return c;
  }
  function futureBookings(store) {
    var s = { sales: 0, count: 0 };
    var limit = ymd(addMonths(TODAY, 7));
    DEALS.forEach(function (d) {
      if (!inScope(d, store)) return;
      if (d.event > YEST_S && d.event < limit) { s.sales += d.amount; s.count++; }
    });
    return s;
  }

  // ---------- 画面の一覧 ----------
  var NAV = [
    { id: "home", label: "ホーム", ok: function () { return true; } },
    { id: "ai", label: "社内規程のAI", ok: function (a) { return a.ai; } },
    { id: "docs", label: "文書の管理", ok: function (a) { return !!a.docs; } },
    { id: "input", label: "実績の入力", ok: function (a) { return a.input; } },
    { id: "confirm", label: "実績の確定", ok: function (a) { return a.confirm; } },
    { id: "results", label: "実績の表示", ok: function (a) { return !!a.results; } }
  ];
  function route() { var h = location.hash.replace(/^#\/?/, ""); return h || "home"; }
  function allowed(id) { for (var i = 0; i < NAV.length; i++) if (NAV[i].id === id) return NAV[i].ok(A()); return false; }
  function go(id) { if (location.hash === "#/" + id) render(); else location.hash = "#/" + id; }
  function pendingCount() { return state.entries.filter(function (e) { return e.status === "pending"; }).length; }

  // ---------- ログイン ----------
  function viewLogin() {
    var u = D.users[state.pick];
    var opts = D.roles.map(function (r) {
      return '<label class="role-opt"><input type="radio" name="role" value="' + r.id + '"' + (r.id === state.pick ? " checked" : "") + ' data-act="pick-role">' +
        "<span><b>" + esc(r.label) + "</b><small>" + esc(r.desc) + "</small></span></label>";
    }).join("");
    return '<main class="login"><div class="login-card">' +
      '<div class="brand-mark"><span class="dot"></span>社内規程AI・実績管理</div>' +
      '<p class="lead">デモ版です。役職を選んでログインすると、その役職で見られる画面と数字に切り替わります。</p>' +
      '<fieldset class="role-pick"><legend>役職を選ぶ</legend>' + opts + "</fieldset>" +
      '<div class="stack">' +
      '<label class="field-label">メールアドレス<input type="email" value="' + esc(u.email) + '" readonly></label>' +
      '<label class="field-label">パスワード<input type="password" value="demo-password" readonly></label>' +
      "</div>" +
      '<div class="login-actions"><button class="btn primary" data-act="login">ログイン</button></div>' +
      '<p class="fine">サンプルのアカウントです（' + esc(u.name) + "・" + esc(u.title) + "）。実在の方とは関係ありません。</p>" +
      "</div></main>";
  }
  function viewCode() {
    return '<main class="login"><div class="login-card">' +
      '<div class="brand-mark"><span class="dot"></span>2段階認証</div>' +
      '<p class="lead">登録したスマートフォンの認証アプリに表示された、6桁の確認コードを入力してください。</p>' +
      '<label class="field-label">確認コード<input type="text" class="code-input" inputmode="numeric" maxlength="6" value="123456" aria-label="確認コード"></label>' +
      '<p class="fine">すべてのアカウントで2段階認証を使います。デモでは確認コードが入っています。</p>' +
      '<div class="login-actions"><button class="btn ghost" data-act="back-login">戻る</button><button class="btn primary" data-act="verify">確認してログイン</button></div>' +
      "</div></main>";
  }

  // ---------- 全体の枠 ----------
  function shell(current, inner) {
    var u = U();
    var nav = NAV.filter(function (n) { return n.ok(A()); }).map(function (n) {
      var c = n.id === "confirm" && pendingCount() ? '<span class="count">' + pendingCount() + "</span>" : "";
      return '<a href="#/' + n.id + '" class="' + (n.id === current ? "active" : "") + '"><span class="ico"></span>' + esc(n.label) + c + "</a>";
    }).join("");
    var roleOpts = D.roles.map(function (r) {
      return '<option value="' + r.id + '"' + (r.id === state.role ? " selected" : "") + ">" + esc(r.label) + "</option>";
    }).join("");
    return '<header class="topbar">' +
      '<a class="brand-mark" href="#/home"><span class="dot"></span>社内規程AI・実績管理</a>' +
      '<div class="who"><span class="user">' + esc(u.name) + "<small>" + esc(u.title) + "（" + esc(roleLabel(state.role)) + "）</small></span>" +
      '<label class="role-switch"><span class="rs-label">役職を切り替え</span><select data-act="switch-role" aria-label="役職を切り替え">' + roleOpts + "</select></label>" +
      '<button class="btn ghost small" data-act="logout">ログアウト</button></div></header>' +
      '<div class="layout"><nav class="sidenav" aria-label="メニュー">' + nav + '</nav><main class="content">' + inner + "</main></div>" +
      '<footer class="footer"><span>Terveys Technology Solutions Pvt Ltd 日本支店　｜　デモ版（画面のイメージ）。規程・氏名・店舗・数字はすべてサンプルです。</span>' +
      '<button class="linklike" data-act="reset">デモのデータを元に戻す</button></footer>';
  }

  // ---------- ホーム ----------
  function viewHome() {
    var a = A(), u = U();
    var cards = [];
    if (a.ai) cards.push(["ai", "社内規程のAI", "規程やマニュアルについて質問すると、根拠の条文を示して答えます。"]);
    if (a.docs) cards.push(["docs", "文書の管理", "AI が答えに使う文書の一覧と、見られる役職です。"]);
    if (a.input) cards.push(["input", "実績の入力", "成約・施行の数字を入力します。入力のしかたは画面に表示されます。"]);
    if (a.confirm) cards.push(["confirm", "実績の確定", "現場の入力を確認して確定します。確認待ち " + pendingCount() + " 件。"]);
    if (a.results) cards.push(["results", "実績の表示", "成約月・施行月で、前年比・計画比を見ます。"]);
    var cardHtml = cards.map(function (c) {
      return '<a class="card card-link" href="#/' + c[0] + '"><h3>' + esc(c[1]) + "</h3><p>" + esc(c[2]) + '</p><span class="go">開く →</span></a>';
    }).join("");
    var info = a.results || a.confirm
      ? '<p class="note blue" style="margin-top:16px">昨日までに確定した実績を、今朝 6:00 に集計しました（集計は1日1回）。</p>' : "";
    return '<div class="page-head"><h1>' + esc(u.name) + "さん、こんにちは</h1>" +
      '<p class="lead">' + esc(roleLabel(state.role)) + "としてログインしています。見られる画面と数字は、役職によって変わります。画面上部の役職の欄を切り替えると、ほかの役職の見え方も確かめられます。</p></div>" +
      '<div class="cards">' + cardHtml + "</div>" + info +
      '<div class="card about" style="margin-top:16px"><h3>このデモについて</h3><ul>' +
      "<li>規程・氏名・店舗・数字は、すべてサンプルです。</li>" +
      "<li>本番では、社内規程のAIは AI（Azure OpenAI）が文章で答えます。このデモでは、サンプルの規程から当てはまる条文を探して表示します。</li>" +
      "<li>このデモで入力した内容は、お使いのブラウザの中だけに残ります。</li></ul></div>";
  }

  // ---------- 社内規程のAI ----------
  function docLabel(doc) { return doc.kind === "社内規程" ? doc.name : "業務マニュアル「" + doc.name + "」"; }
  function docById(id) { for (var i = 0; i < D.docs.length; i++) if (D.docs[i].id === id) return D.docs[i]; return null; }
  function norm(s) {
    return String(s).replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/\s+/g, "").toLowerCase();
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
      return '<div class="msg bot"><div class="who-ai">AI</div><p>ご質問をどうぞ。下の例を押しても試せます。規程に書いていないことは、推測ではお答えしません。</p></div>';
    }
    if (m.kind === "hit") {
      return '<div class="msg bot"><div class="who-ai">AIの回答</div><p>' + esc(m.art.answer) + "</p>" +
        '<div class="cite"><div class="cite-h">根拠：' + esc(docLabel(m.doc)) + "　" + esc(m.art.no) + "（" + esc(m.art.title) + "）</div>" +
        '<div class="cite-t">' + esc(m.art.text) + "</div></div>" +
        (m.art.note ? '<p class="aside">' + esc(m.art.note) + "</p>" : "") + "</div>";
    }
    if (m.kind === "restricted") {
      return '<div class="msg bot none"><div class="who-ai">AIの回答</div><p>この質問に関係する内容は、' + esc(docLabel(m.doc)) +
        "にあります。この文書は" + esc(roleLabel(state.role)) + "の方は見られないため、中身はお答えできません。必要な場合は、店長にご確認ください。</p>" +
        '<p class="aside">見られる文書は、役職ごとに分けています（文書の管理で設定します）。</p></div>';
    }
    return '<div class="msg bot none"><div class="who-ai">AIの回答</div><p>登録されている文書には、このご質問についての記載がありません。推測ではお答えしません。</p>' +
      '<p class="aside">規程やマニュアルに書き足して登録すれば、答えられるようになります。</p></div>';
  }
  function viewAI() {
    var visible = D.docs.filter(function (d) { return d.status === "公開中" && d.roles.indexOf(state.role) >= 0; }).map(docLabel);
    var msgs = [{ who: "bot", kind: "welcome" }].concat(state.chat).map(function (m) {
      return m.who === "me" ? '<div class="msg me">' + esc(m.text) + "</div>" : botHtml(m);
    }).join("");
    if (state.busy) msgs += '<div class="msg bot"><span class="typing">規程を確認しています</span></div>';
    var chips = D.suggestions.map(function (s) {
      return '<button class="chip" type="button" data-act="ask-chip" data-q="' + esc(s) + '">' + esc(s) + "</button>";
    }).join("");
    return '<div class="page-head"><h1>社内規程のAI</h1><p class="lead">社内規程と業務マニュアルに書いてあることを、根拠の条文を示してお答えします。書いていないことは、推測でお答えしません。</p></div>' +
      '<p class="note">デモ版：本番では AI（Azure OpenAI）が文章で答えます。このデモでは、サンプルの規程から当てはまる条文を探して表示します。</p>' +
      '<p class="scope">' + esc(roleLabel(state.role)) + "の方が見られる文書：<b>" + esc(visible.join("、")) + "</b></p>" +
      '<div class="chat" id="chat">' + msgs + "</div>" +
      '<div class="chips">' + chips + "</div>" +
      '<form class="ask" data-act="ask"><input type="text" name="q" placeholder="質問を入力（例：有給休暇は何日もらえますか）" autocomplete="off" aria-label="質問">' +
      '<button class="btn primary" type="submit"' + (state.busy ? " disabled" : "") + ">質問する</button></form>";
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

  // ---------- 文書の管理 ----------
  function viewDocs() {
    var edit = A().docs === "edit";
    var rows = D.docs.map(function (d) {
      var who = d.roles.length === D.roles.length ? "全員" : d.roles.map(roleLabel).join("・");
      var badge = d.status === "公開中" ? '<span class="badge confirmed">公開中</span>' : '<span class="badge gray">' + esc(d.status) + "</span>";
      var ops = !edit ? "" : "<td>" + (d.status === "公開中"
        ? '<button class="btn small" data-act="doc-op">差し替え</button> <button class="btn small ghost" data-act="doc-op">版の履歴</button>'
        : '<button class="btn small" data-act="doc-op">登録</button>') + "</td>";
      return "<tr><td><b>" + esc(d.name) + "</b></td><td>" + esc(d.kind) + "</td><td>" + esc(d.version) + "</td><td>" + esc(d.updated) +
        "</td><td>" + esc(who) + "</td><td>" + badge + "</td>" + ops + "</tr>";
    }).join("");
    return '<div class="page-head"><h1>文書の管理</h1><p class="lead">AI が答えに使う文書の一覧です。文書ごとに、見られる役職を決めます。業務マニュアルは、作成したものをここから追加・差し替えできます。</p></div>' +
      (edit ? '<div class="form-actions" style="margin-bottom:12px"><button class="btn primary" data-act="doc-op">文書を追加</button></div>'
        : '<p class="note blue" style="margin-bottom:12px">文書の追加・差し替えは、管理者（このデモでは役員）が行います。</p>') +
      '<div class="table-wrap"><table><thead><tr><th>文書</th><th>種類</th><th>版</th><th>更新日</th><th>見られる役職</th><th>状態</th>' + (edit ? "<th>操作</th>" : "") +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<p class="note blue" style="margin-top:14px">AI は、質問した方の役職で見られる文書だけを使って答えます。たとえば、アルバイトの方が値引きについて質問しても、役職者向けのマニュアルの中身は表示されません。</p>';
  }

  // ---------- 実績の入力 ----------
  function statusBadge(s) {
    return s === "pending" ? '<span class="badge pending">確認待ち</span>' : s === "confirmed" ? '<span class="badge confirmed">確定</span>' : '<span class="badge returned">差し戻し</span>';
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
      return "<tr><td>" + statusBadge(e.status) + "</td><td>" + esc(timeLabel(e.created)) + "</td><td>" + kindLabel(e.kind) + "</td><td>" + esc(slashDate(e.contract)) +
        "</td><td>" + esc(slashDate(e.event)) + "</td><td>" + esc(e.product) + '</td><td class="num">' + yen(e.amount) + "</td><td>" + esc(mask(e.customer)) + "</td><td>" + esc(e.staff) + "</td></tr>";
    }).join("") || '<tr><td colspan="9">まだ入力はありません。</td></tr>';
    return '<div class="page-head"><h1>実績の入力</h1><p class="lead">成約したとき、挙式などの施行が終わったときに入力します。各欄の下に、入力のしかたを表示しています。入力した数字は、経理が確認して確定します。</p></div>' +
      '<form class="card form" data-act="entry" novalidate><div class="form-grid">' +
      '<div class="field"><label for="f-store">店舗</label><select id="f-store" disabled><option>' + esc(storeName(u.store)) + "</option></select>" +
      '<p class="help">ご自分の店舗が入っています。</p></div>' +
      '<div class="field"><span class="label">区分</span><div class="seg" role="radiogroup" aria-label="区分">' +
      '<label><input type="radio" name="kind" value="seiyaku" checked>成約（予約の数字）</label><label><input type="radio" name="kind" value="sekou">施行（実績の数字）</label></div>' +
      '<p class="help">ご契約いただいた日に「成約」で入力します。挙式などが終わったら「施行」で入力します。</p></div>' +
      '<div class="field"><label for="f-contract">成約日<span class="req">必須</span></label><input type="date" id="f-contract" name="contract" value="' + TODAY_S + '">' +
      '<p class="help">ご契約いただいた日です。</p></div>' +
      '<div class="field"><label for="f-event">施行日<span class="req">必須</span></label><input type="date" id="f-event" name="event">' +
      '<p class="help">挙式・撮影などを行う日です。</p></div>' +
      '<div class="field"><label for="f-product">商品</label><select id="f-product" name="product">' + products + "</select>" +
      '<p class="help">いちばん大きな商品を選びます。</p></div>' +
      '<div class="field"><label for="f-amount">金額（税別）<span class="req">必須</span></label><input type="number" id="f-amount" name="amount" min="0" step="1000" inputmode="numeric" placeholder="例：280000">' +
      '<p class="help">税別の金額を、円で入力します。</p></div>' +
      '<div class="field"><label for="f-customer">お客様のお名前<span class="req">必須</span></label><input type="text" id="f-customer" name="customer" placeholder="例：佐々木 美咲" autocomplete="off">' +
      '<p class="help">お名前は、経理以外の画面では伏せて表示されます。</p></div>' +
      '<div class="field"><label for="f-staff">担当者</label><select id="f-staff" name="staff">' + people + "</select></div>" +
      '</div><div class="form-actions"><button class="btn primary" type="submit">入力する</button><span class="fine" style="margin:0">入力すると「確認待ち」になり、経理が確定します。</span></div></form>' +
      '<div class="section-head"><h2>' + esc(storeName(u.store)) + "の最近の入力</h2></div>" +
      '<div class="table-wrap"><table><thead><tr><th>状態</th><th>入力日時</th><th>区分</th><th>成約日</th><th>施行日</th><th>商品</th><th class="num">金額（税別）</th><th>お客様</th><th>担当者</th></tr></thead><tbody>' +
      rows + "</tbody></table></div>";
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
      return "<tr><td>" + (p ? '<input type="checkbox" class="pick" value="' + esc(e.id) + '" aria-label="選ぶ">' : "") + "</td><td>" + statusBadge(e.status) + "</td><td>" + esc(timeLabel(e.created)) +
        "</td><td>" + esc(storeName(e.store)) + "</td><td>" + kindLabel(e.kind) + "</td><td>" + esc(slashDate(e.contract)) + "</td><td>" + esc(slashDate(e.event)) +
        "</td><td>" + esc(e.product) + '</td><td class="num">' + yen(e.amount) + "</td><td>" + esc(e.customer) + " 様</td><td>" + esc(e.staff) + "</td><td>" +
        (p ? '<button class="btn small ok" data-act="confirm-one" data-id="' + esc(e.id) + '">確定</button> <button class="btn small danger-ghost" data-act="return-one" data-id="' + esc(e.id) + '">差し戻し</button>' : "") +
        "</td></tr>";
    }).join("");
    return '<div class="page-head"><h1>実績の確定</h1><p class="lead">現場が入力した数字を確認して、確定します。確定した数字は、翌朝の集計に入ります（集計は1日1回）。</p></div>' +
      '<div class="form-actions" style="margin-bottom:12px"><button class="btn ok" data-act="confirm-picked"' + (n ? "" : " disabled") + ">選んだ入力を確定する</button>" +
      '<span class="badge ' + (n ? "pending" : "confirmed") + '">確認待ち ' + n + " 件</span></div>" +
      '<div class="table-wrap"><table><thead><tr><th><input type="checkbox" data-act="pick-all" aria-label="すべて選ぶ"></th><th>状態</th><th>入力日時</th><th>店舗</th><th>区分</th><th>成約日</th><th>施行日</th><th>商品</th><th class="num">金額（税別）</th><th>お客様</th><th>担当者</th><th>操作</th></tr></thead><tbody>' +
      rows + "</tbody></table></div>" +
      '<p class="note blue" style="margin-top:14px">経理の方には、お客様のお名前がそのまま表示されます。ほかの役職の画面では、お名前を伏せて表示します。</p>';
  }
  function setStatus(ids, status) {
    var n = 0;
    state.entries.forEach(function (e) { if (ids.indexOf(e.id) >= 0 && e.status === "pending") { e.status = status; n++; } });
    save();
    render();
    return n;
  }

  // ---------- 実績の表示 ----------
  function chart(points, selected) {
    var W = 760, H = 290, L = 50, R = 10, T = 30, B = 46;
    var max = 1;
    points.forEach(function (p) { max = Math.max(max, p.value + (p.rest || 0), p.last || 0, p.plan || 0); });
    var step = Math.pow(10, Math.floor(Math.log10(max)));
    var nice = [1, 2, 2.5, 5, 10].map(function (k) { return k * step; }).filter(function (v) { return v >= max; })[0] || max;
    var iw = W - L - R, ih = H - T - B, bw = iw / points.length;
    function y(v) { return T + ih - (v / nice) * ih; }
    function cx(i) { return L + i * bw + bw / 2; }
    var g = '<text class="axis" x="' + (L - 6) + '" y="14" text-anchor="end">（万円）</text>';
    for (var i = 0; i <= 4; i++) {
      var v = nice * i / 4, yy = y(v).toFixed(1);
      g += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/>' +
        '<text class="axis" x="' + (L - 6) + '" y="' + (+yy + 4) + '" text-anchor="end">' + Math.round(v / 10000).toLocaleString("ja-JP") + "</text>";
    }
    points.forEach(function (p, i) {
      var w = bw * 0.58, x = cx(i) - w / 2;
      var cls = p.future ? "bar-future" : p.key === selected ? "bar sel" : "bar";
      var title = jpMonth(p.key) + (p.future ? "（予約）" : p.key === CUR ? "（昨日まで）" : "") + "　" + yen(p.value) +
        (p.rest ? "　＋ 今日以降の予約 " + yen(p.rest) : "");
      var click = p.future ? "" : ' data-act="pick-month" data-m="' + p.key + '" style="cursor:pointer"';
      g += '<rect class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y(p.value).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(0) - y(p.value)).toFixed(1) + '" rx="2"' + click + "><title>" + esc(title) + "</title></rect>";
      if (p.rest) {
        g += '<rect class="bar-future" x="' + x.toFixed(1) + '" y="' + y(p.value + p.rest).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(p.value) - y(p.value + p.rest)).toFixed(1) + '"' + click + "><title>" + esc(title) + "</title></rect>";
      }
      if (p.key === CUR) {
        g += '<text class="axis" x="' + cx(i).toFixed(1) + '" y="' + (y(p.value + (p.rest || 0)) - 5).toFixed(1) + '" text-anchor="middle">途中</text>';
      }
      g += '<text class="axis" x="' + cx(i).toFixed(1) + '" y="' + (H - 26) + '" text-anchor="middle">' + mOnly(p.key) + "</text>";
      if (i === 0 || p.key.slice(5) === "01") {
        g += '<text class="axis year" x="' + (cx(i) - bw / 2 + 2).toFixed(1) + '" y="' + (H - 8) + '">' + p.key.slice(0, 4) + "年</text>";
      }
    });
    var lastPts = points.map(function (p, i) { return cx(i).toFixed(1) + "," + y(p.last).toFixed(1); }).join(" ");
    var planPts = points.map(function (p, i) { return cx(i).toFixed(1) + "," + y(p.plan).toFixed(1); }).join(" ");
    g += '<polyline class="plan" points="' + planPts + '"/><polyline class="last" points="' + lastPts + '"/>';
    points.forEach(function (p, i) { g += '<circle class="lastdot" cx="' + cx(i).toFixed(1) + '" cy="' + y(p.last).toFixed(1) + '" r="2.5"/>'; });
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="月別の売上のグラフ">' + g + "</svg>";
  }

  function viewResults() {
    var a = A(), u = U(), r = state.res;
    var full = a.results === "full";
    var store = full ? r.store : u.store;
    var basis = r.basis;
    var m = r.month;
    var cur = sum(basis, m, store);
    var last = sum(basis, shiftMonth(m, -12), store);
    var pl = plan(basis, m, store);
    var c = costs(store);
    var fb = futureBookings(store);
    var partial = m === CUR;

    // 月の選択肢（直近13か月）とグラフ
    var monthOpts = "", points = [];
    for (var i = 12; i >= 0; i--) {
      var k = monthKey(addMonths(TODAY, -i));
      monthOpts += '<option value="' + k + '"' + (k === m ? " selected" : "") + ">" + jpMonth(k) + (k === CUR ? "（途中）" : "") + "</option>";
    }
    for (i = 11; i >= 0; i--) {
      var mk = monthKey(addMonths(TODAY, -i));
      points.push({ key: mk, value: sum(basis, mk, store).sales, last: sum(basis, shiftMonth(mk, -12), store).sales, plan: plan(basis, mk, store),
        rest: basis === "sekou" && mk === CUR ? sum(basis, mk, store, null, true).sales : 0 }); // 今月は、昨日までの実績の上に今日以降の予約を重ねる
    }
    if (basis === "sekou") {
      for (i = 1; i <= 6; i++) { // 来月以降の施行予定（予約）を棒にする
        var fk = monthKey(addMonths(TODAY, i));
        points.push({ key: fk, value: sum(basis, fk, store, null, true).sales, last: sum(basis, shiftMonth(fk, -12), store).sales, plan: plan(basis, fk, store), future: true });
      }
    }

    var storeOpts = '<option value="all"' + (store === "all" ? " selected" : "") + ">全店舗</option>" + D.stores.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === store ? " selected" : "") + ">" + esc(s.name) + "</option>";
    }).join("");

    var controls = '<div class="controls">' +
      '<div class="control">集計の基準<div class="toggle" role="group" aria-label="集計の基準">' +
      '<button type="button" data-act="basis" data-v="sekou" class="' + (basis === "sekou" ? "on" : "") + '">施行月</button>' +
      '<button type="button" data-act="basis" data-v="seiyaku" class="' + (basis === "seiyaku" ? "on" : "") + '">成約月</button></div></div>' +
      '<label class="control">月<select data-act="month">' + monthOpts + "</select></label>" +
      '<label class="control">業態<select disabled><option>衣装（第1段階の対象）</option></select></label>' +
      '<label class="control">店舗<select data-act="store"' + (full ? "" : " disabled") + ">" + (full ? storeOpts : "<option>" + esc(storeName(u.store)) + "</option>") + "</select></label></div>" +
      '<p class="basis-note">' + (basis === "sekou"
        ? "施行月：挙式などを行った月で集計します。来月以降の棒は、成約済みで施行がまだの「予約」の数字です。"
        : "成約月：ご契約いただいた月で集計します。") +
      (full ? "" : "　役職者の方は、ご自分の店舗だけが表示されます。") + "</p>";

    var tiles = '<div class="tiles">' +
      tile("売上（税別）", man(cur.sales), jpMonth(m) + (partial ? "（昨日まで）" : "")) +
      tile("件数", cur.count + "件", "平均 " + (cur.count ? man(cur.sales / cur.count) : "—")) +
      tile("前年比", '<span class="' + pctCls(ratio(cur.sales, last.sales)) + '">' + pct(ratio(cur.sales, last.sales)) + "</span>", "前年 " + man(last.sales), true) +
      tile("計画比", '<span class="' + pctCls(ratio(cur.sales, pl)) + '">' + pct(ratio(cur.sales, pl)) + "</span>", "計画 " + man(pl), true) +
      (full ? tile("粗利", man(cur.gross), "粗利率 " + pct(ratio(cur.gross, cur.sales)))
        : '<div class="tile lock"><div class="k">粗利・利益</div><div class="v">役員と経理の方だけに表示</div></div>') +
      tile("今後の予約（施行予定）", man(fb.sales), "6か月先まで・" + fb.count + "件") +
      "</div>";

    var legend = '<div class="legend"><span><i class="l-bar"></i>' + (basis === "sekou" ? "実績" : "成約") + "</span>" +
      (basis === "sekou" ? '<span><i class="l-future"></i>予約（施行予定）</span>' : "") +
      '<span><i class="l-last"></i>前年</span><span><i class="l-plan"></i>計画</span><span>棒を押すと、その月を表示します</span></div>';

    var table = r.view === "store" ? storeTable(basis, m, store, full) : staffTable(basis, m, store);

    // 明細（直近12件）
    var rowsD = DEALS.filter(function (d) {
      if (!inScope(d, store)) return false;
      if (dateOf(d, basis).slice(0, 7) !== m) return false;
      return basis === "seiyaku" || d.event <= YEST_S;
    }).sort(function (x, y2) { return dateOf(x, basis) < dateOf(y2, basis) ? 1 : -1; }).slice(0, 12);
    var showName = state.role === "accounting";
    var detail = rowsD.map(function (d) {
      return "<tr><td>" + esc(slashDate(d.contract)) + "</td><td>" + esc(slashDate(d.event)) + "</td><td>" + esc(storeName(d.store)) + "</td><td>" + esc(d.staff) +
        "</td><td>" + esc(d.product) + '</td><td class="num">' + yen(d.amount) + "</td><td>" + esc(showName ? d.customer + " 様" : mask(d.customer)) + "</td></tr>";
    }).join("") || '<tr><td colspan="7">この月の明細はありません。</td></tr>';

    return '<div class="page-head"><h1>実績の表示</h1><p class="lead">確定した実績を、1日1回（毎朝 6:00）集計して表示します。成約月と施行月を切り替えて、前年比・計画比を見られます。スマートフォンでも見られます。</p></div>' +
      controls + tiles +
      '<div class="card chart-card"><div class="chart-scroll">' + chart(points, m) + "</div>" + legend + "</div>" +
      '<div class="section-head"><h2>' + jpMonth(m) + "の内訳</h2>" +
      '<div class="toggle" role="group" aria-label="内訳"><button type="button" data-act="view" data-v="store" class="' + (r.view === "store" ? "on" : "") + '">店舗別</button>' +
      '<button type="button" data-act="view" data-v="staff" class="' + (r.view === "staff" ? "on" : "") + '">担当者別</button></div></div>' +
      table +
      '<div class="section-head"><h2>明細（新しい順・12件まで）</h2><div class="export">' +
      '<button class="btn small" data-act="csv-table">表を CSV で書き出す</button>' +
      '<button class="btn small" data-act="csv-hq">本社提出用（12か月・CSV）</button></div></div>' +
      '<div class="table-wrap"><table><thead><tr><th>成約日</th><th>施行日</th><th>店舗</th><th>担当者</th><th>商品</th><th class="num">金額（税別）</th><th>お客様</th></tr></thead><tbody>' +
      detail + "</tbody></table></div>" +
      '<p class="hidden-cols">' + (showName ? "経理の方には、お客様のお名前がそのまま表示されます。" : "お客様のお名前は、部署に応じて伏せて表示します（経理の方には表示されます）。") + "</p>";
  }
  function tile(k, v, s, raw) {
    return '<div class="tile"><div class="k">' + esc(k) + '</div><div class="v">' + (raw ? v : esc(v)) + '</div><div class="s">' + esc(s) + "</div></div>";
  }

  function storeRows(basis, m, store, full) {
    var list = D.stores.filter(function (s) { return store === "all" || s.id === store; });
    var rows = list.map(function (s) {
      var cur = sum(basis, m, s.id), last = sum(basis, shiftMonth(m, -12), s.id), pl = plan(basis, m, s.id), c = costs(s.id);
      return { name: s.name, cur: cur, last: last, pl: pl, c: c };
    });
    if (rows.length > 1) {
      var t = { name: "合計", cur: { sales: 0, count: 0, gross: 0 }, last: { sales: 0 }, pl: 0, c: { fixed: 0, labor: 0 }, total: true };
      rows.forEach(function (x) {
        t.cur.sales += x.cur.sales; t.cur.count += x.cur.count; t.cur.gross += x.cur.gross; t.last.sales += x.last.sales; t.pl += x.pl; t.c.fixed += x.c.fixed; t.c.labor += x.c.labor;
      });
      rows.push(t);
    }
    return rows.map(function (x) {
      var o = { "店舗": x.name, "売上（税別）": x.cur.sales, "件数": x.cur.count, "前年比": ratio(x.cur.sales, x.last.sales), "計画比": ratio(x.cur.sales, x.pl), "固定費（家賃・光熱費）": x.c.fixed };
      if (full) { o["人件費"] = x.c.labor; o["粗利"] = x.cur.gross; o["営業利益"] = x.cur.gross - x.c.fixed - x.c.labor; }
      o._total = !!x.total;
      return o;
    });
  }
  function staffRows(basis, m, store) {
    return D.staff.filter(function (p) { return store === "all" || p.store === store; }).map(function (p) {
      var cur = sum(basis, m, p.store, p.name), last = sum(basis, shiftMonth(m, -12), p.store, p.name);
      return { "担当者": p.name, "店舗": storeName(p.store), "売上（税別）": cur.sales, "件数": cur.count, "平均単価": cur.count ? Math.round(cur.sales / cur.count) : 0, "前年比": ratio(cur.sales, last.sales) };
    }).sort(function (a, b) { return b["売上（税別）"] - a["売上（税別）"]; });
  }
  function htmlTable(rows, note) {
    if (!rows.length) return "";
    var cols = Object.keys(rows[0]).filter(function (k) { return k.charAt(0) !== "_"; });
    var head = cols.map(function (k) { return '<th class="' + (typeof rows[0][k] === "number" || rows[0][k] === null ? "num" : "") + '">' + esc(k) + "</th>"; }).join("");
    var body = rows.map(function (r) {
      return '<tr class="' + (r._total ? "total" : "") + '">' + cols.map(function (k) {
        var v = r[k];
        if (k === "前年比" || k === "計画比") return '<td class="num ' + pctCls(v) + '">' + pct(v) + "</td>";
        if (k === "件数") return '<td class="num">' + v + "件</td>";
        if (typeof v === "number") return '<td class="num' + (v < 0 ? " down" : "") + '">' + yen(v) + "</td>";
        return "<td>" + esc(v) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="table-wrap"><table><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>" + (note ? '<p class="hidden-cols">' + note + "</p>" : "");
  }
  function storeTable(basis, m, store, full) {
    return htmlTable(storeRows(basis, m, store, full), full ? "固定費・人件費は月額のサンプルです。" : "人件費・粗利・営業利益は、役員と経理の方だけに表示されます。");
  }
  function staffTable(basis, m, store) { return htmlTable(staffRows(basis, m, store), ""); }

  // ---------- CSV ----------
  function csvCell(v) {
    if (v == null) return "";
    var s = typeof v === "number" ? String(Math.round(v * 1000) / 1000) : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function download(name, rows) {
    var cols = Object.keys(rows[0]).filter(function (k) { return k.charAt(0) !== "_"; });
    var lines = [cols.map(csvCell).join(",")].concat(rows.map(function (r) {
      return cols.map(function (k) {
        var v = r[k];
        if ((k === "前年比" || k === "計画比") && v != null) v = (v * 100).toFixed(1) + "%";
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
  function resultScope() { return A().results === "full" ? state.res.store : U().store; }
  function csvTable() {
    var r = state.res, store = resultScope(), full = A().results === "full";
    var rows = r.view === "store" ? storeRows(r.basis, r.month, store, full) : staffRows(r.basis, r.month, store);
    download("実績_" + (r.view === "store" ? "店舗別" : "担当者別") + "_" + (r.basis === "sekou" ? "施行月" : "成約月") + "_" + r.month + ".csv", rows);
  }
  function csvHQ() {
    var r = state.res, store = resultScope(), full = A().results === "full";
    var rows = [];
    for (var i = 12; i >= 1; i--) {
      var mk = monthKey(addMonths(TODAY, -i));
      storeRows(r.basis, mk, store, full).forEach(function (x) {
        var o = { "年月": mk }; Object.keys(x).forEach(function (k) { o[k] = x[k]; }); rows.push(o);
      });
    }
    download("本社提出用_" + (r.basis === "sekou" ? "施行月" : "成約月") + "_" + monthKey(addMonths(TODAY, -12)) + "_" + monthKey(addMonths(TODAY, -1)) + ".csv", rows);
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
      var chat = document.getElementById("chat");
      if (chat && state.chat.length) chat.lastElementChild.scrollIntoView({ block: "nearest" });
      var q = app.querySelector('.ask input[name="q"]');
      if (q && !state.busy && state.chat.length) q.focus({ preventScroll: true });
    }
  }

  // ---------- 操作 ----------
  var acts = {
    "pick-role": function (el) { state.pick = el.value; render(); },
    "login": function () { state.stage = "code"; render(); },
    "back-login": function () { state.stage = "login"; render(); },
    "verify": function () {
      state.role = state.pick; state.authed = true; state.stage = "login"; state.chat = [];
      save(); go("home"); toast(roleLabel(state.role) + "としてログインしました。");
    },
    "logout": function () { state.authed = false; state.stage = "login"; state.pick = state.role; save(); location.hash = ""; render(); },
    "switch-role": function (el) {
      state.role = el.value; state.chat = []; save();
      if (!allowed(route())) go("home"); else render();
      toast("役職を「" + roleLabel(state.role) + "」に切り替えました（" + U().name + "さん）。");
    },
    "ask-chip": function (el) { ask(el.getAttribute("data-q")); },
    "doc-op": function () { toast("デモでは文書を登録できません。本番では PDF や Word を登録すると、AI がすぐに参照できるようになります。"); },
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
    "view": function (el) { state.res.view = el.getAttribute("data-v"); render(); },
    "month": function (el) { state.res.month = el.value; render(); },
    "store": function (el) { state.res.store = el.value; render(); },
    "pick-month": function (el) { state.res.month = el.getAttribute("data-m"); render(); },
    "csv-table": function () { csvTable(); },
    "csv-hq": function () { csvHQ(); },
    "reset": function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* 何もしない */ }
      state.entries = seedEntries(); state.chat = []; save(); render();
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
    if (!el.matches("select[data-act], input[type=radio][data-act]")) return;
    var f = acts[el.getAttribute("data-act")];
    if (f) f(el, ev);
  });
  document.addEventListener("submit", function (ev) {
    var form = ev.target, act = form.getAttribute("data-act");
    if (!act) return;
    ev.preventDefault();
    if (act === "ask") { var q = form.querySelector('input[name="q"]'); ask(q.value); }
    if (act === "entry") submitEntry(form);
  });
  window.addEventListener("hashchange", render);

  render();
})();
