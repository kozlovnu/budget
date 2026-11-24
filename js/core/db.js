/* Работа с базой: очередь записей, операции по месяцам, загрузка */
"use strict";
/* ============ db ============ */
const QUEUE = {}, SRV = {};
function dbErrText(e) {
  const code = e && e.code;
  return code === "quota_exceeded" ? "Хранилище заполнено — изменение не сохранено и отменено" : code === "invalid_argument" ? "Нет прав на изменение данных — изменение отменено" : "Не сохранилось: нет связи с базой. Изменение отменено — повторите";
}
/** Записи в один документ идут строго по очереди (так требует база). */
function queued(path, job) {
  if (!DB) { toast("Изменения не сохраняются: база недоступна в этом просмотре"); return Promise.reject({ code: "no_db" }); }
  const p = (QUEUE[path] || Promise.resolve()).then(job).catch(e => { toast(dbErrText(e)); throw e; });
  QUEUE[path] = p.catch(() => {});
  return p;
}
function save(path, data, mode) { return queued(path, () => mode === "update" ? DB.doc(path).update(data) : DB.doc(path).set(data)); }
// a month is stored as {items: {opId: op}} so that each change touches only its own operation
const OPK = ["id", "d", "t", "a", "ac", "to", "ta", "c", "s", "n", "card", "src"];
function normItems(items) {
  if (Array.isArray(items)) return items.filter(Boolean).map(o => Object.assign({}, o));
  const out = [];
  for (const k in items || {}) { const o = items[k]; if (!o || typeof o !== "object") continue; const c = {}; for (const f in o) if (o[f] != null) c[f] = o[f]; if (!c.id) c.id = k; out.push(c); }
  out.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  return out;
}
function opWire(op) { const w = {}; for (const k of OPK) w[k] = op[k] == null ? null : op[k]; for (const k in op) if (!(k in w) && op[k] != null) w[k] = op[k]; return w; }
const OPSFMT = {};
function applyOps(list, ch) { const ids = new Set(Object.keys(ch)); const out = list.filter(x => !ids.has(x.id)); for (const id in ch) if (ch[id]) out.push(ch[id]); out.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0); return out; }
async function writeOps(m, changes) {
  const cur = S.ops[m] || [], before = {};
  for (const id in changes) before[id] = cur.find(x => x.id === id) || null;
  S.ops[m] = applyOps(cur, changes); ALLOPS = null;
  try {
    if (OPSFMT[m] === "map") { const it = {}; for (const id in changes) it[id] = changes[id] ? opWire(changes[id]) : null; await save("ops/" + m, { items: it }, "update"); }
    else { const it = {}; for (const o of S.ops[m]) it[o.id] = opWire(o); await save("ops/" + m, { items: it }); OPSFMT[m] = "map"; }
  } catch (e) { S.ops[m] = applyOps(S.ops[m] || [], before); ALLOPS = null; render(); throw e; }
}
async function putOp(op, oldD) {
  const m = op.d.slice(0, 7), om = oldD && oldD.slice(0, 7);
  const prevOld = om && om !== m ? (S.ops[om] || []).find(x => x.id === op.id) : null;
  await writeOps(m, { [op.id]: op });
  if (om && om !== m) { try { await writeOps(om, { [op.id]: null }); } catch (e) { try { await writeOps(m, { [op.id]: null }); } catch (x) { warn("откат переноса операции", x); } if (prevOld) S.ops[om] = applyOps(S.ops[om] || [], { [op.id]: prevOld }); ALLOPS = null; render(); throw e; } }
}
async function delOp(op) { await writeOps(op.d.slice(0, 7), { [op.id]: null }); }
/* ---------- служебные документы meta/* (счета, настройки, курсы, сверки, долги, игра) ----------
   Пишем не весь документ, а только изменившиеся поля: база сливает вложенные объекты при update,
   поэтому правки с двух устройств в разные поля больше не затирают друг друга.
   Массивы (список счетов, долгов) база заменяет целиком — для них по-прежнему «кто последний, тот прав». */
const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
/** Убрать поля со значением null: так база хранит удалённые поля после частичной записи. */
function stripNulls(x) {
  if (Array.isArray(x)) return x.map(v => isObj(v) ? stripNulls(v) : v);
  if (!isObj(x)) return x;
  const o = {}; for (const k in x) { const v = x[k]; if (v === null || v === undefined) continue; o[k] = isObj(v) || Array.isArray(v) ? stripNulls(v) : v; }
  return o;
}
/** Разница «сервер → локально» для частичной записи: изменённые поля, удалённые — null. null, если различий нет. */
function metaDiff(a, b) {
  const out = {}; let n = 0;
  for (const k in b) {
    const x = a ? a[k] : undefined, y = b[k];
    if (y === undefined || (y === null && x == null)) continue;
    if (isObj(x) && isObj(y)) { const d = metaDiff(x, y); if (d) { out[k] = d; n++; } }
    else if (JSON.stringify(x) !== JSON.stringify(y)) { out[k] = y; n++; }
  }
  if (a) for (const k in a) if (b[k] === undefined) { out[k] = null; n++; }
  return n ? out : null;
}
function saveMeta(id) {
  const path = "meta/" + id;
  const p = queued(path, async () => {
    const local = clone(S[id]), base = SRV[id];
    if (base === undefined) await DB.doc(path).set(local);
    else { const d = metaDiff(base, local); if (!d) return; await DB.doc(path).update(d); }
    SRV[id] = local;
  });
  return p.catch(e => { if (SRV[id]) S[id] = clone(SRV[id]); normalizeMeta(id); ALLOPS = null; render(); if (FORM) renderSheet(); throw e; });
}
/** Привести загруженный документ к текущей схеме (только в памяти). */
function normalizeMeta(id) {
  if (id === "settings" && isObj(S.settings)) normalizeSettings(S.settings);
  if (id === "game" && isObj(S.game)) normalizeGame(S.game);
}

async function boot() {
  // база — Firestore через js/core/cloud.js; разбор с помощью ИИ (SAMPLE) на своём хостинге недоступен
  try { DB = Cloud.db; } catch (e) { DB = null; }
  SAMPLE = null;
  DL = Cloud.downloads;
  if (!DB) { S.loadedMeta = S.loadedOps = true; S.noDb = true; render(); return; }
  DB.collection("meta").onSnapshot(snap => {
    for (const d of snap.docs) if (d.exists) { const v = stripNulls(d.data()); SRV[d.id] = v; S[d.id] = clone(v); }
    S.loadedMeta = true; ALLOPS = null; dataLoaded(); render(true);
  }, e => { S.dbErr = e && e.code; render(); });
  DB.collection("ops").onSnapshot(snap => {
    const o = {}; for (const d of snap.docs) if (d.exists) { const it = d.data().items; o[d.id] = normItems(it); OPSFMT[d.id] = Array.isArray(it) || !it ? "arr" : "map"; }
    S.ops = o; S.loadedOps = true; ALLOPS = null; dataLoaded(); render(true);
    if (!boot.bk) { boot.bk = true; setTimeout(() => autoBackup(), 4000); }
  }, e => { S.dbErr = e && e.code; render(); });
  for (const f of App.boots) { try { f(DB); } catch (e) { warn("запуск модуля", e); } }
}
/** После каждой загрузки: схема в памяти; один раз за сеанс — миграция в базе, если нужна. */
function dataLoaded() {
  if (!S.loadedMeta || !S.loadedOps) return;
  for (const id of ["settings", "game"]) normalizeMeta(id);
  if (!dataLoaded.once) { dataLoaded.once = true; setTimeout(() => migrateSettings().catch(e => warn("обновление настроек", e)), 1500); }
  for (const f of App.loads) { try { f(); } catch (e) { warn("модуль после загрузки", e); } }
}
