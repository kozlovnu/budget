/* Пульс месяца для Главной: темп трат, изменение капитала, сигналы «требует внимания». Без интерфейса. */
"use strict";
function dimOf(m) { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); }
/** Недели месяца: понедельник–воскресенье, первая и последняя обрезаны границами месяца. [{d1, d2, days: [даты]}] */
function monthWeeks(m) {
  const n = dimOf(m), y = +m.slice(0, 4), mo = +m.slice(5) - 1, W = []; let w = null;
  for (let d = 1; d <= n; d++) {
    const ds = m + "-" + String(d).padStart(2, "0");
    if (!w || new Date(y, mo, d).getDay() === 1) { w = { d1: ds, d2: ds, days: [] }; W.push(w); }
    w.d2 = ds; w.days.push(ds);
  }
  return W;
}
/** Траты месяца по дням в валюте приложения: {дата: сумма}; cat — только одна категория. */
function spendDays(m, pf, cat) {
  const r = {};
  for (const o of allOps()) { if (o.t !== "e" || o.d.slice(0, 7) !== m || !opPf(o, pf) || (cat && o.c !== cat)) continue; r[o.d] = (r[o.d] || 0) + fromRUB(opRUB(o), UI.cur, m); }
  return r;
}

/**
 * Темп трат текущего месяца против «обычно к этому дню».
 * «Обычно» — среднее по последним 6 полным месяцам с расходами, причём к тому же числу месяца:
 * поэтому аренда в начале месяца не выглядит как перерасход.
 * @returns {{m, day, dim, now, usualToday, usualMonth, perDay, daysLeft, diff, n}} суммы — в валюте UI.cur
 */
function paceData(pf) {
  const m = curM(), day = +TODAYS.slice(8), dim = dimOf(m);
  const base = []; for (let i = 1; i <= 6; i++) base.push(addMonth(m, -i));
  let now = 0; const upTo = {}, full = {};
  for (const o of allOps()) {
    if (o.t !== "e" || !opPf(o, pf)) continue;
    const mm = o.d.slice(0, 7);
    if (mm !== m && !base.includes(mm)) continue;
    const v = fromRUB(opRUB(o), UI.cur, mm);
    if (mm === m) { if (o.d <= TODAYS) now += v; continue; }
    full[mm] = (full[mm] || 0) + v;
    if (+o.d.slice(8) <= day) upTo[mm] = (upTo[mm] || 0) + v;
  }
  const bm = base.filter(x => full[x] > 0), n = bm.length;
  const usualToday = n ? bm.reduce((s, x) => s + (upTo[x] || 0), 0) / n : 0;
  const usualMonth = n ? bm.reduce((s, x) => s + full[x], 0) / n : 0;
  const daysLeft = dim - day + 1;
  return { m, day, dim, now, usualToday, usualMonth, n, daysLeft, perDay: Math.max(0, usualMonth - now) / daysLeft, diff: usualToday > 0 ? (now - usualToday) / usualToday : 0 };
}

/** Капитал сейчас и изменение с последней сверки до начала месяца (в рублях). */
function capDelta(pf) {
  const ks = snapKeys(), prev = ks.filter(k => k <= curM() + "-01").slice(-1)[0];
  const now = capitalNowRUB(pf), was = prev ? snapTotalRUB(prev, pf) : now;
  return { now, was, from: prev || null, d: now - was, p: was ? (now - was) / was : 0 };
}

/**
 * Что требует внимания: несданная сверка, превышенные лимиты, всплески трат, долги.
 * @param A advData(текущий месяц) — для лимитов и всплесков
 * @returns {Array<{kind, title, sub, go, color, icon}>}
 */
function homeSignals(A, pf, P) {
  const s = [], m = curM();
  const hasRecon = !!(S.snaps && S.snaps.items && S.snaps.items[m + "-01"]);
  if (!hasRecon && accs().some(a => !a.archived)) s.push({ kind: "recon", title: "Сверка на 1 " + MONG[+m.slice(5) - 1] + " не внесена", sub: "остатки считаются по операциям", go: "reconcile", color: "#FF9500", icon: "recon" });
  for (const c of A.cats) if (c.lim > 0 && c.cur > c.lim) s.push({ kind: "limit", title: c.c + ": лимит превышен", sub: money(c.cur - c.lim, UI.cur) + " сверх плана", go: "analytics", cat: c.c, color: "#FF3B30", icon: "flame" });
  // всплеск — только по закрытой части месяца: категория уже обогнала свой обычный месяц
  for (const c of A.cats) if (!(c.lim > 0 && c.cur > c.lim) && c.base > 0 && c.cur > c.base * 1.5 && c.cur - c.base > A.thr) s.push({ kind: "spike", title: c.c + " — больше обычного", sub: money(c.cur, UI.cur) + " при обычных " + money(c.base, UI.cur), go: "analytics", cat: c.c, color: "#AF52DE", icon: "bars" });
  if (P && P.n && P.diff > 0.2 && P.now - P.usualToday > A.thr) s.push({ kind: "pace", title: "Траты на " + Math.round(P.diff * 100) + "% быстрее обычного", sub: "до " + money(P.perDay, UI.cur) + " в день, чтобы уложиться", go: "analytics", color: "#FF9500", icon: "flame" });
  return s;
}

/* ---------- средние траты в день ----------
   Считаются только «ежедневные» категории. Что исключать, пользователь выбирает сам (my.daily.exclude);
   пока не выбрал — исключаются постоянные категории (аренда, коммуналка, подписки — по разметке прогноза)
   и поездки: это разовые или ежемесячные платежи, они искажают среднее за день. */
/** Все категории расходов: из настроек и из операций. */
function expenseCats() {
  const s = new Set(((S.settings && S.settings.cats && S.settings.cats.e) || []).map(c => c.name));
  for (const o of allOps()) if (o.t === "e" && o.c) s.add(o.c);
  return [...s];
}
function dailyDefaultExclude() { return expenseCats().filter(c => catKind(c) === "fix" || TRIPCATS.includes(c)); }
function dailyCustom() { const d = mySt().daily; return !!(d && Array.isArray(d.exclude)); }
function dailyExcluded() { return new Set(dailyCustom() ? mySt().daily.exclude : dailyDefaultExclude()); }
/**
 * Траты в день за месяц m: по дням и по категориям, против обычного уровня.
 * Учитываются только «ежедневные» категории (см. dailyExcluded); исключённые — отдельно, справочно.
 * Текущий месяц считается по сегодняшний день, прошлые — целиком.
 * «Обычно» — траты за 6 месяцев до m (с расходами), делённые на все дни этих месяцев.
 * @returns {{m, days, dim, byDay, total, avg, usual, diff, n, cats, excl, excluded}} суммы в валюте UI.cur
 */
function dailyMonth(m, pf) {
  const cm = curM(), partial = m === cm, dim = dimOf(m), days = partial ? +TODAYS.slice(8) : dim, ex = dailyExcluded();
  const base = []; for (let i = 1; i <= 6; i++) base.push(addMonth(m, -i));
  const byDay = new Array(dim).fill(0), cat = {}, catBase = {}, excl = {}, any = {};
  for (const o of allOps()) {
    if (o.t !== "e" || !opPf(o, pf)) continue;
    const mm = o.d.slice(0, 7); if (mm !== m && !base.includes(mm)) continue;
    if (mm !== m) any[mm] = 1;
    if (mm === m && o.d > TODAYS) continue;
    const v = fromRUB(opRUB(o), UI.cur, mm);
    if (ex.has(o.c)) { if (mm === m) excl[o.c] = (excl[o.c] || 0) + v; continue; }
    if (mm === m) { byDay[+o.d.slice(8) - 1] += v; cat[o.c] = (cat[o.c] || 0) + v; }
    else catBase[o.c] = (catBase[o.c] || 0) + v;
  }
  const bm = base.filter(x => any[x]), bdays = bm.reduce((s, x) => s + dimOf(x), 0);
  const total = byDay.reduce((s, v) => s + v, 0), avg = days ? total / days : 0;
  const usual = bdays ? Object.values(catBase).reduce((s, v) => s + v, 0) / bdays : 0;
  const names = new Set(Object.keys(cat).concat(Object.keys(catBase)));
  const cats = [...names].map(c => { const now = (cat[c] || 0) / (days || 1), u = bdays ? (catBase[c] || 0) / bdays : 0; return { c, month: cat[c] || 0, now, usual: u, diff: u > 0 ? (now - u) / u : null }; })
    .filter(x => x.month > 0 || x.usual > 0).sort((a, b) => Math.max(b.now, b.usual) - Math.max(a.now, a.usual));
  return { m, partial, days, dim, byDay, total, avg, usual, diff: usual > 0 ? (avg - usual) / usual : 0, n: bm.length, cats,
    excl: Object.keys(excl).map(c => ({ c, month: excl[c] })).sort((a, b) => b.month - a.month), excluded: [...ex] };
}
/** Средние траты в день за текущий месяц (для виджета Главной). */
function dailyAvg(pf) {
  const D = dailyMonth(curM(), pf);
  return { now: D.avg, usual: D.usual, diff: D.diff, day: D.days, n: D.n, excluded: D.excluded };
}
