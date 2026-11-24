/* Экран «Траты в день»: средние траты в день за месяц — по дням и по категориям, против обычного уровня.
   Открывается из виджета «Месяц» на Главной и из Аналитики → Траты. Набор категорий — общий с виджетом. */
"use strict";
const DY_BACK = { home: "Главная", analytics: "Аналитика" };
function vDaily() {
  const pf = curPf(), cm = curM();
  if (!UI.dyM || UI.dyM > cm) UI.dyM = cm;
  const m = UI.dyM, D = dailyMonth(m, pf), M = v => money(v, UI.cur);
  if (UI.dyDay && UI.dyDay.slice(0, 7) !== m) UI.dyDay = null;
  const from = DY_BACK[UI.dyFrom] ? UI.dyFrom : "home";
  const nav = '<div style="display:flex;gap:6px"><button class="mbtn glass" data-act="dym" data-k="-1" aria-label="Предыдущий месяц">‹</button><button class="mbtn glass" data-act="dym" data-k="1" aria-label="Следующий месяц"' + (m >= cm ? " disabled" : "") + '>›</button></div>';
  let html = navHead("Траты в день", mLabel(m, true) + (D.partial ? " · по " + dLabel(TODAYS) : ""), backBtn(from, DY_BACK[from]), headRight(nav)) + pfBar();
  // итог
  const up = D.diff > 0.05, pct = D.n && D.usual ? '<span class="n" style="font-weight:600;color:' + (up ? "var(--orangeT)" : "var(--green)") + '">' + (D.diff >= 0 ? "+" : "−") + Math.abs(Math.round(D.diff * 100)) + "%</span>" : "";
  const exN = D.excluded.length;
  let L = '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:10px">' +
    '<div class="wrow" style="align-items:flex-end;flex-wrap:wrap"><div><div class="mut" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.02em">В среднем в день</div><div class="n" style="font-size:32px;font-weight:700;line-height:1.1">' + M(D.avg) + '</div></div>' +
    '<div style="text-align:right"><div class="mut" style="font-size:13px">обычно</div><div class="n" style="font-size:17px;font-weight:600">' + (D.n ? M(D.usual) : "—") + ' ' + pct + '</div></div></div>' +
    '<div class="mut n" style="font-size:13px;line-height:1.4">' + D.days + " " + pl(D.days, "день", "дня", "дней") + " · всего " + M(D.total) + (exN ? " · без " + exN + " " + pl(exN, "категории", "категорий", "категорий") : "") +
    ' · <a href="#" data-act="wcfg" data-k="daily">Настроить</a></div>' +
    dayBars(D) + '<p class="foot" style="margin:0">Нажмите на день — ниже появятся его траты. Пунктир — обычные траты в день.</p></div></section>';
  // выбранный день
  if (UI.dyDay) {
    const ops = allOps().filter(o => o.d === UI.dyDay && o.t === "e" && opPf(o, pf)), ex = new Set(D.excluded);
    const tot = ops.filter(o => !ex.has(o.c)).reduce((s, o) => s + fromRUB(opRUB(o), UI.cur, m), 0);
    L += '<section class="sec"><div class="sechead"><h2>' + esc(dLabel(UI.dyDay)) + '</h2><button class="chipb" data-act="dydayx" style="height:30px;font-size:13px">' + M(tot) + ' ×</button></div>' +
      (ops.length ? '<div class="group">' + ops.map(o => opRow(o, null, false)).join("") + '</div>' + (ops.some(o => ex.has(o.c)) ? '<p class="foot">Траты исключённых категорий (' + esc([...new Set(ops.filter(o => ex.has(o.c)).map(o => o.c))].join(", ")) + ') в сумму дня не входят.</p>' : "") : '<div class="card mut">В этот день трат не было.</div>') + '</section>';
  }
  // категории
  const mx = Math.max(1e-9, ...D.cats.map(x => Math.max(x.now, x.usual)));
  let R = '<section class="sec"><div class="sechead"><h2>По категориям</h2><span class="mut" style="font-size:13px">в день</span></div>' +
    (D.cats.length ? '<div class="group">' + D.cats.map(x => {
      const p = x.diff == null ? "" : x.month === 0 ? '<span class="mut" style="font-size:13px">нет трат</span>' : '<span class="n" style="font-size:13px;font-weight:600;color:' + (x.diff > 0.05 ? "var(--orangeT)" : x.diff < -0.05 ? "var(--green)" : "var(--muted)") + '">' + (x.diff >= 0 ? "+" : "−") + Math.abs(Math.round(x.diff * 100)) + "%</span>";
      return '<button class="row" data-act="dycat" data-c="' + esc(x.c) + '">' + catTile(x.c) + '<span class="body" style="flex-direction:column;align-items:stretch;gap:5px"><span class="wrow"><span class="ell" style="font-size:16px">' + esc(x.c) + '</span><span class="n" style="font-weight:700;white-space:nowrap">' + M(x.now) + ' ' + p + '</span></span>' +
        '<span class="bar" style="height:5px;position:relative"><i style="width:' + (x.now / mx * 100).toFixed(1) + '%;background:' + catColor(x.c) + '"></i>' + (x.usual ? '<span class="wmark" style="left:calc(' + (x.usual / mx * 100).toFixed(1) + '% - 1px);top:-3px;height:11px"></span>' : "") + '</span>' +
        '<small class="mut n" style="font-size:12.5px">обычно ' + M(x.usual) + ' · за месяц ' + M(x.month) + '</small></span><span class="chev" aria-hidden="true">›</span></button>';
    }).join("") + '</div><p class="foot">Чёрная отметка на полосе — обычный уровень. Нажмите на категорию — откроются её платежи.</p>' : '<div class="card mut">Трат в учитываемых категориях пока нет.</div>') + '</section>';
  R += '<section class="sec"><div class="sechead"><h2>Не учитываются</h2><a href="#" data-act="wcfg" data-k="daily">Настроить</a></div>' +
    (D.excl.length ? '<div class="group">' + D.excl.map(x => '<button class="row" data-act="dycat" data-c="' + esc(x.c) + '">' + catTile(x.c) + '<span class="body"><span class="t"><b>' + esc(x.c) + '</b><small>не входит в среднее</small></span><span class="v n">' + M(x.month) + '</span><span class="chev" aria-hidden="true">›</span></span></button>').join("") + '</div>' :
      '<div class="card mut" style="font-size:15px">' + (D.excluded.length ? "В этом месяце трат в исключённых категориях не было: " + esc(D.excluded.join(", ")) + "." : "Учитываются все категории.") + '</div>') + '</section>';
  return html + cols(L, R);
}
/** Столбики по дням месяца; пунктир — обычные траты в день; дни после сегодня — пустые. */
function dayBars(D) {
  const n = D.dim, W = 340, H = 150, pl = 4, pr = 4, pt = 16, pb = 22, bw = (W - pl - pr) / n;
  const mx = Math.max(D.usual * 1.15, ...D.byDay, 1), Y = v => pt + (H - pt - pb) * (1 - v / mx);
  const sel = UI.dyDay ? +UI.dyDay.slice(8) - 1 : -1;
  let s = "";
  if (D.usual > 0) { const y = Y(D.usual).toFixed(1); s += '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--label)" stroke-opacity=".55" stroke-dasharray="4 4"/><text x="' + W + '" y="' + (+y - 4) + '" text-anchor="end" font-size="9.5" fill="var(--muted)" stroke="var(--card)" stroke-width="3" paint-order="stroke">обычно ' + esc(shortM(D.usual, UI.cur)) + '</text>'; }
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = pl + i * bw, v = D.byDay[i], future = i >= D.days, h = future ? 2 : Math.max(v > 0 ? 2 : 0, H - pb - Y(v));
    const col = future ? "var(--fill2)" : v > D.usual * 2 && D.usual > 0 ? "var(--orange)" : "var(--blue)";
    s += '<rect x="' + (x + bw * 0.14).toFixed(1) + '" y="' + (H - pb - h).toFixed(1) + '" width="' + (bw * 0.72).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(3, bw * 0.3).toFixed(1) + '" fill="' + col + '"' + (sel >= 0 && sel !== i && !future ? ' opacity=".35"' : "") + '/>';
    if (i === 0 || (i + 1) % 5 === 0 || i === n - 1) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="9.5" fill="' + (i === sel ? "var(--link)" : "var(--muted)") + '" font-weight="' + (i === sel ? 700 : 500) + '">' + (i + 1) + '</text>';
    if (!future) { const d = D.m + "-" + String(i + 1).padStart(2, "0"); pts.push({ x: x + bw / 2, y: H - pb - h, label: dLabel(d), value: money(v, UI.cur), sub: D.usual ? (v >= D.usual ? "+" : "−") + Math.abs(Math.round((v - D.usual) / D.usual * 100)) + "% к обычному дню" : "", dot: false, m: d, hint: i === sel ? "выбран · нажмите еще раз, чтобы снять" : "нажмите — траты этого дня" }); }
  }
  return ichart(s, W, H, pts, { aria: "Траты по дням месяца, в среднем " + money(D.avg, UI.cur) + " в день. Нажмите на день, чтобы увидеть его траты.", pick: "dyday", guideTop: pt - 6, guideBottom: H - pb });
}
PICK.dyday = p => { UI.dyDay = UI.dyDay === p.m ? null : p.m; };

App.actions({
  /** открыть экран: data-m — месяц, data-from — куда вернуться */
  godaily: t => { UI.dyM = t.dataset.m || curM(); UI.dyFrom = t.dataset.from || "home"; UI.dyDay = null; go("daily"); },
  dym: t => { const m = addMonth(UI.dyM || curM(), +t.dataset.k); if (m > curM()) return; UI.dyM = m; UI.dyDay = null; render(); },
  dydayx: () => { UI.dyDay = null; render(); },
  dycat: t => { UI.det = { kind: "cat", key: t.dataset.c, m: UI.dyM || curM(), from: "daily" }; UI.dper = "m"; go("detail"); }
});
App.view("daily", vDaily, { section: () => UI.dyFrom === "analytics" ? "analytics" : "home" });
