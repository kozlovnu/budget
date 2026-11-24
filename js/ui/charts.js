/* Графики: капитал, траты, интерактивные подсказки */
"use strict";
function chNum(v, cur) { const c = cur || UI.cur; const s = v < 0 ? "−" : ""; return c === "UZS" ? s + nf(Math.abs(v) / 1e6, 1) : s + nf(Math.round(Math.abs(v)), 0); }
const CH_SIN = 0.643, CH_COS = 0.766;
/* Подписи значений над точками/столбцами. Если все не помещаются горизонтально, подписываются
   только последняя и выбранная точки (раньше — все, повёрнутые на 40°, что плохо читалось);
   остальные значения показывает подсказка при наведении или касании. */
function chPlan(vals, plotW, spFn, cur) {
  const t = vals.map(v => v == null ? "" : chNum(v, cur)); const maxW = Math.max(0, ...t.map(s => s.length * 5.3 + 2));
  const sparse = maxW > spFn(plotW) - 3;
  return { t, maxW, ang: false, sparse, step: 1, ext: 0, top: 12 };
}
function chLabels(plan, xs, ys, W, on, bandY) {
  const n = plan.t.length; let s = "";
  plan.t.forEach((t, i) => {
    if (!t) return; if (plan.sparse && i !== n - 1 && i !== on) return;
    const x = xs[i], y = plan.ang && bandY != null ? bandY : ys[i] - 7, w = t.length * 5.3 + 2, hl = on != null && on === i;
    const st = ' font-size="9" font-weight="' + (hl ? 700 : 600) + '" fill="' + (hl ? "var(--link)" : "var(--label2)") + '" stroke="var(--card)" stroke-width="3" paint-order="stroke" style="font-variant-numeric:tabular-nums" pointer-events="none"';
    if (plan.ang) s += '<text transform="translate(' + (x + 1).toFixed(1) + ' ' + y.toFixed(1) + ') rotate(-40)" text-anchor="start"' + st + '>' + t + '</text>';
    else { const cx = Math.min(W - w / 2, Math.max(w / 2, x)); s += '<text x="' + cx.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle"' + st + '>' + t + '</text>'; }
  });
  return s;
}
function lineChart(pts, labels, marks, markLabel, months) {
  const W = 340, pl = 6, pb = 22;
  const plan = chPlan(pts, W - pl - 6, w => w / Math.max(1, pts.length - 1)); const pr = 6 + plan.ext;
  const pt = plan.ang ? plan.top + 6 : 28, H = 124 + pt;
  const hi = Math.max(...pts), lo = Math.min(...pts), rg = (hi - lo) || 1;
  const X = i => pl + (W - pl - pr) * i / Math.max(1, pts.length - 1);
  const Y = v => pt + (H - pt - pb) * (1 - (v - lo) / rg);
  const p = pts.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ");
  let s = '<polygon points="' + p + ' ' + X(pts.length - 1).toFixed(1) + ',' + (H - pb) + ' ' + X(0) + ',' + (H - pb) + '" fill="var(--chartFill)"/>';
  s += '<polyline points="' + p + '" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  pts.forEach((v, i) => { s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="2.6" fill="var(--card)" stroke="var(--blue)" stroke-width="1.6"/>'; });
  for (const i of marks || []) s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(pts[i]).toFixed(1) + '" r="4.5" fill="var(--orange)" stroke="var(--card)" stroke-width="2"/>';
  const li = pts.length - 1;
  s += '<circle cx="' + X(li).toFixed(1) + '" cy="' + Y(pts[li]).toFixed(1) + '" r="4.5" fill="var(--blue)" stroke="var(--card)" stroke-width="2"/>';
  s += chLabels(plan, pts.map((v, i) => X(i)), pts.map(v => Y(v)), W, null, pt - 7);
  s += '<text x="' + pl + '" y="' + (H - 5) + '" font-size="11" fill="var(--muted)">' + esc(labels[0]) + '</text><text x="' + (W - pr) + '" y="' + (H - 5) + '" font-size="11" fill="var(--muted)" text-anchor="end">' + esc(labels[li]) + '</text>';
  const P = pts.map((v, i) => {
    const prev = i ? pts[i - 1] : null, dl = prev != null ? v - prev : null;
    return { x: X(i), y: Y(v), label: months ? months[i] : labels[i], value: money(v, UI.cur),
      sub: (dl != null ? money(dl, UI.cur, { sign: true }) + " · " + (dl >= 0 ? "+" : "−") + Math.abs(prev ? dl / prev * 100 : 0).toFixed(1).replace(".", ",") + "%" : "") + ((marks || []).includes(i) ? " · " + markLabel : "") };
  });
  return ichart(s, W, H, P, { aria: "Капитал по месяцам: от " + DSx(pts[0]) + " до " + DSx(pts[li]) + ". Наведите или коснитесь, чтобы увидеть месяц.", guideTop: pt - 6, guideBottom: H - pb });
}
function DSx(v) { return shortM(v, UI.cur); }

function periodLabel(a, b) {
  const f = d => +d.slice(8) + " " + MONG[+d.slice(5, 7) - 1];
  if (a === b) return f(a) + " " + a.slice(0, 4);
  return (a.slice(0, 7) === b.slice(0, 7) ? +a.slice(8) : f(a)) + " – " + f(b) + " " + b.slice(0, 4);
}
const PICK = {
  capm: p => { UI.capSel = UI.capSel === p.m ? null : p.m; },
  capy: p => { UI.capYear = +p.m; UI.capSel = null; UI.capMode = "m"; }
};
function capPoints(pf) {
  const ks = snapKeys(), last = ks[ks.length - 1], withNow = !!last && last < TODAYS, cy = +TODAYS.slice(0, 4);
  const val = k => k === "now" ? fromRUB(capitalNowRUB(pf), UI.cur, curM()) : fromRUB(snapTotalRUB(k, pf), UI.cur, k.slice(0, 7));
  const P = [];
  if (UI.capMode === "y" && !UI.capYear) {
    const years = [...new Set(ks.map(k => +k.slice(0, 4)))].concat(withNow ? [cy] : []).filter((y, i, a) => a.indexOf(y) === i).sort();
    for (const y of years) {
      const kEnd = (y + 1) + "-01-01";
      if (ks.includes(kEnd)) P.push({ key: kEnd, m: String(y), lab: String(y), tip: y + " · на 1 января " + (y + 1) });
      else if (y === cy && withNow) P.push({ key: "now", m: String(y), lab: String(y), tip: y + " · сейчас, " + dLabel(TODAYS) });
      else { const kl = ks.filter(k => k.startsWith(y + "-")).slice(-1)[0]; if (kl) P.push({ key: kl, m: String(y), lab: String(y), tip: y + " · на " + dLabel(kl) }); }
    }
  } else {
    const sel = UI.capYear ? ks.filter(k => k.startsWith(UI.capYear + "-")) : ks.slice(-13);
    for (const k of sel) P.push({ key: k, m: k, lab: MONS[+k.slice(5, 7) - 1], yr: k.slice(5, 7) === "01" || k === sel[0] ? "’" + k.slice(2, 4) : "", tip: "На " + dLabel(k) + (UI.capYear ? " " + k.slice(0, 4) : "") });
    if (UI.capYear && UI.capYear < cy && ks.includes((UI.capYear + 1) + "-01-01")) { const k = (UI.capYear + 1) + "-01-01"; P.push({ key: k, m: k, lab: "итог", yr: "", tip: "На 1 января " + (UI.capYear + 1) }); }
    if (withNow && (!UI.capYear || UI.capYear === cy)) P.push({ key: "now", m: "now", lab: "сейчас", yr: "", tip: "Сейчас · " + dLabel(TODAYS) });
  }
  for (const p of P) p.v = val(p.key);
  // previous point for each bar (for change and decomposition)
  P.forEach((p, i) => { p.prev = i ? P[i - 1].key : (ks.filter(k => k < (p.key === "now" ? TODAYS : p.key)).slice(-1)[0] || null); if (UI.capMode === "y" && !UI.capYear && i === 0) p.prev = ks[0]; });
  return P;
}
/* График капитала: линия с заливкой. Масштаб — от минимума до максимума периода (капитал не бывает
   около нуля, и столбцы от нуля прятали изменения); на оси подписаны минимум и максимум. */
function capBars(P, pick, selKey) {
  const n = P.length, W = 340, pl = 14, pr = 14, pb = 30, pt = 24, H = 150 + pt;
  const plan = chPlan(P.map(p => p.v), W - pl - pr, w => w / Math.max(1, n - 1));
  const vs = P.map(p => p.v), vmax = Math.max(...vs), vmin = Math.min(...vs);
  const pad = (vmax - vmin) * 0.15 || Math.abs(vmax) * 0.05 || 1, hi = vmax + pad, lo = vmin - pad;
  const X = i => n === 1 ? W / 2 : pl + (W - pl - pr) * i / (n - 1);
  const Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  const si = P.findIndex(p => p.key === selKey);
  const ax = ' font-size="9" fill="var(--muted)" stroke="var(--card)" stroke-width="3" paint-order="stroke" pointer-events="none"';
  let s = "";
  for (const v of vmax > vmin ? [vmax, vmin] : [vmax]) { const y = Y(v).toFixed(1); s += '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--sep)" stroke-dasharray="3 4"/>'; }
  const line = P.map((p, i) => X(i).toFixed(1) + "," + Y(p.v).toFixed(1)).join(" ");
  s += '<polygon points="' + line + ' ' + X(n - 1).toFixed(1) + ',' + (H - pb) + ' ' + X(0).toFixed(1) + ',' + (H - pb) + '" fill="var(--chartFill)"/>';
  s += '<polyline points="' + line + '" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  // подпись шкалы — на той стороне, где нет самой точки, чтобы не наезжать на линию
  const axl = (v, dy) => { const i = vs.indexOf(v), right = i < n / 2; return '<text x="' + (right ? W : 0) + '" y="' + (Y(v) + dy).toFixed(1) + '" text-anchor="' + (right ? "end" : "start") + '"' + ax + '>' + esc(DSx(v)) + '</text>'; };
  if (vmax > vmin) s += axl(vmax, -4) + axl(vmin, 11);
  const pts = [];
  P.forEach((p, i) => {
    const x = X(i), y = Y(p.v), on = i === si;
    const one = p.prev && p.key !== p.prev ? decomp(p.prev, p.key, curPf()).oneoff > 0 : false;
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (on ? 5.5 : one ? 4.5 : 3) + '" fill="' + (on ? "var(--blue)" : one ? "var(--orange)" : "var(--card)") + '" stroke="' + (on || one ? "var(--card)" : "var(--blue)") + '" stroke-width="' + (on || one ? 2 : 1.6) + '"/>';
    const lab = p.lab === "сейчас" && W / Math.max(1, n) < 34 ? "сег." : p.lab, step = n > 14 ? 2 : 1;
    if (i % step === 0 || i === n - 1 || on) {
      s += '<text x="' + x.toFixed(1) + '" y="' + (H - pb + 15) + '" font-size="' + (n > 10 ? 9.5 : 10.5) + '" text-anchor="middle" fill="' + (on ? "var(--link)" : "var(--muted)") + '" font-weight="' + (on ? 700 : 500) + '">' + esc(lab) + '</text>';
      if (p.yr) s += '<text x="' + x.toFixed(1) + '" y="' + (H - pb + 27) + '" font-size="9" text-anchor="middle" fill="var(--muted)">' + esc(p.yr) + '</text>';
    }
    const pv = i ? P[i - 1].v : null, dl = pv != null ? p.v - pv : null;
    pts.push({ x, y, label: p.tip, value: money(p.v, UI.cur), sub: (dl != null ? money(dl, UI.cur, { sign: true }) + " · " + (dl >= 0 ? "+" : "−") + Math.abs(pv ? dl / pv * 100 : 0).toFixed(1).replace(".", ",") + "%" : "") + (one ? " · разовое поступление" : ""), dot: false, m: p.m, hint: pick === "capy" ? "нажмите, чтобы открыть месяцы" : (on ? "выбран · нажмите еще раз, чтобы снять" : "нажмите — разбор изменения") });
  });
  s += chLabels(plan, P.map((p, i) => X(i)), P.map(p => Y(p.v)), W, si >= 0 ? si : null);
  return ichart(s, W, H, pts, { aria: "Капитал по " + (pick === "capy" ? "годам" : "месяцам") + ": от " + DSx(vs[0]) + " до " + DSx(vs[n - 1]) + ". Наведите, чтобы увидеть значение; нажмите, чтобы " + (pick === "capy" ? "открыть месяцы года." : "увидеть разбор изменения."), pick, guideTop: pt - 8, guideBottom: H - pb });
}
function spendBridge(sel, cat, months, dataMonths, pf) {
  const mode = UI.abase === "prev" ? "prev" : "avg", pm = addMonth(sel, -1);
  const by = {}; const add = (k, m, v) => { (by[k] = by[k] || {})[m] = (by[k][m] || 0) + v; };
  for (const o of allOps()) { if (o.t !== "e" || !opPf(o, pf)) continue; const m = o.d.slice(0, 7); if (m !== sel && m !== pm && !months.includes(m)) continue; if (cat && o.c !== cat) continue; add(cat ? (o.s || "без подкатегории") : o.c, m, fromRUB(opRUB(o), UI.cur, m)); }
  const baseOf = k => mode === "prev" ? (by[k][pm] || 0) : dataMonths.reduce((s, m) => s + (by[k][m] || 0), 0) / (dataMonths.length || 1);
  let rows = Object.keys(by).map(k => ({ k, b: baseOf(k), c: by[k][sel] || 0 })).map(r => Object.assign(r, { d: r.c - r.b })).filter(r => Math.abs(r.d) > 0.5);
  rows.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const top = rows.slice(0, 7), rest = rows.slice(7); if (rest.length) top.push({ k: "Остальные (" + rest.length + ")", d: rest.reduce((s, r) => s + r.d, 0), other: true });
  const B = Object.keys(by).reduce((s, k) => s + baseOf(k), 0), C = Object.keys(by).reduce((s, k) => s + (by[k][sel] || 0), 0);
  const items = [{ k: mode === "prev" ? MON[+pm.slice(5) - 1] + " " + pm.slice(0, 4) : "Среднее за " + dataMonths.length + " мес", v: B, tot: "base" }].concat(top, [{ k: mLabel(sel, true), v: C, tot: "end" }]);
  let cum = 0, mx = 0, mn = Infinity; for (const it of items) { if (it.tot) { it.x0 = 0; it.x1 = it.v; cum = it.v; mn = Math.min(mn, it.v); } else { it.x0 = cum; it.x1 = cum + it.d; cum = it.x1; mn = Math.min(mn, it.x0, it.x1); } mx = Math.max(mx, it.x0, it.x1); }
  const lo = Math.max(0, mn - (mx - mn) * 0.6), hi = mx + (mx - mn) * 0.04;
  const W = 340, nameW = 118, valW = 62, X0 = nameW + 6, X1 = W - valW - 6, rh = 26, gap = 7, H = items.length * (rh + gap) + 6;
  const X = v => X0 + (X1 - X0) * (Math.max(lo, v) - lo) / ((hi - lo) || 1);
  const trunc = s => s.length > 19 ? s.slice(0, 18) + "…" : s;
  let s = "";
  items.forEach((it, i) => {
    const y = 4 + i * (rh + gap), a = X(Math.min(it.x0, it.x1)), b = X(Math.max(it.x0, it.x1)), w = Math.max(2, b - a);
    const col = it.tot === "base" ? "var(--fill)" : it.tot === "end" ? "var(--blue)" : it.d > 0 ? "var(--orange)" : "var(--green)";
    const val = it.tot ? chNum(it.v) : (it.d > 0 ? "+" : "") + chNum(it.d);
    const click = !it.tot && !it.other && !cat;
    s += '<g' + (click ? ' data-act="catdet" data-c="' + esc(it.k) + '" style="cursor:pointer"' : "") + '><title>' + esc(it.k + ": " + (it.tot ? money(it.v, UI.cur) : money(it.d, UI.cur, { sign: true }))) + '</title>' +
      '<rect x="0" y="' + (y - 2) + '" width="' + W + '" height="' + (rh + 4) + '" fill="transparent"/>' +
      '<text x="0" y="' + (y + rh / 2 + 4) + '" font-size="12" fill="var(--label)" font-weight="' + (it.tot ? 700 : 500) + '">' + esc(trunc(it.k)) + '</text>' +
      '<rect x="' + a.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + rh + '" rx="5" fill="' + col + '"/>' +
      '<text x="' + W + '" y="' + (y + rh / 2 + 4) + '" font-size="12" text-anchor="end" font-weight="700" fill="' + (it.tot ? "var(--label)" : it.d > 0 ? "var(--orangeT)" : "var(--greenT)") + '" style="font-variant-numeric:tabular-nums">' + esc(val) + '</text></g>';
    if (i < items.length - 1) { const xe = X(it.tot ? it.v : it.x1); s += '<line x1="' + xe.toFixed(1) + '" x2="' + xe.toFixed(1) + '" y1="' + (y + rh) + '" y2="' + (y + rh + gap) + '" stroke="var(--muted)" stroke-dasharray="2 2" stroke-width="1"/>'; }
  });
  const unit = UI.cur === "UZS" ? "млн сум" : SYM[UI.cur];
  return '<div class="bridge" role="img" aria-label="Бридж трат: от ' + esc(items[0].k) + ' ' + esc(money(B, UI.cur)) + ' к ' + esc(mLabel(sel)) + ' ' + esc(money(C, UI.cur)) + '"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block" aria-hidden="true">' + s + '</svg></div>' +
    '<div class="mut" style="font-size:12px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center"><span style="display:flex;gap:6px;align-items:center"><span style="width:12px;height:10px;border-radius:3px;background:var(--orange)"></span>траты выросли</span><span style="display:flex;gap:6px;align-items:center"><span style="width:12px;height:10px;border-radius:3px;background:var(--green)"></span>снизились</span><span>значения в ' + unit + (lo > 0 ? " · шкала начинается с " + chNum(lo) : "") + (cat ? "" : " · нажмите на категорию, чтобы открыть платежи") + '</span></div>';
}
function spendBars(months, vals, avg, sel, pick) {
  const W = 340, pb = 20, gap = 5;
  const plan = chPlan(vals.map(v => v > 0 ? v : null), W, w => (w - 11 * gap) / 12 + gap);
  const plotW = W - plan.ext, bw = (plotW - 11 * gap) / 12;
  const pt = plan.ang ? plan.top + 4 : 22, H = 156 + pt; const mx = Math.max(...vals, avg, 1) * (plan.ang ? 1.0 : 1.1);
  const Y = v => pt + (H - pt - pb) * (1 - v / mx);
  let s = "";
  const P = [];
  months.forEach((m, i) => {
    const x = i * (bw + gap), v = vals[i], y = Y(v), on = m === sel;
    if (v > 0) s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (H - pb - y).toFixed(1) + '" rx="5" fill="' + (on ? "var(--blue)" : sel ? "var(--fill)" : "var(--chartFill)") + '"' + (on ? "" : ' stroke="var(--blue)" stroke-opacity=".25"') + '/>';
    else s += '<rect x="' + x.toFixed(1) + '" y="' + (H - pb - 3) + '" width="' + bw.toFixed(1) + '" height="3" rx="1.5" fill="var(--sep)"/>';
    s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 5) + '" font-size="10.5" text-anchor="middle" fill="' + (on ? "var(--link)" : "var(--muted)") + '" font-weight="' + (on ? 700 : 500) + '">' + MONS[+m.slice(5) - 1] + '</text>';
    P.push({ x: x + bw / 2, y: v > 0 ? y : H - pb - 3, label: mLabel(m, true), value: v > 0 ? money(v, UI.cur) : "нет данных", sub: v > 0 && avg > 0 ? (v >= avg ? "+" : "−") + Math.abs((v / avg - 1) * 100).toFixed(0) + "% к среднему" : "", dot: false, m });
  });
  if (avg > 0) { const y = Y(avg); s += '<line x1="0" x2="' + plotW + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--label)" stroke-width="1.2" stroke-dasharray="4 4"/>'; }
  s += chLabels(plan, months.map((m, i) => i * (bw + gap) + bw / 2), vals.map(v => Y(v)), W, months.indexOf(sel) >= 0 ? months.indexOf(sel) : null, pt - 6);
  return ichart(s, W, H, P, { aria: "Траты по месяцам. Наведите, чтобы увидеть сумму; нажмите, чтобы выбрать месяц.", pick, guideTop: pt - 8, guideBottom: H - pb }) + (avg > 0 ? '<div class="mut" style="font-size:12px;display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="width:18px;border-top:1.5px dashed var(--label)"></span>среднее ' + esc(money(avg, UI.cur)) + '</div>' : "");
}
/** Столбцы за произвольные периоды (недели месяца, дни недели).
    items: [{m, lab, lab2, v, future, tip, sub}]; o: {sel, pick, avg, avgLab, aria}. Будущие периоды — серая черта, не выбираются. */
function periodBars(items, o) {
  const W = 340, n = items.length, gap = n > 6 ? 6 : 8, pb = items.some(x => x.lab2) ? 32 : 20;
  const vals = items.map(x => x.future ? null : x.v), sel = o.sel;
  const plan = chPlan(vals.map(v => v > 0 ? v : null), W, w => (w - (n - 1) * gap) / n + gap);
  const bw = (W - (n - 1) * gap) / n, pt = 22, H = 128 + pt + pb - 20;
  const mx = Math.max(...vals.map(v => v || 0), o.avg || 0, 1) * 1.1, Y = v => pt + (H - pt - pb) * (1 - v / mx);
  const si = items.findIndex(x => x.m === sel);
  let s = ""; const P = [];
  items.forEach((it, i) => {
    const x = i * (bw + gap), v = it.v || 0, y = Y(v), on = i === si;
    if (!it.future && v > 0) s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (H - pb - y).toFixed(1) + '" rx="6" fill="' + (on ? "var(--blue)" : si >= 0 ? "var(--fill)" : "var(--chartFill)") + '"' + (on ? "" : ' stroke="var(--blue)" stroke-opacity=".25"') + '/>';
    else s += '<rect x="' + x.toFixed(1) + '" y="' + (H - pb - 3) + '" width="' + bw.toFixed(1) + '" height="3" rx="1.5" fill="' + (it.future ? "var(--fill2)" : "var(--sep)") + '"/>';
    const col = on ? "var(--link)" : "var(--muted)", fw = on ? 700 : 500;
    s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - pb + 15) + '" font-size="11" text-anchor="middle" fill="' + col + '" font-weight="' + fw + '">' + esc(it.lab) + '</text>';
    if (it.lab2) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - pb + 28) + '" font-size="10" text-anchor="middle" fill="' + col + '" font-weight="' + fw + '">' + esc(it.lab2) + '</text>';
    P.push({ x: x + bw / 2, y: it.future || !(v > 0) ? H - pb - 3 : y, label: it.tip, value: it.future ? "ещё не наступил" : money(v, UI.cur), sub: it.future ? "" : it.sub || "", dot: false, m: it.future ? null : it.m, hint: on ? "выбрано · нажмите ещё раз, чтобы снять" : "нажмите, чтобы выбрать" });
  });
  if (o.avg > 0) { const y = Y(o.avg); s += '<line x1="0" x2="' + W + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--label)" stroke-width="1.2" stroke-dasharray="4 4" pointer-events="none"/>'; }
  plan.t = plan.t.map((t, i) => items[i].future ? "" : t);
  s += chLabels(plan, items.map((x, i) => i * (bw + gap) + bw / 2), items.map(x => Y(x.v || 0)), W, si >= 0 ? si : null, pt - 6);
  return ichart(s, W, H, P, { aria: o.aria || "", pick: o.pick, guideTop: pt - 8, guideBottom: H - pb }) +
    (o.avg > 0 ? '<div class="mut" style="font-size:12px;display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="width:18px;border-top:1.5px dashed var(--label)"></span>' + esc(o.avgLab || "среднее") + ' ' + esc(money(o.avg, UI.cur)) + '</div>' : "");
}

/* ---------- interactive charts ---------- */
let CH = {}, chSeq = 0;
function ichart(inner, W, H, pts, o) {
  const id = "ch" + (++chSeq); CH[id] = { W, H, pts, pick: o.pick || null };
  return '<div class="ichart" data-ch="' + id + '" tabindex="0" role="img" aria-label="' + esc(o.aria || "") + '"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;overflow:visible" aria-hidden="true">' + inner +
    '<line class="ch-guide" x1="0" x2="0" y1="' + (o.guideTop || 0) + '" y2="' + (o.guideBottom || H) + '" stroke="var(--label)" stroke-opacity=".35" stroke-width="1"/><circle class="ch-dot" cx="0" cy="0" r="6" fill="var(--blue)" stroke="var(--card)" stroke-width="2.5"/></svg><div class="ch-tip glass" hidden></div></div>';
}
function chIndex(el, clientX) { const c = CH[el.dataset.ch]; const r = el.querySelector("svg").getBoundingClientRect(); const xv = (clientX - r.left) / r.width * c.W; let bi = 0, bd = 1e9; c.pts.forEach((p, i) => { const d = Math.abs(p.x - xv); if (d < bd) { bd = d; bi = i; } }); return bi; }
function chShow(el, i) {
  const c = CH[el.dataset.ch]; if (!c || !c.pts.length) return;
  i = Math.max(0, Math.min(c.pts.length - 1, i)); el._i = i; const p = c.pts[i];
  const svgEl = el.querySelector("svg"), r = svgEl.getBoundingClientRect(), sx = r.width / c.W, sy = r.height / c.H;
  const g = el.querySelector(".ch-guide"), d = el.querySelector(".ch-dot");
  g.setAttribute("x1", p.x); g.setAttribute("x2", p.x); g.style.opacity = 1;
  if (p.dot !== false) { d.setAttribute("cx", p.x); d.setAttribute("cy", p.y); d.style.opacity = 1; } else d.style.opacity = 0;
  const t = el.querySelector(".ch-tip");
  t.innerHTML = '<b>' + esc(p.label) + '</b><span class="n">' + esc(p.value) + '</span>' + (p.sub ? '<small class="n">' + esc(p.sub) + '</small>' : "") + (c.pick && p.m ? '<small>' + (p.hint || (UI.am === p.m || (UI.det && UI.dm === p.m) ? "выбран" : "нажмите, чтобы выбрать")) + '</small>' : "");
  t.hidden = false;
  const tw = t.offsetWidth, th = t.offsetHeight, ew = el.clientWidth;
  let left = p.x * sx - tw / 2; left = Math.max(-4, Math.min(ew - tw + 4, left));
  let top = p.y * sy - th - 12; if (top < -th / 2) top = p.y * sy + 14;
  t.style.left = left + "px"; t.style.top = top + "px";
  el.setAttribute("aria-label", p.label + ": " + p.value + (p.sub ? ", " + p.sub : ""));
}
function chHide(el) { el._i = null; const g = el.querySelector(".ch-guide"), d = el.querySelector(".ch-dot"), t = el.querySelector(".ch-tip"); if (g) g.style.opacity = 0; if (d) d.style.opacity = 0; if (t) t.hidden = true; }
document.addEventListener("pointermove", e => { const el = e.target.closest && e.target.closest(".ichart"); if (!el || !CH[el.dataset.ch]) return; const i = chIndex(el, e.clientX); if (el._i !== i) chShow(el, i); });
document.addEventListener("pointerout", e => { const el = e.target.closest && e.target.closest(".ichart"); if (el && e.pointerType === "mouse" && !(e.relatedTarget && el.contains(e.relatedTarget))) chHide(el); });
document.addEventListener("focusout", e => { if (e.target.classList && e.target.classList.contains("ichart")) chHide(e.target); });
document.addEventListener("keydown", e => {
  const el = document.activeElement; if (!el || !el.classList || !el.classList.contains("ichart")) return; const c = CH[el.dataset.ch]; if (!c) return;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const cur = el._i == null ? c.pts.length - 1 : el._i + (e.key === "ArrowLeft" ? -1 : 1); chShow(el, cur); }
  else if ((e.key === "Enter" || e.key === " ") && c.pick && el._i != null) { e.preventDefault(); chPick(c, el._i); }
});
function chClick(el, e) { const c = CH[el.dataset.ch]; if (!c) return; const i = chIndex(el, e.clientX); if (c.pick) chPick(c, i); else chShow(el, i); }
function chPick(c, i) { const p = c.pts[i]; if (!p || !p.m) return; if (PICK[c.pick]) PICK[c.pick](p); else if (c.pick === "apick") { UI.am = UI.am === p.m ? null : p.m; } else if (c.pick === "dpick") { UI.dm = p.m; if (UI.det && UI.det.kind === "cat") { UI.det.m = p.m; UI.dper = "m"; } } render(); const nel = document.querySelector('.ichart'); }
