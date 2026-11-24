/* Расчёт итогов месяца и наблюдений */
"use strict";
/* ---------- Итоги и консультант ---------- */
/** Категории поездок: нерегулярные траты, считаются отдельно в итогах, аналитике и средних тратах в день. */
const TRIPCATS = ["Путешествия", "Поездки"];
function isOneoffInc(o) { return o.c === "Продажа имущества" || o.s === "премия"; }
function advDefaultM() { return addMonth(curM(), -1); }
function lsq(vals) { const n = vals.length; if (n < 3) return 0; const mx = (n - 1) / 2, my = vals.reduce((s, v) => s + v, 0) / n; let a = 0, b = 0; vals.forEach((v, i) => { a += (i - mx) * (v - my); b += (i - mx) * (i - mx); }); return b ? a / b : 0; }
function advData(m, pf) {
  const months = []; for (let i = 12; i >= 0; i--) months.push(addMonth(m, -i));
  const E = {}, Es = {}, Ic = {}, T = { exp: {}, inc: {}, reg: {}, trip: {}, xf: {} }, opsBy = {}, subsN = new Set();
  const add = (o, k, mm, v) => { (o[k] = o[k] || {})[mm] = (o[k][mm] || 0) + v; };
  const m3 = [addMonth(m, -2), addMonth(m, -1), m];
  for (const o of allOps()) {
    const mm = o.d.slice(0, 7); if (!months.includes(mm)) continue;
    const v = fromRUB(opRUB(o), UI.cur, mm);
    const xs = pfXfer(o, pf); if (xs) { T.xf[mm] = (T.xf[mm] || 0) + xs * v; continue; }
    if (!opPf(o, pf)) continue;
    if (o.t === "e") {
      add(E, o.c, mm, v); add(Es, o.c + "\u0001" + (o.s || "без подкатегории"), mm, v); T.exp[mm] = (T.exp[mm] || 0) + v;
      if (TRIPCATS.includes(o.c)) T.trip[mm] = (T.trip[mm] || 0) + v;
      if (mm === m) (opsBy[o.c] = opsBy[o.c] || []).push({ d: o.d, v, n: o.n || "", s: o.s || "", ac: accName(o.ac) });
      if (o.c === "Подписки" && m3.includes(mm)) subsN.add(String(o.n || o.s || "").toLowerCase().replace(/[^a-zа-яё]/g, "").slice(0, 10));
    } else if (o.t === "i") {
      add(Ic, o.c + (o.s === "премия" ? " · премии" : ""), mm, v); T.inc[mm] = (T.inc[mm] || 0) + v;
      if (!isOneoffInc(o)) T.reg[mm] = (T.reg[mm] || 0) + v;
    }
  }
  const has = mm => (T.exp[mm] || 0) > 0;
  const base = months.slice(6, 12).filter(has), y12 = months.slice(1).filter(has);
  const avg = (o, list) => list.length ? list.reduce((s, x) => s + ((o || {})[x] || 0), 0) / list.length : 0;
  const k = { inc: (T.inc[m] || 0), reg: (T.reg[m] || 0), exp: (T.exp[m] || 0), trip: (T.trip[m] || 0), xf: (T.xf[m] || 0) };
  const b = { inc: avg(T.inc, base), reg: avg(T.reg, base), exp: avg(T.exp, base), trip: avg(T.trip, base), xf: avg(T.xf, base) };
  k.save = k.reg - k.exp; b.save = b.reg - b.exp; k.one = k.inc - k.reg;
  k.rate = k.reg > 0 ? k.save / k.reg : null; b.rate = b.reg > 0 ? b.save / b.reg : null;
  const thr = Math.max(b.exp * 0.03, 1e-9);
  const cats = Object.keys(E).map(c => {
    const cur = E[c][m] || 0, bb = avg(E[c], base), series = months.slice(1).map(x => E[c][x] || 0);
    const s6 = series.slice(-6), mean6 = s6.reduce((s, v) => s + v, 0) / 6, slope = lsq(s6);
    const d = cur - bb, pct = bb > 0 ? d / bb : null;
    let flag = "";
    if ((bb > 0 && cur > bb * 1.5 && d > thr) || (bb === 0 && cur > thr)) flag = "spike";
    else if (bb > 0 && cur < bb * 0.5 && -d > thr) flag = "drop";
    const trend = mean6 > thr / 2 && slope * 5 / mean6 > 0.35 ? "up" : mean6 > thr / 2 && slope * 5 / mean6 < -0.35 ? "down" : "";
    let drivers = null;
    if (flag === "spike") {
      const subs = Object.keys(Es).filter(x => x.startsWith(c + "\u0001")).map(x => ({ s: x.split("\u0001")[1], cur: Es[x][m] || 0, base: avg(Es[x], base) })).map(x => Object.assign(x, { d: x.cur - x.base })).sort((p, q) => q.d - p.d).slice(0, 2);
      const top = (opsBy[c] || []).slice().sort((p, q) => q.v - p.v).slice(0, 3);
      drivers = { subs, top };
    }
    return { c, cur, base: bb, d, pct, series, flag, trend, drivers, avg12: avg(E[c], y12), lim: budRUB(c, m) ? fromRUB(budRUB(c, m), UI.cur, m) : 0 };
  }).filter(r => r.cur > 0 || r.base > 0).sort((p, q) => Math.max(q.cur, q.base) - Math.max(p.cur, p.base));
  const incs = Object.keys(Ic).map(c => ({ c, cur: Ic[c][m] || 0, base: avg(Ic[c], base), series: months.slice(1).map(x => Ic[c][x] || 0) })).filter(r => r.cur > 0 || r.base > 0).sort((p, q) => Math.max(q.cur, q.base) - Math.max(p.cur, p.base));
  // health, as of today
  let liquid = 0, invest = 0, dep = 0; const byCur = {};
  for (const a of accs()) { if (!a.inCap || a.archived || !pfHas(a, pf)) continue; const v = toRUB(balanceAt(a.id, TODAYS), a.cur, curM()); if (a.type === "broker" || a.type === "fund") invest += v; else liquid += v; if (a.type === "deposit") dep += v; byCur[a.cur] = (byCur[a.cur] || 0) + v; }
  const capRUB = liquid + invest;
  const fullM = []; for (let i = 1; i <= 12; i++) fullM.push(addMonth(curM(), -i));
  let expR = 0, nE = 0, intR = 0; const m3f = fullM.slice(0, 3);
  for (const o of allOps()) { if (!opPf(o, pf)) continue; const mm = o.d.slice(0, 7); if (o.t === "e" && fullM.includes(mm)) expR += opRUB(o); if (o.t === "i" && o.c === "Проценты" && m3f.includes(mm)) intR += opRUB(o); }
  for (const mm of fullM) if (allOps().some(o => o.t === "e" && o.d.slice(0, 7) === mm && opPf(o, pf))) nE++;
  const avgExpR = nE ? expR / nE : 0;
  const ks = snapKeys(), k12 = ks.filter(x => x <= addMonth(curM(), -12) + "-31").slice(-1)[0] || ks[0];
  const cap12 = k12 ? { k: k12, rub: snapTotalRUB(k12, pf) } : null;
  const health = {
    capRUB, liquidRUB: liquid, investRUB: invest, depRUB: dep, avgExpRUB: avgExpR,
    cushion: avgExpR > 0 ? liquid / avgExpR : null,
    curShare: Object.keys(byCur).map(c => ({ c, p: capRUB ? byCur[c] / capRUB : 0 })).sort((p, q) => q.p - p.p),
    depYield: dep > 0 ? (intR / 3 * 12) / dep : null,
    subsAvg: avg(E["Подписки"], m3.filter(has)), subsN: subsN.size,
    debtsRUB: pf && pf !== "all" ? 0 : debtsTotalRUB(), cap12
  };
  return { m, pf: pf || "all", months, base, k, b, cats, incs, health, thr, other: (E["Прочее"] || {})[m] || 0 };
}
function advNotes(A) {
  const N = [], k = A.k, b = A.b, h = A.health, pc = v => Math.round(v * 100) + "%", M = v => money(v, UI.cur), MR = v => D(v);
  if (k.reg === 0) N.push({ l: "warn", t: "Нет доходов за месяц", d: "В журнале нет поступлений — норма сбережений не считается. Проверьте, внесена ли зарплата." });
  else if (k.rate != null) {
    if (k.rate >= 0.4) N.push({ l: "good", t: "Высокая норма сбережений — " + pc(k.rate), d: "Сохраняете больше 40% дохода. В среднем за прошлые полгода было " + (b.rate != null ? pc(b.rate) : "—") + "." });
    else if (k.rate >= 0.15) N.push({ l: "info", t: "Норма сбережений " + pc(k.rate), d: "Комфортный ориентир — 20–30% дохода и выше." });
    else N.push({ l: "bad", t: "Низкая норма сбережений — " + pc(k.rate), d: "Расходы съели почти весь доход месяца. Посмотрите всплески ниже." });
  }
  if (h.cushion != null) {
    if (h.cushion < 3) N.push({ l: "bad", t: "Финансовая подушка " + h.cushion.toFixed(1).replace(".", ",") + " мес", d: "Ликвидных денег меньше чем на 3 месяца трат. Ориентир — 3–6 месяцев." });
    else if (h.cushion > 24) N.push({ l: "info", t: "Подушка с большим запасом — " + Math.round(h.cushion) + " мес трат", d: "Ликвидных денег хватит на 2+ года расходов. Излишек сверх 6–12 месяцев можно распределить по целям и валютам." });
    else N.push({ l: "good", t: "Финансовая подушка " + Math.round(h.cushion) + " мес", d: "Ликвидных денег хватает на " + Math.round(h.cushion) + " месяцев средних трат." });
  }
  const top = h.curShare[0];
  if (top && top.p > 0.6) N.push({ l: "warn", t: "Капитал на " + pc(top.p) + " в " + (SYM[top.c] || top.c), d: "Высокая концентрация в одной валюте: курсовые колебания сильно влияют на капитал в других валютах." });
  if (h.depYield != null && h.depYield > 0) N.push({ l: "info", t: "Доходность вклада ≈ " + (h.depYield * 100).toFixed(1).replace(".", ",") + "% годовых", d: "Чистыми, по выплатам процентов за 3 месяца к текущему остатку вклада." });
  A.cats.filter(r => r.flag === "spike").slice(0, 4).forEach(r => N.push({ l: "warn", t: r.c + ": всплеск " + (r.pct != null ? "+" + pc(r.pct) : ""), d: M(r.cur) + " против " + M(r.base) + " в среднем за полгода." }));
  A.cats.filter(r => r.trend === "up" && r.flag !== "spike").slice(0, 3).forEach(r => N.push({ l: "info", t: r.c + ": растет полгода подряд", d: "Траты по категории устойчиво растут, сейчас " + M(r.cur) + " в месяц." }));
  const over = A.cats.filter(r => r.lim > 0 && r.cur > r.lim);
  if (over.length) N.push({ l: "warn", t: "Превышены лимиты: " + over.length, d: over.slice(0, 4).map(r => r.c + " +" + M(r.cur - r.lim)).join(", ") });
  if (h.subsAvg > 0) N.push({ l: "info", t: "Подписки ≈ " + M(h.subsAvg) + " в месяц", d: (h.subsN ? h.subsN + " сервисов за 3 месяца. " : "") + "Раз в квартал стоит проверять, чем реально пользуетесь." });
  if (k.exp > 0 && A.other / k.exp > 0.1) N.push({ l: "info", t: "«Прочее» — " + pc(A.other / k.exp) + " трат", d: "Большая доля без категории мешает анализу — разнесите крупные операции." });
  if (h.debtsRUB > 0 && h.capRUB > 0) N.push({ l: h.debtsRUB / h.capRUB > 0.1 ? "warn" : "info", t: "Вам должны " + MR(h.debtsRUB), d: Math.round(h.debtsRUB / h.capRUB * 100) + "% капитала. В капитал не входит." });
  return N;
}
function spark(vals, col) {
  const W = 84, H = 26, mx = Math.max(...vals, 1), n = vals.length;
  const p = vals.map((v, i) => (2 + (W - 4) * i / Math.max(1, n - 1)).toFixed(1) + "," + (H - 3 - (H - 6) * v / mx).toFixed(1)).join(" ");
  const last = p.split(" ").pop().split(",");
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + p + '" fill="none" stroke="' + (col || "var(--blue)") + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6" fill="' + (col || "var(--blue)") + '"/></svg>';
}
function dPct(cur, base, invert) {
  if (!(base > 0)) return '<span class="mut">—</span>';
  const p = (cur - base) / base, up = p > 0, bad = invert ? !up : up;
  if (Math.abs(p) < 0.005) return '<span class="mut">0%</span>';
  return '<span class="dp ' + (Math.abs(p) < 0.1 ? "" : bad ? "neg" : "pos") + '">' + (up ? "+" : "−") + Math.round(Math.abs(p) * 100) + "%</span>";
}
