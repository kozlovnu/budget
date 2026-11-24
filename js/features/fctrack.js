/* Прогноз и факт.
   Прогноз капитала сохраняется в базе (коллекция forecasts) и потом сравнивается с фактическим капиталом
   на конец каждого месяца. Так видно, насколько модель ошибается через 1, 3, 6 и 12 месяцев.
   Автоматически — раз в месяц: при первом открытии месяца, а после сверки на 1-е число — заново, от сверенных остатков.
   Вручную — кнопкой «Сохранить прогноз».
   Документ: { v, kind: "auto"|"manual", made, at, m0, months[12], rates[13], band: {портфель: {p10[], p50[], p90[]}}, params }
   Суммы — в рублях; rates — курсы, заложенные в прогноз на каждую точку: по ним прогноз показывается в валюте
   приложения ровно так, как вы его видели. Факт пересчитывается по фактическим курсам месяца. */
"use strict";
S.fcsaved = null; // {id: документ}; null — ещё не загружено

App.onBoot(db => {
  db.collection("forecasts").onSnapshot(snap => {
    const o = {}; for (const d of snap.docs) if (d.exists) o[d.id] = d.data();
    S.fcsaved = o; fcAutoSave(); render(true);
  }, e => warn("сохранённые прогнозы", e));
});
App.onData(() => fcAutoSave());

const FC_TRACK_H = [1, 3, 6, 12];
/** Снимок текущего прогноза для сохранения. */
function fcSnapDoc(kind) {
  const L = fcLive12(), F = fcS(), pts = [curM()].concat(L.months);
  const r4 = x => Math.round(x * 10000) / 10000;
  const rates = pts.map(m => { const r = L.fx.at(m); return { usd: r4(r.usd), eur: r4(r.eur), uzs: r4(r.uzs), kzt: r4(r.kzt || 0) }; });
  const band = {};
  for (const p in L.band) { const b = L.band[p]; if (!Array.isArray(b)) continue; band[p] = { p10: b.map(x => Math.round(x.p10)), p50: b.map(x => Math.round(x.p50)), p90: b.map(x => Math.round(x.p90)) }; }
  return { v: 1, kind, made: TODAYS, at: new Date().toISOString(), m0: curM(), months: L.months.slice(), rates, band, params: { fx: F.fx, infl: +F.infl || 0, by: +F.by || 0, sims: 500 } };
}
/** Раз в месяц сохранить прогноз; после сверки на 1-е — пересохранить от сверенных остатков. */
function fcAutoSave() {
  if (!DB || !S.fcsaved || !S.loadedMeta || !S.loadedOps || !S.accounts || fcAutoSave.busy) return;
  const m = curM(), id = "auto-" + m, cur = S.fcsaved[id];
  const recon = !!(S.snaps && S.snaps.items && S.snaps.items[m + "-01"]);
  if (cur && (cur.recon || !recon)) return;
  if (!allOps().some(o => o.t === "e" && o.d < m + "-01")) return; // без истории прогноз не строится
  fcAutoSave.busy = true;
  setTimeout(async () => {
    try { const doc = fcSnapDoc("auto"); doc.recon = recon; await save("forecasts/" + id, doc); }
    catch (e) { warn("автосохранение прогноза", e); }
    finally { fcAutoSave.busy = false; }
  }, 2500);
}

/** Фактический капитал на конец месяца m (в рублях) или null, если месяц ещё не закончился. */
function capEndRUB(m, pf) {
  if (m >= curM()) return null;
  const date = m + "-" + String(dimOf(m)).padStart(2, "0"); let s = 0;
  for (const a of accs()) if (a.inCap && pfHas(a, pf) && accLiveAt(a, date)) s += toRUB(balanceAt(a.id, date), a.cur, m);
  return s;
}
/** Сравнение одного сохранённого прогноза с фактом по прошедшим месяцам (в валюте приложения). */
function fcCompare(doc, pf) {
  const B = (doc.band || {})[pf] || (doc.band || {}).all; if (!B) return [];
  const rows = [];
  for (let i = 1; i <= (doc.months || []).length; i++) {
    const m = doc.months[i - 1], fact = capEndRUB(m, pf); if (fact == null) break;
    const r = doc.rates[i] || doc.rates[0], f = v => dispR(v, r), fa = fromRUB(fact, UI.cur, m);
    const p10 = f(B.p10[i]), p50 = f(B.p50[i]), p90 = f(B.p90[i]);
    rows.push({ i, m, p10, p50, p90, fact: fa, err: fa ? (p50 - fa) / Math.abs(fa) : 0, inBand: fa >= Math.min(p10, p90) && fa <= Math.max(p10, p90), recon: !!(S.snaps && S.snaps.items && S.snaps.items[addMonth(m, 1) + "-01"]) });
  }
  return rows;
}
/** Сводная точность по горизонтам: средняя ошибка и сколько раз факт попал в диапазон. По автопрогнозам (по одному в месяц). */
function fcAccuracy(pf) {
  const by = {}; for (const h of FC_TRACK_H) by[h] = [];
  for (const id in S.fcsaved || {}) { const d = S.fcsaved[id]; if (d.kind !== "auto") continue; for (const r of fcCompare(d, pf)) if (by[r.i]) by[r.i].push(r); }
  return FC_TRACK_H.map(h => { const L = by[h]; return { h, n: L.length, mae: L.length ? L.reduce((s, r) => s + Math.abs(r.err), 0) / L.length : null, bias: L.length ? L.reduce((s, r) => s + r.err, 0) / L.length : null, inBand: L.filter(r => r.inBand).length }; });
}
const fcSavedList = () => Object.keys(S.fcsaved || {}).map(id => Object.assign({ id }, S.fcsaved[id])).sort((a, b) => (b.at || b.made || "") < (a.at || a.made || "") ? -1 : 1);
const pctS = (x, d) => (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(d == null ? 1 : d).replace(".", ",") + "%";
/** Число без знака валюты — чтобы «прогноз → факт» помещалось в строку. */
const bare = s => s.replace(/\s*(₽|\$|€|сум|сўм|₸)\s*/g, " ").trim();
const endLabel = m => "конец " + MONG[+m.slice(5) - 1] + (m.slice(0, 4) !== curM().slice(0, 4) ? " " + m.slice(0, 4) : "");

/** Блок «Прогноз и факт» на вкладке Прогноз. */
function fcTrackSection(pf) {
  if (!DB) return "";
  if (!S.fcsaved) return '<section class="sec"><div class="sechead"><h2>Прогноз и факт</h2></div><div class="card mut">Загружаю сохранённые прогнозы…</div></section>';
  const list = fcSavedList(), M = v => shortM(v, UI.cur);
  const cmp = []; for (const d of list) for (const r of fcCompare(d, pf)) cmp.push(Object.assign({ doc: d }, r));
  cmp.sort((a, b) => b.m < a.m ? -1 : b.m > a.m ? 1 : a.i - b.i);
  let h = '<section class="sec"><div class="sechead"><h2>Прогноз и факт</h2><button class="chipb" data-act="fcsave" style="height:32px;font-size:14px">Сохранить прогноз</button></div>';
  if (!cmp.length) {
    const next = list.length ? list[list.length - 1].months[0] : addMonth(curM(), 1);
    h += '<div class="card" style="font-size:15px;line-height:1.45">' + (list.length ? "Сохранено прогнозов: " + list.length + ". Первое сравнение с фактом появится, когда закончится " + esc(MON[+next.slice(5) - 1]) + " " + next.slice(0, 4) + " — тогда станет известен капитал на " + esc(endLabel(next)) + "." : "Прогноз будет сохраняться сам раз в месяц. Когда месяц закончится, здесь появится сравнение с фактическим капиталом.") + '</div>';
  } else {
    const acc = fcAccuracy(pf).filter(x => x.n);
    if (acc.length) h += '<div class="card" style="display:grid;grid-template-columns:repeat(' + acc.length + ',minmax(0,1fr));gap:8px;text-align:center">' + acc.map(x => '<div><div class="mut" style="font-size:12px;font-weight:600">через ' + x.h + ' мес</div><div class="n" style="font-size:20px;font-weight:700">±' + (x.mae * 100).toFixed(1).replace(".", ",") + '%</div><div class="mut n" style="font-size:12px">в диапазоне ' + x.inBand + ' из ' + x.n + '</div></div>').join("") + '</div>';
    h += '<div class="group" style="margin-top:10px">' + cmp.slice(0, 8).map(r => '<button class="row" data-act="fcdoc" data-id="' + esc(r.doc.id) + '"><span class="tile n" style="background:' + (r.inBand ? "#34C759" : "#FF9500") + ';font-size:12px;font-weight:700">' + r.i + 'м</span><span class="body"><span class="t"><b>' + esc(endLabel(r.m).replace(/^./, s => s.toUpperCase())) + '</b><small class="n">от ' + esc(dLabel(r.doc.made).replace(/ \d{4}$/, "")) + ': ' + bare(M(r.p50)) + ' → ' + bare(M(r.fact)) + (r.recon ? "" : " · без сверки") + '</small></span><span class="v n" style="color:' + (Math.abs(r.err) <= 0.02 ? "var(--green)" : Math.abs(r.err) <= 0.05 ? "var(--label)" : "var(--orangeT)") + '">' + pctS(r.err) + '</span><span class="chev" aria-hidden="true">›</span></span></button>').join("") + '</div>';
  }
  h += '<p class="foot">В строке: дата прогноза и капитал на конец месяца, ' + esc(SYM[UI.cur] || UI.cur) + ': прогноз → факт. Ошибка — насколько медиана прогноза отличалась от фактического капитала на конец месяца; «в диапазоне» — факт попал в полосу 80% вариантов. Прогноз сохраняется сам раз в месяц, после сверки на 1-е — от сверенных остатков.' + (list.length ? ' <a href="#" data-act="fclist">Все сохранённые (' + list.length + ')</a>' : "") + '</p></section>';
  return h;
}

/* шторка: один сохранённый прогноз — график с фактом и таблица по месяцам */
App.sheet("fcdoc", () => {
  const d = S.fcsaved && S.fcsaved[FORM.id]; if (!d) return sHead("Прогноз", null) + '<div class="card mut">Прогноз удалён.</div>';
  const pf = curPf(), B = d.band[pf] || d.band.all, rows = fcCompare(d, pf), M = v => money(v, UI.cur);
  const band = B.p50.map((_, i) => ({ p10: dispR(B.p10[i], d.rates[i]), p50: dispR(B.p50[i], d.rates[i]), p90: dispR(B.p90[i], d.rates[i]) }));
  const act = [band[0].p50].concat(d.months.map((m, i) => { const r = rows.find(x => x.i === i + 1); return r ? r.fact : null; }));
  const labels = [dLabel(d.made).replace(/ \d{4}$/, "")].concat(d.months.map(m => MONS[+m.slice(5) - 1] + (m.slice(5) === "01" ? " " + m.slice(2, 4) : "")));
  let h = sHead("Прогноз от " + dLabel(d.made), null) +
    '<p class="foot" style="margin-top:0">' + (d.kind === "auto" ? "Сохранён автоматически" + (d.recon ? " после сверки на 1-е" : "") : "Сохранён вручную") + " · курс " + (d.params && d.params.fx === "trend" ? "по тренду" : "текущий") + " · рост трат " + ((d.params && d.params.infl) || 0) + '%</p>' +
    '<div class="card">' + fcChart2(labels, band, null, act, i => i ? "80% вариантов: " + M(band[i].p10) + " – " + M(band[i].p90) + (act[i] != null ? " · факт " + M(act[i]) : "") : "") +
    '<div class="mut" style="font-size:12px;display:flex;gap:14px;margin-top:6px"><span><span style="display:inline-block;width:16px;border-top:2.5px solid var(--blue);vertical-align:middle"></span> прогноз</span><span><span style="display:inline-block;width:16px;border-top:2.2px solid var(--label);vertical-align:middle"></span> факт</span></div></div>';
  h += '<div class="mut" style="font-size:12px;margin:12px 4px 6px">Капитал на конец месяца, ' + esc(SYM[UI.cur] || UI.cur) + ': прогноз → факт</div><div class="group">' + d.months.map((m, i) => { const r = rows.find(x => x.i === i + 1);
    return '<div class="row"><span class="body"><span class="t"><b>' + esc(endLabel(m).replace(/^./, s => s.toUpperCase())) + '</b><small class="n">' + (r ? bare(M(band[i + 1].p50)) + " → " + bare(M(r.fact)) : "прогноз " + bare(M(band[i + 1].p50)) + " · факта ещё нет") + '</small></span>' + (r ? '<span class="v n" style="color:' + (r.inBand ? "var(--green)" : "var(--orangeT)") + '">' + pctS(r.err) + (r.inBand ? " ✓" : "") + '</span>' : "") + '</span></div>'; }).join("") + '</div>';
  h += FORM.arm ? '<div style="display:flex;gap:10px;margin-top:14px"><button class="btn" data-act="fcdelx">Отмена</button><button class="btn danger" data-act="fcdel" style="color:#fff;background:var(--red)">Удалить прогноз</button></div>'
    : '<button class="btn" data-act="fcdelarm" style="margin-top:14px;color:var(--red)">Удалить этот прогноз</button>';
  return h;
});
App.sheet("fclist", () => {
  const list = fcSavedList();
  return sHead("Сохранённые прогнозы", null) + (list.length ? '<div class="group">' + list.map(d => { const B = d.band.all, r = d.rates[B.p50.length - 1] || d.rates[0];
    return '<button class="row" data-act="fcdoc" data-id="' + esc(d.id) + '"><span class="body"><span class="t"><b>' + esc(dLabel(d.made)) + '</b><small>' + (d.kind === "auto" ? "автоматически" : "вручную") + " · сравнений: " + fcCompare(d, "all").length + '</small></span><span class="v n">' + shortM(dispR(B.p50[B.p50.length - 1], r), UI.cur) + '</span><span class="chev" aria-hidden="true">›</span></span></button>'; }).join("") + '</div><p class="foot">Справа — прогноз капитала через 12 месяцев от даты сохранения.</p>' : '<div class="card mut">Пока нет сохранённых прогнозов.</div>');
});
App.actions({
  fcsave: async () => {
    const id = "m-" + TODAYS + "-" + Date.now().toString(36);
    try { await save("forecasts/" + id, fcSnapDoc("manual")); toast("Прогноз сохранён — сравнение с фактом появится после конца месяца"); }
    catch (e) { /* save уже показал ошибку */ }
  },
  fcdoc: t => openSheet({ kind: "fcdoc", id: t.dataset.id, title: "Прогноз" }),
  fclist: () => openSheet({ kind: "fclist", title: "Прогнозы" }),
  fcdelarm: () => { FORM.arm = true; renderSheet(); },
  fcdelx: () => { FORM.arm = false; renderSheet(); },
  fcdel: async () => { const id = FORM.id; closeSheet(); try { await DB.doc("forecasts/" + id).delete(); toast("Прогноз удалён"); } catch (e) { toast(dbErrText(e)); } }
});
