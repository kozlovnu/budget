/* Модель прогноза капитала */
"use strict";
/* ---------- Прогноз ---------- */
/* ---------- Прогноз 2.0: модель из составляющих ---------- */
// manual fixed costs: from their month a set amount replaces the history median of that category
function fixManFn(hist) {
  const FX = (mySt().fixed) || {}, cats = Object.keys(FX).filter(c => FX[c] && FX[c].on && catKind(c) === "fix" && (FX[c].hist || []).length);
  if (!cats.length) return null;
  return (m, r) => {
    const out = { UZ: { v: 0, base: 0 }, RU: { v: 0, base: 0 } };
    for (const c of cats) {
      const h = verAt(FX[c].hist, m); if (!h) continue;
      const bu = hist.M.UZ.fixCats[c] || 0, br = hist.M.RU.fixCats[c] || 0;
      out.UZ.base += bu; out.RU.base += br;
      const p = bu || br ? (bu / r.uzs >= br ? "UZ" : "RU") : ((h.cur || "UZS") === "RUB" ? "RU" : "UZ");
      const vR = (+h.v || 0) * rOf(r, h.cur || "UZS");
      out[p].v += p === "UZ" ? vR * r.uzs : vR;
    }
    return out;
  };
}
function mDiff(a, b) { return (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7)); }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rOf(r, cur) { return cur === "RUB" ? 1 : cur === "USD" ? r.usd : cur === "EUR" ? r.eur : cur === "UZS" ? 1 / r.uzs : cur === "KZT" ? 1 / r.kzt : 1; } // RUB per unit
function fxModel(mode, baseM) {
  const base = rateM(baseM);
  if (mode !== "trend") return { at: () => base, slope: null };
  const R = (S.rates && S.rates.m) || {}; const ks = Object.keys(R).sort().filter(k => k <= baseM).slice(-24);
  const sl = {}; for (const key of ["usd", "eur", "uzs", "kzt"]) { const pts = ks.map(k => [mDiff(ks[0], k), Math.log(R[k][key])]).filter(p => isFinite(p[1])); if (pts.length < 6) { sl[key] = 0; continue; } const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n; let a = 0, b = 0; for (const p of pts) { a += (p[0] - mx) * (p[1] - my); b += (p[0] - mx) ** 2; } sl[key] = b ? a / b : 0; }
  return { at: m => { const k = mDiff(baseM, m); if (k <= 0) return base; const o = {}; for (const key of ["usd", "eur", "uzs", "kzt"]) o[key] = base[key] * Math.exp(sl[key] * k); return o; }, slope: sl };
}
function poolOf(a) { return a && pfOf(a) === "ru" ? "RU" : "UZ"; }
function poolCur(p) { return p === "RU" ? "RUB" : "UZS"; }
// history model: expenses by pool/kind with seasonality, residual ratios, other income — trained on months < endM
function fcHist(endM, exclCats) {
  const ops = allOps().filter(o => o.d.slice(0, 7) < endM);
  const agg = { UZ: { fix: {}, var: {}, irr: {} }, RU: { fix: {}, var: {}, irr: {} } }, fixC = { UZ: {}, RU: {} }, inc = { UZ: {}, RU: {} }, ext = { UZ: {}, RU: {} }, sal = {}, intr = {}, months = new Set();
  for (const o of ops) {
    const m = o.d.slice(0, 7), a = acc(o.ac);
    if (o.t === "e") {
      const p = poolOf(a), v = conv(o.a, opCur(o), poolCur(p), m), k = catKind(o.c); months.add(m);
      agg[p][k][m] = (agg[p][k][m] || 0) + v;
      if (k === "fix") { const F = fixC[p][o.c] = fixC[p][o.c] || {}; F[m] = (F[m] || 0) + v; }
    } else if (o.t === "t") {
      const t = acc(o.to);
      if (a && !t) { const p = poolOf(a); ext[p][m] = (ext[p][m] || 0) - conv(o.a, opCur(o), poolCur(p), m); }
      else if (!a && t) { const p = poolOf(t); ext[p][m] = (ext[p][m] || 0) + conv(opDelta(o, t.id), t.cur, poolCur(p), m); }
    } else if (o.t === "i") {
      const p = poolOf(a), v = conv(o.a, opCur(o), poolCur(p), m);
      if (o.c === "Зарплата" && o.s !== "премия") sal[m] = (sal[m] || 0) + conv(o.a, opCur(o), "UZS", m);
      else if (o.c === "Проценты") intr[m] = (intr[m] || 0) + conv(o.a, opCur(o), "UZS", m);
      else if (!NON_REG_INC.includes(o.c) && o.s !== "премия" && !(exclCats && exclCats.has(o.c))) inc[p][m] = (inc[p][m] || 0) + v;
    }
  }
  const all = [...months].sort(); const last12 = []; for (let i = 12; i >= 1; i--) last12.push(addMonth(endM, -i));
  const l12 = last12.filter(m => months.has(m)), last3 = last12.slice(-3);
  const mean = (o, list) => list.length ? list.reduce((s, m) => s + (o[m] || 0), 0) / list.length : 0;
  const med = a => { const s = a.slice().sort((x, y) => x - y), k = s.length >> 1; return s.length ? (s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2) : 0; };
  const M = {};
  for (const p of ["UZ", "RU"]) {
    const fixCats = {}; let fix = 0;
    for (const c in fixC[p]) { const v = med(last3.map(m => fixC[p][c][m] || 0)); if (v > 0) { fixCats[c] = v; fix += v; } }
    const varBase = mean(agg[p].var, l12);
    // seasonality of variable spend: ratio to trailing 12-month mean, shrunk 50% to 1
    const sr = Array.from({ length: 12 }, () => []);
    for (const m of all) { const w = []; for (let i = 0; i < 12; i++) { const x = addMonth(m, -i); if (months.has(x)) w.push(agg[p].var[x] || 0); } const mu = w.reduce((s, v) => s + v, 0) / (w.length || 1); if (w.length >= 6 && mu > 0) sr[+m.slice(5) - 1].push((agg[p].var[m] || 0) / mu); }
    let idx = sr.map(a => a.length ? 1 + 0.5 * (a.reduce((s, v) => s + v, 0) / a.length - 1) : 1); const im = idx.reduce((s, v) => s + v, 0) / 12; idx = idx.map(v => v / im);
    // irregular: annual sum of last 12 months, spread by historical calendar weights (shrunk 50% to uniform)
    const irrYear = l12.length ? mean(agg[p].irr, l12) * 12 : 0;
    const wr = Array(12).fill(0); let wt = 0; for (const m of all) { const v = agg[p].irr[m] || 0; wr[+m.slice(5) - 1] += v; wt += v; }
    const w = wr.map(v => 0.5 * (wt ? v / wt : 1 / 12) + 0.5 / 12);
    M[p] = { fix, fixCats, varBase, idx, irrYear, w, inc: mean(inc[p], l12), ext: l12.length ? last12.reduce((s, m) => s + (ext[p][m] || 0), 0) / l12.length : 0 };
  }
  const expVI = (p, m) => M[p].varBase * M[p].idx[+m.slice(5) - 1] + M[p].irrYear * M[p].w[+m.slice(5) - 1];
  const res = []; for (const m of all.slice(-24)) { const r = {}; for (const p of ["UZ", "RU"]) { const e = expVI(p, m), a = (agg[p].var[m] || 0) + (agg[p].irr[m] || 0); r[p] = e > 0 ? a / e : 1; } res.push(r); }
  const sal6 = []; for (let i = 6; i >= 1; i--) { const m = addMonth(endM, -i); if (sal[m]) sal6.push(sal[m]); }
  const int3 = []; for (let i = 3; i >= 1; i--) int3.push(intr[addMonth(endM, -i)] || 0);
  return { M, res, salMed: med(sal6), intAvg: int3.reduce((s, v) => s + v, 0) / 3, first: all[0], n: all.length, agg, l12 };
}
// starting balances per pool from a balance map {accId: native}
function fcStart(bal) {
  const st = { deps: [], uzS: {}, RU: 0, ruS: {}, INV: 0, invS: {}, CASH: {}, OTHER: {} };
  for (const a of accs()) {
    if (!a.inCap) continue; const v = bal(a); if (!v) continue; const pf = pfOf(a);
    if (pf === "inv") { if (a.cur === "RUB") st.INV += v; else st.invS[a.cur] = (st.invS[a.cur] || 0) + v; }
    else if (pf === "cash") st.CASH[a.cur] = (st.CASH[a.cur] || 0) + v;
    else if (pf === "ru") { if (a.cur === "RUB") st.RU += v; else st.ruS[a.cur] = (st.ruS[a.cur] || 0) + v; }
    else if (pf === "uz") { if (a.type === "deposit" && a.cur === "UZS") st.deps.push({ v, rate: a.rate || 0, id: a.id, name: a.name }); else st.uzS[a.cur] = (st.uzS[a.cur] || 0) + v; }
    else st.OTHER[a.cur] = (st.OTHER[a.cur] || 0) + v;
  }
  st.deps.sort((x, y) => y.v - x.v);
  return st;
}
function sumS(o, r) { let s = 0; for (const c in o) s += o[c] * rOf(r, c); return s; }
// the engine. o: {start (first simulated month), H, st, hist, fx, sal(m) UZS, prem(m) UZS, rub(m) RUB, events(m) RUB, plan, tax, by, infl, sims, shocks}
function fcRun(o) {
  const H = o.H, months = []; for (let t = 0; t < H; t++) months.push(addMonth(o.start, t));
  const P = ["all", "uz", "ru", "inv", "cash", "other"];
  const run = (seq, comp) => {
    const deps = o.st.deps.map(d => ({ v: d.v, rate: d.rate })); let old = null, nw = 0, rOld = 0, rNew = 0;
    let RU = o.st.RU, INV = o.st.INV; const out = [];
    const tot = (r) => { const uz = deps.reduce((s, d) => s + d.v, 0) + (old != null ? old + nw : 0); const v = { uz: uz / r.uzs + sumS(o.st.uzS, r), ru: RU + sumS(o.st.ruS, r), inv: INV + sumS(o.st.invS, r), cash: sumS(o.st.CASH, r), other: sumS(o.st.OTHER, r) }; v.all = v.uz + v.ru + v.inv + v.cash + v.other; return v; };
    out.push(tot(o.fx(addMonth(o.start, -1))));
    let rr = null; const add = (pool, k, vRUB) => { if (comp) comp[pool][k] = (comp[pool][k] || 0) + (o.disp ? o.disp(vRUB, rr) : vRUB); };
    for (let t = 0; t < H; t++) {
      const m = months[t], r = o.fx(m); rr = r; const mo = +m.slice(5) - 1, inf = Math.pow(1 + (o.infl || 0) / 100, (t + 1) / 12);
      const pl = (o.plan || []).find(p => p.from === m);
      if (pl) { const sum = deps.reduce((s, d) => s + d.v, 0) + (old != null ? old + nw : 0); deps.length = 0; old = sum; nw = 0; rOld = pl.old; rNew = pl.nw; }
      // interest on balances at month start, net of tax
      const k = (1 - (o.tax || 0) / 100) / 1200;
      let it = 0; if (old == null) for (const d of deps) it += d.v * d.rate * k; else it = old * rOld * k + nw * rNew * k;
      const shUZ = seq ? seq[t].UZ : 1, shRU = seq ? seq[t].RU : 1;
      const H_ = o.hist.M;
      const fm = o.fixMan ? o.fixMan(m, r) : null;
      const eUZf = fm ? (H_.UZ.fix - fm.UZ.base) * inf + fm.UZ.v : H_.UZ.fix * inf, eUZv = H_.UZ.varBase * H_.UZ.idx[mo] * inf * shUZ, eUZi = H_.UZ.irrYear * H_.UZ.w[mo] * inf * shUZ;
      const eRUf = fm ? (H_.RU.fix - fm.RU.base) * inf + fm.RU.v : H_.RU.fix * inf, eRUv = H_.RU.varBase * H_.RU.idx[mo] * inf * shRU, eRUi = H_.RU.irrYear * H_.RU.w[mo] * inf * shRU;
      const sal = o.sal(m), prem = o.prem(m), rub = o.rub(m), oth = o.oth ? o.oth(m) : 0, ev = o.events(m);
      const xUZ = o.noExt ? 0 : H_.UZ.ext, xRU = o.noExt ? 0 : H_.RU.ext;
      RU += rub + H_.RU.inc + xRU - eRUf - eRUv - eRUi;
      let toRU = 0; if (RU < 0) { toRU = -RU; RU = 0; }
      const netUZ = sal + prem + oth + it + H_.UZ.inc + xUZ - eUZf - eUZv - eUZi - toRU * r.uzs + ev * r.uzs;
      if (old == null) { if (deps.length) deps[0].v += netUZ; else deps.push({ v: netUZ, rate: 0 }); } else nw += netUZ;
      const g = INV * (o.by || 0) / 1200; INV += g;
      if (comp) {
        const u = v => v / r.uzs;
        add("uz", "Зарплата", u(sal)); add("uz", "Премии", u(prem)); add("uz", "Проценты по вкладам", u(it)); add("uz", "Прочие доходы", u(H_.UZ.inc)); add("uz", "Регулярные поступления", u(oth));
        add("uz", "Постоянные траты", -u(eUZf)); add("uz", "Переменные траты", -u(eUZv)); add("uz", "Нерегулярные траты", -u(eUZi));
        add("uz", "Сценарии", ev); add("uz", "Долги и переводы вне учета", u(xUZ)); add("ru", "Долги и переводы вне учета", xRU); add("uz", "Переводы в Россию", -toRU);
        add("ru", "Регулярные поступления", rub); add("ru", "Прочие доходы", H_.RU.inc); add("ru", "Постоянные траты", -eRUf); add("ru", "Переменные траты", -eRUv); add("ru", "Нерегулярные траты", -eRUi); add("ru", "Переводы из Узбекистана", toRU);
        add("inv", "Доходность брокера и фондов", g);
      }
      out.push(tot(r));
    }
    return out;
  };
  const comp = { uz: {}, ru: {}, inv: {}, cash: {}, other: {} };
  const det = run(null, comp);
  const N = o.sims || 0, R = rng(20261028), sims = [];
  for (let s = 0; s < N && o.hist.res.length; s++) sims.push(run(months.map(() => o.hist.res[Math.floor(R() * o.hist.res.length)]), null));
  const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  const band = {}; for (const p of P) { band[p] = det.map((d, t) => sims.length ? { p10: q(sims.map(x => x[t][p]), 0.1), p50: q(sims.map(x => x[t][p]), 0.5), p90: q(sims.map(x => x[t][p]), 0.9) } : { p10: d[p], p50: d[p], p90: d[p] }); }
  return { months, det, band, comp };
}
function dispR(v, r) { return UI.cur === "USD" ? v / r.usd : UI.cur === "EUR" ? v / r.eur : UI.cur === "UZS" ? v * r.uzs : v; }
/** Горизонты прогноза, мес: ближние (1 и 3) — чтобы сверять прогноз с фактом каждый месяц. */
const FC_HZ = [1, 3, 6, 12, 24, 36];
const FC_CACHE = {};
/** Прогноз от сегодняшнего дня; пересчитывается только при изменении данных или параметров. */
function fcLive() { const k = "live:" + dataSig(); if (FC_CACHE.k !== k) { FC_CACHE.k = k; FC_CACHE.v = fcLiveCalc(); } return FC_CACHE.v; }
const FC12_CACHE = {};
/** Тот же прогноз, но всегда на 12 месяцев — для сохранения и сравнения с фактом (не зависит от выбранного горизонта). */
function fcLive12() { const k = "12:" + dataSig(); if (FC12_CACHE.k !== k) { FC12_CACHE.k = k; FC12_CACHE.v = fcLiveCalc(12); } return FC12_CACHE.v; }
function fcLiveCalc(Hopt) {
  const F = fcS(), start = addMonth(curM(), 1), H = Hopt || F.hz || 12;
  const MY = mySt();
  const hist = fcHist(curM(), new Set((MY.incomes || []).map(x => x.cat).filter(Boolean))), fx = fxModel(F.fx, curM());
  const st = fcStart(a => a.archived ? 0 : balanceAt(a.id, TODAYS));
  const sal = m => salUZSAt(m, fx.at(m));
  const prem = m => bonusUZSAt(m, fx.at(m));
  const rub = m => incAt(m, fx.at(m)).ru, oth = m => incAt(m, fx.at(m)).uz;
  const evs = (((S.settings || {}).forecast || {}).events || []).filter(e => e.on !== false);
  const events = m => evs.filter(e => e.m === m).reduce((s, e) => s + (+e.v || 0), 0);
  const plan = ((MY.deposits || {}).plan || []).filter(p => /^\d{4}-\d{2}$/.test(p.from)).slice().sort((a, b) => a.from < b.from ? -1 : 1);
  const fixMan = fixManFn(hist);
  const res = fcRun({ start, H, st, hist, fx: fx.at, sal, prem, rub, oth, events, plan, fixMan, tax: +((MY.deposits || {}).tax) || 0, by: +F.by || 0, infl: +F.infl || 0, sims: 500, disp: dispR, noExt: F.extOn === false });
  return Object.assign(res, { fx, hist, st, start, salNow: sal(start) });
}
const BT_CACHE = {};
/** Проверка модели на истории; кэш по данным и периоду. */
function fcBack(startM, H) { const k = dataSig() + ":" + startM + ":" + H; if (!(k in BT_CACHE)) { for (const x in BT_CACHE) delete BT_CACHE[x]; BT_CACHE[k] = fcBackCalc(startM, H); } return BT_CACHE[k]; }
function fcBackCalc(startM, H) {
  const k0 = startM + "-01"; if (!S.snaps || !snap(k0)) return null;
  const hist = fcHist(startM, false), b0 = snap(k0).bal || {};
  const st = fcStart(a => b0[a.id] || 0);
  const dep = st.deps.reduce((s, d) => s + d.v, 0), eff = dep > 0 ? hist.intAvg * 12 / dep * 100 : 0;
  st.deps.forEach(d => { d.rate = eff; });
  const fx = m => rateM(addMonth(m, 1)), F = fcS();
  const res = fcRun({ start: startM, H, st, hist, fx, sal: () => hist.salMed, prem: m => bonusUZSAt(m, null, hist.salMed), rub: () => 0, events: () => 0, plan: [], tax: 0, by: +fcS().by || 0, infl: 0, sims: 500, disp: dispR });
  const act = [], oneoff = []; let inc = 0, exp = 0;
  for (let t = 0; t <= H; t++) {
    const k = addMonth(startM, t) + "-01"; let one = 0, oneP = {};
    for (const o of allOps()) { if (o.d >= k) break; if (o.d >= k0 && o.t === "i" && o.c === "Продажа имущества") { const v = opRUB(o); one += v; const p = pfOf(acc(o.ac) || {}); oneP[p] = (oneP[p] || 0) + v; } }
    act.push(snap(k) ? { k, all: snapTotalRUB(k) - one, by: pf => snapTotalRUB(k, pf) - (pf === "all" ? one : (oneP[pf] || 0)) } : null);
  }
  for (const o of allOps()) { const m = o.d.slice(0, 7); if (m < startM || m >= addMonth(startM, H)) continue; if (o.t === "i" && o.c !== "Продажа имущества") inc += opRUB(o); if (o.t === "e") exp += opRUB(o); }
  return Object.assign(res, { act, actInc: inc, actExp: exp, eff, hist, H, startM });
}

const COMP_ORDER = ["Зарплата", "Премии", "Проценты по вкладам", "Регулярные поступления", "Прочие доходы", "Доходность брокера и фондов", "Постоянные траты", "Переменные траты", "Нерегулярные траты", "Долги и переводы вне учета", "Переводы из Узбекистана", "Переводы в Россию", "Сценарии", "Курс и переоценка"];
function compFor(comp, pf) {
  const out = {};
  if (pf === "all") { for (const p in comp) for (const k in comp[p]) if (k !== "Переводы в Россию" && k !== "Переводы из Узбекистана") out[k] = (out[k] || 0) + comp[p][k]; }
  else Object.assign(out, comp[pf] || {});
  return out;
}
