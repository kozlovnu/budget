/* Резервные копии */
"use strict";
/* ---------- Настройки ---------- */
function mLabelG(m) { return MONG[+m.slice(5) - 1] + " " + m.slice(0, 4); }
/* ---------- Резервные копии: автоматические в базе приложения + файл ---------- */
const BKF = [[1, "каждый день"], [3, "раз в 3 дня"], [7, "раз в неделю"], [0, "выключена"]];
function bkCfg() { const M = mySt(); const c = M.autoBk || {}; return { freq: c.freq == null ? 1 : +c.freq, keep: +c.keep || 14 }; }
function bkData() {
  const data = { app: "budget", v: 2, at: new Date().toISOString(), meta: {}, ops: {} };
  for (const k of ["accounts", "settings", "rates", "snaps", "debts", "advice", "game"]) if (S[k]) data.meta[k] = S[k];
  for (const m of Object.keys(S.ops).sort()) if ((S.ops[m] || []).length) data.ops[m] = S.ops[m];
  if (S.fcsaved && Object.keys(S.fcsaved).length) data.forecasts = S.fcsaved; // сохранённые прогнозы — для «Прогноз и факт»
  return data;
}
async function bkPack(str) {
  if (typeof CompressionStream === "undefined") return { enc: "json", data: str };
  const buf = new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return { enc: "gzip64", data: btoa(bin) };
}
async function bkUnpack(enc, data) {
  if (enc === "json") return data;
  const bin = atob(data), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}
const BK_CH = 200000;
async function bkCreate(kind) {
  const data = bkData(), z = await bkPack(JSON.stringify(data));
  const now = new Date(), id = "b" + now.toISOString().replace(/[^0-9]/g, "").slice(0, 14) + Math.random().toString(36).slice(2, 5);
  const parts = Math.max(1, Math.ceil(z.data.length / BK_CH));
  for (let i = 0; i < parts; i++) await DB.doc("backupParts/" + id + "-" + i).set({ d: z.data.slice(i * BK_CH, (i + 1) * BK_CH) });
  await DB.doc("backups/" + id).set({ at: now.toISOString(), day: iso(now), kind, enc: z.enc, parts, size: z.data.length, nOps: allOps().length, nAcc: accs().length, cap: Math.round(capitalNowRUB()) });
  return id;
}
async function bkList() { const q = await DB.collection("backups").orderBy("at", "desc").limit(200).get(); return q.docs.filter(d => d.exists && d.data().at).map(d => Object.assign({ id: d.id }, d.data())); }
async function bkDelete(b) { await DB.doc("backups/" + b.id).delete(); for (let i = 0; i < (b.parts || 1); i++) { try { await DB.doc("backupParts/" + b.id + "-" + i).delete(); } catch (e) { warn("удаление части копии", e); } } }
async function bkPrune(list) {
  const cfg = bkCfg(); const auto = list.filter(b => b.kind === "auto"), other = list.filter(b => b.kind !== "auto");
  for (const b of auto.slice(cfg.keep).concat(other.slice(5))) { try { await bkDelete(b); } catch (e) { warn("удаление старой копии", e); } }
}
async function bkLoad(b) {
  let s = ""; for (let i = 0; i < (b.parts || 1); i++) { const d = await DB.doc("backupParts/" + b.id + "-" + i).get(); if (!d.exists) throw new Error("part"); s += d.data().d; }
  return JSON.parse(await bkUnpack(b.enc, s));
}
const BK_HOLDER = "h" + Math.random().toString(36).slice(2, 10);
let BK_BUSY = false, BK_LAST_CHECK = 0;
function bkDue(list) { const c = bkCfg(); if (!c.freq) return false; const last = list.find(b => b.kind === "auto"); return !last || days(last.day || last.at.slice(0, 10), TODAYS) >= c.freq; }
async function autoBackup(force) {
  if (!DB || BK_BUSY || !S.loadedMeta || !S.loadedOps || !S.accounts) return;
  if (!force && Date.now() - BK_LAST_CHECK < 55 * 60e3) return;
  if (!force && !bkCfg().freq) return;
  BK_BUSY = true; BK_LAST_CHECK = Date.now();
  try {
    let list = await bkList();
    if (!force && !bkDue(list)) { UI.bkList = list; return; }
    const lk = await DB.doc("locks/backup").acquire({ holder: BK_HOLDER, ttlMs: 120000 });
    if (!lk.acquired) return;
    list = await bkList();
    if (!force && !bkDue(list)) { UI.bkList = list; return; }
    await bkCreate(force ? "manual" : "auto");
    list = await bkList(); await bkPrune(list); UI.bkList = await bkList();
    if (force) toast("Копия сохранена в приложении");
  } catch (e) { if (force) toast("Не удалось сделать копию — повторите позже"); }
  finally { BK_BUSY = false; if (BKV.includes(UI.view)) render(); }
}
function bkWhen(at) { const d = new Date(at); return dLabel(iso(d)) + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function backupSec() {
  const M = mySt(), cfg = bkCfg(), lb = M.lastBackup, RS = UI.restore;
  bkEnsure();
  const L = UI.bkList || [], lastAuto = L.find(b => b.kind === "auto");
  const nextTxt = !cfg.freq ? "выключено" : !lastAuto ? "при следующем открытии приложения" : (() => { const n = iso(new Date(new Date(lastAuto.day + "T00:00:00").getTime() + cfg.freq * 864e5)); return n <= TODAYS ? "при следующем открытии приложения" : "при открытии приложения с " + dLabel(n); })();
  let h = '<section class="sec" style="gap:6px"><div class="caps"><span>Резервные копии</span><span>автоматически</span></div><div class="group">' +
    '<div class="field"><label for="bk-freq">Автокопия</label><select id="bk-freq" data-in="bkfreq">' + BKF.map(x => '<option value="' + x[0] + '"' + (cfg.freq === x[0] ? " selected" : "") + '>' + x[1] + '</option>').join("") + '</select></div>' +
    '<div class="field"><label for="bk-keep">Хранить копий</label><select id="bk-keep" data-in="bkkeep">' + [7, 14, 30].map(n => '<option value="' + n + '"' + (cfg.keep === n ? " selected" : "") + '>' + n + '</option>').join("") + '</select></div>' +
    '<div class="field"><span style="flex:1;font-size:15px;line-height:1.35;padding:8px 0"><span class="mut">Последняя автокопия:</span> ' + (UI.bkList === null ? "загружаю…" : lastAuto ? esc(bkWhen(lastAuto.at)) : "еще не было") + '<br><span class="mut">Следующая:</span> ' + esc(nextTxt) + '</span></div>' +
    (DB ? '<button class="row" data-act="bknow"' + (BK_BUSY ? " disabled" : "") + '><span class="body" style="border:0"><span class="t"><b style="color:var(--link)">' + (BK_BUSY ? "Сохраняю копию…" : "Сделать копию сейчас") + '</b></span></span></button>' : "") +
    '</div>';
  if (L.length) h += '<div class="group" style="margin-top:10px">' + L.slice(0, 30).map(b => '<div class="row"><span class="body" style="flex-wrap:wrap;row-gap:8px;padding-top:10px;padding-bottom:10px"><span class="t" style="min-width:170px"><b>' + esc(bkWhen(b.at)) + '</b><small>' + (b.kind === "auto" ? "авто" : b.kind === "pre-restore" ? "перед восстановлением" : b.kind === "pre-delete" ? "перед удалением" : b.kind === "pre-migration" ? "перед обновлением" : "вручную") + ' · ' + (b.nOps || 0).toLocaleString("ru-RU") + ' ' + pl(b.nOps || 0, "операция", "операции", "операций") + ' · ' + esc(DS(b.cap || 0)) + '</small></span><span style="display:flex;gap:6px;flex:none">' + (DL ? '<button class="chipb" data-act="bkfile" data-id="' + esc(b.id) + '" aria-label="Скачать копию файлом">Файл</button>' : "") + '<button class="chipb" data-act="bkpick" data-id="' + esc(b.id) + '">Восстановить</button></span></span></div>').join("") + '</div>';
  if (RS && RS.err) h += '<div class="group" style="margin-top:10px"><div class="field"><span class="neg" style="font-size:14px;padding:8px 0">' + esc(RS.err) + '</span></div></div>';
  if (RS && RS.data) h += '<div class="group" style="margin-top:10px"><div class="field" style="flex-direction:column;align-items:stretch;gap:10px;padding:12px 16px"><span style="font-size:15px;line-height:1.4"><b>' + esc(RS.file) + '</b><br>Копия от ' + esc(RS.atLabel) + ': ' + RS.nOps.toLocaleString("ru-RU") + ' ' + pl(RS.nOps, "операция", "операции", "операций") + ', ' + RS.nAcc + ' ' + pl(RS.nAcc, "счет", "счета", "счетов") + ', ' + RS.nSnaps + ' ' + pl(RS.nSnaps, "сверка", "сверки", "сверок") + '. Сейчас в базе ' + allOps().length.toLocaleString("ru-RU") + ' ' + pl(allOps().length, "операция", "операции", "операций") + '. Перед восстановлением текущие данные сохранятся отдельной копией.</span>' +
    (UI.restoreBusy ? '<span class="mut">Восстанавливаю…</span>' : '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn danger" style="flex:1;min-width:160px;height:44px;font-size:15px' + (RS.armed ? ';color:#fff;background:var(--red)' : "") + '" data-act="' + (RS.armed ? "restorego" : "restorearm") + '">' + (RS.armed ? "Точно заменить все данные" : "Восстановить из этой копии") + '</button><button class="btn alt" style="flex:1;min-width:120px;height:44px;font-size:15px" data-act="restorecancel">Отмена</button></div>') + '</div></div>';
  h += '<p class="foot">Копии хранятся в базе приложения и спасают от ошибок, неудачного импорта и правок с другого устройства. Если удалить само приложение, удалятся и они — для этого раз в месяц сохраняйте файл.</p>';
  h += '<div class="caps" style="margin-top:8px"><span>Файл на устройстве</span></div><div class="group">' +
    '<div class="field"><span style="flex:1;font-size:17px">Последний файл</span><span class="mut" style="font-size:15px">' + (lb ? esc(dLabel(lb)) : "еще не сохраняли") + '</span></div>' +
    (DL ? '<button class="row" data-act="backup"><span class="body" style="border:0"><span class="t"><b style="color:var(--link)">Скачать копию всей базы</b><small>файл JSON: операции, счета, сверки, курсы, долги, настройки</small></span></span></button>'
      : '<div class="field"><span class="mut" style="font-size:14px;padding:8px 0">Скачивание недоступно в этом браузере.</span></div>') +
    '<label class="row" style="cursor:pointer"><span class="body" style="border:0"><span class="t"><b style="color:var(--link)">Восстановить из файла…</b><small>сначала покажем, что в файле; данные заменятся только после подтверждения</small></span></span><input type="file" id="restorefile" accept=".json,application/json" data-in="restore" style="position:absolute;left:-9999px"></label></div>';
  return h + '</section>';
}
async function doBackup(data, name) {
  if (!DL) return toast("Скачивание недоступно в этом просмотре");
  try { await DL.save({ filename: name || "budget-backup-" + TODAYS + ".json", data: JSON.stringify(data || bkData()) }); }
  catch (e) { if (!e || e.code !== "declined") toast("Не удалось сохранить файл"); return; }
  if (data) return toast("Файл сохранен");
  mySt().lastBackup = TODAYS; render(); try { await saveMeta("settings"); } catch (e) { return; } toast("Копия сохранена");
}
function bkCheck(d, label) {
  if (!d || d.app !== "budget" || !d.meta || !d.ops || typeof d.ops !== "object") throw 0;
  for (const m in d.ops) { if (!/^\d{4}-\d{2}$/.test(m) || !Array.isArray(d.ops[m])) throw 0; for (const o of d.ops[m]) if (!o || !o.id || !/^\d{4}-\d{2}-\d{2}$/.test(o.d || "") || !(o.a > 0)) throw 0; }
  for (const k in d.meta) if (!["accounts", "settings", "rates", "snaps", "debts", "advice", "game"].includes(k) || !d.meta[k] || typeof d.meta[k] !== "object") throw 0;
  if (d.forecasts != null) { if (typeof d.forecasts !== "object" || Array.isArray(d.forecasts)) throw 0; for (const id in d.forecasts) if (!/^[\w-]+$/.test(id) || !d.forecasts[id] || typeof d.forecasts[id] !== "object") throw 0; }
  const at = new Date(d.at);
  return { file: label, data: d, nOps: Object.values(d.ops).reduce((s, l) => s + l.length, 0), nAcc: ((d.meta.accounts || {}).list || []).length, nSnaps: Object.keys((d.meta.snaps || {}).items || {}).length, atLabel: isNaN(at) ? "неизвестной даты" : bkWhen(d.at) };
}
async function readRestore(f) {
  UI.restore = { file: f.name };
  try { UI.restore = bkCheck(JSON.parse(await f.text()), f.name); }
  catch (e) { UI.restore = { file: f.name, err: "Это не копия бюджета или файл поврежден — восстановление невозможно." }; }
  render();
}
async function bkPick(id, toFile) {
  const b = (UI.bkList || []).find(x => x.id === id); if (!b) return;
  try { const d = await bkLoad(b); if (toFile) return doBackup(d, "budget-backup-" + b.at.slice(0, 10) + ".json"); UI.restore = bkCheck(d, "Копия в приложении"); }
  catch (e) { if (toFile) return toast("Копия повреждена — выберите другую"); UI.restore = { file: "Копия в приложении", err: "Копия повреждена или неполная — выберите другую." }; }
  render();
}
async function doRestore() {
  const RS = UI.restore; if (!RS || !RS.data || UI.restoreBusy) return;
  const d = RS.data; UI.restoreBusy = true; render();
  try { await bkCreate("pre-restore"); } catch (e) { UI.restoreBusy = false; render(); return toast("Не удалось сохранить копию текущих данных — восстановление отменено"); }
  try {
    for (const k in d.meta) await save("meta/" + k, d.meta[k]);
    for (const m of Object.keys(d.ops)) { const it = {}; for (const o of d.ops[m]) it[o.id] = opWire(o); await save("ops/" + m, { items: it }); OPSFMT[m] = "map"; }
    for (const m of Object.keys(S.ops)) if (!d.ops[m]) { await save("ops/" + m, { items: {} }); OPSFMT[m] = "map"; }
    for (const id in (d.forecasts || {})) await save("forecasts/" + id, d.forecasts[id]);
    UI.restore = null; toast("Данные восстановлены. Прежнее состояние сохранено копией «перед восстановлением»");
  } catch (e) { toast("Восстановление прервано: часть данных не записалась. Повторите восстановление из той же копии"); }
  UI.restoreBusy = false; UI.bkList = undefined; render();
}
async function restoreAcc(a, i) { if (!a || accs().some(x => x.id === a.id)) return; S.accounts.list.splice(Math.min(i < 0 ? 0 : i, S.accounts.list.length), 0, a); await saveMeta("accounts"); }

/* ---------- действия модуля ---------- */
App.actions({
  backup: () => doBackup(),
  restorego: () => doRestore(),
  bknow: () => autoBackup(true),
  bkfreq: async t => { const M = mySt(); M.autoBk = Object.assign({}, M.autoBk || {}, { freq: +t.dataset.v }); await mySave(); if (+t.dataset.v) { BK_LAST_CHECK = 0; autoBackup(); } },
  bkpick: t => bkPick(t.dataset.id),
  bkfile: t => bkPick(t.dataset.id, true),
  restorearm: () => { if (UI.restore) { UI.restore.armed = true; render(); } },
  restorecancel: () => { UI.restore = null; render(); }
});

/* ---------- поля модуля ---------- */
App.change(t => t.dataset.in === "bkfreq", async t => { const M = mySt(); M.autoBk = Object.assign({}, M.autoBk || {}, { freq: +t.value }); await mySave(); if (+t.value) { BK_LAST_CHECK = 0; autoBackup(); } });
App.change(t => t.dataset.in === "bkkeep", async t => { const M = mySt(); M.autoBk = Object.assign({}, M.autoBk || {}, { keep: +t.value }); await mySave(); });
App.change(t => t.dataset.in === "restore", async t => { const f = t.files && t.files[0]; if (f) readRestore(f); t.value = ""; });
