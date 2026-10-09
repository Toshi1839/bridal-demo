// デモが開かれたこと・初めてログインしたことを、岩崎の Gmail に知らせる（Google Apps Script の受け口へ・2026-10-09）
// 送るのは「開いた／ログインした」「端末の種類と画面の幅」「役職」「リンク元」「ブラウザ」だけ。入力した内容は送らない。
// 1つのタブにつき、開いたとき1回・ログインしたとき1回まで（受け口の側でも重複と1日の数を抑えている）。
// 岩崎さんの端末：一度 ?me=1 を付けて開くと、以後その端末からは知らせない（?me=0 で元に戻す）。
// 撮影・確認の道具：?nonotify=1 を付けて開く。
// 受け口へ渡す項目名に sid・c は使えない（Apps Script が使う名前で、付けると HTTP 400 になる）ので、タブの印は tid で渡す。
(function () {
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbwpRhYr9HGfp86y_2pNgCmBj_J_lMmGB9LJ2VGfey8ApCrsAtque3LfPVWHrIFIFNHddg/exec";   // 受け口（Apps Script「デモの通知」）
  var q = location.search;
  if (!/\.github\.io$/.test(location.hostname) && !/[?&]notifytest=1(&|$)/.test(q)) return;   // 公開ページだけ（手元のサーバでは知らせない）
  try {
    if (/[?&]me=1(&|$)/.test(q)) localStorage.setItem("bridal-demo-me", "1");
    if (/[?&]me=0(&|$)/.test(q)) localStorage.removeItem("bridal-demo-me");
    if (localStorage.getItem("bridal-demo-me") === "1") return;
  } catch (e) { /* 保存できなくても続ける */ }
  if (/[?&]nonotify=1(&|$)/.test(q) || navigator.webdriver) return;

  var ROLE = { exec: "役員", manager: "役職者", staff: "従業員", parttime: "アルバイト", accounting: "経理" };
  var ua = navigator.userAgent || "";
  var dev = (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) ? "タブレット"
    : /iPhone|Android|Mobile/.test(ua) ? "スマートフォン" : "パソコン";
  function ss(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; }
    return null;
  }
  function state() { try { return JSON.parse(localStorage.getItem("bridal-demo-v3")) || {}; } catch (e) { return {}; } }
  var sid = ss("bd-sid") || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  ss("bd-sid", sid);
  function send(ev, role) {
    var u = ENDPOINT + "?ev=" + ev + "&dev=" + encodeURIComponent(dev) + "&w=" + (window.innerWidth || "") + "&tid=" + sid +
      "&role=" + encodeURIComponent(role || "") + "&ref=" + encodeURIComponent(document.referrer || "") + "&ua=" + encodeURIComponent(ua);
    try { fetch(u, { mode: "no-cors", keepalive: true }); } catch (e) { (new Image()).src = u; }
  }

  var st0 = state();
  if (!ss("bd-open")) { ss("bd-open", "1"); send("open", st0.authed ? (ROLE[st0.role] || "") : ""); }
  if (st0.authed) ss("bd-login", "1");                          // 前回からログインしたまま＝新しいログインではない
  function checkLogin() {
    if (ss("bd-login")) return;
    var st = state();
    if (st.authed) { ss("bd-login", "1"); send("login", ROLE[st.role] || ""); }
  }
  window.addEventListener("hashchange", function () { setTimeout(checkLogin, 300); });
  document.addEventListener("click", function () { setTimeout(checkLogin, 600); }, true);
})();
