/* Экран «Журнал» */
"use strict";
/* ---------- Журнал ---------- */
function opMonths() { return Object.keys(S.ops).filter(m => S.ops[m].length).sort(); }
function vJournal() {
  const ms = opMonths();
  if (!UI.jm) UI.jm = ms.length ? ms[ms.length - 1] : curM();
  const m = UI.jm;
  let html = navHead("Журнал", "", eyeBtn(), headRight('<button class="gbtn glass" data-act="exportcsv">Экспорт</button>'));
  html += '<div style="display:flex;align-items:center;gap:8px;margin-top:14px"><button class="mbtn glass" data-act="jm" data-k="-1" aria-label="Предыдущий месяц">‹</button><div style="flex:1;text-align:center;font-size:17px;font-weight:600">' + mLabel(m, true) + '</div><button class="mbtn glass" data-act="jm" data-k="1" aria-label="Следующий месяц">›</button></div>';
  const nf0 = (UI.jtype !== "all" ? 1 : 0) + (UI.jacc ? 1 : 0) + (UI.jcat ? 1 : 0), open = UI.jfOpen || nf0 > 0;
  html += '<div class="jfilters" style="display:flex;flex-direction:column;gap:10px;margin-top:12px"><div style="display:flex;gap:8px"><label class="glass" style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:44px;border-radius:999px;padding:0 14px"><span aria-hidden="true" class="mut">⌕</span><span style="position:absolute;left:-9999px">Поиск</span><input id="jq" data-in="jq" value="' + esc(UI.jq) + '" placeholder="Поиск по категории, заметке" style="flex:1;min-width:0;border:0;background:transparent;font-size:16px"></label>' +
    '<button class="gbtn glass" data-act="jfilt" aria-expanded="' + open + '" style="height:44px;padding:0 14px;font-size:15px' + (nf0 ? ';color:var(--link);font-weight:600' : "") + '">' + (nf0 ? "Фильтры · " + nf0 : "Фильтры") + '</button></div>';
  if (open) {
    html += '<div class="seg glass" role="group" aria-label="Тип">' + [["all", "Все"], ["e", "Расходы"], ["i", "Доходы"], ["t", "Переводы"]].map(x => '<button data-act="jtype" data-t="' + x[0] + '" aria-pressed="' + (UI.jtype === x[0]) + '">' + x[1] + '</button>').join("") + '</div>';
    html += '<div style="display:flex;gap:8px"><select data-in="jacc" aria-label="Счет" class="glass" style="flex:1;min-width:0;height:40px;border-radius:999px;padding:0 12px;font-size:15px"><option value="">Все счета</option>' + accs().map(a => '<option value="' + a.id + '"' + (UI.jacc === a.id ? " selected" : "") + '>' + esc(a.name) + '</option>').join("") + '</select><select data-in="jcat" aria-label="Категория" class="glass" style="flex:1;min-width:0;height:40px;border-radius:999px;padding:0 12px;font-size:15px"><option value="">Все категории</option>' + allCatNames().map(c => '<option' + (UI.jcat === c ? " selected" : "") + '>' + esc(c) + '</option>').join("") + '</select></div>' +
      (nf0 ? '<button class="chipb" data-act="jreset" style="align-self:flex-start;height:32px;font-size:14px">Сбросить фильтры</button>' : "");
  }
  html += '</div>';
  html += '<div id="jlist">' + journalList() + '</div>';
  return html;
}
function allCatNames() { const s = new Set(); const C = (S.settings && S.settings.cats) || { e: [], i: [] }; for (const t of ["e", "i"]) for (const c of C[t]) s.add(c.name); for (const o of allOps()) if (o.c) s.add(o.c); return [...s]; }
/** Валюта списка операций, если она у всех одна; иначе null. Переводы не учитываются. */
function listCur(items) { let c = null; for (const o of items) { if (o.t === "t") continue; const k = opCur(o); if (c && c !== k) return null; c = k; } return c; }
function journalList() {
  const m = UI.jm, q = UI.jq.trim().toLowerCase();
  let items = (S.ops[m] || []).slice();
  items = items.filter(o => (UI.jtype === "all" || o.t === UI.jtype) && (!UI.jacc || o.ac === UI.jacc || o.to === UI.jacc) && (!UI.jcat || o.c === UI.jcat) &&
    (!q || [o.c, o.s, o.n, o.card, accName(o.ac)].join(" ").toLowerCase().includes(q)));
  // Итоги — в валюте самих операций, если она у всех одна (например, отфильтрован счёт в сумах);
  // иначе — в выбранной валюте приложения со знаком «≈»
  const lc = listCur(items), fmt = (v, o) => lc ? money(v, lc, o) : "≈ " + D(v, m, o);
  const amt = o => lc ? o.a : opRUB(o);
  let e = 0, inc = 0;
  for (const o of items) { if (o.t === "e") e += amt(o); if (o.t === "i") inc += amt(o); }
  let html = '<div class="grid3" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:14px"><div class="card" style="padding:10px 14px"><div class="mut" style="font-size:12px;font-weight:600">Расходы</div><div class="n" style="font-weight:700">' + fmt(-e) + '</div></div><div class="card" style="padding:10px 14px"><div class="mut" style="font-size:12px;font-weight:600">Доходы</div><div class="n pos" style="font-weight:700">' + fmt(inc, { sign: true }) + '</div></div></div>';
  if (!items.length) return html + '<div class="card empty" style="margin-top:14px">' + (S.ops[m] && S.ops[m].length ? "Ничего не нашлось — измените фильтры." : "За " + mLabel(m) + " операций нет. Нажмите «+», чтобы добавить первую, или загрузите выписку в разделе Импорт.") + '</div>';
  const byDay = {};
  for (const o of items) (byDay[o.d] = byDay[o.d] || []).push(o);
  html += '<div class="jdays">';
  for (const d of Object.keys(byDay).sort().reverse()) {
    const list = byDay[d], dc = listCur(list); let tot = 0;
    for (const o of list) if (o.t === "e") tot -= dc ? o.a : opRUB(o);
    const dt = new Date(d + "T00:00:00");
    html += '<section class="sec" style="margin-top:16px;gap:6px"><div class="caps" style="text-transform:none;font-weight:600;font-size:13px"><span>' + WD[dt.getDay()][0].toUpperCase() + WD[dt.getDay()].slice(1) + ', ' + dLabel(d) + '</span><span class="n">' + (tot ? (dc ? money(tot, dc) : "≈ " + D(tot, m)) : "") + '</span></div><div class="group">' +
      list.map(o => opRow(o, UI.jacc || null, true)).join("") + '</div></section>';
  }
  return html + '</div>';
}
let RB = null;
function runBal() {
  const ops = allOps(), list = S.accounts && S.accounts.list;
  if (RB && RB.ops === ops && RB.snaps === S.snaps && RB.list === list && RB.epoch === CALC_EPOCH) return RB.map;
  const ev = [];
  for (const k of snapKeys()) ev.push({ d: k, k: 1 });
  for (const a of accs()) if (a.openDate) ev.push({ d: a.openDate, k: 0, a });
  ev.sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : x.k - y.k);
  const bal = {}, map = {}; let ei = 0, lastSnap = "";
  const apply = d => { while (ei < ev.length && ev[ei].d <= d) { const e = ev[ei++]; if (e.k === 1) { for (const id in bal) bal[id] = 0; Object.assign(bal, snap(e.d).bal || {}); lastSnap = e.d; } else if (e.a.openDate > lastSnap) bal[e.a.id] = e.a.openBal || 0; } };
  for (const o of ops) { apply(o.d); const r = {}; for (const id of [o.ac, o.to]) if (id && acc(id) && r[id] == null) { bal[id] = (bal[id] || 0) + opDelta(o, id); r[id] = bal[id]; } map[o.id] = r; }
  RB = { ops, snaps: S.snaps, list, map, epoch: CALC_EPOCH }; return map;
}
function balAfter(o, accId) { const r = runBal()[o.id]; if (!r) return ""; const id = accId && r[accId] != null ? accId : (o.ac && r[o.ac] != null ? o.ac : o.to); if (!id || r[id] == null) return ""; return '<small class="rb">остаток ' + money(r[id], accCur(id)) + '</small>'; }
/** Строка операции. showBal — показывать мелким шрифтом остаток счёта после операции. */
function opRow(o, accId, showBal) {
  const cur = opCur(o);
  let title, meta, amt, cls = "";
  if (o.t === "t") { title = "Перевод" + (o.s && o.s !== "Перевод" ? " · " + o.s : ""); meta = accName(o.ac) + " → " + accName(o.to); amt = money(o.a, cur); cls = "mut"; }
  else { title = esc(o.c) + (o.s ? " · " + esc(o.s) : ""); meta = esc(accName(o.ac)) + (o.p ? " · " + esc(opPerTxt(o)) : "") + (o.card ? " · " + esc(o.card) : "") + (o.n ? " · " + esc(o.n) : ""); amt = money(o.t === "e" ? -o.a : o.a, cur, { sign: o.t === "i" }); cls = o.t === "i" ? "pos" : ""; }
  return '<button class="row" data-act="editop" data-id="' + esc(o.id) + '" data-m="' + o.d.slice(0, 7) + '">' + (o.t === "t" ? '<span class="tile" style="background:#8E8E93">' + svg("fx", 18) + '</span>' : catTile(o.c)) + '<span class="body"><span class="t"><b>' + (o.t === "t" ? esc(title) : title) + '</b><small>' + (o.t === "t" ? esc(meta) : meta) + '</small></span><span class="v n ' + cls + '">' + amt + (showBal ? balAfter(o, accId) : "") + '</span></span></button>';
}

/* ---------- действия модуля ---------- */
App.actions({
  jfilt: () => { UI.jfOpen = !UI.jfOpen; render(); },
  jreset: () => { UI.jtype = "all"; UI.jacc = ""; UI.jcat = ""; UI.jfOpen = false; render(); },
  jm: t => { UI.jm = addMonth(UI.jm, +t.dataset.k); render(); },
  jtype: t => { UI.jtype = t.dataset.t; render(); }
});

/* ---------- поля модуля ---------- */
App.change(t => t.dataset.in === "jacc", async t => { UI.jacc = t.value; render(); });
App.change(t => t.dataset.in === "jcat", async t => { UI.jcat = t.value; render(); });

/* ---------- экраны модуля ---------- */
App.view("journal", vJournal);
