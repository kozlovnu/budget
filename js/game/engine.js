/* Игра: индекс здоровья, челленджи, серии */
"use strict";
/* ============ Игра: движок ============ */
// Всё состояние игры — один документ meta/game (S.game). Из истории считается, не хранится.
const GAME_DEF = { v: 1, on: true, w: { rate: 30, cushion: 25, limits: 20, growth: 15, yield: 10 }, yieldTarget: 15, rateTarget: 20, chPct: 85 };
let GAME_C = { ops: null, sig: "", data: null };
/** Довести состояние игры до схемы (вызывается при загрузке данных, не при отрисовке). */
function normalizeGame(g) {
  if (g.v == null) g.v = GAME_DEF.v;
  if (g.on == null) g.on = GAME_DEF.on;
  if (!g.w || typeof g.w !== "object") g.w = {};
  for (const k in GAME_DEF.w) if (!(+g.w[k] >= 0)) g.w[k] = GAME_DEF.w[k];
  if (!(+g.yieldTarget > 0)) g.yieldTarget = GAME_DEF.yieldTarget;
  if (!(+g.rateTarget > 0)) g.rateTarget = GAME_DEF.rateTarget;
  if (![80, 85, 90].includes(+g.chPct)) g.chPct = GAME_DEF.chPct;
  for (const k of ["challenges", "medals", "seen", "aw"]) if (!g[k] || typeof g[k] !== "object") g[k] = {};
  return g;
}
function gameS() { if (!isObj(S.game)) S.game = normalizeGame({}); return S.game; }
// разовая трата: поездки и категории типа «Нерегулярные» — не штрафуют и не награждают
function gOne(c) { return TRIPCATS.includes(c) || catKind(c) === "irr"; }
function gEnd(m) { const e = m + "-31"; return e > TODAYS ? TODAYS : e; }
function gSig() {
  const st = S.settings || {}, fc = st.forecast || {};
  const ac = accs().map(a => [a.id, a.cur, a.type, a.inCap ? 1 : 0, a.archived ? 1 : 0, a.openDate || "", a.openBal || 0, a.till || ""].join("~")).join("|");
  let sn = "", rt = "";
  sn = JSON.stringify((S.snaps && S.snaps.items) || {});
  rt = JSON.stringify((S.rates && S.rates.m) || {});
  return JSON.stringify([st.budgets || {}, st.limitTotal || null, fc.kinds || {}, ((st.cats || {}).e || []).map(c => c.name), ac, sn, rt, curM()]);
}
function gCap(m, firstSnap) {
  const date = gEnd(m);
  if (!firstSnap || firstSnap > date) return null;
  let cap = 0, liq = 0, inv = 0, dep = 0, capPR = 0; const pm = addMonth(m, -1);
  for (const a of accs()) {
    if (!a.inCap || !accLiveAt(a, date)) continue; // архивный счёт — только пока был открыт
    const b = balanceAt(a.id, date), v = toRUB(b, a.cur, m); cap += v; capPR += toRUB(b, a.cur, pm);
    if (a.type === "broker" || a.type === "fund") inv += v; else liq += v;
    if (a.type === "deposit") dep += v;
  }
  return { cap, liq, inv, dep, capPR };
}
function gameBuild() {
  const cm = curM(), cur0 = UI.cur, firstSnap = snapKeys()[0] || null;
  const have = new Set(), intBy = {};
  for (const o of allOps()) { const mm = o.d.slice(0, 7); have.add(mm); if (o.t === "i" && o.c === "Проценты") intBy[mm] = (intBy[mm] || 0) + opRUB(o); }
  const first = [...have].filter(m => m <= cm).sort()[0];
  const rows = {};
  if (!first) return { rows, list: [], cm };
  // 1) помесячные итоги из advData (в рублях: на время расчета валюта интерфейса сбрасывается на RUB)
  for (let m = first; m <= cm; m = addMonth(m, 1)) {
    const r = rows[m] = { m, closed: m < cm, has: false, reg: 0, exp: 0, save: 0, rate: null, one: 0, trip: 0, oneExp: 0, expCore: 0, catCur: {}, catBase: {}, catFlag: {}, catTrend: {} };
    if (!have.has(m)) continue;
    let A; UI.cur = "RUB"; try { A = advData(m, "all"); } finally { UI.cur = cur0; }
    const k = A.k;
    r.has = k.exp > 0 || k.reg > 0;
    r.reg = k.reg; r.exp = k.exp; r.save = k.save; r.rate = k.rate; r.one = k.one; r.trip = k.trip;
    for (const c of A.cats) { r.catCur[c.c] = c.cur; r.catBase[c.c] = c.base; r.catFlag[c.c] = c.flag; r.catTrend[c.c] = c.trend; }
    let oneExp = 0; const over = [];
    for (const c of A.cats) { if (gOne(c.c)) oneExp += c.cur; else if (c.lim > 0) { if (c.cur > c.lim) over.push({ c: c.c, cur: c.cur, lim: c.lim }); } }
    r.oneExp = oneExp; r.expCore = k.exp - oneExp; r.saveCore = k.reg - r.expCore; r.rateCore = k.reg > 0 ? r.saveCore / k.reg : null;
    // то же правило, что в Аналитике (calc/limits.js); разовые траты не учитываются
    const lc = limitCheck(Object.fromEntries(A.cats.map(c => [c.c, c.cur])), m, gOne);
    r.limit = lc ? lc.limit : 0; r.limitSrc = lc ? lc.src : null;
    r.limitSpend = r.limitSrc === "total" ? r.expCore : lc ? lc.spend : 0;
    r.inLimit = r.limit > 0 ? r.limitSpend <= r.limit : null;
    r.over = over.length; r.overList = over;
  }
  // 2) капитал, подушка, доходность, рост капитала за 12 мес (без разовых доходов и трат)
  const caps = {}, capOf = m => (m in caps) ? caps[m] : (caps[m] = gCap(m, firstSnap));
  const win = (m, n) => { const o = []; for (let i = n - 1; i >= 0; i--) o.push(addMonth(m, -i)); return o; };
  for (const m of Object.keys(rows)) {
    const r = rows[m], c = capOf(m), cp = capOf(addMonth(m, -1)), c12 = capOf(addMonth(m, -12));
    r.capEnd = c ? c.cap : null; r.liquid = c ? c.liq : null; r.invest = c ? c.inv : null; r.dep = c ? c.dep : null;
    r.gNoFx = c && cp ? c.capPR - cp.cap - r.one + r.oneExp : null; // рост без курсовой переоценки и разовых доходов/трат
    r.dCap = c && cp ? c.cap - cp.cap : null; r.dCapPct = c && cp && cp.cap > 0 ? r.dCap / cp.cap : null;
    const w12 = win(m, 12).map(x => rows[x]).filter(x => x && x.exp > 0);
    const aE = w12.length ? w12.reduce((s, x) => s + x.exp, 0) / w12.length : 0;
    const aC = w12.length ? w12.reduce((s, x) => s + x.expCore, 0) / w12.length : 0;
    r.cushion = r.liquid != null && aC > 0 ? r.liquid / aC : null;
    r.cushionRaw = r.liquid != null && aE > 0 ? r.liquid / aE : null; r.avgCore = aC;
    const int3 = win(m, 3).reduce((s, x) => s + (intBy[x] || 0), 0);
    r.depYield = r.dep > 0 ? int3 / 3 * 12 / r.dep : null;
    if (c && c12 && c12.cap > 0) {
      const wr = win(m, 12).map(x => rows[x]).filter(Boolean);
      const one = wr.reduce((s, x) => s + x.one, 0), oe = wr.reduce((s, x) => s + x.oneExp, 0);
      r.growth = (c.cap - c12.cap - one + oe) / c12.cap; r.growthRaw = (c.cap - c12.cap) / c12.cap;
    } else { r.growth = null; r.growthRaw = null; }
  }
  return { rows, list: Object.keys(rows).map(m => rows[m]).filter(r => r.closed && r.has), cm };
}
// кеш: пересчитывается при изменении операций, настроек, счетов, снимков, курсов или месяца
function gameData() {
  const ops = allOps(), sig = gSig();
  if (!GAME_C.data || GAME_C.ops !== ops || GAME_C.sig !== sig) { GAME_C.data = gameBuild(); GAME_C.ops = ops; GAME_C.sig = sig; GAME_IDX = null; }
  return GAME_C.data;
}
function gameHistory() { return gameData().list; }
function gameMonth(m) { const r = gameData().rows[m]; return r && r.has ? r : null; }
function gameDump() {
  const p = v => v == null ? null : +(v * 100).toFixed(1), r0 = v => v == null ? null : Math.round(v);
  const t = gameHistory().map(r => ({ месяц: r.m, доход: r0(r.reg), расход: r0(r.exp), сбережения: r0(r.save), "норма, %": p(r.rate), "норма без разовых, %": p(r.rateCore), лимит: r0(r.limit), уложился: r.inLimit, превышений: r.over, капитал: r0(r.capEnd), "Δ капитала": r0(r.dCap), "подушка, мес": r.cushion == null ? null : +r.cushion.toFixed(1), "рост 12 мес, %": p(r.growth), "доходность вклада, %": p(r.depYield) }));
  try { console.table(t); } catch (e) { /* нет console.table */ }
  return t;
}
let GAME_IDX = null; // кеш индекса здоровья (сбрасывается вместе с gameData)

/* ---------- Игра: индекс финансового здоровья 0–100 ---------- */
const GAME_COMP = [["rate", "Норма сбережений"], ["cushion", "Подушка"], ["limits", "Соблюдение лимитов"], ["growth", "Рост капитала за 12 мес"], ["yield", "Доходность вклада"]];
const GAME_LV = [[90, "Независимый", "var(--indigo)"], [75, "Сильный", "var(--green)"], [60, "Устойчивый", "var(--teal)"], [40, "Стабильный", "var(--blue)"], [0, "Старт", "var(--orange)"]];
function gLevel(sc) { return GAME_LV.find(l => sc >= l[0]) || GAME_LV[GAME_LV.length - 1]; }
function gClamp(x) { return Math.max(0, Math.min(1, x)); }
function gPct(v, d) { return (v * 100).toFixed(d == null ? 0 : d).replace(".", ",").replace("-", "−") + "%"; }
function gNum(v, d) { return v.toFixed(d == null ? 1 : d).replace(".", ","); }
// индекс месяца: каждый компонент 0–100, затем сумма с весами; недоступный компонент исключается, остальные веса пересчитываются
function gameIndex(m) {
  const data = gameData(), g = gameS(), sig = JSON.stringify([g.w, g.yieldTarget, g.rateTarget]);
  if (!GAME_IDX || GAME_IDX.sig !== sig) GAME_IDX = { sig, map: {} };
  if (m in GAME_IDX.map) return GAME_IDX.map[m];
  const r = data.rows[m]; let res = null;
  if (r && r.has && r.closed) {
    const i = data.list.indexOf(r), win = data.list.slice(Math.max(0, i - 5), i + 1).filter(x => x.inLimit != null);
    const nIn = win.filter(x => x.inLimit).length;
    const raw = { rate: r.rateCore, cushion: r.cushion, limits: win.length ? nIn / win.length : null, growth: r.growth, yield: r.depYield };
    const sc = {
      rate: raw.rate == null ? null : gClamp(raw.rate / 0.30) * 100,
      cushion: raw.cushion == null ? null : gClamp(raw.cushion / 6) * 100,
      limits: raw.limits == null ? null : raw.limits * 100,
      growth: raw.growth == null ? null : gClamp(raw.growth / 0.25) * 100,
      yield: raw.yield == null ? null : gClamp(raw.yield / (g.yieldTarget / 100)) * 100
    };
    const comps = GAME_COMP.map(x => ({ k: x[0], n: x[1], raw: raw[x[0]], score: sc[x[0]], w: +g.w[x[0]] || 0 }));
    const wt = comps.reduce((a, c) => a + (c.score != null ? c.w : 0), 0);
    let idx = null;
    for (const c of comps) { c.wEff = wt > 0 && c.score != null ? c.w / wt * 100 : 0; c.pts = c.score != null ? c.score * c.wEff / 100 : 0; c.gain = c.score != null ? (100 - c.score) * c.wEff / 100 : 0; }
    if (wt > 0) idx = comps.reduce((a, c) => a + c.pts, 0);
    if (idx != null) { const score = Math.round(idx); res = { m, idx, score, lv: gLevel(score), comps, r, nIn, nTot: win.length }; }
  }
  GAME_IDX.map[m] = res; return res;
}
function gameValTxt(c, X) {
  if (c.raw == null) return "нет данных";
  switch (c.k) {
    case "rate": return gPct(c.raw);
    case "cushion": return gNum(c.raw) + " мес";
    case "limits": return X.nIn + " из " + X.nTot + " мес";
    case "growth": return (c.raw > 0 ? "+" : "") + gPct(c.raw, 1);
    default: return gPct(c.raw, 1) + " год.";
  }
}
function gameHint(c, X) {
  const r = X.r, g = gameS(), M = v => D(v, r.m);
  if (c.score == null) return c.k === "growth" ? "Для расчета нужен снимок капитала на 12 месяцев раньше. Компонент не учитывается, остальные веса пересчитаны." : c.k === "yield" ? "Вкладов в капитале нет — компонент не учитывается, остальные веса пересчитаны." : c.k === "limits" ? "Лимиты не заданы — компонент не учитывается. Задайте их в разделе «Категории и лимиты»." : c.k === "cushion" ? "Нет данных по ликвидным деньгам или тратам." : "В месяце нет регулярных доходов.";
  if (c.score >= 99.5) return "Максимум баллов — подтягивать нечего.";
  if (c.k === "rate") {
    const need = Math.max(0, 0.30 * r.reg - r.saveCore), goal = g.rateTarget / 100, gneed = Math.max(0, goal * r.reg - r.saveCore);
    return "Для 100 баллов нужна норма 30%: откладывайте еще " + M(need) + " в месяц. " + (gneed > 0 ? "До вашей цели " + g.rateTarget + "% не хватает " + M(gneed) + "." : "Ваша цель " + g.rateTarget + "% выполнена.");
  }
  if (c.k === "cushion") { const need = Math.max(0, 6 * (r.avgCore || 0) - (r.liquid || 0)); return "Для 100 баллов нужно 6 месяцев обычных трат (" + M(6 * (r.avgCore || 0)) + "): не хватает " + M(need) + " ликвидных денег."; }
  if (c.k === "limits") return "В лимит уложились " + X.nIn + " из " + X.nTot + " последних месяцев." + (r.overList.length ? " В этом месяце превышены: " + r.overList.slice(0, 3).map(o => o.c).join(", ") + "." : "");
  if (c.k === "growth") return "Капитал за 12 месяцев вырос на " + gPct(c.raw, 1) + " без разовых поступлений и трат. Для 100 баллов нужно +25%.";
  return "Ориентир — " + g.yieldTarget + "% годовых; его можно изменить в настройках игры.";
}
function gSpark(vals) {
  const n = vals.length; if (n < 2) return "";
  const W = 132, H = 36, pts = vals.map((v, i) => [2 + (W - 4) * i / (n - 1), H - 4 - (H - 8) * Math.max(0, Math.min(100, v)) / 100]);
  const last = pts[n - 1];
  return '<svg class="gsp" role="img" aria-label="Индекс за последние ' + n + ' мес" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '"><line x1="2" x2="' + (W - 2) + '" y1="' + (H / 2) + '" y2="' + (H / 2) + '" stroke="var(--sep)" stroke-dasharray="2 4"/><polyline points="' + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") + '" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3.4" fill="var(--blue)"/></svg>';
}
function gameCard(mSel) {
  const g = gameS(); if (!g.on) return "";
  const data = gameData(), hist = data.list, partial = mSel >= curM();
  let ref = null; for (let i = hist.length - 1; i >= 0; i--) if (hist[i].m <= mSel) { ref = hist[i]; break; }
  const X = ref ? gameIndex(ref.m) : null;
  const head = '<div class="sechead"><h2>Индекс здоровья</h2>' + (partial ? '<span class="mut" style="font-size:13px">' + esc(mLabel(curM(), true)) + " — в процессе</span>" : "") + "</div>";
  if (!X) return '<section class="sec">' + head + '<div class="card mut" style="font-size:15px">Индекс появится, когда закроется первый месяц с доходами и расходами. Текущий месяц оценивается после его окончания.</div></section>';
  const i = hist.indexOf(ref), prev = i > 0 ? gameIndex(hist[i - 1].m) : null, dl = prev ? X.score - prev.score : null;
  const ser = hist.slice(Math.max(0, i - 11), i + 1).map(r => gameIndex(r.m)).filter(x => x && x.idx != null).map(x => x.idx);
  const circ = 2 * Math.PI * 42, off = circ * (1 - X.score / 100), open = !!UI.gameOpen;
  const dtxt = dl == null ? "" : dl > 0 ? '<span class="pos" style="font-weight:600">▲ +' + dl + "</span>" : dl < 0 ? '<span class="neg" style="font-weight:600">▼ −' + Math.abs(dl) + "</span>" : '<span class="mut" style="font-weight:600">без изменений</span>';
  const cap = esc(mLabel(ref.m, true)) + (ref.m !== mSel && !partial ? " · последний месяц с данными" : "");
  let h = '<section class="sec">' + head + '<div class="gcard"><button class="ghead" data-act="gamecard" aria-expanded="' + open + '" aria-label="Разбор индекса по компонентам">' +
    '<span class="gring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="gt" cx="50" cy="50" r="42"/><circle class="gp" cx="50" cy="50" r="42" stroke="' + X.lv[2] + '" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/></svg><span class="gnum n">' + X.score + "<small>из 100</small></span></span>" +
    '<span class="gmeta"><span class="glv">' + X.lv[1] + '</span><span class="gsub">' + cap + "</span>" + (dl != null ? '<span class="gsub n">' + dtxt + " против " + MONG[+prev.m.slice(5) - 1] + "</span>" : "") + gSpark(ser) + "</span></button>";
  if (partial) h += '<p class="foot" style="padding:0">Месяц еще идет, поэтому оценка показана за ' + esc(mLabel(ref.m)) + ". Новая появится после его закрытия.</p>";
  h += '<div class="gtoggle"><span class="mut" style="font-weight:500">' + (open ? "Скрыть разбор" : "Из чего складывается индекс") + '</span><button data-act="gamecard" aria-label="' + (open ? "Скрыть разбор" : "Показать разбор") + '" style="color:var(--link);font-size:15px;font-weight:600">' + (open ? "Свернуть ˄" : "Разбор ˅") + "</button></div>";
  if (open) {
    const best = X.comps.filter(c => c.gain > 0.05).sort((a, b) => b.gain - a.gain)[0];
    h += X.comps.map(c => {
      const col = c.score == null ? "var(--gray)" : c.score >= 75 ? "var(--green)" : c.score >= 40 ? "var(--blue)" : "var(--orange)";
      return '<div class="gcomp"><div class="gl"><b>' + esc(c.n) + '</b><span class="n" style="font-weight:600">' + esc(gameValTxt(c, X)) + '</span></div>' +
        '<div class="bar" role="img" aria-label="' + (c.score == null ? "нет данных" : Math.round(c.score) + " баллов из 100") + '"><i style="width:' + (c.score == null ? 0 : c.score.toFixed(1)) + "%;background:" + col + '"></i></div>' +
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><small class="n">' + (c.score == null ? "не учитывается" : Math.round(c.score) + " из 100 баллов · вес " + Math.round(c.wEff) + "% · вклад " + gNum(c.pts) + " из " + gNum(c.wEff)) + "</small>" + (best && best.k === c.k ? '<span class="pill">Главный резерв: до +' + gNum(c.gain) + "</span>" : "") + "</div>" +
        "<small>" + esc(gameHint(c, X)) + "</small></div>";
    }).join("");
    h += '<p class="foot" style="padding:0">В индекс не входят разовые траты (поездки и категории «Нерегулярные»), премии, продажа имущества и переводы между портфелями. Веса и ориентиры — в разделе «Игра» настроек.</p>';
  }
  return h + "</div></section>";
}

/* ---------- Игра: челленджи месяца ---------- */
function gRoundT(v) { const st = v < 20000 ? 100 : 1000; return Math.max(st, Math.round(v / st) * st); }
function gChalOf(m) { const c = gameS().challenges; return Object.keys(c).map(k => c[k]).filter(x => x && x.month === m).sort((a, b) => a.cat < b.cat ? -1 : 1); }
function gDim(m) { return new Date(+m.slice(0, 4), +m.slice(5), 0).getDate(); }
// состояние челленджа считается из истории: хранится только принятый челлендж
function gChalState(ch, data) {
  const r = data.rows[ch.month], spent = r && r.catCur ? (r.catCur[ch.cat] || 0) : 0, closed = ch.month < curM();
  const dim = gDim(ch.month), dayNow = closed ? dim : Math.min(dim, +TODAYS.slice(8)), el = dayNow / dim;
  const st = closed ? (spent <= ch.target ? "done" : "fail") : spent > ch.target ? "fail" : (ch.target > 0 && spent / ch.target - el > 0.10 ? "warn" : "ok");
  return { spent, left: ch.target - spent, closed, daysLeft: dim - dayNow, st, ok: spent <= ch.target, saved: Math.max(0, (ch.base || 0) - spent), pct: ch.target > 0 ? spent / ch.target : 0 };
}
function gChalSuggest() {
  const g = gameS(), data = gameData(), cm = curM(), pm = addMonth(cm, -1), pr = data.rows[pm], cr = data.rows[cm];
  if (!pr || !pr.has) return [];
  const taken = new Set(gChalOf(cm).map(x => x.cat)), out = [];
  for (const c in pr.catCur) {
    if (catKind(c) !== "var" || gOne(c) || taken.has(c)) continue;
    const fl = pr.catFlag[c], tr = pr.catTrend[c];
    if (fl !== "spike" && tr !== "up") continue;
    const base = cr && cr.catBase[c] > 0 ? cr.catBase[c] : pr.catBase[c];
    if (!(base > 0)) continue;
    out.push({ cat: c, base, target: gRoundT(base * g.chPct / 100), flag: fl, trend: tr, prev: pr.catCur[c], over: pr.catCur[c] / base - 1 });
  }
  out.sort((a, b) => (b.flag === "spike") - (a.flag === "spike") || b.over - a.over);
  return out.slice(0, 3);
}
function gChalAdd(cat, target, manual, pct) {
  const g = gameS(), cm = curM(), data = gameData(), cr = data.rows[cm], pr = data.rows[addMonth(cm, -1)];
  const base = cr && cr.catBase[cat] > 0 ? cr.catBase[cat] : pr && pr.catBase[cat] > 0 ? pr.catBase[cat] : 0;
  for (const k of Object.keys(g.challenges)) { const x = g.challenges[k]; if (x && x.month === cm && x.cat === cat) delete g.challenges[k]; }
  const id = uid("c"); g.challenges[id] = { id, month: cm, cat, target: Math.round(target), base: Math.round(base), pct: pct || null, manual: !!manual, accepted: TODAYS };
  gameSave(); toast("Челлендж принят: " + cat + " — не больше " + D(target, cm));
}
function gameChalCard(mSel) {
  const g = gameS(); if (!g.on) return "";
  const data = gameData(), cm = curM(), M = v => D(v, cm), act = gChalOf(cm), sug = gChalSuggest();
  const rm = mSel < cm ? mSel : addMonth(cm, -1), past = gChalOf(rm);
  const col = st => st === "ok" || st === "done" ? ["var(--green)", "var(--greenT)"] : st === "warn" ? ["var(--orange)", "var(--orangeT)"] : ["var(--red)", "var(--redT)"];
  const dl = gDim(cm) - +TODAYS.slice(8);
  let h = '<section class="sec"><div class="sechead"><h2>Челленджи</h2><span class="mut" style="font-size:13px">' + esc(mLabel(cm, true)) + " · " + (dl > 0 ? "осталось " + dl + " " + pl(dl, "день", "дня", "дней") : "последний день") + "</span></div>" +
    '<div style="display:flex;align-items:center;gap:10px"><span class="mut" style="font-size:13px;flex:none">Цель — траты не выше</span><div class="seg glass" role="group" aria-label="Порог челленджа: процент от обычных трат" style="flex:1">' + [80, 85, 90].map(v => '<button data-act="chpct" data-v="' + v + '" aria-pressed="' + (g.chPct === v) + '">' + v + "%</button>").join("") + "</div></div>";
  h += act.map(ch => {
    const s2 = gChalState(ch, data), c = col(s2.st);
    return '<div class="card" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;gap:10px">' + catTile(ch.cat) + '<div style="flex:1;min-width:0"><b style="font-weight:600">' + esc(ch.cat) + ": не больше " + M(ch.target) + '</b><br><small class="mut" style="font-size:13px">' + (ch.base > 0 ? "обычно " + M(ch.base) : "обычный уровень неизвестен") + (ch.manual ? " · свой" : ch.pct ? " · " + ch.pct + "%" : "") + '</small></div><button class="chipb" data-act="chdel" data-id="' + esc(ch.id) + '" aria-label="Отменить челлендж: ' + esc(ch.cat) + '">Отменить</button></div>' +
      '<div class="bar" role="img" aria-label="Потрачено ' + Math.round(s2.pct * 100) + '% от цели"><i style="width:' + Math.min(100, s2.pct * 100).toFixed(1) + "%;background:" + c[0] + '"></i></div>' +
      '<div class="n" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:15px"><span>Потрачено ' + M(s2.spent) + " из " + M(ch.target) + '</span><span style="font-weight:600;color:' + c[1] + '">' + (s2.st === "fail" ? "провалено: перерасход " + M(-s2.left) : "осталось " + M(s2.left) + " · " + (s2.daysLeft > 0 ? s2.daysLeft + " " + pl(s2.daysLeft, "день", "дня", "дней") : "последний день")) + "</span></div></div>";
  }).join("");
  if (sug.length) h += '<div class="group">' + sug.map(x => '<div class="row">' + catTile(x.cat) + '<span class="body"><span class="t"><b style="white-space:normal">' + esc(x.cat) + ": не больше " + g.chPct + "% от обычного уровня (лимит " + M(x.target) + ')</b><small style="white-space:normal">обычно ' + M(x.base) + " · в " + MONP[+addMonth(cm, -1).slice(5) - 1] + " " + M(x.prev) + (x.flag === "spike" ? " — всплеск" : " — растет") + '</small></span><button class="chipb" data-act="chacc" data-c="' + esc(x.cat) + '">Принять</button></span></div>').join("") + "</div>";
  else if (!act.length) h += '<div class="card mut" style="font-size:15px">Предложений нет: в прошлом месяце не было всплесков и роста по переменным категориям. Можно добавить свой челлендж.</div>';
  if (UI.chForm) {
    const cats = ((S.settings.cats || {}).e || []).map(c => c.name);
    h += '<div class="group"><div class="field"><label for="ch-cat">Категория</label><select id="ch-cat">' + cats.map(c => "<option>" + esc(c) + "</option>").join("") + '</select></div><div class="field"><label for="ch-amt">Не больше, ' + esc(SYM[UI.cur]) + '</label><input id="ch-amt" class="n" inputmode="decimal" autocomplete="off" placeholder="0"></div></div><div style="display:flex;gap:8px"><button class="btn alt" style="flex:1" data-act="chnew">Отмена</button><button class="btn pri" style="flex:1" data-act="chadd">Добавить</button></div>';
  } else h += '<button class="btn alt" data-act="chnew" style="height:44px;font-size:15px">Свой челлендж</button>';
  if (past.length) h += '<div class="caps" style="margin-top:6px"><span>Итоги: ' + esc(mLabel(rm, true)) + "</span></div>" + '<div class="group">' + past.map(ch => {
    const s2 = gChalState(ch, data);
    return '<div class="row">' + catTile(ch.cat) + '<span class="body"><span class="t"><b style="white-space:normal">' + esc(ch.cat) + ": " + (s2.ok ? "выполнено" : "не выполнено") + '</b><small class="n" style="white-space:normal">потрачено ' + D(s2.spent, rm) + " из " + D(ch.target, rm) + (s2.saved > 0 ? " · спасено " + D(s2.saved, rm) : "") + '</small></span><span class="v n ' + (s2.ok ? "pos" : "neg") + '">' + (s2.ok ? "✓" : "✗") + "</span></span></div>";
  }).join("") + "</div>";
  return h + "</section>";
}

/* ---------- Игра: серии ---------- */
const GAME_SER = [
  { k: "saver", n: "Копилка", ok: (r, g) => r.rateCore != null && r.rateCore >= g.rateTarget / 100, sub: g => "норма сбережений не ниже " + g.rateTarget + "%" },
  { k: "disc", n: "Дисциплина", ok: r => r.inLimit === true, sub: () => "траты в общем лимите" },
  { k: "grow", n: "Рост", ok: r => r.gNoFx != null && r.gNoFx > 0, sub: () => "капитал растет без курсовой переоценки и разовых поступлений" }
];
// серия идет по закрытым месяцам с данными подряд; пропущенный месяц или невыполнение условия обрывают ее
function gameStreaks() {
  const g = gameS(), list = gameData().list, pm = addMonth(curM(), -1), out = {};
  for (const d of GAME_SER) {
    let cur = 0, best = 0, bestEnd = null, prev = null;
    for (const r of list) {
      const ok = d.ok(r, g), cont = prev && addMonth(prev.m, 1) === r.m;
      if (ok) { cur = (cont ? cur : 0) + 1; if (cur >= best) { best = cur; bestEnd = r.m; } } else cur = 0;
      prev = r;
    }
    if (!prev || prev.m !== pm) cur = 0;
    out[d.k] = { k: d.k, n: d.n, cur, best, bestEnd };
  }
  return out;
}
// серия под угрозой: темп текущего месяца хуже, чем нужно, чтобы продлить ее
function gameThreats() {
  const g = gameS(), data = gameData(), cm = curM(), r = data.rows[cm], st = gameStreaks(), out = [];
  if (!r || !r.has) return out;
  const dim = gDim(cm), el = Math.min(dim, +TODAYS.slice(8)) / dim, M = v => D(v, cm);
  if (st.disc.cur > 0 && r.limit > 0) {
    const used = r.limitSpend / r.limit;
    if (used > 1) out.push({ k: "disc", t: "Дисциплина: лимит уже превышен (" + M(r.limitSpend) + " из " + M(r.limit) + "), серия в " + st.disc.cur + " " + pl(st.disc.cur, "месяц", "месяца", "месяцев") + " прервется." });
    else if (used - el > 0.10) out.push({ k: "disc", t: "Дисциплина под угрозой: потрачено " + Math.round(used * 100) + "% лимита, а месяца прошло " + Math.round(el * 100) + "%. Осталось " + M(r.limit - r.limitSpend) + "." });
  }
  if (st.saver.cur > 0) {
    const l3 = data.list.slice(-3), ref = Math.max(r.reg, l3.length ? l3.reduce((a, x) => a + x.reg, 0) / l3.length : 0), goal = g.rateTarget / 100, allowed = (1 - goal) * ref;
    if (ref > 0 && r.expCore > allowed) out.push({ k: "saver", t: "Копилка: обычные траты уже " + M(r.expCore) + " при допустимых " + M(allowed) + " для нормы " + g.rateTarget + "%. Серия в " + st.saver.cur + " " + pl(st.saver.cur, "месяц", "месяца", "месяцев") + " прервется." });
    else if (ref > 0 && r.expCore / el > allowed) out.push({ k: "saver", t: "Копилка под угрозой: при текущем темпе траты за месяц составят " + M(r.expCore / el) + " при допустимых " + M(allowed) + " (норма " + g.rateTarget + "%)." });
  }
  if (st.grow.cur > 0 && r.gNoFx != null && r.gNoFx < 0 && el >= 0.5) out.push({ k: "grow", t: "Рост под угрозой: с начала месяца капитал без курсовой переоценки и разовых поступлений уменьшился на " + M(-r.gNoFx) + "." });
  return out;
}
function gFlame(on, sz) {
  sz = sz || 18;
  return '<svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" aria-hidden="true"><path d="M12 2.5c.6 3.2-1.4 4.8-3 6.9C7.6 11.3 6.5 13 6.5 15.2a5.5 5.5 0 0 0 11 0c0-2.3-1-3.9-2.1-5.2-.3 1.3-1 2.2-2 2.6.7-3.2-.2-7.4-1.4-10.1z" fill="' + (on ? "var(--orange)" : "var(--gray)") + '"/><path d="M12 21a2.9 2.9 0 0 1-2.9-2.9c0-1.5.9-2.3 1.7-3.3.5.9 1.1 1.3 1.6 1.4.9-.9 1.2-1.9 1.2-2.9a4 4 0 0 1 1.3 3.5A2.9 2.9 0 0 1 12 21z" fill="' + (on ? "var(--red)" : "var(--fill)") + '" opacity=".85"/></svg>';
}
function gameStreakCard() {
  const g = gameS(); if (!g.on) return "";
  const data = gameData(); if (!data.list.length) return "";
  const st = gameStreaks(), th = gameThreats(), mw = x => x + " " + pl(x, "мес", "мес", "мес");
  let h = '<section class="sec"><div class="sechead"><h2>Серии</h2><span class="mut" style="font-size:13px">закрытые месяцы подряд</span></div>';
  h += th.map(x => '<div class="warn">' + esc(x.t) + "</div>").join("");
  h += '<div class="group">' + GAME_SER.map(d => {
    const s2 = st[d.k], on = s2.cur > 0;
    return '<div class="row"><span class="tile" style="background:' + (on ? "var(--orange)" : "var(--gray)") + '">' + gFlame(on, 20).replace(/fill="var\(--orange\)"/, 'fill="#fff"').replace(/fill="var\(--gray\)"/, 'fill="#fff"').replace(/fill="var\(--red\)"/, 'fill="rgba(255,255,255,.55)"').replace(/fill="var\(--fill\)"/, 'fill="rgba(255,255,255,.55)"') + '</span><span class="body"><span class="t"><b>' + d.n + '</b><small style="white-space:normal">' + esc(d.sub(g)) + " · рекорд " + mw(s2.best) + (s2.best > s2.cur && s2.bestEnd ? " (до " + MONG[+s2.bestEnd.slice(5) - 1] + " " + s2.bestEnd.slice(0, 4) + ")" : "") + '</small></span><span class="v n" style="display:flex;align-items:center;gap:4px">' + gFlame(on, 20) + s2.cur + "</span></span></div>";
  }).join("") + "</div></section>";
  return h;
}
/** Одна строка-ссылка на «Игру» для экрана «Итоги» (сама игра — на своём экране). */
function gameMiniRow(mSel) {
  const g = gameS(); if (!g.on) return "";
  const hist = gameData().list; let ref = null; for (let i = hist.length - 1; i >= 0; i--) if (hist[i].m <= mSel) { ref = hist[i]; break; }
  const X = ref ? gameIndex(ref.m) : null;
  return '<section class="sec"><div class="group"><button class="row" data-act="go" data-v="awards"><span class="tile n" style="background:' + (X ? X.lv[2] : "var(--gray)") + ';font-size:13px;font-weight:700">' + (X ? X.score : svg("trophy", 18)) + '</span><span class="body"><span class="t"><b>Игра</b><small>' + (X ? "индекс здоровья " + X.score + " · " + esc(X.lv[1]) + " · " + esc(mLabel(ref.m)) : "индекс, челленджи и награды") + '</small></span><span class="chev" aria-hidden="true">›</span></span></button></div></section>';
}
function gameSave() { render(true); return saveMeta("game").catch(() => {}); }
function vGame() {
  const g = gameS(), data = gameData(), hist = data.list;
  let html = navHead("Настройки игры", "", backBtn("prefs", "Настройки"), "", "Индекс финансового здоровья считается по закрытым месяцам. Сама игра — в разделе «Игра».");
  let L = '<section class="sec"><div class="group"><div class="field"><span style="flex:1;font-size:17px">Геймификация</span><button class="sw" role="switch" aria-checked="' + !!g.on + '" aria-label="Геймификация" data-act="gametog"></button></div></div>' +
    '<p class="foot">Выключатель скрывает индекс и все остальное, что связано с игрой. Сохраненные данные не удаляются.</p></section>';
  if (!g.on) return html + cols(L, "");
  const tot = GAME_COMP.reduce((a, x) => a + (+g.w[x[0]] || 0), 0);
  const stp = (act, k, d, val, lab, dis0, dis1) => '<span class="gstep"><button data-act="' + act + '" data-k="' + k + '" data-d="-' + d + '" aria-label="Уменьшить: ' + esc(lab) + '"' + (dis0 ? " disabled" : "") + '>−</button><b class="n">' + val + '</b><button data-act="' + act + '" data-k="' + k + '" data-d="' + d + '" aria-label="Увеличить: ' + esc(lab) + '"' + (dis1 ? " disabled" : "") + ">+</button></span>";
  // веса и ориентиры индекса — для тонкой настройки, по умолчанию свёрнуты
  L += '<section class="sec"><div class="group"><button class="row" data-act="gtune" aria-expanded="' + !!UI.gTune + '"><span class="body"><span class="t"><b>Тонкая настройка индекса</b><small>веса компонентов и ориентиры</small></span><span class="chev" aria-hidden="true">' + (UI.gTune ? "⌃" : "⌄") + '</span></span></button></div></section>';
  if (UI.gTune) {
  L += '<section class="sec"><div class="caps"><span>Веса компонентов</span><span class="n" style="color:' + (tot === 100 ? "var(--greenT)" : "var(--orangeT)") + '">Сумма ' + tot + "%</span></div><div class=\"group\">" +
    GAME_COMP.map(x => '<div class="field"><span style="flex:1;min-width:0;font-size:17px">' + esc(x[1]) + "</span>" + stp("gw", x[0], 5, (+g.w[x[0]] || 0) + "%", x[1], (+g.w[x[0]] || 0) <= 0, (+g.w[x[0]] || 0) >= 100) + "</div>").join("") + "</div>" +
    '<p class="foot">' + (tot === 100 ? "Сумма весов 100%." : "Сумма должна быть 100%. Пока индекс делит каждый вес на сумму, поэтому считается корректно.") + '</p><button class="btn alt" data-act="greset" style="height:44px;font-size:15px">Вернуть значения по умолчанию</button></section>';
  L += '<section class="sec"><div class="caps"><span>Ориентиры</span></div><div class="group">' +
    '<div class="field"><span style="flex:1;min-width:0;font-size:17px">Доходность вклада</span>' + stp("gtg", "yieldTarget", 1, g.yieldTarget + "%", "ориентир доходности вклада", g.yieldTarget <= 1, g.yieldTarget >= 40) + "</div>" +
    '<div class="field"><span style="flex:1;min-width:0;font-size:17px">Цель нормы сбережений</span>' + stp("gtg", "rateTarget", 1, g.rateTarget + "%", "цель нормы сбережений", g.rateTarget <= 5, g.rateTarget >= 60) + "</div>" +
    '<div class="field"><span style="flex:1;min-width:0;font-size:17px">Порог челленджа</span><span class="gstep">' + [80, 85, 90].map(v => '<button data-act="chpct" data-v="' + v + '" aria-pressed="' + (g.chPct === v) + '" style="width:auto;padding:0 10px;font-size:15px' + (g.chPct === v ? ';background:var(--blue);color:#fff' : "") + '">' + v + "%</button>").join("") + "</span></div></div>" +
    '<p class="foot">Ориентир доходности — годовых, на нем компонент доходности дает 100 баллов. Цель нормы сбережений используется в подсказках. Сама норма дает 100 баллов при 30%.</p></section>';
  }
  let R = '<section class="sec"><div class="caps"><span>История индекса</span><span>' + hist.length + " " + pl(hist.length, "месяц", "месяца", "месяцев") + "</span></div>";
  if (!hist.length) R += '<div class="card mut" style="font-size:15px">Закрытых месяцев с данными пока нет.</div>';
  else {
    const cm = data.rows[curM()];
    R += '<div class="group">' + (cm && cm.has ? '<div class="row"><span class="tile" style="background:var(--gray)">…</span><span class="body"><span class="t"><b>' + esc(mLabel(curM(), true)) + '</b><small>в процессе · оценка после закрытия</small></span><span class="v mut">—</span></span></div>' : "") +
      hist.slice().reverse().slice(0, 36).map(r => {
        const X = gameIndex(r.m);
        return '<div class="row"><span class="tile n" style="background:' + (X ? X.lv[2] : "var(--gray)") + ';font-size:13px;font-weight:700">' + (X ? X.score : "–") + '</span><span class="body"><span class="t"><b>' + esc(mLabel(r.m, true)) + '</b><small class="n">' + (X ? esc(X.lv[1]) + " · " : "") + "норма " + (r.rateCore != null ? gPct(r.rateCore) : "—") + (r.cushion != null ? " · подушка " + gNum(r.cushion) + " мес" : "") + '</small></span><span class="v n">' + (X ? X.score : "—") + "</span></span></div>";
      }).join("") + "</div>";
  }
  R += '<p class="foot">Норма и подушка здесь без разовых трат.</p></section>';
  return html + cols(L, R);
}

/* ---------- действия модуля ---------- */
App.actions({
  gtune: () => { UI.gTune = !UI.gTune; render(); },
  gamecard: () => { UI.gameOpen = !UI.gameOpen; render(true); },
  chpct: t => { const g = gameS(); g.chPct = +t.dataset.v; gameSave(); },
  chacc: t => { const x = gChalSuggest().find(y => y.cat === t.dataset.c); if (x) gChalAdd(x.cat, x.target, false, gameS().chPct); },
  chdel: t => { const g = gameS(), id = t.dataset.id, ch = g.challenges[id]; if (!ch || ch.month !== curM()) return; delete g.challenges[id]; gameSave(); toast("Челлендж отменен"); },
  chnew: () => { UI.chForm = !UI.chForm; render(true); },
  chadd: () => { const sel = document.getElementById("ch-cat"), inp = document.getElementById("ch-amt"); if (!sel || !inp) return; const v = calcNum(inp.value); if (!(v > 0)) return toast("Введите сумму больше нуля"); UI.chForm = false; gChalAdd(sel.value, toRUB(v, UI.cur, curM()), true, null); },
  gametog: () => { const g = gameS(); g.on = !g.on; gameSave(); },
  gw: t => { const g = gameS(), k = t.dataset.k; g.w[k] = Math.max(0, Math.min(100, (+g.w[k] || 0) + (+t.dataset.d))); gameSave(); },
  gtg: t => { const g = gameS(), k = t.dataset.k, lim = k === "yieldTarget" ? [1, 40] : [5, 60]; g[k] = Math.max(lim[0], Math.min(lim[1], (+g[k] || 0) + (+t.dataset.d))); gameSave(); },
  greset: () => { const g = gameS(); g.w = Object.assign({}, GAME_DEF.w); g.yieldTarget = GAME_DEF.yieldTarget; g.rateTarget = GAME_DEF.rateTarget; gameSave(); }
});

/* ---------- экраны модуля ---------- */
App.view("game", vGame, { section: "prefs", group: "settings" });

/* ---------- виджет Главной: индекс здоровья (живёт в модуле игры и пропадает вместе с ней) ---------- */
App.widget("index", {
  name: "Индекс здоровья", icon: "trophy", color: "#FF9500", desc: "оценка финансов за прошлый месяц", sizes: ["S"], size: "S",
  avail: () => gameOn(),
  render() {
    const m = advDefaultM(), X = gameIndex(m); if (!X) return null;
    return { go: "awards", inner: wLab("Индекс здоровья") + '<span class="wrow" style="justify-content:flex-start;gap:10px">' + wRing(X.score / 100, X.lv[2], X.score) + '<span style="font-size:14px;font-weight:600;color:' + X.lv[2] + '">' + esc(X.lv[1]) + '</span></span><span class="mut" style="font-size:12.5px">' + esc(mLabel(m)) + '</span>' };
  }
});
