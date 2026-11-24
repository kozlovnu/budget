/* Экран «Аналитика» (траты) и детализация */
"use strict";
/* ---------- Аналитика ---------- */
function expByMonth() {
  const r = {};
  for (const o of allOps()) if (o.t === "e") { const m = o.d.slice(0, 7); r[m] = (r[m] || 0) + opRUB(o); }
  return r;
}
function vAnalytics() {
  let html = navHead("Аналитика", curPf() !== "all" ? "Портфель · " + pfLabel(curPf()) : "", curSeg(), headRight()) + pfBar();
  html += '<div class="seg glass" role="group" aria-label="Раздел" style="margin-top:14px">' + [["spend", "Траты"], ["forecast", "Прогноз"], ["summary", "Итоги"]].map(x => '<button data-act="atab" data-t="' + x[0] + '" aria-pressed="' + (UI.atab === x[0]) + '">' + x[1] + '</button>').join("") + '</div>';
  return html + (UI.atab === "forecast" ? vForecast() : UI.atab === "summary" ? vSummary() : vSpend());
}
function winMonths(end) { const r = []; for (let i = 11; i >= 0; i--) r.push(addMonth(end, -i)); return r; }
function expMonthsAll(pf) { const s = {}; for (const o of allOps()) if (o.t === "e" && opPf(o, pf)) s[o.d.slice(0, 7)] = 1; return Object.keys(s).sort(); }
function vSpend() {
  const pf = curPf(); const msAll = expMonthsAll(pf);
  if (!msAll.length) return '<div class="card empty" style="margin-top:16px">' + (pf === "all" ? "Пока нет расходов. Добавьте операции или загрузите выписку." : "В портфеле «" + esc(pfLabel(pf)) + "» расходов нет.") + '</div>';
  if (!UI.aend) UI.aend = msAll[msAll.length - 1];
  const months = winMonths(UI.aend);
  if (UI.am && !months.includes(UI.am)) UI.am = null;
  const sel = UI.am, cat = UI.acat;
  const has = new Set(msAll);
  const dataMonths = months.filter(m => has.has(m)); const nM = dataMonths.length || 1;
  const em = {}, byCatM = {};
  for (const o of allOps()) {
    if (o.t !== "e" || !opPf(o, pf)) continue; const m = o.d.slice(0, 7); if (!months.includes(m)) continue;
    const v = opRUB(o);
    (byCatM[o.c] = byCatM[o.c] || {})[m] = (byCatM[o.c][m] || 0) + v;
    if (!cat || o.c === cat) em[m] = (em[m] || 0) + v;
  }
  const vals = months.map(m => fromRUB(em[m] || 0, UI.cur, m));
  const avg = dataMonths.reduce((s, m) => s + fromRUB(em[m] || 0, UI.cur, m), 0) / nM;
  const selV = sel ? vals[months.indexOf(sel)] : null;
  if (!sel || (UI.aw && UI.aw.slice(0, 7) !== sel)) { UI.aw = null; UI.ad = null; }
  if (UI.ad && (!UI.aw || UI.ad < UI.aw)) UI.ad = null;
  let L = '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:12px">' +
    '<div style="display:flex;flex-direction:column;gap:2px"><div class="mut" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.02em">' + (cat ? esc(cat) + " · траты в месяц" : "Траты в месяц · без переводов") + '</div>' +
    '<div class="n" style="font-size:28px;font-weight:700;line-height:1.15">' + money(sel ? selV : avg, UI.cur) + ' <span class="mut" style="font-size:15px;font-weight:500">' + (sel ? mLabel(sel) : "в среднем за " + nM + " мес") + '</span></div></div>' +
    ((sel || cat) ? '<div class="chips">' + (sel ? '<button class="chipb" data-act="aclearm" aria-label="Сбросить месяц">' + esc(mLabel(sel, true)) + ' ×</button>' : "") + (cat ? '<button class="chipb" data-act="aclearc" aria-label="Сбросить категорию">' + esc(cat) + ' ×</button>' : "") + '</div>' : "") +
    (sel ? spendDrill(sel, cat, pf) +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:6px"><span class="mut" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.02em">Что изменилось</span><div class="seg glass mini" role="group" aria-label="База сравнения">' + [["avg", "К среднему"], ["prev", "К прошлому месяцу"]].map(x => '<button data-act="abase" data-v="' + x[0] + '" aria-pressed="' + ((UI.abase === "prev") === (x[0] === "prev")) + '">' + x[1] + '</button>').join("") + '</div></div>' + spendBridge(sel, cat, months, dataMonths, pf) + '</div></section>' :
    spendBars(months, vals, avg, sel, "apick") +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><button class="mbtn glass" data-act="am" data-k="-12" aria-label="Предыдущие 12 месяцев">‹</button><span class="mut" style="font-size:13px;text-align:center">' + esc(MONS[+months[0].slice(5) - 1] + " " + months[0].slice(0, 4) + " – " + MONS[+months[11].slice(5) - 1] + " " + months[11].slice(0, 4)) + '<br>Нажмите на месяц, чтобы выбрать</span><button class="mbtn glass" data-act="am" data-k="12" aria-label="Следующие 12 месяцев">›</button></div></div></section>');
  // средние траты в день за выбранный (или текущий) месяц → экран «Траты в день»
  const dyM = sel || curM(), DyA = dailyMonth(dyM, pf);
  L += '<section class="sec"><div class="group"><button class="row" data-act="godaily" data-from="analytics" data-m="' + dyM + '"><span class="tile" style="background:#FF9500">' + svg("bars", 18) + '</span><span class="body"><span class="t"><b>Траты в день</b><small class="n">' + esc(mLabel(dyM)) + (DyA.n ? " · обычно " + money(DyA.usual, UI.cur) : "") + '</small></span><span class="v n">' + money(DyA.avg, UI.cur) + '</span><span class="chev" aria-hidden="true">›</span></span></button></div></section>';
  // categories vs plan: chosen month, or the average month of the window
  const per = sel ? [sel] : dataMonths, div = sel ? 1 : nM, mref = sel || curM();
  const fact = {}; for (const c in byCatM) { let s = 0; for (const m of per) s += fromRUB(byCatM[c][m] || 0, UI.cur, m); fact[c] = s / div; }
  const cats = Object.keys(fact).filter(c => fact[c] > 0);
  for (const c of ((S.settings.cats && S.settings.cats.e) || []).map(x => x.name)) if (budRUB(c, mref) > 0 && !cats.includes(c)) cats.push(c);
  cats.sort((a, b) => (fact[b] || 0) - (fact[a] || 0));
  // общий лимит сравнивается со всеми тратами; сумма лимитов по категориям — только с тратами этих категорий
  const lc = limitCheck(fact, mref, null, v => toRUB(v, UI.cur, mref));
  const totF = lc ? fromRUB(lc.spend, UI.cur, mref) : 0, totLim = lc ? fromRUB(lc.limit, UI.cur, mref) : 0;
  const D2 = v => money(v, UI.cur);
  let R = '<section class="sec"><div class="sechead"><h2>' + (sel ? mLabel(sel, true) : "Средний месяц") + ' против плана</h2><a href="#categories" data-act="go" data-v="categories">Лимиты</a></div>';
  if (totLim > 0) { const over = totF > totLim; R += '<div class="card" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span style="font-weight:600">' + (lc.src === "total" ? "Все траты" : "Траты с лимитом") + '</span><span class="n" style="font-weight:700;' + (over ? "color:var(--orangeT)" : "") + '">' + D2(totF) + ' <span class="mut" style="font-weight:500">из ' + D2(totLim) + '</span></span></div><div class="bar"><i style="width:' + Math.min(100, totF / totLim * 100).toFixed(1) + '%;background:' + (over ? "var(--orange)" : "var(--blue)") + '"></i></div><small class="mut" style="font-size:13px">' + (lc.src === "total" ? "общий лимит" : lc.n + " " + pl(lc.n, "категория", "категории", "категорий") + " с лимитом") + (over ? " · превышение " + D2(totF - totLim) : " · осталось " + D2(totLim - totF)) + '</small></div>'; }
  R += '<div class="group">' + cats.map(c => {
    const f = fact[c] || 0, p = fromRUB(budRUB(c, mref), UI.cur, mref), over = p && f > p, on = cat === c;
    return '<div class="row' + (on ? " on" : "") + '" style="padding-right:0">' + catTile(c) + '<div class="body" style="flex-direction:column;align-items:stretch;gap:6px">' +
      '<button data-act="acat" data-c="' + esc(c) + '" aria-pressed="' + on + '" style="display:flex;flex-direction:column;gap:6px;text-align:left;width:100%"><span style="display:flex;justify-content:space-between;gap:8px;width:100%"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c) + '</span><span class="n" style="font-weight:600;white-space:nowrap;' + (over ? "color:var(--orangeT)" : "") + '">' + D2(f) + '</span></span>' +
      (p ? '<span class="bar" style="width:100%"><i style="width:' + Math.min(100, f / p * 100).toFixed(1) + '%;background:' + (over ? "var(--orange)" : "var(--blue)") + '"></i></span><small class="n mut" style="font-size:13px">' + (over ? "+" + D2(f - p) + " сверх плана · " : "из ") + D2(p) + '</small>' : '<small class="mut" style="font-size:13px">без лимита</small>') + '</button>' +
      (on ? '<button class="btn alt" data-act="catdet" data-c="' + esc(c) + '" style="height:40px;font-size:15px;background:var(--fill2)">Платежи и детали ›</button>' : "") + '</div></div>';
  }).join("") + '</div><p class="foot">Нажмите на категорию — график покажет ее траты по месяцам. Второе нажатие или кнопка «Платежи» открывают детализацию.</p></section>';
  // структура трат: за выбранный месяц, иначе — средний месяц окна
  const n = sel ? 1 : nM, perS = sel ? [sel] : dataMonths; const s12 = {}; let tot12 = 0;
  for (const c in byCatM) { let s = 0; for (const m of perS) s += fromRUB(byCatM[c][m] || 0, UI.cur, m); if (s > 0) { s12[c] = s; tot12 += s; } }
  const top = Object.keys(s12).sort((a, b) => s12[b] - s12[a]); const mx = s12[top[0]] || 1;
  L += '<section class="sec"><div class="sechead"><h2>Куда уходят деньги</h2><span class="mut" style="font-size:13px">' + (sel ? "за " + esc(mLabel(sel)) : "в месяц, за " + n + " мес") + '</span></div><div class="card" style="display:flex;flex-direction:column;gap:4px">' + (top.length ? "" : '<span class="mut" style="font-size:15px">Расходов нет</span>') + top.map(c => '<button data-act="acat" data-c="' + esc(c) + '" class="srow' + (cat === c ? " on" : "") + '"><span class="sname">' + esc(c) + '</span><span class="bar" style="height:10px"><i style="width:' + (s12[c] / mx * 100).toFixed(1) + '%;background:' + catColor(c) + '"></i></span><span class="n sval">' + shortM(s12[c] / n, UI.cur) + ' <span class="mut" style="font-weight:500;font-size:12px">' + Math.round(s12[c] / tot12 * 100) + '%</span></span></button>').join("") + '</div></section>';
  // trips
  const trips = tripsAll(pf);
  const tk = Object.keys(trips).sort((a, b) => trips[b].d2 < trips[a].d2 ? -1 : 1).slice(0, 10);
  if (tk.length) R += '<section class="sec"><div class="sechead"><h2>Поездки</h2><span class="mut" style="font-size:13px">последние</span></div><div class="group">' + tk.map(k => '<button class="row" data-act="tripdet" data-k="' + esc(k) + '"><span class="tile" style="background:#007AFF">' + svg("travel", 18) + '</span><span class="body"><span class="t"><b>' + esc(k) + '</b><small>' + trips[k].n + ' опер. · ' + esc(periodLabel(trips[k].d1, trips[k].d2)) + '</small></span><span class="v n">' + D(trips[k].v, trips[k].d2.slice(0, 7)) + '</span><span class="chev">›</span></span></button>').join("") + '</div></section>';
  return cols(L, R);
}
/* ---------- Месяц по неделям → неделя по дням ---------- */
const WDS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const dd = d => +d.slice(8);
const wkLabel = w => w.d1 === w.d2 ? dd(w.d1) + " " + MONG[+w.d1.slice(5, 7) - 1] : dd(w.d1) + "–" + dd(w.d2) + " " + MONG[+w.d1.slice(5, 7) - 1];
/** Гистограмма выбранного месяца: по неделям, а при выбранной неделе — по её дням. */
function spendDrill(m, cat, pf) {
  const days = spendDays(m, pf, cat), W = monthWeeks(m), M = v => money(v, UI.cur);
  const past = d => d <= TODAYS, sum = ds => ds.reduce((s, d) => s + (days[d] || 0), 0);
  const elapsed = Object.keys(days).length ? W.reduce((s, w) => s + w.days.filter(past).length, 0) : 0;
  const perDay = elapsed ? sum(W.flatMap(w => w.days.filter(past))) / elapsed : 0;
  const head = (back, title, val) => '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">' + back + '<span class="mut" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.02em">' + title + '</span>' + (val ? '<span class="n" style="font-size:15px;font-weight:700;margin-left:auto">' + val + '</span>' : "") + '</div>';
  const w = UI.aw && W.find(x => x.d1 === UI.aw);
  if (!w) {
    const items = W.map(x => { const el = x.days.filter(past), v = sum(x.days);
      return { m: x.d1, lab: x.d1 === x.d2 ? String(dd(x.d1)) : dd(x.d1) + "–" + dd(x.d2), v, future: !el.length, tip: wkLabel(x),
        sub: (el.length < x.days.length ? "идёт: " + el.length + " из " + x.days.length + " дн." : x.days.length + " " + pl(x.days.length, "день", "дня", "дней")) + (el.length ? " · " + M(v / el.length) + " в день" : "") }; });
    return head('<button class="gbtn glass back" data-act="aclearm" style="height:34px;font-size:15px">' + svg("back", 18) + 'К месяцам</button>', "По неделям", "") +
      periodBars(items, { sel: null, pick: "awk", aria: "Траты " + mLabel(m) + " по неделям. Нажмите на неделю, чтобы увидеть её по дням." }) +
      '<p class="foot" style="margin:0">Недели с понедельника; первая и последняя — в границах месяца. Нажмите на неделю — откроются её дни.</p>';
  }
  const items = w.days.map(d => { const wd = new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, dd(d)).getDay(), v = days[d] || 0;
    return { m: d, lab: WDS[wd], lab2: String(dd(d)), v, future: !past(d), tip: WD[wd][0].toUpperCase() + WD[wd].slice(1) + ", " + dLabel(d), sub: perDay ? (v >= perDay ? "+" : "−") + Math.abs(Math.round((v - perDay) / perDay * 100)) + "% к среднему дню месяца" : "" }; });
  return head('<button class="gbtn glass back" data-act="awx" style="height:34px;font-size:15px">' + svg("back", 18) + 'К неделям</button>', esc(wkLabel(w)), M(sum(w.days))) +
    periodBars(items, { sel: UI.ad, pick: "aday", avg: perDay, avgLab: "в среднем в день за " + MON[+m.slice(5) - 1], aria: "Траты за " + wkLabel(w) + " по дням. Нажмите на день, чтобы увидеть его траты." }) +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><button class="mbtn glass" data-act="awk" data-k="-1" aria-label="Предыдущая неделя"' + (w === W[0] ? " disabled" : "") + '>‹</button><span class="mut" style="font-size:13px;text-align:center">' + (UI.ad ? "" : "Нажмите на день — ниже появятся его траты") + '</span><button class="mbtn glass" data-act="awk" data-k="1" aria-label="Следующая неделя"' + (w === W[W.length - 1] || !past(W[W.indexOf(w) + 1].d1) ? " disabled" : "") + '>›</button></div>' + spendDayOps(m, cat, pf);
}
/** Траты выбранного дня — списком прямо под графиком дней. */
function spendDayOps(m, cat, pf) {
  if (!UI.ad) return "";
  const ops = allOps().filter(o => o.d === UI.ad && o.t === "e" && opPf(o, pf) && (!cat || o.c === cat));
  const tot = ops.reduce((s, o) => s + fromRUB(opRUB(o), UI.cur, m), 0);
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b style="font-size:17px">' + esc(dLabel(UI.ad)) + (cat ? " · " + esc(cat) : "") + '</b><button class="chipb" data-act="adx" style="height:30px;font-size:13px" aria-label="Снять выбор дня">' + money(tot, UI.cur) + ' ×</button></div>' +
    (ops.length ? '<div class="group dayops" style="margin:0 -6px;background:var(--fill2)">' + ops.map(o => opRow(o, null, false)).join("") + '</div>' : '<div class="mut" style="font-size:15px">В этот день трат не было.</div>');
}
PICK.awk = p => { UI.aw = p.m; UI.ad = null; };
PICK.aday = p => { UI.ad = UI.ad === p.m ? null : p.m; };

/* ---------- Детализация ---------- */
function vDetail() {
  const d = UI.det;
  if (!d) { UI.view = "analytics"; return vAnalytics(); }
  const back = backBtn(d.from || "analytics", d.from === "accounts" ? "Счета" : d.from === "advice" ? "Итоги" : d.from === "home" ? "Главная" : d.from === "daily" ? "Траты в день" : "Аналитика");
  if (d.kind === "acc") return vAccDetail(d, back);
  const isTrip = d.kind === "trip";
  const dpf = d.from === "accounts" ? "all" : curPf();
  const filt = isTrip ? (o => o.t === "e" && TRIPCATS.includes(o.c) && o.s === d.key && opPf(o, dpf)) : (o => o.t === "e" && o.c === d.key && opPf(o, dpf));
  const all = allOps().filter(filt);
  let html = navHead(esc(d.key), isTrip ? "Поездка" : "Категория", back, curSeg());
  if (!all.length) return html + '<div class="card empty" style="margin-top:16px">Операций нет.</div>';
  const end = UI.aend || all[all.length - 1].d.slice(0, 7); const months = winMonths(end);
  if (!UI.dper) UI.dper = d.m ? "m" : "12";
  if (UI.dper === "m" && !d.m) UI.dper = "12";
  const per = isTrip ? "all" : UI.dper;
  const inP = o => per === "all" ? true : per === "12" ? months.includes(o.d.slice(0, 7)) : o.d.slice(0, 7) === d.m;
  const list = all.filter(inP);
  const tot = list.reduce((s, o) => s + fromRUB(opRUB(o), UI.cur, o.d.slice(0, 7)), 0);
  const hasM = new Set(expMonthsAll(dpf));
  const nM = per === "12" ? months.filter(m => hasM.has(m)).length || 1 : per === "all" ? new Set(list.map(o => o.d.slice(0, 7))).size || 1 : 1;
  if (!isTrip) html += '<div class="seg glass" role="group" aria-label="Период" style="margin-top:14px">' + (d.m ? '<button data-act="dper" data-p="m" aria-pressed="' + (per === "m") + '">' + esc(mLabel(d.m, true)) + '</button>' : "") + '<button data-act="dper" data-p="12" aria-pressed="' + (per === "12") + '">12 мес</button><button data-act="dper" data-p="all" aria-pressed="' + (per === "all") + '">Все время</button></div>';
  let L = '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="grid3" style="grid-template-columns:repeat(' + (per === "m" ? 2 : 3) + ',minmax(0,1fr))"><div><div class="mut" style="font-size:13px">Всего</div><div class="n" style="font-weight:700;font-size:20px">' + money(tot, UI.cur) + '</div></div><div><div class="mut" style="font-size:13px">Операций</div><div class="n" style="font-weight:700;font-size:20px">' + list.length + '</div></div>' + (per !== "m" ? '<div><div class="mut" style="font-size:13px">' + (isTrip ? "Период" : "В месяц") + '</div><div class="n" style="font-weight:700;font-size:' + (isTrip ? 15 : 20) + 'px">' + (isTrip ? esc(periodLabel(all[0].d, all[all.length - 1].d)) : money(tot / nM, UI.cur)) + '</div></div>' : "") + '</div>';
  if (!isTrip) {
    const em = {}; for (const o of all) { const m = o.d.slice(0, 7); if (months.includes(m)) em[m] = (em[m] || 0) + opRUB(o); }
    const vals = months.map(m => fromRUB(em[m] || 0, UI.cur, m)); const dm = months.filter(m => hasM.has(m)); const avg = dm.reduce((s, m) => s + fromRUB(em[m] || 0, UI.cur, m), 0) / (dm.length || 1);
    UI.dm = d.m || null;
    L += spendBars(months, vals, avg, d.m, "dpick");
  }
  L += '</div></section>';
  // breakdown
  const by = {}; for (const o of list) { const k = isTrip ? (o.n || "без описания") : (o.s || "без подкатегории"); by[k] = (by[k] || 0) + fromRUB(opRUB(o), UI.cur, o.d.slice(0, 7)); }
  const bk = Object.keys(by).sort((a, b) => by[b] - by[a]).slice(0, 12); const bmx = by[bk[0]] || 1;
  L += '<section class="sec"><div class="sechead"><h2>' + (isTrip ? "Где тратили" : "Подкатегории") + '</h2></div><div class="card" style="display:flex;flex-direction:column;gap:4px">' + bk.map(k => '<div class="srow"><span class="sname" title="' + esc(k) + '">' + esc(k) + '</span><span class="bar" style="height:10px"><i style="width:' + (by[k] / bmx * 100).toFixed(1) + '%;background:' + catColor(isTrip ? "Путешествия" : d.key) + '"></i></span><span class="n sval">' + shortM(by[k], UI.cur) + ' <span class="mut" style="font-weight:500;font-size:12px">' + Math.round(by[k] / (tot || 1) * 100) + '%</span></span></div>').join("") + '</div></section>';
  const R = '<section class="sec" style="gap:0"><div class="sechead"><h2>Платежи</h2><span class="mut" style="font-size:13px">' + list.length + '</span></div>' + dayGroups(list.slice().reverse().slice(0, 400)) + (list.length > 400 ? '<p class="foot">Показаны последние 400.</p>' : "") + '</section>';
  return html + cols(L, R);
}
function dayGroups(items, accId) {
  if (!items.length) return '<div class="card empty" style="margin-top:8px">Операций нет.</div>';
  const byDay = {}; for (const o of items) (byDay[o.d] = byDay[o.d] || []).push(o);
  return Object.keys(byDay).sort().reverse().map(d => { const dt = new Date(d + "T00:00:00"); let t = 0; for (const o of byDay[d]) if (o.t === "e") t -= opRUB(o);
    return '<div style="display:flex;flex-direction:column;gap:6px;margin-top:14px"><div class="caps" style="text-transform:none;font-weight:600;font-size:13px"><span>' + WD[dt.getDay()][0].toUpperCase() + WD[dt.getDay()].slice(1) + ', ' + dLabel(d) + '</span><span class="n">' + (t ? D(t, d.slice(0, 7)) : "") + '</span></div><div class="group">' + byDay[d].map(o => opRow(o, accId, !!accId)).join("") + '</div></div>'; }).join("");
}
function vAccDetail(d, back) {
  const a = acc(d.key);
  if (!a) return navHead("Счет", "", back) + '<div class="card empty" style="margin-top:16px">Счет удален.</div>';
  const mine = allOps().filter(o => o.ac === a.id || o.to === a.id);
  const ms = [...new Set(mine.map(o => o.d.slice(0, 7)))].sort();
  if (!UI.dm || !(ms.includes(UI.dm) || UI.dm === curM())) UI.dm = ms.length ? ms[ms.length - 1] : curM();
  const m = UI.dm;
  let html = navHead(esc(a.name), esc([TYPEN[a.type], SYM[a.cur], COUNTRY[a.country || ""], a.inCap ? "" : "не в капитале"].filter(Boolean).join(" · ")), back, '<span style="display:flex;gap:8px"><button class="gbtn icon glass" data-act="togmain" data-id="' + a.id + '" aria-pressed="' + !!a.main + '" aria-label="' + (a.main ? "Убрать из основных" : "Сделать основным") + '" title="' + (a.main ? "Убрать из основных" : "Сделать основным") + '" style="color:' + (a.main ? "var(--orange)" : "var(--link)") + '">' + svg("star", 20).replace('fill="none"', a.main ? 'fill="currentColor"' : 'fill="none"') + '</button><button class="gbtn glass" data-act="accform" data-id="' + a.id + '">Изменить</button></span>');
  const bal = balanceAt(a.id, TODAYS);
  html += '<div style="padding:12px 4px 0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;color:var(--label2)">Остаток сейчас</span><span class="big n' + (money(bal, a.cur).length > 15 ? " s" : "") + (bal < 0 ? " neg" : "") + '">' + money(bal, a.cur) + '</span></div>';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-top:14px"><button class="mbtn glass" data-act="dm" data-k="-1" aria-label="Предыдущий месяц">‹</button><div style="flex:1;text-align:center;font-size:17px;font-weight:600">' + mLabel(m, true) + '</div><button class="mbtn glass" data-act="dm" data-k="1" aria-label="Следующий месяц">›</button></div>';
  const inM = mine.filter(o => o.d.slice(0, 7) === m);
  let ex = 0, inc = 0, tin = 0, tout = 0;
  for (const o of inM) { if (o.t === "e" && o.ac === a.id) ex += o.a; else if (o.t === "i" && o.ac === a.id) inc += o.a; else if (o.t === "t") { if (o.ac === a.id) tout += o.a; if (o.to === a.id) tin += opDelta(o, a.id) - (o.ac === a.id ? -o.a : 0); } }
  const card = (t, v, cls) => '<div class="card" style="padding:10px 14px;min-width:0"><div class="mut" style="font-size:12px;font-weight:600">' + t + '</div><div class="n ' + (cls || "") + '" style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + v + '</div></div>';
  let L = '<section class="sec"><div class="grid3">' + card("Расходы", money(-ex, a.cur)) + card("Доходы", money(inc, a.cur, { sign: true }), "pos") + card("Переводы", money(tin - tout, a.cur, { sign: true }), "mut") + '</div></section>';
  const months = winMonths(ms.length ? ms[ms.length - 1] > m ? ms[ms.length - 1] : m : m);
  const em = {}; for (const o of mine) if (o.t === "e" && o.ac === a.id) { const k = o.d.slice(0, 7); em[k] = (em[k] || 0) + o.a; }
  const vals = months.map(k => em[k] || 0); const nz = vals.filter(v => v > 0); const avg = nz.length ? nz.reduce((s, v) => s + v, 0) / nz.length : 0;
  const saveCur = UI.cur; UI.cur = a.cur;
  L += '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="mut" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.02em">Расходы по месяцам, ' + SYM[a.cur] + '</div>' + spendBars(months, vals, avg, m, "dpick") + '</div></section>';
  UI.cur = saveCur;
  const by = {}; for (const o of inM) if (o.t === "e" && o.ac === a.id) by[o.c] = (by[o.c] || 0) + o.a;
  const bk = Object.keys(by).sort((x, y) => by[y] - by[x]); const bmx = by[bk[0]] || 1;
  if (bk.length) L += '<section class="sec"><div class="sechead"><h2>Расходы за ' + MON[+m.slice(5) - 1] + '</h2></div><div class="card" style="display:flex;flex-direction:column;gap:4px">' + bk.map(c => '<div class="srow"><span class="sname">' + esc(c) + '</span><span class="bar" style="height:10px"><i style="width:' + (by[c] / bmx * 100).toFixed(1) + '%;background:' + catColor(c) + '"></i></span><span class="n sval">' + shortM(by[c], a.cur) + '</span></div>').join("") + '</div></section>';
  const R = '<section class="sec" style="gap:0"><div class="sechead"><h2>Операции</h2><span class="mut" style="font-size:13px">' + inM.length + '</span></div>' + dayGroups(inM.slice().reverse(), a.id) + '</section>';
  return html + cols(L, R);
}

/* ---------- действия модуля ---------- */
App.actions({
  abase: t => { UI.abase = t.dataset.v; render(); },
  atab: t => { UI.atab = t.dataset.t; if (UI.view !== "analytics") go("analytics"); else render(); },
  am: t => { UI.aend = addMonth(UI.aend, +t.dataset.k); UI.am = null; render(); },
  acat: t => { const c = t.dataset.c; if (UI.acat === c) { ACT.catdet(t); return; } UI.acat = c; render(); },
  aclearm: () => { UI.am = null; render(); },
  awx: () => { UI.aw = null; UI.ad = null; render(); },
  adx: () => { UI.ad = null; render(); },
  awk: t => { const W = monthWeeks(UI.am), i = W.findIndex(x => x.d1 === UI.aw) + +t.dataset.k; if (W[i] && W[i].d1 <= TODAYS) { UI.aw = W[i].d1; UI.ad = null; render(); } },
  aclearc: () => { UI.acat = null; render(); },
  catdet: t => { UI.det = { kind: "cat", key: t.dataset.c, m: UI.am, from: "analytics" }; UI.dper = UI.am ? "m" : "12"; go("detail"); },
  tripdet: t => { UI.det = { kind: "trip", key: t.dataset.k, from: "analytics" }; go("detail"); },
  dper: t => { UI.dper = t.dataset.p; render(); },
  dm: t => { UI.dm = addMonth(UI.dm, +t.dataset.k); render(); }
});

/* ---------- экраны модуля ---------- */
App.view("analytics", vAnalytics);
App.view("detail", vDetail, { section: () => (UI.det && UI.det.from) || "analytics" });
