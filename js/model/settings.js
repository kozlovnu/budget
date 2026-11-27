/* Модель настроек.
   Схема документа meta/settings (версия 2):
     v          — версия схемы
     cats       — категории { e: [{name, subs}], i: [...] }
     budgets    — лимиты по категориям { категория: {v, cur} }; limitTotal — общий лимит {v, cur}
     forecast   — всё о прогнозе: параметры модели (hz, fx, by, infl, extOn, bt, kinds) и сценарии events
     my         — личные суммы с месяцем начала действия (salary, bonus, incomes, deposits, fixed),
                  регулярные счета и правила их оплаты (bills — схема в calc/bills.js),
                  вид (ui), профиль (name, about), служебное (autoBk, lastBackup, defAcc…)
   До версии 2 параметры прогноза жили в двух местах (fc2 и forecast), а личные суммы — ещё и в fc2.
   Версия 3: появилась Главная — стартовый экран «Капитал» (прежнее значение по умолчанию) становится «Главной»;
   my.ui.home — раскладка виджетов [{id, size}], пока её нет — стандартный набор.
   Приведение к схеме (normalizeSettings) идёт один раз при каждой загрузке данных, а не при отрисовке. */
"use strict";
const SETTINGS_V = 3;
const FC_DEF = { extOn: true, fx: "now", by: 0, infl: 0, hz: 12, bt: "", kinds: {} };
const FC_LEGACY = ["brokerYield", "incOverride", "expOverride", "horizon"]; // поля старого прогноза, больше не используются
const DEF_CATS = () => ({ e: ["Аренда квартиры", "Коммунальные", "Подписки", "Продукты", "Кафе", "Транспорт", "Путешествия", "Покупки", "Здоровье", "Развлечения", "Подарки", "Прочее"].map(n => ({ name: n, subs: [] })), i: ["Зарплата", "Проценты", "Продажа имущества", "Возвраты", "Прочие доходы"].map(n => ({ name: n, subs: [] })) });
const isObj = x => !!x && typeof x === "object" && !Array.isArray(x);

/** Настройки есть всегда: при первом запуске — значения по умолчанию. */
function ensureSettings() { if (!isObj(S.settings)) { S.settings = { v: SETTINGS_V, cats: DEF_CATS(), budgets: {}, forecast: {} }; normalizeSettings(S.settings); } return S.settings; }

/** Довести документ настроек до схемы v2. Идемпотентно; возвращает true, если структура поменялась (нужна миграция в базе). */
function normalizeSettings(st) {
  let changed = false;
  if (!isObj(st.cats)) { st.cats = DEF_CATS(); changed = true; }
  for (const t of ["e", "i"]) if (!Array.isArray(st.cats[t])) st.cats[t] = [];
  if (!isObj(st.budgets)) st.budgets = {};
  const old = isObj(st.fc2) ? st.fc2 : {};
  const F = isObj(st.forecast) ? st.forecast : (st.forecast = {});
  // 1) личные суммы из старого fc2 → my (тот же перенос, что раньше делался при каждой отрисовке)
  const M = isObj(st.my) ? st.my : (st.my = {});
  const from0 = (Object.keys(S.ops || {}).filter(m => (S.ops[m] || []).length).sort()[0]) || curM();
  if (!isObj(M.salary)) M.salary = { hist: +old.sal ? [{ from: from0, v: +old.sal, cur: old.salCur || "UZS" }] : [] };
  if (!Array.isArray(M.salary.hist)) M.salary.hist = [];
  if (!isObj(M.bonus)) M.bonus = { on: !!old.premOn, months: (old.premM || []).slice(), hist: old.premM ? [{ from: from0, target: 25, pct: old.premPct != null ? +old.premPct : 100 }] : [] };
  if (!Array.isArray(M.bonus.hist)) M.bonus.hist = [];
  if (!Array.isArray(M.bonus.months)) M.bonus.months = [];
  if (!Array.isArray(M.incomes)) M.incomes = (old.rub || []).map((x, i) => ({ id: "inc" + (i + 1), name: x.n || "Поступление", cur: "RUB", cat: "", months: (x.m || []).slice(), hist: [{ from: from0, v: +x.v || 0 }] }));
  if (!isObj(M.deposits)) M.deposits = { plan: (old.plan || []).map(x => Object.assign({}, x)), tax: old.tax != null ? +old.tax : 0 };
  if (!Array.isArray(M.deposits.plan)) M.deposits.plan = [];
  if (M.about == null) M.about = "";
  if (!isObj(M.fixed)) M.fixed = {};
  if (M.daily !== undefined && !(isObj(M.daily) && Array.isArray(M.daily.exclude))) delete M.daily; // нет — значит «по умолчанию»
  if (M.bills !== undefined) { if (!isObj(M.bills)) delete M.bills; else { if (!Array.isArray(M.bills.list)) M.bills.list = []; M.bills.list = M.bills.list.filter(b => isObj(b) && b.id); for (const b of M.bills.list) if (!Array.isArray(b.subs)) b.subs = []; if (!isObj(M.bills.marks)) M.bills.marks = {}; } } // регулярные счета (calc/bills.js)
  // 2) параметры модели прогноза из fc2 → forecast; старые поля прогноза удаляются
  if (isObj(st.fc2)) {
    for (const k in FC_DEF) if (F[k] == null && old[k] != null) F[k] = old[k];
    delete st.fc2; changed = true;
  }
  for (const k of FC_LEGACY) if (k in F) { delete F[k]; changed = true; }
  for (const k in FC_DEF) if (F[k] == null) F[k] = JSON.parse(JSON.stringify(FC_DEF[k]));
  if (!isObj(F.kinds)) F.kinds = {};
  if (!Array.isArray(F.events)) F.events = [];
  // 3) вид приложения
  const wasV = +st.v || 1;
  normalizeUI(M);
  if (wasV < 3 && M.ui.start === "capital") M.ui.start = "home";
  if (st.v !== SETTINGS_V) { st.v = SETTINGS_V; changed = true; }
  return changed;
}
function normalizeUI(M) {
  const u = isObj(M.ui) ? M.ui : (M.ui = {});
  for (const k in PZ_DEF) if (u[k] === undefined) u[k] = JSON.parse(JSON.stringify(PZ_DEF[k]));
  if (!Array.isArray(u.curs) || u.curs.length < 2) u.curs = PZ_DEF.curs.slice();
  if (!Array.isArray(u.favs)) u.favs = [];
  const have = (Array.isArray(u.blocks) ? u.blocks : []).filter((b, i, a) => b && PZ_BLOCKS.some(x => x[0] === b.id) && a.findIndex(y => y && y.id === b.id) === i);
  for (const x of PZ_BLOCKS) if (!have.some(b => b.id === x[0])) have.push({ id: x[0], on: x[0] !== "mains" });
  u.blocks = have;
  if (u.home !== undefined) { if (!Array.isArray(u.home)) delete u.home; else u.home = u.home.filter((x, i, a) => x && typeof x.id === "string" && a.findIndex(y => y && y.id === x.id) === i).map(x => ({ id: x.id, size: x.size === "M" ? "M" : "S" })); }
  return u;
}
/* Доступ к частям настроек. Только чтение структуры: значения по умолчанию уже проставлены normalizeSettings. */
function mySt() { return ensureSettings().my; }
function fcS() { return ensureSettings().forecast; }
function PZ() { return mySt().ui; }

/** Разовая миграция в базе: копия «перед обновлением», затем запись настроек в новой схеме.
    Вызывается после загрузки данных; блокировка не даёт двум устройствам мигрировать одновременно. */
async function migrateSettings() {
  if (!DB || !SRV.settings || migrateSettings.done) return;
  const raw = JSON.parse(JSON.stringify(SRV.settings));
  if (raw.v === SETTINGS_V && !raw.fc2) { migrateSettings.done = true; return; }
  migrateSettings.done = true;
  try {
    const lk = await DB.doc("locks/migrate").acquire({ holder: BK_HOLDER, ttlMs: 60000 });
    if (lk && lk.acquired === false) return; // мигрирует другое устройство — новые настройки придут сами
  } catch (e) { warn("блокировка миграции", e); }
  try { await bkCreate("pre-migration"); } catch (e) { warn("копия перед обновлением", e); return; } // без копии не мигрируем
  // пишем текущее состояние (уже приведённое к схеме при загрузке и со всеми правками, сделанными за эти секунды),
  // через ту же очередь, что и обычные сохранения, — чтобы ничего не затереть
  await queued("meta/settings", async () => { const cur = JSON.parse(JSON.stringify(ensureSettings())); normalizeSettings(cur); await DB.doc("meta/settings").set(cur); SRV.settings = cur; });
}
function verAt(hist, m) { let r = null; for (const h of (hist || [])) if (h && /^\d{4}-\d{2}$/.test(h.from || "") && h.from <= m && (!r || h.from >= r.from)) r = h; return r; }
function verNext(hist, m) { let r = null; for (const h of (hist || [])) if (h && h.from > m && (!r || h.from < r.from)) r = h; return r; }
function toUZSr(v, cur, r) { return cur === "UZS" ? v : cur === "USD" ? v * r.usd * r.uzs : cur === "EUR" ? v * r.eur * r.uzs : cur === "KZT" ? v / r.kzt * r.uzs : v * r.uzs; }
function salUZSAt(m, r) { const h = verAt(mySt().salary.hist, m); return h ? toUZSr(+h.v || 0, h.cur || "UZS", r) : 0; }
function bonusUZSAt(m, r, base) { const B = mySt().bonus; if (!B.on || !(B.months || []).includes(+m.slice(5))) return 0; const h = verAt(B.hist, m); if (!h) return 0; const s = base != null ? base : salUZSAt(m, r); return s * 3 * (+h.target || 0) / 100 * (+h.pct || 0) / 100; }
function incAt(m, r) { let ru = 0, uz = 0; for (const x of (mySt().incomes || [])) { const ms = x.months || []; if (ms.length && !ms.includes(+m.slice(5))) continue; const h = verAt(x.hist, m); if (!h) continue; const v = +h.v || 0; if ((x.cur || "RUB") === "RUB") ru += v; else uz += toUZSr(v, x.cur, r); } return { ru, uz }; }
const KIND_DEF = { "Аренда квартиры": "fix", "Коммунальные": "fix", "Подписки": "fix", "Жилье": "fix", "Связь": "fix", "Обучение": "fix",
  "Путешествия": "irr", "Поездки": "irr", "Покупки": "irr", "Подарки": "irr", "Здоровье": "irr", "Авто": "irr", "Финансы": "irr", "Переводы людям": "irr" };
const KINDN = { fix: "Постоянные", var: "Переменные", irr: "Нерегулярные" };
const NON_REG_INC = ["Зарплата", "Продажа имущества", "Проценты"];
function catKind(c) { return fcS().kinds[c] || KIND_DEF[c] || "var"; }
/* ============ Раздел «Настройки» ============ */
const BKV = ["backups", "about", "prefs", "params"];
const PZ_BLOCKS = [["chart", "График капитала"], ["decomp", "Откуда изменение"], ["struct", "Из чего состоит"], ["mains", "Основные счета"], ["debts", "Долги · справочно"]];
const PZ_DEF = { theme: "auto", glass: "full", cur: "", curs: ["RUB", "USD", "UZS"], fmt: "int", favs: [], start: "home", hide: false, blur: false, remRecon: 1, remFile: null, accBy: "country" };
const MONP = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
const CURS4 = ["RUB", "USD", "UZS", "EUR"];
function applyUI() {
  const u = PZ(), r = document.documentElement;
  if (u.theme === "light" || u.theme === "dark") r.setAttribute("data-theme", u.theme); else r.removeAttribute("data-theme");
  if (u.glass === "low") r.setAttribute("data-glass", "low"); else r.removeAttribute("data-glass");
  r.classList.toggle("privacy", !!u.hide);
  FMT = u.fmt === "dec" || u.fmt === "short" ? u.fmt : "int";
  lsSet("theme", u.theme); lsSet("glass", u.glass);
}
async function savePZ() { applyUI(); render(); try { await saveMeta("settings"); } catch (e) { /* saveMeta уже показал ошибку и откатил изменение */ } }
function bkEnsure() { if (DB && UI.bkList === undefined) { UI.bkList = null; bkList().then(l => { UI.bkList = l; if (BKV.includes(UI.view)) render(); }).catch(() => { UI.bkList = []; }); } }
function lastBkTxt() { const L = UI.bkList; if (!DB) return "недоступны"; if (!L) return "…"; const a = L.find(b => b.kind === "auto"); return a ? bkWhen(a.at) : bkCfg().freq ? "ещё не было" : "выключены"; }
function initials(nm) { return String(nm || "").split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase(); }
function monthsIn(ms) { const a = (ms || []).slice().sort((x, y) => x - y).map(k => MONP[k - 1]); return !a.length ? "каждый месяц" : "в " + (a.length === 1 ? a[0] : a.slice(0, -1).join(", ") + " и " + a[a.length - 1]); }
function pct1(v) { v = +v || 0; return nf(v, v % 1 ? 1 : 0) + "%"; }
function moneyF(v, cur, dec) { const n = (v < 0 ? "−" : "") + nf(v, dec); return cur === "USD" ? "$" + n : cur === "EUR" ? "€" + n : n + " " + (SYM[cur] || cur); }
function secT(t, right, body, foot) { return '<section class="sec" style="gap:6px"><div class="caps"><span>' + t + '</span>' + (right ? '<span>' + right + '</span>' : "") + '</div>' + body + (foot ? '<p class="foot">' + foot + '</p>' : "") + '</section>'; }

function myPath(path) { const k = path.split("."); let o = mySt(); for (let i = 0; i < k.length - 1; i++) { o = o[/^\d+$/.test(k[i]) ? +k[i] : k[i]]; if (o == null) return null; } return { o, key: /^\d+$/.test(k[k.length - 1]) ? +k[k.length - 1] : k[k.length - 1] }; }
function mySort() { const M = mySt(); const by = (a, b) => (a.from || "") < (b.from || "") ? -1 : 1; M.salary.hist.sort(by); M.bonus.hist.sort(by); for (const x of M.incomes || []) (x.hist || []).sort(by); (M.deposits.plan || []).sort(by); for (const c in M.fixed || {}) ((M.fixed[c] || {}).hist || []).sort(by); }
async function mySave() { mySort(); render(); await saveMeta("settings"); }
