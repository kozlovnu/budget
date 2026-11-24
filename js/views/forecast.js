/* Вкладка «Прогноз» */
"use strict";
function fcChart2(labels, band, old, act, tipSub) {
  const W = 340, pl = 6, pb = 22, n = labels.length;
  const main = act ? act.map(a => a == null ? null : a) : band.map(b => b.p50);
  const plan = chPlan(main, W - pl - 6, w => w / Math.max(1, n - 1)); const pr = 6 + plan.ext;
  const pt = plan.ang ? plan.top + 8 : 24, H = 170 + pt;
  const vals = [].concat(...band.map(b => [b.p10, b.p90]), old || [], (act || []).filter(v => v != null));
  let hi = Math.max(...vals), lo = Math.min(...vals); const pad = (hi - lo) * .08 || Math.abs(hi) * .05 || 1; hi += pad; lo -= pad;
  const X = i => pl + (W - pl - pr) * i / Math.max(1, n - 1), Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  let s = '<polygon points="' + band.map((b, i) => X(i).toFixed(1) + "," + Y(b.p90).toFixed(1)).join(" ") + " " + band.map((b, i) => X(i).toFixed(1) + "," + Y(b.p10).toFixed(1)).reverse().join(" ") + '" fill="var(--blue)" fill-opacity=".14"/>';
  if (old) s += '<polyline points="' + old.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ") + '" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4"/>';
  s += '<polyline points="' + band.map((b, i) => X(i).toFixed(1) + "," + Y(b.p50).toFixed(1)).join(" ") + '" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linejoin="round"/>';
  if (act) { const pts = act.map((v, i) => v == null ? null : X(i).toFixed(1) + "," + Y(v).toFixed(1)).filter(Boolean); s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="var(--label)" stroke-width="2.2" stroke-linejoin="round"/>'; act.forEach((v, i) => { if (v != null) s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="2.6" fill="var(--card)" stroke="var(--label)" stroke-width="1.6"/>'; }); }
  else band.forEach((b, i) => { s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(b.p50).toFixed(1) + '" r="2.4" fill="var(--card)" stroke="var(--blue)" stroke-width="1.5"/>'; });
  const step = n > 14 ? 3 : n > 8 ? 2 : 1;
  labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) s += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 5) + '" font-size="10" text-anchor="' + (i === 0 ? "start" : i === n - 1 ? "end" : "middle") + '" fill="var(--muted)">' + esc(l) + '</text>'; });
  s += chLabels(plan, main.map((v, i) => X(i)), main.map(v => v == null ? 0 : Y(v)), W, null, pt - 7);
  const P = labels.map((l, i) => ({ x: X(i), y: Y(main[i] == null ? band[i].p50 : main[i]), label: l, value: money(main[i] == null ? band[i].p50 : main[i], UI.cur), sub: tipSub(i) }));
  return ichart(s, W, H, P, { aria: "Прогноз капитала по месяцам с диапазоном. Наведите, чтобы увидеть месяц.", guideTop: pt - 6, guideBottom: H - pb });
}
function vForecast() {
  const F = fcS(), pf = curPf(), L = fcLive(), H = F.hz || 12, M = v => money(v, UI.cur);
  const months = [curM()].concat(L.months), rAt = i => L.fx.at(months[i]);
  const band = L.band[pf].map((b, i) => ({ p10: dispR(b.p10, rAt(i)), p50: dispR(b.p50, rAt(i)), p90: dispR(b.p90, rAt(i)) }));
  const startD = band[0].p50, end = band[H], endM = L.months[H - 1];
  const labels = months.map((m, i) => i === 0 ? "сейчас" : MONS[+m.slice(5) - 1] + (m.slice(5) === "01" ? " " + m.slice(2, 4) : ""));
  let Lh = '<section class="sec"><div class="seg glass" role="group" aria-label="Горизонт">' + FC_HZ.map(k => '<button data-act="f2hz" data-k="' + k + '" aria-pressed="' + (H === k) + '">' + k + ' мес</button>').join("") + '</div></section>';
  Lh += '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:10px"><div><div class="mut" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.02em">Капитал к концу ' + esc(MONG[+endM.slice(5) - 1] + " " + endM.slice(0, 4)) + (pf !== "all" ? " · " + esc(pfLabel(pf)) : "") + '</div><div class="n" style="font-size:30px;font-weight:700;line-height:1.15">' + M(end.p50) + '</div><div class="n mut" style="font-size:14px">' + money(end.p50 - startD, UI.cur, { sign: true }) + ' к сегодня · 80% вариантов: ' + M(end.p10) + ' – ' + M(end.p90) + '</div></div>' +
    fcChart2(labels, band, null, null, i => i ? "80% вариантов: " + M(band[i].p10) + " – " + M(band[i].p90) : "") +
    '<div class="mut" style="font-size:12px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center"><span style="display:flex;gap:6px;align-items:center"><span style="width:18px;border-top:2.5px solid var(--blue)"></span>медиана</span><span style="display:flex;gap:6px;align-items:center"><span style="width:18px;height:10px;background:var(--blue);opacity:.18;border-radius:3px"></span>80% вариантов</span>' + '</div></div></section>';
  // components
  const cf = compFor(L.comp, pf); let cs = 0; for (const k in cf) cs += cf[k];
  const fxRes = (end.p50 - startD) - cs; const fxDet = dispR(L.det[H][pf], rAt(H)) - dispR(L.det[0][pf], rAt(0)) - cs;
  if (Math.abs(fxDet) > Math.abs(startD) * 0.002) cf["Курс и переоценка"] = fxDet;
  const keys = COMP_ORDER.filter(k => cf[k] != null && Math.abs(cf[k]) >= 0.5);
  const mx = Math.max(...keys.map(k => Math.abs(cf[k])), 1);
  Lh += '<section class="sec"><div class="sechead"><h2>Из чего сложится</h2><span class="mut" style="font-size:13px">за ' + H + ' мес</span></div><div class="card" style="display:flex;flex-direction:column;gap:6px">' + keys.map(k => '<div class="crow"><span>' + esc(k) + '</span><span class="n ' + (cf[k] < 0 ? "neg" : "pos") + '">' + money(cf[k], UI.cur, { sign: true }) + '</span><span class="bar"><i style="width:' + (Math.abs(cf[k]) / mx * 100).toFixed(1) + '%;background:' + (cf[k] >= 0 ? "var(--green)" : "var(--orange)") + '"></i></span></div>').join("") +
    '<p class="foot" style="padding:6px 0 0">Ожидаемые значения без случайных отклонений. Разница с медианой — ' + money(fxRes - (cf["Курс и переоценка"] || 0), UI.cur, { sign: true }) + ': в прошлом траты часто бывали ниже модели.</p></div></section>';
  // сохранённые прогнозы против факта
  Lh += safeBlock("Прогноз и факт", () => fcTrackSection(pf));
  // как считается и насколько точен — по запросу, чтобы не загромождать экран
  Lh += '<section class="sec"><div class="group"><button class="row" data-act="fchow" aria-expanded="' + !!UI.fcHow + '"><span class="body"><span class="t"><b>Как считается прогноз</b><small>модель и её точность на прошлых месяцах</small></span><span class="chev" aria-hidden="true">' + (UI.fcHow ? "⌃" : "⌄") + '</span></span></button></div></section>';
  if (UI.fcHow) Lh += '<section class="sec"><div class="card" style="font-size:14px;line-height:1.45">500 вариантов будущего: случайные отклонения переменных и нерегулярных трат взяты из ваших реальных месяцев (' + L.hist.res.length + ' шт.). Медиана — середина вариантов, полоса — 80% из них. Постоянные траты — медиана последних 3 месяцев, переменные — среднее за 12 месяцев с поправкой на сезон, нерегулярные — годовая сумма, разложенная по обычным месяцам.</div></section>' + safeBlock("Проверка на истории", () => vBacktest(pf));
  return cols(Lh, vFcAssume(L, pf));
}
function vBacktest(pf) {
  const F = fcS(), ksB = snapKeys().filter(k => k <= TODAYS), endK = ksB[ksB.length - 1], opts = [];
  if (endK) for (const n of [12, 6]) { const s0 = addMonth(endK.slice(0, 7), -n); if (snap(s0 + "-01")) opts.push([s0, n, MONS[+s0.slice(5) - 1] + " " + s0.slice(0, 4) + " → " + MONS[+endK.slice(5, 7) - 1] + " " + endK.slice(0, 4)]); }
  if (!opts.length) return '<section class="sec"><div class="sechead"><h2>Проверка на истории</h2></div><div class="card empty">Нужны сверки остатков хотя бы за 7 месяцев подряд.</div></section>';
  const o = opts.find(x => x[0] === F.bt) || opts[0], B = fcBack(o[0], o[1]);
  let h = '<section class="sec"><div class="sechead"><h2>Проверка на истории</h2></div><div class="seg glass" role="group" aria-label="Период проверки">' + opts.map(x => '<button data-act="f2bt" data-s="' + x[0] + '" aria-pressed="' + (x[0] === o[0]) + '">' + x[2] + '</button>').join("") + '</div>';
  if (!B) return h + '<div class="card empty">Нет остатков на начало периода.</div></section>';
  const ms = []; for (let t = 0; t <= o[1]; t++) ms.push(addMonth(o[0], t));
  const r = i => rateM(ms[i]); const band = B.band[pf].map((b, i) => ({ p10: dispR(b.p10, r(i)), p50: dispR(b.p50, r(i)), p90: dispR(b.p90, r(i)) }));
  const act = B.act.map((a, i) => a ? dispR(a.by(pf), r(i)) : null);
  const labels = ms.map((m, i) => MONS[+m.slice(5) - 1] + (i === 0 || m.slice(5) === "01" ? " " + m.slice(2, 4) : ""));
  let li = act.length - 1; while (li > 0 && act[li] == null) li--;
  const err = v => act[li] ? (v - act[li]) / Math.abs(act[li] - act[0] || 1) : 0;
  const pE = (band[li].p50 - act[li]), grow = act[li] - act[0];
  const pct = v => (v >= 0 ? "+" : "−") + Math.abs(Math.round(v * 100)) + "%";
  h += '<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="grid3" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
    '<div><div class="mut" style="font-size:12px;font-weight:600">Факт на ' + esc(dLabel(ms[li] + "-01")) + '</div><div class="n" style="font-weight:700">' + money(act[li], UI.cur) + '</div><div class="n mut" style="font-size:12px">рост ' + money(grow, UI.cur, { sign: true }) + '</div></div>' +
    '<div><div class="mut" style="font-size:12px;font-weight:600">Модель</div><div class="n" style="font-weight:700">' + money(band[li].p50, UI.cur) + '</div><div class="n mut" style="font-size:12px">ошибка ' + money(pE, UI.cur, { sign: true }) + (grow ? " · " + Math.abs(Math.round(pE / grow * 100)) + "% от роста" : "") + '</div></div></div>' +
    fcChart2(labels, band, null, act, i => act[i] != null ? "модель " + money(band[i].p50, UI.cur) + " · 80%: " + money(band[i].p10, UI.cur) + " – " + money(band[i].p90, UI.cur) : "") +
    '<div class="mut" style="font-size:12px;display:flex;flex-wrap:wrap;gap:6px 14px"><span style="display:flex;gap:6px;align-items:center"><span style="width:18px;border-top:2.2px solid var(--label)"></span>факт</span><span style="display:flex;gap:6px;align-items:center"><span style="width:18px;border-top:2.5px solid var(--blue)"></span>модель</span></div>';
  // components: model vs fact
  const mc = compFor(B.comp, pf), fc = btFact(o[0], o[1], pf);
  const rows = [["Доходы", ["Зарплата", "Премии", "Проценты по вкладам", "Прочие доходы", "Регулярные поступления"]], ["Траты", ["Постоянные траты", "Переменные траты", "Нерегулярные траты"]], ["Долги и переводы вне учета", ["Долги и переводы вне учета"]], ["Брокер и фонды", ["Доходность брокера и фондов"]]];
  const sm = (obj, ks) => ks.reduce((s, k) => s + (obj[k] || 0), 0);
  h += '<table class="bt"><thead><tr><th></th><th>Модель</th><th>Факт</th></tr></thead><tbody>' + rows.map(x => { const a = sm(mc, x[1]), b = sm(fc, x[1]); return '<tr><td>' + esc(x[0]) + '</td><td class="n">' + money(a, UI.cur, { sign: true }) + '</td><td class="n">' + money(b, UI.cur, { sign: true }) + '</td></tr>'; }).join("") + (pf === "all" || pf === "uz" || pf === "cash" ? '<tr><td>Курс</td><td class="n">—</td><td class="n">' + money(fc["Курс и переоценка"] || 0, UI.cur, { sign: true }) + '</td></tr>' : "") + '</tbody></table>';
  h += '<p class="foot" style="padding:0">Модель обучена только на данных до ' + esc(MONG[+o[0].slice(5) - 1] + " " + o[0].slice(0, 4)) + ', курсы — фактические. Из факта исключены разовые поступления (продажа имущества). Ставка вклада по данным того времени — ' + B.eff.toFixed(1).replace(".", ",") + '% чистыми, брокер — ' + (+F.by || 0) + '% годовых.</p></div></section>';
  return h;
}
function btFact(startM, H, pf) {
  const k0 = startM + "-01", k1 = addMonth(startM, H) + "-01", out = {}, add = (k, v, m) => { out[k] = (out[k] || 0) + fromRUB(v, UI.cur, m); };
  for (const o of allOps()) {
    if (o.d < k0 || o.d >= k1) continue; const m = o.d.slice(0, 7), a = acc(o.ac), t = acc(o.to), v = opRUB(o);
    if (o.t === "t") { if (a && !t && pfHas(a, pf)) add("Долги и переводы вне учета", -v, m); else if (!a && t && pfHas(t, pf)) add("Долги и переводы вне учета", toRUB(opDelta(o, t.id), t.cur, m), m); continue; }
    if (!pfHas(a, pf)) continue;
    if (o.t === "i") { if (o.c === "Продажа имущества") continue; add(o.c === "Зарплата" ? (o.s === "премия" ? "Премии" : "Зарплата") : o.c === "Проценты" ? "Проценты по вкладам" : "Прочие доходы", v, m); }
    else if (o.t === "e") add({ fix: "Постоянные траты", var: "Переменные траты", irr: "Нерегулярные траты" }[catKind(o.c)], -v, m);
  }
  const d = decomp(k0, k1, pf); out["Доходность брокера и фондов"] = fromRUB(d.inv, UI.cur, k1.slice(0, 7)); out["Курс и переоценка"] = fromRUB(d.fx, UI.cur, k1.slice(0, 7));
  return out;
}
/** Редактируемые параметры модели прогноза (экран Настройки → Прогноз). */
function fcParamsBlocks(L, pf) {
  const F = fcS(), r0 = L.fx.at(curM()), MI = v => money(v, UI.cur);
  const inp = (id, key, val, w) => '<input id="' + id + '" class="n" inputmode="decimal" data-f2="' + key + '" value="' + esc(val) + '"' + (w ? ' style="max-width:' + w + 'px"' : "") + '>';
  const sw = (label, act, on) => '<div class="field"><span style="flex:1;font-size:17px">' + label + '</span><button class="sw" role="switch" aria-checked="' + !!on + '" aria-label="' + esc(label) + '" data-act="' + act + '"></button></div>';
  const mchips = (sel, act, extra) => '<div class="mchips">' + MONS.map((n, i) => '<button data-act="' + act + '"' + (extra || "") + ' data-m="' + (i + 1) + '" aria-pressed="' + sel.includes(i + 1) + '">' + n + '</button>').join("") + '</div>';
  let R = '';
  // fx + broker + spending params
  const sl = L.fx.slope, yr = k => ((Math.exp(k * 12) - 1) * 100).toFixed(1).replace(".", ",").replace("-", "−");
  R += '<section class="sec"><div class="caps"><span>Курс</span></div><div class="seg glass" role="group" aria-label="Курс в прогнозе">' + [["now", "Текущий"], ["trend", "Тренд 24 мес"]].map(x => '<button data-act="f2fx" data-v="' + x[0] + '" aria-pressed="' + (F.fx === x[0]) + '">' + x[1] + '</button>').join("") + '</div>' +
    '<p class="foot">' + (sl ? "По тренду за 2 года: рублей за $ " + yr(sl.usd) + "% в год, сумов за рубль " + yr(sl.uzs) + "% в год. " : "Курсы как сейчас: $ = " + nf(r0.usd, 2) + " ₽, ₽ = " + nf(r0.uzs, 2) + " сум. ") + '</p></section>';
  R += '<section class="sec"><div class="caps"><span>Инвестиции и траты</span></div><div class="group">' +
    '<div class="field"><label for="f2-by">Доходность брокера и фондов</label>' + inp("f2-by", "by", F.by) + '<span class="mut">% год.</span></div>' +
    '<div class="field"><label for="f2-in">Рост трат</label>' + inp("f2-in", "infl", F.infl) + '<span class="mut">% год.</span></div>' +
    sw("Долги и переводы вне учета", "f2ext", F.extOn !== false) +
    '<div class="field"><span class="mut" style="font-size:13px;line-height:1.35;padding:8px 0">В среднем за 12 мес: ' + money(L.hist.M.UZ.ext, "UZS", { sign: true }) + ' и ' + money(L.hist.M.RU.ext, "RUB", { sign: true }) + ' в месяц — выданные долги, их возвраты и переводы с чужих карт.</span></div></div></section>';
  // categories by kind
  const last = []; for (let i = 12; i >= 1; i--) last.push(addMonth(curM(), -i));
  const avg = {}; for (const o of allOps()) { const m = o.d.slice(0, 7); if (o.t !== "e" || !last.includes(m) || !opPf(o, pf)) continue; avg[o.c] = (avg[o.c] || 0) + fromRUB(opRUB(o), UI.cur, m) / 12; }
  const cats = Object.keys(avg).sort((a, b) => avg[b] - avg[a]);
  const KS = { fix: "Пост.", var: "Перем.", irr: "Нерег." };
  R += '<section class="sec"><div class="caps"><span>Категории трат</span><span>в среднем в месяц</span></div><div class="group">' + cats.map(c => '<div class="row"><span class="body"><span class="t"><b>' + esc(c) + '</b></span><span class="v n" style="font-weight:500;font-size:15px">' + MI(avg[c]) + '</span><button class="kchip k-' + catKind(c) + '" data-act="f2kind" data-c="' + esc(c) + '" aria-label="Тип: ' + KINDN[catKind(c)] + '. Нажмите, чтобы сменить">' + KS[catKind(c)] + '</button></span></div>').join("") + '</div>' +
    '<p class="foot">Постоянные — медиана последних 3 месяцев. Переменные — среднее за 12 месяцев с поправкой на сезон (декабрь, лето). Нерегулярные — годовая сумма, разложенная по месяцам, когда такие траты обычно случаются. Нажмите на тип, чтобы поменять.</p></section>';
  return R;
}
function vFcAssume(L, pf) {
  const F = fcS(), r0 = L.fx.at(curM()), MI = v => money(v, UI.cur);
  const inp = (id, key, val, w) => '<input id="' + id + '" class="n" inputmode="decimal" data-f2="' + key + '" value="' + esc(val) + '"' + (w ? ' style="max-width:' + w + 'px"' : "") + '>';
  const sw = (label, act, on) => '<div class="field"><span style="flex:1;font-size:17px">' + label + '</span><button class="sw" role="switch" aria-checked="' + !!on + '" aria-label="' + esc(label) + '" data-act="' + act + '"></button></div>';
  const mchips = (sel, act, extra) => '<div class="mchips">' + MONS.map((n, i) => '<button data-act="' + act + '"' + (extra || "") + ' data-m="' + (i + 1) + '" aria-pressed="' + sel.includes(i + 1) + '">' + n + '</button>').join("") + '</div>';
  const MY = mySt(), m1 = L.start, sh = verAt(MY.salary.hist, m1), inc = MY.incomes || [];
  const incYear = inc.reduce((sum, x) => { let t = 0; for (let k = 0; k < 12; k++) { const mm = addMonth(m1, k), ms = x.months || []; if (ms.length && !ms.includes(+mm.slice(5))) continue; const h = verAt(x.hist, mm); if (h) t += toRUB(+h.v || 0, x.cur || "RUB", curM()); } return sum + t; }, 0);
  const plan = (MY.deposits || {}).plan || [];
  const srow = (t, sub, v, view) => '<button class="row" data-act="go" data-v="' + (view || "income") + '"><span class="body"><span class="t"><b>' + t + '</b><small>' + sub + '</small></span><span class="v n" style="font-size:15px">' + v + '</span><span class="chev">›</span></span></button>';
  let R = '<section class="sec"><div class="sechead"><h2>Допущения</h2></div><div class="group">' +
    srow("Оклад", sh ? "с " + esc(mLabelG(sh.from)) : "не задан", sh ? esc(money(+sh.v || 0, sh.cur || "UZS")) : "—") +
    srow("Премии", MY.bonus.on && verAt(MY.bonus.hist, m1) ? "в " + (MY.bonus.months || []).map(k => MONS[k - 1]).join(", ") : "не учитываются", MY.bonus.on && verAt(MY.bonus.hist, m1) ? verAt(MY.bonus.hist, m1).pct + "% от целевой" : "—") +
    srow("Регулярные поступления", inc.length ? inc.length + " · за 12 мес" : "нет", inc.length ? esc(D(incYear)) : "—") +
    srow("Вклады", "налог на проценты " + nf(+((MY.deposits || {}).tax) || 0, 0) + "%", plan.length ? plan.length + " период" + (plan.length === 1 ? "" : plan.length < 5 ? "а" : "ов") + " ставок" : "по ставке счета", "deposits") +
    srow("Курс, доходность, рост трат", (F.fx === "trend" ? "курс по тренду" : "курс текущий") + " · типы категорий", (+F.infl || 0) + "% · " + (+F.by || 0) + "%", "fcset") + '</div><p class="foot">Все параметры меняются в Настройках; здесь — только сводка.</p></section>';
  const evs = (((S.settings || {}).forecast || {}).events) || [];
  R += '<section class="sec"><div class="sechead"><h2>Сценарии</h2><button data-act="addev">Добавить</button></div>' + (evs.length ? '<div class="group">' + evs.map((e, i) => '<div class="row"><div class="body"><span class="t"><b>' + esc(e.label || "Событие") + '</b><small class="n">' + mLabel(e.m) + ' · ' + D(+e.v || 0, null, { sign: true }) + '</small></span><button class="sw" role="switch" aria-checked="' + (e.on !== false) + '" aria-label="Учитывать: ' + esc(e.label) + '" data-act="evtoggle" data-i="' + i + '"></button><button class="mbtn" data-act="evdel" data-i="' + i + '" aria-label="Удалить сценарий">×</button></div></div>').join("") + '</div>' : '<div class="card empty">Добавьте поездку, крупную покупку или поступление — прогноз учтет их в нужном месяце.</div>') + '</section>';
  return R;
}


/* ---------- действия модуля ---------- */
App.actions({
  fchow: () => { UI.fcHow = !UI.fcHow; render(); },
  f2hz: t => { fcS().hz = +t.dataset.k; render(); saveMeta("settings"); },
  f2bt: t => { fcS().bt = t.dataset.s; render(); saveMeta("settings"); },
  f2fx: t => { fcS().fx = t.dataset.v; render(); saveMeta("settings"); },
  f2ext: () => { const F = fcS(); F.extOn = F.extOn === false; render(); saveMeta("settings"); },
  f2kind: t => { const F = fcS(), c = t.dataset.c, nx = { fix: "var", var: "irr", irr: "fix" }[catKind(c)]; F.kinds[c] = nx; render(); saveMeta("settings"); },
  hz: t => { UI.horizon = +t.dataset.k; render(); },
  addev: () => openSheet({ kind: "fcev", title: "Сценарий", label: "", m: addMonth(curM(), 2), v: "" }),
  savefcev: async () => { readForm(); const v = parseNum(FORM.v); if (!isFinite(v) || !v) return toast("Введите сумму"); if (!/^\d{4}-\d{2}$/.test(FORM.m)) return toast("Укажите месяц"); const F = S.settings.forecast = S.settings.forecast || {}; (F.events = F.events || []).push({ label: FORM.label || "Событие", m: FORM.m, v, on: true }); closeSheet(); await saveMeta("settings"); render(); },
  evtoggle: async t => { const e = S.settings.forecast.events[+t.dataset.i]; e.on = e.on === false; render(); await saveMeta("settings"); },
  evdel: async t => { const i = +t.dataset.i, ev = S.settings.forecast.events[i]; S.settings.forecast.events.splice(i, 1); render(); await saveMeta("settings"); toast("Сценарий удален", async () => { const L = S.settings.forecast.events; L.splice(Math.min(i, L.length), 0, ev); await saveMeta("settings"); }); },
  gofc: () => { UI.atab = "forecast"; go("analytics"); }
});

/* ---------- поля модуля ---------- */
App.change(t => t.dataset.f2, async t => { const v = calcNum(t.value); if (isFinite(v)) { fcS()[t.dataset.f2] = v; render(); await saveMeta("settings"); } else render(); });
