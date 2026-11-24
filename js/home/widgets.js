/* Стандартные виджеты Главной. Каждый — одна мысль и один переход по нажатию.
   Цвет только у Капитала и карты; у остальных цвет означает статус (оранжевый — внимание). */
"use strict";
const pctTxt = p => (p >= 0 ? "+" : "−") + Math.abs(p * 100).toFixed(1).replace(".", ",") + "%";
/** Мини-линия по минимуму и максимуму (капитал не начинается с нуля). */
function wSpark(vals, col, H) {
  H = H || 34; const W = 300, hi = Math.max(...vals), lo = Math.min(...vals), rg = hi - lo || 1, n = vals.length;
  const p = vals.map((v, i) => (2 + (W - 4) * i / Math.max(1, n - 1)).toFixed(1) + "," + (H - 4 - (H - 8) * (v - lo) / rg).toFixed(1)), l = p[p.length - 1].split(",");
  return '<svg class="wspark" viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + p.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="' + l[0] + '" cy="' + l[1] + '" r="3.2" fill="' + col + '"/></svg>';
}
/** Кольцо-шкала с числом в центре. */
function wRing(p, col, txt) {
  const r = 26, c = 2 * Math.PI * r;
  return '<svg class="wring" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="' + r + '" fill="none" stroke="var(--fill2)" stroke-width="7"/><circle cx="32" cy="32" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (c * Math.max(0, Math.min(1, p))).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 32 32)"/><text class="n" x="32" y="37.5" text-anchor="middle" font-size="16" font-weight="700" fill="var(--label)">' + txt + '</text></svg>';
}
const wgo = (v, extra) => 'data-act="wgo" data-v="' + v + '"' + (extra || "");

/* Капитал */
App.widget("cap", {
  name: "Капитал", icon: "cap", color: "#007AFF", desc: "сумма и изменение за месяц", sizes: ["M", "S"], size: "M",
  render(c, size) {
    const m = curM(), now = fromRUB(c.C.now, UI.cur, m);
    const series = snapKeys().slice(-12).map(k => fromRUB(snapTotalRUB(k, c.pf), UI.cur, k.slice(0, 7))).concat([now]);
    const pill = '<span class="wpill n">' + pctTxt(c.C.p) + (size === "M" ? " за месяц" : "") + '</span>';
    return { go: "capital", bg: "linear-gradient(135deg,#0A84FF,#5E5CE6)", fg: "#fff",
      inner: '<span class="wrow">' + wLab(c.pf === "all" ? "Капитал" : "Капитал · " + esc(pfLabel(c.pf)), true) + pill + '</span>' + wBig(size === "M" ? money(now, UI.cur) : shortM(now, UI.cur), size === "M" ? 30 : 22) + (series.length > 1 ? wSpark(series, "#fff", size === "M" ? 34 : 26) : "") };
  }
});

/* Месяц: темп трат и средние траты в день */
App.widget("month", {
  name: "Месяц", icon: "bars", color: "#FF9500", desc: "темп трат, средние траты в день", sizes: ["M", "S"], size: "M", config: "daily",
  render(c, size) {
    const P = c.P; if (!P.n && !P.now) return null;
    const ahead = P.diff > 0.05, pct = Math.min(100, P.usualMonth ? P.now / P.usualMonth * 100 : 0), mark = Math.min(100, P.usualMonth ? P.usualToday / P.usualMonth * 100 : 0);
    const st = P.n ? '<span class="n" style="font-size:13px;font-weight:600;color:' + (ahead ? "var(--orangeT)" : "var(--green)") + '">' + (P.diff >= 0 ? "+" : "−") + Math.abs(Math.round(P.diff * 100)) + "% к обычному</span>" : "";
    const bar = P.n ? '<div class="wbar"><div class="bar" style="height:' + (size === "M" ? 10 : 8) + 'px"><i style="width:' + pct.toFixed(1) + '%;background:' + (ahead ? "var(--orange)" : "var(--blue)") + '"></i></div><span class="wmark" style="left:calc(' + mark.toFixed(1) + '% - 1px)" title="обычно к этому дню"></span></div>' : "";
    const per = P.n ? '<span class="mut n" style="font-size:13px">до <b style="color:var(--label)">' + shortM(P.perDay, UI.cur) + '</b> в день · ' + P.daysLeft + " дн.</span>" : '<span class="mut" style="font-size:13px">мало истории для сравнения</span>';
    // средние траты в день — только по «ежедневным» категориям (настраивается)
    const Dy = dailyAvg(c.pf), dUp = Dy.diff > 0.05;
    const dPct = Dy.n && Dy.usual ? ' <span style="color:' + (dUp ? "var(--orangeT)" : "var(--green)") + '">' + (Dy.diff >= 0 ? "+" : "−") + Math.abs(Math.round(Dy.diff * 100)) + "%</span>" : "";
    const exTxt = Dy.excluded.length ? "без: " + Dy.excluded.join(", ") : "все категории";
    const head = MON[+P.m.slice(5) - 1].replace(/^./, s => s.toUpperCase()) + " · день " + P.day + " из " + P.dim;
    // две зоны нажатия: верх — траты месяца в Аналитике, строка «в среднем в день» — экран «Траты в день»
    const top = '<button class="wsub" ' + wgo("analytics", ' data-atab="spend" data-acat="" data-am=""') + ' aria-label="Траты месяца">';
    const low = '<button class="wsub" data-act="godaily" data-from="home" aria-label="Траты в день по категориям">';
    if (size === "M") return { raw: true,
      inner: '<div class="wbody">' + top + '<span class="wrow">' + wLab(head) + st + '</span><span class="wrow" style="align-items:baseline">' + wBig(shortM(P.now, UI.cur)) + per + '</span>' + bar + '</button>' + low +
        '<span class="wdaily"><span class="wrow" style="align-items:baseline"><span class="mut" style="font-size:13px;white-space:nowrap">В среднем в день</span><span class="n" style="font-size:16px;font-weight:700;white-space:nowrap">' + money(Dy.now, UI.cur) + dPct.replace('<span style="', '<span style="font-size:13px;') +  '<span class="chev" aria-hidden="true" style="margin-left:4px">›</span></span></span><span class="mut ell n" style="font-size:12px;display:block">' + (Dy.usual ? "обычно " + money(Dy.usual, UI.cur) + " · " : "") + esc(exTxt) + '</span></span></button></div>' };
    return { raw: true, inner: '<div class="wbody">' + top + wLab("Траты · день " + P.day) + wBig(shortM(P.now, UI.cur), 22) + st + bar + '</button>' + low + '<span class="mut n" style="font-size:12.5px">в день <b style="color:var(--label)">' + shortM(Dy.now, UI.cur) + '</b>' + dPct + ' ›</span></button></div>' };
  }
});

/* Шторка «Средние траты в день»: какие категории учитывать */
App.sheet("daily", () => {
  const pf = curPf(), ex = dailyExcluded(), Dy = dailyAvg(pf), A = advData(curM(), pf);
  const base = {}; for (const x of A.cats) base[x.c] = x.base;
  const cats = expenseCats().sort((a, b) => (base[b] || 0) - (base[a] || 0));
  const why = c => catKind(c) === "fix" ? "постоянная" : TRIPCATS.includes(c) ? "поездки" : catKind(c) === "irr" ? "нерегулярная" : "";
  return sHead("Средние траты в день", null) +
    '<div class="card" style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><span><span class="mut" style="font-size:13px">Сейчас в день</span><br><b class="n" style="font-size:22px">' + money(Dy.now, UI.cur) + '</b></span><span style="text-align:right"><span class="mut" style="font-size:13px">обычно</span><br><b class="n" style="font-size:17px">' + money(Dy.usual, UI.cur) + '</b></span></div>' +
    '<p class="foot">Включите категории, на которые деньги уходят изо дня в день. Аренду, поездки и другие разовые или ежемесячные платежи лучше выключить — они искажают среднее.</p>' +
    '<div class="group">' + cats.map(c => '<div class="row">' + catTile(c) + '<span class="body"><span class="t"><b>' + esc(c) + '</b><small class="n">' + (base[c] ? "≈ " + money(base[c], UI.cur) + " в месяц" : "трат не было") + (why(c) ? " · " + why(c) : "") + '</small></span><button class="sw" role="switch" aria-checked="' + !ex.has(c) + '" data-act="dailytog" data-c="' + esc(c) + '" aria-label="Учитывать «' + esc(c) + '» в средних тратах в день"></button></span></div>').join("") + '</div>' +
    (dailyCustom() ? '<div class="group" style="margin-top:12px"><button class="row" data-act="dailyreset"><span class="body"><span class="t"><b style="color:var(--link);font-weight:400">Вернуть как по умолчанию</b></span></span></button></div>' : "") +
    '<p class="foot">По умолчанию не учитываются постоянные категории (как в прогнозе) и поездки. Выбор сохраняется и одинаков на всех устройствах.</p>';
});
App.actions({
  dailytog: async t => { const s = dailyExcluded(), c = t.dataset.c; if (s.has(c)) s.delete(c); else s.add(c); mySt().daily = { exclude: [...s] }; render(); renderSheet(); try { await saveMeta("settings"); } catch (e) { /* ошибка уже показана */ } },
  dailyreset: async () => { delete mySt().daily; render(); renderSheet(); try { await saveMeta("settings"); } catch (e) { /* ошибка уже показана */ } }
});

/* Счёт (любой): карта в выбранном дизайне */
App.widget("acc", {
  name: "Счёт", icon: "card", color: "#1C1C1E", desc: "остаток и дизайн карты", sizes: ["S", "M"], size: "S",
  instances: () => accs().filter(a => !a.archived).map(a => ({ arg: a.id, name: a.name + (a.bank ? " · " + a.bank : ""), desc: TYPEN[a.type] || "счёт" })),
  render(c, size, id) {
    const a = acc(id); if (!a) return null;
    if (size === "M") return { raw: true, inner: mainCard(a) };
    return { raw: true, inner: '<button class="mcard wcard" data-act="accdet" data-id="' + esc(a.id) + '" aria-label="' + esc(a.name) + '">' + cardFace(a, balanceAt(a.id, TODAYS), { sub: a.cur !== UI.cur ? "≈ " + D(toRUB(balanceAt(a.id, TODAYS), a.cur, curM())) : "" }) + '</button>' };
  }
});

/* Требует внимания */
App.widget("attn", {
  name: "Внимание", icon: "flame", color: "#FF9500", desc: "сверка, лимиты, всплески трат", sizes: ["S", "M"], size: "S",
  render(c, size) {
    const s = c.sg; if (!s.length) return null;
    const first = s[0], act = wgo(first.go, first.cat ? ' data-atab="spend" data-acat="' + esc(first.cat) + '"' : "");
    const badge = '<span class="wbadge n">' + s.length + '</span>';
    if (size === "M") return { act: wgo(first.go), inner: '<span class="wrow">' + wLab("Требует внимания") + badge + '</span><span class="wlist">' + s.slice(0, 3).map(x => '<span class="wli"><span class="tile" style="background:' + x.color + '">' + svg(x.icon, 15) + '</span><span><b>' + esc(x.title) + '</b><small>' + esc(x.sub) + '</small></span></span>').join("") + '</span>' };
    return { act, inner: '<span class="wrow">' + wLab("Внимание") + badge + '</span><span style="font-size:15px;font-weight:600;line-height:1.25">' + esc(first.title) + '</span><span class="mut" style="font-size:12.5px;line-height:1.25">' + esc(s.length > 1 ? "и ещё: " + s.slice(1).map(x => x.title.split(/[:—]/)[0].trim()).join(", ") : first.sub) + '</span>' };
  }
});

/* Лимиты */
App.widget("limits", {
  name: "Лимиты", icon: "sliders", color: "#34C759", desc: "категории с лимитом в этом месяце", sizes: ["S", "M"], size: "S",
  render(c, size) {
    const P = c.P, L = c.A.cats.filter(x => x.lim > 0).sort((a, b) => b.cur / b.lim - a.cur / a.lim).slice(0, size === "M" ? 5 : 3);
    if (!L.length) return null;
    const rows = L.map(x => { const p = x.cur / x.lim, warn = x.cur > x.lim || p > P.day / P.dim * 1.1; return '<span class="wlim"><span class="wrow" style="font-size:' + (size === "M" ? 14 : 12.5) + 'px"><span class="ell">' + esc(x.c) + '</span><b class="n"' + (x.cur > x.lim ? ' style="color:var(--orangeT)"' : "") + '>' + (size === "M" ? shortM(x.cur, UI.cur) + ' <span class="mut" style="font-weight:500">из ' + shortM(x.lim, UI.cur) + '</span>' : Math.round(p * 100) + "%") + '</b></span><span class="bar" style="height:5px"><i style="width:' + Math.min(100, p * 100).toFixed(1) + '%;background:' + (warn ? "var(--orange)" : catColor(x.c)) + '"></i></span></span>'; }).join("");
    return { act: wgo("analytics", ' data-atab="spend" data-acat="" data-am=""'), inner: wLab("Лимиты") + '<span class="wlist" style="gap:8px">' + rows + '</span>' };
  }
});

/* Сбережения */
App.widget("save", {
  name: "Сбережения", icon: "save", color: "#34C759", desc: "норма сбережений за прошлый месяц", sizes: ["S", "M"], size: "S",
  render(c, size) {
    const A = c.Ap, k = A.k, b = A.b; if (k.rate == null) return null;
    const mm = MON[+A.m.slice(5) - 1];
    const ring = wRing(k.rate, k.rate >= (b.rate || 0) ? "#34C759" : "#FF9500", Math.round(k.rate * 100) + "%");
    if (size === "M") return { go: "advice", inner: wLab("Сбережения · " + esc(mm)) + '<span class="wrow" style="justify-content:flex-start;gap:14px">' + ring + '<span style="display:flex;flex-direction:column;gap:2px"><span class="n" style="font-size:20px;font-weight:700">' + money(k.save, UI.cur) + '</span><span class="mut n" style="font-size:13px">обычно ' + (b.rate != null ? Math.round(b.rate * 100) + "%" : "—") + " · подушка " + (A.health.cushion ? Math.round(A.health.cushion) + " мес" : "—") + '</span></span></span>' };
    return { go: "advice", inner: wLab("Сбережения") + '<span class="wrow" style="justify-content:flex-start;gap:10px">' + ring + '<span class="mut" style="font-size:12.5px;line-height:1.3">за ' + esc(mm) + '<br>обычно ' + (b.rate != null ? Math.round(b.rate * 100) + "%" : "—") + '</span></span><span class="mut" style="font-size:12.5px">подушка ' + (A.health.cushion ? Math.round(A.health.cushion) + " мес" : "—") + '</span>' };
  }
});

/* Прогноз */
App.widget("fc", {
  name: "Прогноз", icon: "fcst", color: "#5856D6", desc: "капитал на выбранный горизонт и точность прошлых прогнозов", sizes: ["S", "M"], size: "S",
  render(c, size) {
    const L = fcLive(), H = fcS().hz || 12, b = L.band && L.band[c.pf] && L.band[c.pf][H]; if (!b) return null;
    const r = L.fx.at(L.months[H - 1]), p50 = dispR(b.p50, r), p10 = dispR(b.p10, r), p90 = dispR(b.p90, r);
    const now = fromRUB(c.C.now, UI.cur, curM()), d = now ? (p50 - now) / now : 0;
    return { act: wgo("analytics", ' data-atab="forecast"'), inner: wLab("Прогноз · " + H + " мес") + wBig(shortM(p50, UI.cur), 22) + '<span class="n" style="font-size:13px;font-weight:600;color:' + (d >= 0 ? "var(--green)" : "var(--orangeT)") + '">' + pctTxt(d) + ' к сегодня</span><span class="mut n" style="font-size:12.5px;line-height:1.3">' + (size === "M" ? "80% вариантов: " : "") + shortM(p10, UI.cur) + ' – ' + shortM(p90, UI.cur) + '</span>' + fcAccLine(c.pf, H, size) };
  }
});

/** Строка точности для виджета: «точность через 3 мес ±1,8%» — по ближайшему горизонту, где уже есть сравнения. */
function fcAccLine(pf, H, size) {
  if (size !== "M" || typeof fcAccuracy !== "function" || !S.fcsaved) return "";
  const A = fcAccuracy(pf).filter(x => x.n), a = A.find(x => x.h === H) || A.filter(x => x.h <= H).pop() || A[0]; if (!a) return "";
  return '<span class="mut n" style="font-size:12.5px">точность через ' + a.h + ' мес ±' + (a.mae * 100).toFixed(1).replace(".", ",") + '%</span>';
}

/* Последние операции */
App.widget("ops", {
  name: "Последние операции", icon: "list", color: "#8E8E93", desc: "три последние траты и доходы", sizes: ["M", "S"], size: "M",
  render(c, size) {
    const L = allOps().filter(o => o.t !== "t" && o.d <= TODAYS).slice(-(size === "M" ? 3 : 2)).reverse(); if (!L.length) return null;
    return { go: "journal", inner: '<span class="wrow">' + wLab("Последние операции") + (size === "M" ? '<span style="font-size:13px;color:var(--link);font-weight:600">Журнал ›</span>' : "") + '</span><span class="wlist">' + L.map(o => '<span class="wop">' + catTile(o.c) + '<span class="ell">' + esc(o.c) + (size === "M" ? ' <span class="mut" style="font-size:13px">' + esc(dLabel(o.d)) + '</span>' : "") + '</span><b class="n"' + (o.t === "i" ? ' style="color:var(--green)"' : "") + '>' + (size === "M" ? money(o.t === "e" ? -o.a : o.a, opCur(o), { sign: o.t === "i" }) : shortM(o.t === "e" ? -o.a : o.a, opCur(o))) + '</b></span>').join("") + '</span>' };
  }
});

/* Доходы месяца */
App.widget("inc", {
  name: "Доходы", icon: "inc", color: "#34C759", desc: "получено в этом месяце", sizes: ["S"], size: "S",
  render(c) {
    const k = c.A.k, b = c.A.b; if (!k.inc && !b.inc) return null;
    return { act: wgo("journal"), inner: wLab("Доходы · " + MON[+curM().slice(5) - 1].slice(0, 3)) + wBig(shortM(k.inc, UI.cur), 22) + '<span class="mut n" style="font-size:12.5px">обычно ' + shortM(b.inc, UI.cur) + '</span><div class="bar" style="height:6px"><i style="width:' + Math.min(100, b.inc ? k.inc / b.inc * 100 : 0).toFixed(1) + '%;background:#34C759"></i></div>' };
  }
});

/* Подушка */
App.widget("cushion", {
  name: "Подушка", icon: "shield", color: "#007AFF", desc: "на сколько месяцев хватит ликвидных денег", sizes: ["S"], size: "S",
  render(c) {
    const h = c.Ap.health; if (!h.cushion) return null;
    return { go: "advice", inner: wLab("Подушка") + wBig(Math.round(h.cushion) + " мес", 24) + '<span class="mut" style="font-size:12.5px">ликвидные / обычные траты</span><div class="bar" style="height:6px"><i style="width:' + Math.min(100, h.cushion / 12 * 100).toFixed(1) + '%;background:#34C759"></i></div>' };
  }
});

/* Вам должны */
App.widget("debts", {
  name: "Вам должны", icon: "person", color: "#34C759", desc: "долги справочно, не в капитале", sizes: ["S"], size: "S",
  avail: () => !!(S.debts && (S.debts.list || []).length),
  render() {
    const t = debtsTotalRUB(); if (!(t > 0)) return null; const n = (S.debts.list || []).filter(d => debtCalc(d, TODAYS).bal > 0.5).length;
    return { go: "debts", inner: wLab("Вам должны") + wBig(shortM(fromRUB(t, UI.cur, curM()), UI.cur), 22) + '<span class="mut" style="font-size:12.5px">' + n + " " + pl(n, "долг", "долга", "долгов") + ' с процентами</span>' };
  }
});

/* Курсы */
App.widget("rates", {
  name: "Курсы", icon: "fx", color: "#8E8E93", desc: "доллар и сум к рублю", sizes: ["S"], size: "S",
  avail: () => !ratesMissing(),
  render() {
    const m = curM(), r = rateM(m), p = rateM(addMonth(m, -1));
    const line = (t, v, pv, dec) => '<span class="wrow" style="font-size:15px"><span>' + t + '</span><b class="n">' + v.toFixed(dec).replace(".", ",") + ' <span style="font-size:12px;color:' + (v >= pv ? "var(--green)" : "var(--orangeT)") + '">' + (v >= pv ? "▲" : "▼") + '</span></b></span>';
    return { go: "rates", inner: wLab("Курсы · " + MON[+m.slice(5) - 1].slice(0, 3)) + '<span class="wlist" style="gap:6px">' + line("$ → ₽", r.usd, p.usd, 2) + line("€ → ₽", r.eur, p.eur, 2) + line("₽ → сум", r.uzs, p.uzs, 1) + '</span>' };
  }
});

/* Подписки */
App.widget("subs", {
  name: "Подписки", icon: "star", color: "#AF52DE", desc: "сколько уходит на подписки в месяц", sizes: ["S"], size: "S",
  render(c) {
    const h = c.A.health; if (!(h.subsAvg > 0)) return null;
    return { act: wgo("analytics", ' data-atab="spend" data-acat="Подписки"'), inner: wLab("Подписки") + wBig(shortM(h.subsAvg, UI.cur), 22) + '<span class="mut" style="font-size:12.5px">в месяц · ' + h.subsN + " " + pl(h.subsN, "сервис", "сервиса", "сервисов") + '</span>' };
  }
});

/* Последняя поездка */
App.widget("trip", {
  name: "Поездка", icon: "travel", color: "#5856D6", desc: "последняя поездка и её стоимость", sizes: ["S"], size: "S",
  render(c) {
    const T = tripsAll(c.pf), k = Object.keys(T).sort((a, b) => T[b].d2 < T[a].d2 ? -1 : 1)[0]; if (!k) return null;
    const t = T[k];
    return { act: 'data-act="tripdet" data-k="' + esc(k) + '"', inner: wLab("Поездка") + '<span style="font-size:16px;font-weight:600;line-height:1.2" class="ell">' + esc(k) + '</span>' + wBig(D(t.v, t.d2.slice(0, 7)), 20) + '<span class="mut" style="font-size:12.5px">' + esc(periodLabel(t.d1, t.d2)) + '</span>' };
  }
});
