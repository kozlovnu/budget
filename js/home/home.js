/* Экран «Главная»: сетка виджетов, режим «Изменить» (удалить, размер, перетащить, добавить).
   Раскладка хранится в настройках (my.ui.home = [{id, size}]) и одинакова на всех устройствах.
   Сами виджеты — в home/widgets.js и в модулях, которым они принадлежат (индекс — в игре). */
"use strict";
const HCTX = {};
/** Данные для виджетов: считаются лениво и один раз за отрисовку. */
function homeCtx() {
  return memoEpoch(HCTX, "c", () => {
    const pf = curPf(), c = { pf };
    const lazy = (k, f) => Object.defineProperty(c, k, { configurable: true, get() { const v = f(); Object.defineProperty(c, k, { value: v }); return v; } });
    lazy("P", () => paceData(pf));
    lazy("C", () => capDelta(pf));
    lazy("A", () => advData(curM(), pf));
    lazy("Ap", () => advData(advDefaultM(), pf));
    lazy("sg", () => homeSignals(c.A, pf, c.P));
    return c;
  });
}

/* ---------- раскладка ---------- */
function homeDefault() {
  const main = accs().find(a => a.main && !a.archived && a.inCap) || accs().find(a => !a.archived);
  return [{ id: "cap", size: "M" }, { id: "month", size: "M" }].concat(main ? [{ id: "acc:" + main.id, size: "S" }] : [],
    [{ id: "attn", size: "S" }, { id: "limits", size: "S" }, { id: "index", size: "S" }, { id: "save", size: "S" }, { id: "fc", size: "S" }, { id: "ops", size: "M" }]);
}
const wType = id => String(id).split(":")[0], wArg = id => String(id).split(":").slice(1).join(":");
/** Виджет доступен: тип зарегистрирован и включён; у экземпляра (счёта) — счёт существует. */
function wAvail(id) {
  const W = App.widgets[wType(id)]; if (!W || !W.avail()) return false;
  if (W.instances) return W.instances().some(x => x.arg === wArg(id));
  return true;
}
/** Текущая раскладка (без недоступных виджетов). */
function homeLayout() { const L = Array.isArray(PZ().home) ? PZ().home : homeDefault(); return L.filter(x => x && wAvail(x.id)); }
/** Раскладка для изменения: стандартная превращается в собственную при первой правке. */
function homeEditable() { const u = PZ(); if (!Array.isArray(u.home)) u.home = homeDefault(); return u.home; }
async function homeSave() { await savePZ(); }
function wName(id) { const W = App.widgets[wType(id)]; if (!W) return id; if (W.instances) { const x = W.instances().find(i => i.arg === wArg(id)); return x ? x.name : W.name; } return W.name; }

/* ---------- отрисовка ---------- */
let HDRAG = null;
function wgHTML(item, edit) {
  const W = App.widgets[wType(item.id)]; if (!W) return "";
  const size = W.sizes.includes(item.size) ? item.size : W.size;
  let r = null;
  try { r = W.render(homeCtx(), size, wArg(item.id)); } catch (e) { console.error("[budget] виджет «" + W.name + "»:", e); r = { inner: wLab(W.name) + '<span class="mut" style="font-size:14px">Не удалось построить</span>' }; }
  if (!r && !edit) return "";
  if (!r) r = { inner: wLab(wName(item.id)) + '<span class="mut" style="font-size:14px">Пока нечего показать</span>' };
  const cls = "wg" + (size === "M" ? " m" : "") + (edit ? " edit" : "") + (HDRAG && HDRAG.id === item.id ? " dragging" : "");
  const style = (r.bg ? "background:" + r.bg + ";" : "") + (r.fg ? "color:" + r.fg + ";" : "");
  const body = r.raw ? r.inner : '<button class="wbody' + (r.cls ? " " + r.cls : "") + '" ' + (edit ? 'data-act="noop" tabindex="-1"' : (r.act || 'data-act="go" data-v="' + (r.go || "capital") + '"')) + ' style="' + style + '" aria-label="' + esc(wName(item.id)) + '">' + r.inner + '</button>';
  const ctl = edit ? '<span class="wshield" aria-hidden="true"></span>' +
    '<button class="wrm" data-act="wrm" data-id="' + esc(item.id) + '" aria-label="Убрать виджет «' + esc(wName(item.id)) + '»">−</button>' +
    (W.config ? '<button class="wcfg" data-act="wcfg" data-k="' + W.config + '" aria-label="Настроить «' + esc(W.name) + '»">' + svg("gear", 17) + '</button>' : "") +
    (W.sizes.length > 1 ? '<button class="wsz" data-act="wsize" data-id="' + esc(item.id) + '" aria-label="Размер: ' + (size === "M" ? "широкий" : "маленький") + '. Сменить">' + (size === "M" ? "Широкий" : "Малый") + '</button>' : "") +
    '<button class="wdh" data-wdrag="' + esc(item.id) + '" aria-label="Переместить «' + esc(wName(item.id)) + '»: стрелки влево и вправо">' + svg("move", 18) + '</button>' : "";
  return '<div class="' + cls + '" data-wid="' + esc(item.id) + '">' + body + ctl + '</div>';
}
const wLab = (t, light) => '<span class="wlab' + (light ? " lt" : "") + '">' + t + '</span>';
const wBig = (t, fs) => '<span class="n wbig"' + (fs ? ' style="font-size:' + fs + 'px"' : "") + '>' + t + '</span>';
function homeGridHTML(edit) { return homeLayout().map(x => wgHTML(x, edit)).join(""); }
function renderHomeGrid() { const g = document.getElementById("hgrid"); if (g) g.innerHTML = homeGridHTML(!!UI.homeEdit); }

function vHome() {
  const edit = !!UI.homeEdit;
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const eyebrow = edit ? "Режим изменения" : ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"][d.getDay()] + ", " + d.getDate() + " " + MONG[d.getMonth()];
  // «Изменить» — под виджетами (как на iPhone), в заголовке — валюта, «скрыть цифры» и настройки
  const right = edit ? '<button class="btn pri" data-act="homedone" style="height:36px;padding:0 18px;font-size:15px;border-radius:999px">Готово</button>' : headRight();
  let html = navHead("Главная", eyebrow, edit ? "" : curSeg(), right) + (edit ? "" : pfBar());
  if (edit) html += '<p class="foot" style="margin-top:6px">Перетащите виджет за ' + svg("move", 14) + ', чтобы поменять порядок. «Малый/Широкий» меняет размер, «−» убирает виджет.</p>';
  const grid = homeGridHTML(edit);
  html += '<section class="sec"><div class="hgrid' + (edit ? " editing" : "") + '" id="hgrid">' + (grid || '<div class="card mut" style="grid-column:1/-1">На Главной нет виджетов. Нажмите «Изменить», чтобы добавить.</div>') + '</div></section>';
  if (!edit) html += '<section class="sec" style="display:flex;justify-content:center"><button class="gbtn glass" data-act="homeedit" style="height:40px;padding:0 18px;font-size:15px">' + svg("sliders", 18) + ' Изменить виджеты</button></section>';
  if (edit) html += homeGallery() + '<section class="sec"><div class="group"><button class="row" data-act="wreset"><span class="body"><span class="t"><b style="color:var(--link);font-weight:400">Вернуть стандартный набор</b></span></span></button></div></section>';
  return html;
}
/** Галерея: виджеты, которых ещё нет на экране. */
function homeGallery() {
  const have = new Set(homeLayout().map(x => x.id)), items = [];
  for (const id in App.widgets) {
    const W = App.widgets[id]; if (!W.avail()) continue;
    if (W.instances) { for (const x of W.instances()) if (!have.has(id + ":" + x.arg)) items.push({ id: id + ":" + x.arg, W, name: x.name, desc: x.desc || W.desc }); }
    else if (!have.has(id)) items.push({ id, W, name: W.name, desc: W.desc });
  }
  if (!items.length) return '<section class="sec"><div class="sechead"><h2>Добавить виджет</h2></div><div class="card mut" style="font-size:15px">Все виджеты уже на экране.</div></section>';
  const tile = x => '<button class="card" data-act="wadd" data-id="' + esc(x.id) + '"><span class="tile" style="background:' + (x.W.color || "#8E8E93") + '">' + svg(x.W.icon || "grid", 18) + '</span><span class="wgn">' + esc(x.name) + '</span><small>' + esc(x.desc || "") + '</small><span class="wgp" aria-hidden="true">+</span></button>';
  const gen = items.filter(x => !x.W.instances), inst = items.filter(x => x.W.instances);
  // счетов может быть много — отдельной группой после обычных виджетов
  return '<section class="sec"><div class="sechead"><h2>Добавить виджет</h2></div>' + (gen.length ? '<div class="wgal">' + gen.map(tile).join("") + '</div>' : "") + '</section>' +
    (inst.length ? '<section class="sec"><div class="sechead"><h2>Карта счёта</h2><span class="mut" style="font-size:13px">' + inst.length + '</span></div><div class="group">' + inst.map(x => { const a = acc(wArg(x.id)); return '<button class="row" data-act="wadd" data-id="' + esc(x.id) + '">' + (a ? accTile(a) : "") + '<span class="body"><span class="t"><b>' + esc(a ? a.name : x.name) + '</b><small>' + esc(x.desc || "") + (a && a.bank ? " · " + esc(a.bank) : "") + '</small></span><span class="wgp" aria-hidden="true">+</span></span></button>'; }).join("") + '</div></section>' : "");
}

/* ---------- перетаскивание (мышь и палец) ---------- */
function homeMove(id, to) {
  const L = homeEditable(), from = L.findIndex(x => x.id === id); if (from < 0) return false;
  to = Math.max(0, Math.min(L.length - 1, to)); if (to === from) return false;
  const [it] = L.splice(from, 1); L.splice(to, 0, it); return true;
}
document.addEventListener("pointerdown", e => {
  const h = e.target.closest && e.target.closest("[data-wdrag]"); if (!h || UI.view !== "home" || !UI.homeEdit) return;
  e.preventDefault(); homeEditable();
  HDRAG = { id: h.dataset.wdrag, last: null, moved: false };
  document.documentElement.classList.add("wdragging"); renderHomeGrid();
});
document.addEventListener("pointermove", e => {
  if (!HDRAG) return; e.preventDefault();
  if (e.clientY < 90) window.scrollBy(0, -14); else if (e.clientY > window.innerHeight - 130) window.scrollBy(0, 14);
  const el = document.elementFromPoint(e.clientX, e.clientY), w = el && el.closest && el.closest("[data-wid]");
  if (!w) { HDRAG.last = null; return; }
  const tid = w.dataset.wid; if (tid === HDRAG.id || tid === HDRAG.last) return;
  const L = homeEditable(), to = L.findIndex(x => x.id === tid);
  if (homeMove(HDRAG.id, to)) { HDRAG.moved = true; HDRAG.last = tid; renderHomeGrid(); }
}, { passive: false });
function homeDragEnd() {
  if (!HDRAG) return; const moved = HDRAG.moved; HDRAG = null;
  document.documentElement.classList.remove("wdragging"); renderHomeGrid();
  if (moved) homeSave();
}
document.addEventListener("pointerup", homeDragEnd);
document.addEventListener("pointercancel", homeDragEnd);
/* с клавиатуры: фокус на ручке, стрелки двигают виджет */
document.addEventListener("keydown", e => {
  const h = e.target.closest && e.target.closest("[data-wdrag]"); if (!h || !UI.homeEdit) return;
  const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 0; if (!d) return;
  e.preventDefault(); const id = h.dataset.wdrag, L = homeEditable(), i = L.findIndex(x => x.id === id);
  if (homeMove(id, i + d)) { homeSave().then(() => { const n = document.querySelector('[data-wdrag="' + CSS.escape(id) + '"]'); if (n) n.focus(); }); }
});

/* ---------- настройки: блок в «Персонализации» ---------- */
function homePrefsBlock() {
  const L = homeLayout(), have = new Set(L.map(x => x.id));
  const off = [];
  for (const id in App.widgets) { const W = App.widgets[id]; if (!W.avail()) continue; if (W.instances) { for (const x of W.instances()) if (!have.has(id + ":" + x.arg)) off.push(id + ":" + x.arg); } else if (!have.has(id)) off.push(id); }
  const row = (id, i, on) => '<div class="ord"><span class="oname' + (on ? "" : " off") + '">' + esc(wName(id)) + '</span>' +
    (on ? '<button class="mbtn" data-act="wmv" data-id="' + esc(id) + '" data-d="-1" aria-label="Выше: ' + esc(wName(id)) + '"' + (i ? "" : " disabled") + '>↑</button><button class="mbtn" data-act="wmv" data-id="' + esc(id) + '" data-d="1" aria-label="Ниже: ' + esc(wName(id)) + '"' + (i < L.length - 1 ? "" : " disabled") + '>↓</button>' : "") +
    '<button class="sw" role="switch" aria-checked="' + on + '" data-act="' + (on ? "wrm" : "wadd") + '" data-id="' + esc(id) + '" aria-label="Показывать: ' + esc(wName(id)) + '"></button></div>';
  const ex = dailyExcluded().size;
  return secT("Главная · виджеты", '<a href="#home" data-act="homeedit">Изменить на экране</a>', '<div class="group">' + L.map((x, i) => row(x.id, i, true)).join("") + off.map(id => row(id, 0, false)).join("") + '</div>' +
    '<div class="group" style="margin-top:10px"><button class="row" data-act="wcfg" data-k="daily"><span class="tile" style="background:#FF9500">' + svg("bars", 18) + '</span><span class="body"><span class="t"><b>Средние траты в день</b><small>' + (ex ? "не учитываются " + ex + " " + pl(ex, "категория", "категории", "категорий") : "учитываются все категории") + (dailyCustom() ? "" : " · по умолчанию") + '</small></span><span class="chev" aria-hidden="true">›</span></span></button></div>', "Размер и порядок удобнее менять прямо на Главной: «Изменить».");
}

/* ---------- действия ---------- */
App.actions({
  homeedit: () => { UI.homeEdit = true; if (UI.view !== "home") go("home"); else { render(); window.scrollTo(0, 0); } },
  homedone: () => { UI.homeEdit = false; render(); window.scrollTo(0, 0); },
  wrm: async t => { const L = homeEditable(), i = L.findIndex(x => x.id === t.dataset.id); if (i < 0) return; const [x] = L.splice(i, 1); await homeSave(); toast("Виджет «" + wName(x.id) + "» убран", async () => { homeEditable().splice(i, 0, x); await homeSave(); }); },
  wadd: async t => { const id = t.dataset.id, W = App.widgets[wType(id)]; if (!W) return; homeEditable().push({ id, size: W.size }); await homeSave(); },
  wsize: async t => { const it = homeEditable().find(x => x.id === t.dataset.id); if (!it) return; const W = App.widgets[wType(it.id)]; it.size = (it.size || W.size) === "M" ? "S" : "M"; await homeSave(); },
  wmv: async t => { const L = homeEditable(), i = L.findIndex(x => x.id === t.dataset.id); if (homeMove(t.dataset.id, i + +t.dataset.d)) await homeSave(); },
  wreset: async () => { const u = PZ(), prev = u.home; delete u.home; await homeSave(); toast("Возвращён стандартный набор", async () => { PZ().home = prev; await homeSave(); }); },
  wcfg: t => openSheet({ kind: t.dataset.k, title: "Настройка" }),
  /** переход из виджета с нужной вкладкой/категорией */
  wgo: t => { const d = t.dataset; if (d.atab) UI.atab = d.atab; if (d.acat != null) UI.acat = d.acat || null; if (d.am != null) UI.am = null; go(d.v); }
});

App.view("home", vHome);
