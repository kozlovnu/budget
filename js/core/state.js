/* Глобальное состояние приложения (данные S и состояние интерфейса UI) */
"use strict";
/* ============ state ============ */
const S = { accounts: null, settings: null, rates: null, snaps: null, debts: null, game: null, ops: {}, loadedMeta: false, loadedOps: false };
const UI = {
  view: "home", cur: lsGet("cur") || "RUB", jm: null, jq: "", jacc: "", jcat: "", jtype: "all",
  pf: lsGet("pf") || "all", am: null, atab: "spend", editAcc: false, armed: null, showArch: false, recDate: null, horizon: null,
  imp: null
};
let DB = null, SAMPLE = null, DL = null, FORM = null, ALLOPS = null;
let FMT = "int", NARROW = window.innerWidth < 760;
(function () { const t = lsGet("theme"), g = lsGet("glass"), r = document.documentElement; if (t === "light" || t === "dark") r.setAttribute("data-theme", t); if (g === "low") r.setAttribute("data-glass", "low"); })();
let TODAY = new Date();
let TODAYS = iso(TODAY);
