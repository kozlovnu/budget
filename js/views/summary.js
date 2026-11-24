/* Экран «Итоги» и консультант Claude */
"use strict";
const LVL = { good: ["#34C759", "Хорошо"], info: ["#007AFF", "Заметка"], warn: ["#FF9500", "Внимание"], bad: ["#FF3B30", "Риск"], high: ["#FF3B30", "Высокий"], medium: ["#FF9500", "Средний"], low: ["#8E8E93", "Низкий"] };
/** Вкладка «Итоги» в Аналитике: итоги месяца против обычного уровня. */
function vSummary() {
  if (!UI.advm) UI.advm = advDefaultM();
  const pf = curPf(); const m = UI.advm, A = advData(m, pf), k = A.k, b = A.b, M = v => money(v, UI.cur);
  const partial = m === curM();
  const nav = '<div style="display:flex;align-items:center;gap:6px"><button class="mbtn glass" data-act="advm" data-k="-1" aria-label="Предыдущий месяц">‹</button><button class="mbtn glass" data-act="advm" data-k="1" aria-label="Следующий месяц"' + (partial ? " disabled" : "") + '>›</button></div>';
  // Итоги — третья вкладка Аналитики: заголовок, портфель и валюта уже есть сверху, здесь — только месяц
  let html = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px"><div style="min-width:0"><div style="font-size:22px;font-weight:700;line-height:1.2">' + esc(mLabel(m, true)) + '</div><div class="mut" style="font-size:13px">' + (partial ? "по " + esc(dLabel(TODAYS)) + " · " : "") + "сравнение со средним за " + (A.base.length || 0) + ' мес до него</div></div>' + nav + '</div>';
  const kp = (t, v, bv, inv, sub) => '<div class="kpi"><small>' + t + '</small><b class="n">' + v + '</b><span class="n">' + (bv != null ? dPct(k[bv], b[bv], inv) + ' <span class="mut">к ' + M(b[bv]) + '</span>' : sub || "") + '</span></div>';
  let L = '<section class="sec"><div class="card kpis">' +
    kp("Регулярные доходы", M(k.reg), "reg", true) + kp("Расходы", M(k.exp), "exp") +
    kp("Сбережения", M(k.save), "save", true) +
    kp("Норма сбережений", k.rate != null ? Math.round(k.rate * 100) + "%" : "—", null, false, b.rate != null ? '<span class="mut">было ' + Math.round(b.rate * 100) + "%</span>" : "") +
    '</div>' + (k.one > 0 ? '<p class="foot">Плюс разовые доходы (премии, продажа имущества) — ' + M(k.one) + '. В сбережения и норму они не включены.</p>' : "") + (Math.abs(k.xf) > 0.5 ? '<p class="foot">Переводы ' + (k.xf > 0 ? "из других портфелей: +" : "в другие портфели: −") + M(Math.abs(k.xf)) + ' (обычно ' + (b.xf >= 0 ? "+" : "−") + M(Math.abs(b.xf)) + '). В доходы и расходы портфеля не входят.</p>' : "") + (k.trip > 0 ? '<p class="foot">В расходах поездки — ' + M(k.trip) + '. Без них: ' + M(k.exp - k.trip) + ' (обычно ' + M(b.exp - b.trip) + ').</p>' : "") + '</section>';
  // spikes
  const sp = A.cats.filter(r => r.flag);
  L += '<section class="sec"><div class="sechead"><h2>Всплески и отклонения</h2></div>';
  if (!sp.length) L += '<div class="card mut">Существенных отклонений от обычного уровня нет.</div>';
  else L += '<div class="group">' + sp.map(r => {
    const dr = r.drivers;
    const why = dr ? (dr.subs.filter(s => s.d > 0).map(s => esc(s.s) + " +" + M(s.d)).join(", ") + (dr.top.length ? '<br>Крупнейшие: ' + dr.top.map(o => esc(o.n || o.s || o.ac) + " " + M(o.v) + " (" + (+o.d.slice(8)) + "." + o.d.slice(5, 7) + ")").join("; ") : "")) : "Ниже обычного уровня";
    return '<button class="row" data-act="advcat" data-c="' + esc(r.c) + '" style="padding-right:0">' + catTile(r.c) + '<span class="body" style="flex-direction:column;align-items:stretch;gap:4px;padding-right:16px"><span style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(r.c) + '</b><span class="n">' + dPct(r.cur, r.base) + ' ' + M(r.cur) + '</span></span><small class="mut" style="font-size:13px;line-height:1.35">обычно ' + M(r.base) + ' · ' + why + '</small></span></button>';
  }).join("") + '</div>';
  L += '<p class="foot">Все категории с динамикой за 12 месяцев — в <a href="#analytics" data-act="go" data-v="analytics">Аналитике</a>.</p></section>';
  if (pf === "all") L += safeBlock("Игра", () => gameMiniRow(m));
  // right: consultant
  let R = '<section class="sec"><div class="sechead"><h2>Консультант</h2></div>' + advAI(A) + '</section>';
  R += '<section class="sec"><div class="sechead"><h2>Наблюдения</h2></div><div class="group">' + advNotes(A).map(x => '<div class="row" style="align-items:flex-start;padding-top:12px;padding-bottom:12px"><span class="lvl" style="background:' + LVL[x.l][0] + '"></span><span class="body" style="flex-direction:column;align-items:stretch;gap:3px;border:0;padding-right:16px"><b style="font-weight:600">' + esc(x.t) + '</b><small class="mut" style="font-size:13px;line-height:1.35">' + esc(x.d) + '</small></span></div>').join("") + '</div></section>';
  // income
  R += '<section class="sec"><div class="sechead"><h2>Доходы</h2><span class="mut hidem" style="font-size:13px">12 мес · месяц</span></div><div class="group">' + A.incs.map(r =>
    '<div class="row adrow"><span class="tile" style="background:#34C759">' + svg("save", 18) + '</span><span class="body"><span class="t"><b>' + esc(r.c) + '</b><small class="n">обычно ' + M(r.base) + '</small></span>' + spark(r.series, "#34C759") + '<span class="v n" style="text-align:right">' + M(r.cur) + '<br>' + dPct(r.cur, r.base, true) + '</span></span></div>').join("") + '</div></section>';
  return html + cols(L, R);
}
function advAI(A) {
  const st = S.advice && S.advice.m === A.m && S.advice.cur === UI.cur && (S.advice.pf || "all") === A.pf ? S.advice : null;
  if (UI.advBusy) return '<div class="card" style="display:flex;flex-direction:column;gap:10px;align-items:flex-start"><b>Консультант разбирает ' + esc(mLabel(A.m)) + '…</b><span class="mut" style="font-size:14px">Обычно это занимает до минуты.</span></div>';
  if (!SAMPLE) return '<div class="card mut" style="font-size:15px">Разбор консультанта работал через Claude и в этой версии приложения недоступен. Ниже — автоматические наблюдения.</div>';
  if (!st) return '<div class="card" style="display:flex;flex-direction:column;gap:12px"><span style="font-size:15px;line-height:1.4">Claude посмотрит на цифры месяца, динамику категорий, всплески, капитал и подушку и даст выводы и план действий.</span><button class="btn pri" data-act="advrun">Получить разбор за ' + esc(mLabel(A.m)) + '</button></div>';
  const r = st.res || {}, li = a => (a || []).map(x => '<li>' + esc(x) + '</li>').join("");
  let h = '<div class="card adv" style="display:flex;flex-direction:column;gap:14px">';
  if (r.headline) h += '<b style="font-size:19px;line-height:1.3">' + esc(r.headline) + '</b>';
  if (r.summary) h += '<p style="margin:0;line-height:1.45">' + esc(r.summary) + '</p>';
  if ((r.good || []).length) h += '<div><h3>Что хорошо</h3><ul>' + li(r.good) + '</ul></div>';
  if ((r.risks || []).length) h += '<div><h3>На что обратить внимание</h3>' + r.risks.map(x => '<div class="arow"><span class="lvl" style="background:' + (LVL[x.level] || LVL.medium)[0] + '"></span><span><b>' + esc(x.title) + '</b><br><span class="mut">' + esc(x.detail) + '</span></span></div>').join("") + '</div>';
  if ((r.actions || []).length) h += '<div><h3>Что сделать</h3><ol>' + r.actions.map(x => '<li><b>' + esc(x.title) + '</b>' + (x.why ? '<br><span class="mut">Почему: </span>' + esc(x.why) : "") + (x.how ? '<br><span class="mut">Как: </span>' + esc(x.how) : "") + (x.effect ? '<br><span class="mut">Эффект: </span>' + esc(x.effect) : "") + '</li>').join("") + '</ol></div>';
  if ((r.watch || []).length) h += '<div><h3>За чем следить</h3><ul>' + li(r.watch) + '</ul></div>';
  if ((r.extra || []).length) h += '<div><h3>Еще советы</h3><ul>' + li(r.extra) + '</ul></div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><small class="mut">Разбор от ' + esc(dLabel(st.at.slice(0, 10))) + ' · не индивидуальная инвестиционная рекомендация</small><button class="chipb" data-act="advrun">Обновить</button></div></div>';
  return h;
}
function advPayload(A) {
  const R0 = v => Math.round(v), h = A.health, cr = v => R0(fromRUB(v, UI.cur, curM()));
  return {
    currency: UI.cur, portfolio: pfLabel(A.pf), transfers_net_from_other_portfolios: { month: R0(A.k.xf), base_avg: R0(A.b.xf) }, month: A.m, month_is_partial: A.m === curM(), base_months: A.base,
    totals: { income: R0(A.k.inc), income_regular: R0(A.k.reg), expenses: R0(A.k.exp), trips: R0(A.k.trip), savings: R0(A.k.save), savings_rate: A.k.rate != null ? +A.k.rate.toFixed(3) : null },
    totals_base_avg: { income: R0(A.b.inc), income_regular: R0(A.b.reg), expenses: R0(A.b.exp), trips: R0(A.b.trip), savings: R0(A.b.save), savings_rate: A.b.rate != null ? +A.b.rate.toFixed(3) : null },
    expense_categories: A.cats.slice(0, 18).map(r => ({ cat: r.c, month: R0(r.cur), base_avg: R0(r.base), avg_12m: R0(r.avg12), last_12m: r.series.map(R0), flag: r.flag || null, trend: r.trend || null, limit: r.lim ? R0(r.lim) : null, drivers: r.drivers ? { subcats: r.drivers.subs.map(s => ({ sub: s.s, month: R0(s.cur), base: R0(s.base) })), top_ops: r.drivers.top.map(o => ({ date: o.d, amount: R0(o.v), note: o.n || o.s })) } : null })),
    income_categories: A.incs.map(r => ({ cat: r.c, month: R0(r.cur), base_avg: R0(r.base), last_12m: r.series.map(R0) })),
    health_now: { capital: cr(h.capRUB), liquid: cr(h.liquidRUB), investments: cr(h.investRUB), deposits: cr(h.depRUB), avg_monthly_expenses_12m: cr(h.avgExpRUB), cushion_months: h.cushion != null ? +h.cushion.toFixed(1) : null, capital_12m_ago: h.cap12 ? { date: h.cap12.k, value: R0(fromRUB(h.cap12.rub, UI.cur, h.cap12.k.slice(0, 7))) } : null, currency_shares: h.curShare.filter(x => x.p >= 0.005).map(x => ({ cur: x.c, share: +x.p.toFixed(3) })), deposit_net_yield_annual: h.depYield != null ? +h.depYield.toFixed(4) : null, subscriptions_month_avg: R0(h.subsAvg), subscriptions_services: h.subsN, debts_owed_to_user: cr(h.debtsRUB) },
    rates: rateM(curM()), rule_notes: advNotes(A).map(x => x.t)
  };
}
async function advRun() {
  if (!SAMPLE || UI.advBusy) return;
  const A = advData(UI.advm || advDefaultM(), curPf());
  UI.advBusy = true; render();
  const prompt = "Ты — личный финансовый консультант. " + (mySt().about ? "О клиенте: " + mySt().about.trim() + " " : "") + "Счета клиента: " + accs().filter(a => !a.archived && a.inCap).map(a => a.name + " (" + (TYPEN[a.type] || a.type) + ", " + a.cur + ")").join("; ") + ". Долги, выданные людям, клиент сознательно не включает в капитал. «Премии» — разовые доходы. Поездки (категория «Путешествия») — нерегулярные траты.\n\n" +
    (A.pf !== "all" ? "ВАЖНО: разбор только по портфелю «" + pfLabel(A.pf) + "» (часть счетов клиента). Переводы между портфелями не являются доходом или расходом — они даны отдельно.\n\n" : "") + "Ниже — данные из его приложения учета за месяц " + A.m + " и сравнение со средним за предыдущие месяцы (base_avg). Все суммы — в валюте " + UI.cur + ", округлены. Опирайся ТОЛЬКО на эти цифры, ничего не выдумывай; если данных не хватает — так и скажи. Объясняй причины отклонений через drivers (подкатегории и крупнейшие операции). Давай конкретные, выполнимые рекомендации с цифрами, без советов купить конкретные ценные бумаги и без обещаний доходности. Можешь добавить полезные советы сверх запрошенного (налоги, валютные риски, цели, страхование, учет), если они следуют из данных.\n\n" +
    "Ответь ТОЛЬКО JSON-объектом на русском:\n{\"headline\":\"главный вывод одной фразой\",\"summary\":\"2–4 предложения: итог месяца и динамика\",\"good\":[\"что идет хорошо\"],\"risks\":[{\"title\":\"кратко\",\"detail\":\"причина и цифры\",\"level\":\"high|medium|low\"}],\"actions\":[{\"title\":\"что сделать\",\"why\":\"почему\",\"how\":\"как конкретно\",\"effect\":\"ожидаемый эффект в деньгах или %\"}],\"watch\":[\"за чем следить в следующем месяце\"],\"extra\":[\"другие советы консультанта\"]}\nНе больше 4 пунктов в каждом списке, actions — 3–5 пунктов по убыванию важности.\n\nДАННЫЕ:\n" + JSON.stringify(advPayload(A));
  try {
    const res = await SAMPLE.json(prompt, { modelTier: "complex" });
    if (!res || typeof res !== "object") throw { code: "invalid_json" };
    S.advice = { m: A.m, pf: A.pf, cur: UI.cur, at: new Date().toISOString(), res };
    UI.advBusy = false; render();
    try { await saveMeta("advice"); } catch (e) { /* saveMeta уже показал ошибку */ }
  } catch (e) {
    UI.advBusy = false; render();
    const code = e && e.code;
    toast(code === "not_granted" || code === "sampling_disabled" ? "Разбор Claude не разрешен в этом просмотре" : code === "rate_limited" ? "Слишком много запросов — попробуйте позже" : "Не получилось получить разбор, попробуйте еще раз");
  }
}

function tripsAll(pf) {
  const trips = {};
  for (const o of allOps()) if (o.t === "e" && TRIPCATS.includes(o.c) && o.s && opPf(o, pf)) { const t = trips[o.s] = trips[o.s] || { v: 0, n: 0, d1: o.d, d2: o.d }; t.v += opRUB(o); t.n++; if (o.d < t.d1) t.d1 = o.d; if (o.d > t.d2) t.d2 = o.d; }
  return trips;
}

/* ---------- действия модуля ---------- */
App.actions({
  advm: t => { const n = addMonth(UI.advm || advDefaultM(), +t.dataset.k); if (n > curM()) return; UI.advm = n; render(); },
  advrun: () => advRun(),
  advcat: t => { UI.aend = UI.advm; UI.det = { kind: "cat", key: t.dataset.c, m: UI.advm, from: "advice" }; UI.dper = "m"; go("detail"); }
});

/* ---------- экраны модуля ---------- */
/* старый адрес #advice ведёт на вкладку «Итоги» в Аналитике */
App.view("advice", () => { UI.atab = "summary"; UI.view = "analytics"; history.replaceState(null, "", "#analytics"); return vAnalytics(); }, { section: "analytics" });
