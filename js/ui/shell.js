/* Каркас: отрисовка экрана, навигация, вкладки */
"use strict";
/* ============ render ============ */
/* Вкладки нижней панели (на ноутбуке — боковое меню). */
const MAIN_TABS = [["home", "Главная", "home"], ["journal", "Журнал", "list"], ["analytics", "Аналитика", "bars"], ["capital", "Капитал", "cap"], ["accounts", "Счета", "card"]];
/* Разделы внутри «Счетов»: на телефоне — в списке «Ещё», на ноутбуке — подпункты меню. */
const ACC_SUB = [["bills", "Платежи", "bill"], ["debts", "Долги", "person"], ["reconcile", "Сверка", "recon"], ["import", "Импорт", "imp"]];
function render(fromDb) {
  bumpEpoch();
  const h = location.hash.replace("#", "");
  if (App.views[h]) UI.view = h;
  renderTabs();
  if (!S.loadedMeta || !S.loadedOps) return;
  const v = document.getElementById("view");
  if (S.noDb) { v.innerHTML = navHead("Бюджет", "") + '<div class="card empty" style="margin-top:20px">Приложение не подключено к базе: заполните настройки Firebase в файле js/core/firebase-config.js.</div>'; return; }
  ensureSettings();
  applyUI();
  // пустая база: приветствие с демо; резервные копии и «О данных» доступны и без счетов — чтобы перенести данные из копии
  if (!S.accounts && !["backups", "about"].includes(UI.view)) { v.innerHTML = Demo.welcome(); return; }
  if (!UI.booted) { UI.booted = true; const u = PZ(); if (u.cur) UI.cur = u.cur; if (!location.hash) { if (["home", "capital", "journal"].includes(u.start)) UI.view = u.start; else if (u.start === "newop") setTimeout(() => { if (!FORM) ACT.newop(); }, 0); } }
  const view = App.views[UI.view] || App.views.home;
  CH = {}; chSeq = 0;
  const y = window.scrollY;
  v.innerHTML = view.render();
  const pb = v.querySelector(".pfbar"), pbs = pb && pb.querySelector('[aria-pressed="true"]'); if (pbs) pb.scrollLeft = Math.max(0, pbs.offsetLeft - pb.offsetLeft - (pb.clientWidth - pbs.offsetWidth) / 2);
  if (fromDb) window.scrollTo(0, y);
  if (FORM && fromDb) { readForm(); renderSheet(); }
  gameSoon();
}
function go(view) {
  // «Назад» из настроек ведёт туда, откуда в них пришли
  if (App.isSettings(view) && !App.isSettings(UI.view)) UI.backTo = App.sectionOf(UI.view);
  UI.view = view; if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view); render(); window.scrollTo(0, 0);
}
/** Кнопка «Назад» с главного экрана настроек: в раздел, из которого их открыли. */
function settingsBack() {
  const to = UI.backTo && App.views[UI.backTo] && !App.isSettings(UI.backTo) ? UI.backTo : "home";
  const t = MAIN_TABS.find(x => x[0] === to) || ACC_SUB.find(x => x[0] === to) || (to === "awards" ? ["awards", "Игра"] : null);
  return backBtn(to, t ? t[1] : "Главная");
}
window.addEventListener("hashchange", () => render());
function renderTabs() {
  const sec = App.sectionOf(UI.view);
  const link = (x, cls) => '<a href="#' + x[0] + '" data-act="go" data-v="' + x[0] + '"' + (cls ? ' class="' + cls + '"' : "") + (sec === x[0] || (UI.view === x[0] && cls) ? ' aria-current="page"' : "") + '>' + svg(x[2]) + x[1] + '</a>';
  const more = (gameOn() ? [["awards", "Игра", "trophy"]] : []).concat([["prefs", "Настройки", "gear"]]);
  document.getElementById("tabs").innerHTML = '<nav class="tabbar glass" aria-label="Разделы"><div class="brand"><span class="brandic" aria-hidden="true"></span>Бюджет</div>' +
    MAIN_TABS.map(x => link(x)).join("") + '<div class="side-sub">' + ACC_SUB.map(x => link(x, "sub")).join("") + '</div>' +
    '<div class="side-more">' + more.map(x => link(x)).join("") + '</div></nav><button class="fab glass" data-act="newop" aria-label="Новая операция">' + svg("plus") + '<span class="fabt">Новая операция</span></button>';
}
function cols(L, R) { return '<div class="cols"><div class="col">' + L + '</div><div class="col">' + R + '</div></div>'; }
function navHead(title, eyebrow, left, right, sub) {
  return '<div class="navrow">' + (left || "") + '<span class="sp"></span>' + (right || "") + '</div>' + (eyebrow ? '<div class="eyebrow">' + eyebrow + '</div>' : "") + '<h1>' + title + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : "");
}
function backBtn(to, label) { return '<button class="gbtn back glass" data-act="go" data-v="' + to + '">' + svg("back", 20) + esc(label) + '</button>'; }
function curList() { const u = S.settings && S.settings.my && S.settings.my.ui; const want = (u && Array.isArray(u.curs) && u.curs.length >= 2) ? u.curs : ["RUB", "USD", "UZS"]; const L = ["RUB", "USD", "UZS", "EUR"].filter(c => want.includes(c)); if (!L.includes(UI.cur)) L.push(UI.cur); return L; }
/** Переключатель валют и рядом — «скрыть цифры». */
function curSeg() {
  return '<span class="hdl"><div class="seg glass" role="group" aria-label="Валюта">' + curList().map(c => '<button data-act="cur" data-c="' + c + '" aria-pressed="' + (UI.cur === c) + '">' + SYM[c] + '</button>').join("") + '</div>' + eyeBtn() + '</span>';
}
/** Кнопка «скрыть цифры»: суммы размываются на всех экранах (настройка общая для устройств). */
function eyeBtn() { const on = !!PZ().hide; return '<button class="gbtn icon glass" data-act="hidetog" aria-pressed="' + on + '" aria-label="' + (on ? "Показать суммы" : "Скрыть суммы") + '">' + svg(on ? "eyeoff" : "eye", 21) + '</button>'; }
/** Кнопка настроек — справа в заголовке основных экранов. */
function gearBtn() { return '<button class="gbtn icon glass" data-act="go" data-v="prefs" aria-label="Настройки">' + svg("gear", 22) + '</button>'; }
/** Правая часть заголовка: свои кнопки экрана + настройки. */
function headRight(extra) { return '<span class="hdr">' + (extra || "") + gearBtn() + '</span>'; }

/* ---------- действия модуля ---------- */
App.actions({
  go: t => go(t.dataset.v),
  cur: t => { UI.cur = t.dataset.c; lsSet("cur", UI.cur); render(); },
  close: () => closeSheet(),
  scrim: (t, e) => { if (e.target === t) closeSheet(); },
  hidetog: async () => { const u = PZ(); u.hide = !u.hide; await savePZ(); toast(u.hide ? "Суммы скрыты — нажмите на число, чтобы открыть его на 30 секунд" : "Суммы снова видны"); },
  undo: async () => { const f = UNDO, lbl = toast.lbl; UNDO = null; clearTimeout(toast.t); document.getElementById("toast").innerHTML = ""; if (!f) return; if (lbl) return f(); try { await f(); render(); toast("Восстановлено"); } catch (e) { warn("отмена", e); } },
  pf: t => { UI.pf = t.dataset.p; lsSet("pf", UI.pf); UI.am = null; render(); },
  noop: () => {}
});
