/* Экран «Капитал» */
"use strict";
/* ---------- Капитал ---------- */
function vCapital() {
  const ks = snapKeys(); const last = ks[ks.length - 1];
  const after = last ? allOps().some(o => o.d >= last) : true;
  const pf = curPf();
  const nowRUB = capitalNowRUB(pf);
  const eyebrow = last ? (after ? "Сейчас · снимок от " + dLabel(last) + " + операции" : "Снимок на " + dLabel(last)) : "Остатки по операциям";
  let html = navHead(pf === "all" ? "Капитал" : pfLabel(pf), eyebrow, curSeg(), headRight('<button class="gbtn icon glass" data-act="go" data-v="reconcile" aria-label="Сверка остатков">' + svg("recon", 22) + '</button>')) + pfBar();
  const big = D(nowRUB, null);
  html += '<div style="padding:14px 4px 0;display:flex;flex-direction:column;gap:8px"><div class="big n' + (big.length > 15 ? " s" : "") + '">' + big + '</div>';
  let dc = null;
  if (last && last < TODAYS) dc = decomp(last, "now", pf); else if (ks.length >= 2) dc = decomp(ks[ks.length - 2], last, pf);
  const dcM = dc ? (dc.B === "now" ? curM() : dc.B.slice(0, 7)) : curM();
  const r = rateM(curM());
  html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + (dc ? '<span class="chip glass n ' + (dc.delta >= 0 ? "pos" : "neg") + '" title="с ' + esc(dLabel(dc.A)) + '">' + D(dc.delta, dcM, { sign: true }) + ' · ' + (dc.delta >= 0 ? "+" : "−") + Math.abs(dc.delta / dc.tA * 100).toFixed(1).replace(".", ",") + '%</span>' : "") + '<span class="n" style="font-size:13px;color:var(--label2)">$ = ' + nf(r.usd, 2) + ' ₽ · ₽ = ' + nf(r.uzs, 2) + ' сум</span></div></div>';
  const B = {}; let REM = "";
  // chart: bars by months / years with drill-down
  if (ks.length >= 2) {
    const P = capPoints(pf), yearsMode = UI.capMode === "y" && !UI.capYear;
    const head = UI.capYear ? '<button class="gbtn glass back" data-act="capback" style="height:34px;font-size:15px">' + svg("back", 18) + 'Все годы</button><h2 style="font-size:17px;font-weight:600;margin-left:6px">' + UI.capYear + '</h2>' : '<h2 style="font-size:17px;font-weight:600">' + (yearsMode ? "По годам" : "12 мес" + (P.some(p => p.key === "now") ? " и сейчас" : "")) + '</h2>';
    const seg = '<div class="seg glass mini" role="group" aria-label="Период">' + [["m", "Месяцы"], ["y", "Годы"]].map(x => '<button data-act="capmode" data-v="' + x[0] + '" aria-pressed="' + ((x[0] === "y") === (yearsMode || !!UI.capYear)) + '">' + x[1] + '</button>').join("") + '</div>';
    B.chart = '<section class="sec"><div class="card" style="padding:14px 16px 8px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:4px;flex:1;min-width:0">' + head + '</div>' + seg + '</div>' + capBars(P, yearsMode ? "capy" : "capm", UI.capSel) + '<p class="foot" style="padding:0 0 6px">' + (yearsMode ? "Нажмите на год, чтобы увидеть его по месяцам." : "Нажмите на точку — ниже появится разбор изменения за этот месяц.") + '</p></div></section>';
    const ps = UI.capSel && !yearsMode ? P.find(p => p.key === UI.capSel || p.m === UI.capSel) : null;
    if (ps && ps.prev) dc = decomp(ps.prev, ps.key, pf);
    else if (UI.capYear && !yearsMode) { const fk = P[0].key, lk = P[P.length - 1].key; if (fk && fk !== lk) dc = decomp(fk, lk, pf); }
  }
  // decomposition
  if (dc) {
    const mb = dc.B === "now" ? curM() : dc.B.slice(0, 7);
    const rows = [["Сбережения", "доходы минус траты, проценты", dc.save, "#34C759", "save"], ["Курсовая разница", "переоценка сумов, $ и € в рублях", dc.fx, "#30B0C7", "fx"], ["Брокер и фонды", "купоны и переоценка", dc.inv, "#5856D6", "broker"]];
    if (Math.abs(dc.oneoff) > 0.5) rows.push(["Разовые поступления", "продажа имущества", dc.oneoff, "#FF9500", "star"]);
    if (Math.abs(dc.xfer) > 0.5) rows.push(["Переводы между портфелями", "пришло из других минус ушло в другие", dc.xfer, "#8E8E93", "fx"]);
    if (pf !== "all" && pf !== "inv") rows.splice(2, 1);
    B.decomp = '<section class="sec"><h2 style="padding:0 4px">' + (dc.B === "now" ? "Откуда изменение с " + dLabel(dc.A) : "Откуда изменение с " + (+dc.A.slice(8)) + " " + MONG[+dc.A.slice(5, 7) - 1] + " " + dc.A.slice(0, 4) + " по " + (+dc.B.slice(8)) + " " + MONG[+dc.B.slice(5, 7) - 1] + " " + dc.B.slice(0, 4)) + '</h2><div class="group">' + rows.map(x => '<div class="row"><span class="tile" style="background:' + x[3] + '">' + svg(x[4], 18) + '</span><div class="body"><span class="t"><b>' + x[0] + '</b><small>' + x[1] + '</small></span><span class="v n ' + (x[2] < 0 ? "neg" : "") + '">' + D(x[2], mb, { sign: true }) + '</span></div></div>').join("") + '</div></section>';
  }
  // structure
  const groups = { "Банки и депозиты": 0, "Брокерские счета": 0, "Наличные": 0, "Фонды": 0 }; const byCur = {};
  let tot = 0;
  for (const a of accs()) {
    if (!a.inCap || a.archived || !pfHas(a, pf)) continue;
    const v = toRUB(balanceAt(a.id, TODAYS), a.cur, curM()); tot += v;
    const g = a.type === "broker" ? "Брокерские счета" : a.type === "fund" ? "Фонды" : a.type === "cash" ? "Наличные" : "Банки и депозиты";
    groups[g] += v; byCur[a.cur] = (byCur[a.cur] || 0) + v;
  }
  const gc = { "Банки и депозиты": "#007AFF", "Брокерские счета": "#5856D6", "Наличные": "#34C759", "Фонды": "#AEAEB2" };
  const pct = v => tot ? (v / tot * 100) : 0;
  B.struct = '<section class="sec"><div class="sechead"><h2>Из чего состоит</h2><a href="#accounts" data-act="go" data-v="accounts">Счета</a></div><div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="stack">' +
    Object.keys(groups).filter(g => groups[g] > 0).map(g => '<i style="width:' + pct(groups[g]).toFixed(2) + '%;background:' + gc[g] + '"></i>').join("") + '</div>' +
    Object.keys(groups).filter(g => Math.abs(groups[g]) > 0.5).map(g => '<div class="legend"><span class="dot" style="background:' + gc[g] + '"></span><span style="flex:1">' + g + '</span><span class="n mut">' + Math.round(pct(groups[g])) + '%</span><span class="n" style="font-weight:600;min-width:120px;text-align:right">' + D(groups[g]) + '</span></div>').join("") +
    '<div class="pills" style="border-top:1px solid var(--sep);padding-top:12px"><span class="mut" style="font-size:13px;padding-top:4px">Валюты</span>' + Object.keys(byCur).filter(c => Math.abs(pct(byCur[c])) >= 0.05).sort((a, b) => byCur[b] - byCur[a]).map(c => '<span class="pill n">' + SYM[c] + ' ' + pct(byCur[c]).toFixed(1).replace(".", ",").replace(",0", "").replace("-", "−") + '%</span>').join("") + '</div></div></section>';
  // main accounts
  const mains = accs().filter(a => a.main && !a.archived && pfHas(a, pf)).sort((x, y) => (x.order || 0) - (y.order || 0));
  if (mains.length) B.mains = '<section class="sec"><div class="sechead"><h2>Основные счета</h2><a href="#accounts" data-act="go" data-v="accounts">Все счета</a></div><div class="mains">' + mains.map(mainCard).join("") + '</div></section>';
  // курсы не заданы: суммы в разных валютах пересчитаны по примерным курсам — честно предупреждаем
  if (ratesMissing() && accs().some(a => !a.archived && a.cur !== "RUB")) REM += '<section class="sec"><div class="warn" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="flex:1;min-width:180px;font-size:15px;line-height:1.35">Курсы валют ещё не внесены — суммы в других валютах пересчитаны по примерным курсам.</span><button class="chipb" data-act="go" data-v="rates" style="height:36px">Внести курсы</button></div></section>';
  // file backup reminder
  const u = PZ(), lbk = mySt().lastBackup, lim = u.remFile == null ? (bkCfg().freq ? 30 : 7) : +u.remFile;
  if (DL && lim && (!lbk || days(lbk, TODAYS) > lim)) REM += '<section class="sec"><div class="warn" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="flex:1;min-width:180px;font-size:15px;line-height:1.35">' + (lbk ? "Файл с копией не сохраняли с " + esc(dLabel(lbk)) : "Файл с копией базы еще не сохраняли") + '. Автокопии хранятся внутри приложения — на случай его удаления сохраните файл к себе.</span><button class="chipb" data-act="backup" style="height:36px">Скачать копию</button></div></section>';
  // debts
  const dt = debtsTotalRUB(), dn = ((S.debts && S.debts.list) || []).filter(d => debtCalc(d).bal > 0.5).length;
  if (dn && pf === "all") B.debts = '<section class="sec"><button class="group row" data-act="go" data-v="debts" style="padding-left:16px;min-height:64px"><span class="tile" style="background:#FF9500">' + svg("person", 18) + '</span><span class="body" style="border:0"><span class="t"><b>Вам должны</b><small>' + dn + ' чел. · с процентами</small></span><span class="v n">' + D(dt) + '</span><span class="chev">›</span></span></button><p class="foot">Справочно. Долги не входят в капитал — их могут не вернуть.</p></section>';
  // reconcile reminder
  if (last && +u.remRecon) {
    const next = addMonth(last.slice(0, 7), 1) + "-01", thr = next.slice(0, 8) + String(+u.remRecon).padStart(2, "0");
    if (next <= TODAYS && TODAYS >= thr) REM += '<section class="sec"><button class="btn alt" data-act="go" data-v="reconcile" style="justify-content:space-between;padding:0 20px">Внести остатки на ' + dLabel(next) + '<span>›</span></button></section>';
  }
  NARROW = window.innerWidth < 760;
  let L = "", R = "";
  for (const b of u.blocks) { if (!b.on || !B[b.id]) continue; if (NARROW || ["chart", "struct", "mains"].includes(b.id)) L += B[b.id]; else R += B[b.id]; }
  return html + cols(L, R + REM);
}

/* ---------- действия модуля ---------- */
App.actions({
  capmode: t => { UI.capMode = t.dataset.v; UI.capYear = null; UI.capSel = null; render(); },
  capback: () => { UI.capYear = null; UI.capSel = null; UI.capMode = "y"; render(); }
});

/* ---------- экраны модуля ---------- */
App.view("capital", vCapital);
