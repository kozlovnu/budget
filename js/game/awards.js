/* Игра: награды */
"use strict";
/* ---------- Игра: награды — 24 медали ---------- */
// Состояние — meta/game.aw: {id: {date, seen}}. Условия считаются из журнала, сверок и закрытых месяцев; полученные награды не отзываются.
const AW_RAR = [["Обычная", "#8E8E93"], ["Редкая", "#0A84FF"], ["Эпическая", "#BF5AF2"], ["Легендарная", "#FFD60A"]];
const AW_COL = [["a", "Накопления"], ["b", "Серии"], ["c", "Бюджет"], ["d", "Капитал"]];
const AW = [
  { id: "a1", n: "Первая тысяча", why: "Сбережения с начала учёта достигли $1 000", r: 0, g: "#FFC94A", info: "Сумма сбережений всех закрытых месяцев: регулярные доходы минус обычные траты, в долларах по курсу каждого месяца." },
  { id: "a2", n: "Подушка безопасности", why: "Ликвидные деньги покрывают 3 месяца обычных трат", r: 0, g: "#59B8FF", info: "Карты, вклады и наличные на конец закрытого месяца, деленные на средние обычные траты за 12 месяцев (без поездок и нерегулярных)." },
  { id: "a3", n: "Норма сбережений", why: "За месяц отложено 20% регулярного дохода", r: 1, g: "#9B6BFF", info: "Норма сбережений закрытого месяца без разовых доходов и трат." },
  { id: "a4", n: "Золотая копилка", why: "6 месяцев подряд норма сбережений не ниже цели", r: 1, g: "#FF9A7A", info: "Цель нормы сбережений задается в Настройки → Игра. Пропущенный месяц или месяц ниже цели обрывают серию." },
  { id: "a5", n: "Миллионер", why: "Капитал достиг $1 000 000", r: 3, g: "#B9A8FF", info: "Капитал на конец закрытого месяца или сейчас, в долларах по курсу месяца." },
  { id: "a6", n: "Фонд мечты", why: "Ликвидные деньги покрывают год обычных трат", r: 2, g: "#7C8CFF", info: "Та же подушка, но на 12 месяцев: год жизни без дохода." },
  { id: "b1", n: "Семь дней", why: "7 дней подряд с операциями в журнале", r: 0, g: "#FF7A1A", info: "День засчитывается, если в журнале есть хотя бы одна операция с этой датой. Серия жива, пока операции есть сегодня или вчера." },
  { id: "b2", n: "Месяц без пропусков", why: "30 дней подряд с операциями в журнале", r: 1, g: "#FF5CB8", info: "День засчитывается, если в журнале есть хотя бы одна операция с этой датой." },
  { id: "b3", n: "Сотня", why: "100 дней подряд с операциями в журнале", r: 2, g: "#3CE59A", info: "День засчитывается, если в журнале есть хотя бы одна операция с этой датой." },
  { id: "b4", n: "Целый год", why: "365 дней подряд с операциями в журнале", r: 3, g: "#F6C254", info: "День засчитывается, если в журнале есть хотя бы одна операция с этой датой." },
  { id: "b5", n: "Ранняя пташка", why: "3 месяца подряд откладываете в первые 3 дня после зарплаты", r: 1, g: "#FFB02E", info: "Месяц засчитывается, если в течение 3 дней после дохода «Зарплата» был перевод на вклад, брокерский счёт или в фонд. Сначала заплатить себе — потом тратить." },
  { id: "b6", n: "Ночной аудитор", why: "Сверка остатков 6 месяцев подряд", r: 1, g: "#6A6BFF", info: "Снимок остатков на 1-е число каждого месяца без пропусков." },
  { id: "c1", n: "В рамках бюджета", why: "Все траты месяца уложились в лимиты", r: 0, g: "#FF6A55", info: "Закрытый месяц, в котором ни одна категория с лимитом не превышена и общий лимит соблюден. Разовые траты не учитываются." },
  { id: "c2", n: "Холодная голова", why: "Выполнены 3 челленджа месяца", r: 1, g: "#8FA0C0", info: "Челленджи принимаются на экране «Итоги»: не тратить в категории больше выбранного порога." },
  { id: "c3", n: "Месяц в плюсе", why: "3 месяца подряд доходы выше расходов", r: 0, g: "#4CE06E", info: "Регулярные доходы закрытого месяца больше всех его расходов." },
  { id: "c4", n: "Ноль долгов", why: "Все выданные займы вернули", r: 1, g: "#B9B0FF", info: "Ни у одного должника в разделе «Долги» нет остатка." },
  { id: "c5", n: "Экономный месяц", why: "Обычные траты на 15% ниже среднего за полгода", r: 1, g: "#9BE15D", info: "Траты закрытого месяца без поездок и нерегулярных против среднего за предыдущие 6 закрытых месяцев (нужно хотя бы 3)." },
  { id: "c6", n: "Мастер категорий", why: "Лимиты заданы для 6 категорий", r: 0, g: "#BF5AF2", info: "Лимиты задаются в Настройки → Категории и лимиты." },
  { id: "d1", n: "Рост +10%", why: "Капитал вырос на 10% за 12 месяцев", r: 1, g: "#2EE6B0", info: "Рост капитала за 12 месяцев без разовых поступлений и трат. Нужен снимок капитала годом раньше." },
  { id: "d2", n: "Диверсификация", why: "Деньги лежат на счетах 4 разных типов", r: 2, g: "#A58BFF", info: "Типы счетов в капитале с положительным остатком: карта, депозит, брокерский, фонд, наличные, другое." },
  { id: "d3", n: "Первый инвестор", why: "На брокерском счёте или в фонде есть деньги", r: 0, g: "#3E7BFF", info: "Брокерский счёт или фонд в капитале с положительным остатком." },
  { id: "d4", n: "Мультивалюта", why: "Капитал хранится в 3 валютах", r: 1, g: "#3AA8FF", info: "Валюты счетов в капитале с положительным остатком." },
  { id: "d5", n: "Идеальная сверка", why: "3 сверки подряд сошлись с журналом", r: 2, g: "#4FDDB4", info: "Остатки карт, наличных и вкладов на 1-е число совпали с журналом с точностью до 1%. Брокер и фонды не учитываются — их переоценка в журнал не пишется." },
  { id: "d6", n: "Легенда", why: "Получены все остальные 23 награды", r: 3, g: "#7A5CFF", info: "Высшая награда коллекции." }
];
const AW_STAR = "M0-9Q0 0 9 0Q0 0 0 9Q0 0-9 0Q0 0 0-9Z";
let AW_C = null;
function awUSD(v, m) { return fromRUB(v, "USD", m); }
function awNextD(d) { return iso(new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8) + 1)); }
// серия по упорядоченным ключам: date — ключ, на котором серия впервые достигла цели; cur — текущая серия, если она еще жива
function awStreak(items, target, alive) {
  let run = 0, prev = null, date = null, best = 0;
  for (const it of items) { run = it.ok ? (prev != null && addMonth(prev, 1) === it.k ? run : 0) + 1 : 0; prev = it.k; if (run > best) best = run; if (!date && run >= target) date = it.k; }
  return { date, best, cur: prev != null && alive(prev) ? run : 0 };
}
function awCalc() {
  const g = gameS(), data = gameData(), ops = allOps(), cm = curM(), pm = addMonth(cm, -1);
  const sig = JSON.stringify([g.challenges, g.rateTarget, S.debts, cm, TODAYS]);
  if (AW_C && AW_C.data === data && AW_C.ops === ops && AW_C.snaps === S.snaps && AW_C.acc === S.accounts && AW_C.st === S.settings && AW_C.sig === sig) return AW_C.res;
  const list = data.list, lr = list[list.length - 1] || null, R = {};
  const first = fn => { for (const r of list) if (fn(r)) return r.m; return null; };
  const mon = m => MONP[+m.slice(5) - 1];
  // накопления
  { let cum = 0, date = null; for (const r of list) { cum += awUSD(r.saveCore != null ? r.saveCore : r.save, r.m); if (!date && cum >= 1000) date = r.m; }
    R.a1 = { date, cur: cum, tgt: 1000, ptxt: "$" + nf(Math.max(0, cum), 0).replace(/ /g, " ") + " из $1 000", hint: list.length ? "Сбережения за " + list.length + " " + pl(list.length, "закрытый месяц", "закрытых месяца", "закрытых месяцев") + "." : "Закрытых месяцев с доходами и расходами пока нет." }; }
  const cu = lr ? lr.cushion : null, cuH = lr && cu != null ? "На конец " + MONG[+lr.m.slice(5) - 1] + ": " + gNum(cu) + " мес." : "Нет данных по ликвидным деньгам или тратам.";
  R.a2 = { date: first(r => r.cushion != null && r.cushion >= 3), cur: cu, tgt: 3, ptxt: cu == null ? "нет данных" : gNum(cu) + " из 3 мес", hint: cuH };
  R.a6 = { date: first(r => r.cushion != null && r.cushion >= 12), cur: cu, tgt: 12, ptxt: cu == null ? "нет данных" : gNum(cu) + " из 12 мес", hint: cuH };
  const rt = lr ? lr.rateCore : null;
  R.a3 = { date: first(r => r.rateCore != null && r.rateCore >= 0.2), cur: rt, tgt: 0.2, ptxt: rt == null ? "нет данных" : gPct(Math.max(0, rt)) + " из 20%", hint: lr && rt != null ? "В " + mon(lr.m) + " отложено " + gPct(rt) + " регулярного дохода." : "" };
  { const gl = g.rateTarget / 100, s = awStreak(list.map(r => ({ k: r.m, ok: r.rateCore != null && r.rateCore >= gl })), 6, k => k === pm);
    R.a4 = { date: s.date, cur: s.cur, tgt: 6, ptxt: s.cur + " из 6 мес", hint: "Цель нормы — " + g.rateTarget + "%. Рекорд — " + s.best + " " + pl(s.best, "месяц", "месяца", "месяцев") + " подряд." }; }
  { const now = awUSD(capitalNowRUB(), cm); let date = first(r => r.capEnd != null && awUSD(r.capEnd, r.m) >= 1e6); if (!date && now >= 1e6) date = cm;
    R.a5 = { date, cur: now, tgt: 1e6, ptxt: "$" + nf(Math.max(0, now), 0).replace(/ /g, " ") + " из $1 000 000", hint: "Сейчас " + gPct(Math.max(0, Math.min(1, now / 1e6)), 1) + " пути." }; }
  // серии по дням
  { const days = [...new Set(ops.filter(o => o.d <= TODAYS).map(o => o.d))].sort(), T = [["b1", 7], ["b2", 30], ["b3", 100], ["b4", 365]], dt = {};
    const yest = iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 1));
    let run = 0, prev = null, best = 0;
    for (const d of days) { run = prev && awNextD(prev) === d ? run + 1 : 1; prev = d; if (run > best) best = run; for (const [id, t] of T) if (!dt[id] && run >= t) dt[id] = d; }
    const cur = prev && (prev === TODAYS || prev === yest) ? run : 0;
    const hint = "Сейчас " + cur + " " + pl(cur, "день", "дня", "дней") + " подряд, рекорд — " + best + "." + (cur && prev !== TODAYS ? " Сегодня операций еще нет — запишите хотя бы одну, чтобы серия продолжилась." : "");
    for (const [id, t] of T) R[id] = { date: dt[id] || null, cur, tgt: t, ptxt: Math.min(cur, t) + " из " + t + " дней", hint }; }
  // ранняя пташка: откладывать сразу после зарплаты
  { const isInv = a => !!a && ["deposit", "broker", "fund"].includes(a.type);
    const sal = ops.filter(o => o.t === "i" && o.c === "Зарплата" && o.s !== "премия" && o.d <= TODAYS);
    const xf = ops.filter(o => o.t === "t" && isInv(acc(o.to)) && !isInv(acc(o.ac)));
    const okM = {};
    for (const s of sal) { const m = s.d.slice(0, 7); if (!(m in okM)) okM[m] = false; if (okM[m]) continue; const lim = iso(new Date(+s.d.slice(0, 4), +s.d.slice(5, 7) - 1, +s.d.slice(8) + 3)); if (isInv(acc(s.ac)) || xf.some(o => o.d >= s.d && o.d <= lim)) okM[m] = true; }
    const s = awStreak(Object.keys(okM).sort().filter(m => m < cm || okM[m]).map(m => ({ k: m, ok: okM[m] })), 3, k => k === cm || k === pm);
    R.b5 = { date: s.date, cur: s.cur, tgt: 3, ptxt: s.cur + " из 3 мес", hint: sal.length ? "Засчитано месяцев всего: " + Object.values(okM).filter(Boolean).length + ". Рекорд — " + s.best + " подряд." : "В журнале нет доходов с категорией «Зарплата»." }; }
  // сверки
  const ks = snapKeys().filter(k => k <= TODAYS);
  { const s = awStreak(ks.filter(k => k.slice(8) === "01").map(k => ({ k: k.slice(0, 7), ok: true })), 6, k => k >= pm);
    R.b6 = { date: s.date, cur: s.cur, tgt: 6, ptxt: s.cur + " из 6 сверок", hint: ks.length ? "Последняя сверка — " + dLabel(ks[ks.length - 1]) + ". Рекорд — " + s.best + " подряд." : "Сверок еще не было." }; }
  { const items = []; let j = 0, last = null;
    for (let i = 1; i < ks.length; i++) {
      const p = ks[i - 1], k = ks[i], m = k.slice(0, 7), bp = snap(p).bal || {}, bk = snap(k).bal || {}, dl = {};
      while (j < ops.length && ops[j].d < p) j++;
      for (let q = j; q < ops.length && ops[q].d < k; q++) { const o = ops[q]; for (const id of [o.ac, o.t === "t" ? o.to : null]) if (id) dl[id] = (dl[id] || 0) + opDelta(o, id); }
      let diff = 0, tot = 0;
      for (const a of accs()) { if (!a.inCap || a.type === "broker" || a.type === "fund" || (a.openDate && a.openDate > p && a.openDate <= k)) continue; const act = bk[a.id] || 0, exp = (bp[a.id] || 0) + (dl[a.id] || 0); diff += Math.abs(toRUB(act - exp, a.cur, m)); tot += Math.abs(toRUB(act, a.cur, m)); }
      last = { k: m, ok: tot > 0 && diff <= tot * 0.01, diff, tot }; items.push(last);
    }
    const s = awStreak(items, 3, k => k >= pm);
    R.d5 = { date: s.date, cur: s.cur, tgt: 3, ptxt: s.cur + " из 3 сверок", hint: !last ? "Нужно хотя бы две сверки остатков." : last.ok ? "Последняя сверка сошлась: расхождение " + D(last.diff, last.k) + "." : "Последняя сверка разошлась с журналом на " + D(last.diff, last.k) + " (" + gPct(last.tot ? last.diff / last.tot : 0, 1) + "). Запишите неучтенные операции." }; }
  // бюджет
  { const C = ((S.settings && S.settings.cats && S.settings.cats.e) || []).map(c => c.name), nL = C.filter(c => !gOne(c) && budRUB(c, lr ? lr.m : cm) > 0).length;
    const ok = r => r.limit > 0 && r.inLimit === true && r.over === 0;
    R.c1 = { date: first(ok), cur: null, tgt: 1, frac: lr && lr.limit > 0 ? (nL ? Math.max(0, nL - lr.over) / nL : lr.inLimit ? 1 : 0.5) * (lr.inLimit ? 1 : 0.8) : 0,
      ptxt: !lr || !(lr.limit > 0) ? "лимиты не заданы" : nL ? (nL - lr.over) + " из " + nL + " категорий в лимите" : lr.inLimit ? "в общем лимите" : "сверх общего лимита",
      hint: lr && lr.overList && lr.overList.length ? "В " + mon(lr.m) + " превышены: " + lr.overList.slice(0, 3).map(o => o.c).join(", ") + "." : "" };
    const n = C.filter(c => budRUB(c, cm) > 0).length;
    R.c6 = { date: n >= 6 ? cm : null, cur: n, tgt: 6, ptxt: Math.min(n, 6) + " из 6 категорий" }; }
  { let n = 0, date = null; const byM = {};
    for (const k in g.challenges) { const ch = g.challenges[k]; if (!ch || !(ch.month < cm)) continue; if (gChalState(ch, data).ok) byM[ch.month] = (byM[ch.month] || 0) + 1; }
    for (const m of Object.keys(byM).sort()) { n += byM[m]; if (!date && n >= 3) date = m; }
    R.c2 = { date, cur: n, tgt: 3, ptxt: Math.min(n, 3) + " из 3 челленджей", hint: "Выполнено челленджей всего: " + n + "." }; }
  { const s = awStreak(list.map(r => ({ k: r.m, ok: r.reg > 0 && r.save > 0 })), 3, k => k === pm);
    R.c3 = { date: s.date, cur: s.cur, tgt: 3, ptxt: s.cur + " из 3 мес", hint: "Рекорд — " + s.best + " " + pl(s.best, "месяц", "месяца", "месяцев") + " подряд." }; }
  { const L = (S.debts && S.debts.list) || []; let open = 0, last = "";
    for (const d of L) { if (debtCalc(d).bal > 0.5) open++; else for (const e of d.events || []) if (e.k === "return" && e.d > last) last = e.d; }
    R.c4 = { date: open ? null : last ? last.slice(0, 7) : cm, cur: L.length - open, tgt: L.length || 1, ptxt: L.length ? (L.length - open) + " из " + L.length + " " + pl(L.length, "займа", "займов", "займов") + " вернули" : "займов нет", hint: open ? "Должников с остатком: " + open + "." : "" }; }
  { let date = null, cur = null;
    list.forEach((r, i) => { const pr = list.slice(0, i).filter(x => mDiff(x.m, r.m) <= 6).slice(-6); if (pr.length < 3) return; const av = pr.reduce((s, x) => s + x.expCore, 0) / pr.length; if (!(av > 0)) return; const q = r.expCore / av - 1; if (!date && q <= -0.15) date = r.m; if (r === lr) cur = q; });
    R.c5 = { date, cur, tgt: 0.15, frac: cur == null ? 0 : Math.max(0, Math.min(1, -cur / 0.15)), ptxt: cur == null ? "нет данных" : (cur <= 0 ? "−" : "+") + Math.round(Math.abs(cur) * 100) + "% к среднему, нужно −15%", hint: cur == null ? "Нужно хотя бы 3 закрытых месяца до сравниваемого." : "" }; }
  // капитал
  { const gr = lr ? lr.growth : null;
    R.d1 = { date: first(r => r.growth != null && r.growth >= 0.1), cur: gr, tgt: 0.1, ptxt: gr == null ? "нет данных" : (gr > 0 ? "+" : "") + gPct(gr, 1) + " из +10%", hint: gr == null ? "Нужен снимок капитала 12 месяцев назад." : "" }; }
  { const live = accs().filter(a => a.inCap && !a.archived).map(a => ({ a, b: balanceAt(a.id, TODAYS) })).filter(x => x.b > 0.5);
    const types = [...new Set(live.map(x => x.a.type))], curs = [...new Set(live.map(x => x.a.cur))];
    R.d2 = { date: types.length >= 4 ? cm : null, cur: types.length, tgt: 4, ptxt: Math.min(types.length, 4) + " из 4 типов", hint: types.length ? "Сейчас: " + types.map(t => (TYPEN[t] || t).toLowerCase()).join(", ") + "." : "" };
    R.d4 = { date: curs.length >= 3 ? cm : null, cur: curs.length, tgt: 3, ptxt: Math.min(curs.length, 3) + " из 3 валют", hint: curs.length ? "Сейчас: " + curs.map(c => SYM[c] || c).join(", ") + "." : "" };
    const inv = live.some(x => x.a.type === "broker" || x.a.type === "fund"); let invD = null;
    if (inv) { for (const k of ks) { const b = snap(k).bal || {}; if (Object.keys(b).some(id => { const a = acc(id); return a && (a.type === "broker" || a.type === "fund") && b[id] > 0.5; })) { invD = k.slice(0, 7); break; } } invD = invD || cm; }
    R.d3 = { date: invD, cur: inv ? 1 : 0, tgt: 1, ptxt: inv ? "есть" : "пока нет", hint: inv ? "" : "Добавьте брокерский счёт или фонд в капитал." }; }
  const res = AW.filter(a => a.id !== "d6").map(a => { const o = R[a.id] || {}; return Object.assign({ a }, o, { frac: o.date ? 1 : o.frac != null ? o.frac : o.cur != null && o.tgt ? Math.max(0, Math.min(1, o.cur / o.tgt)) : 0 }); });
  AW_C = { data, ops, snaps: S.snaps, acc: S.accounts, st: S.settings, sig, res };
  return res;
}
function awKey(d) { return !d ? "" : d.length === 7 ? d + "-31" : d; }
// полный список с сохраненным состоянием; «Легенда» считается по уже полученным наградам
function awList() {
  const g = gameS(), A = g.aw || {}, res = awCalc().map(x => Object.assign({}, x, { st: A[x.a.id] || null }));
  const n = res.filter(x => x.st).length, L = AW.find(a => a.id === "d6");
  res.push({ a: L, st: A.d6 || null, cur: n, tgt: 23, frac: A.d6 ? 1 : n / 23, ptxt: n + " из 23 наград", hint: "" });
  return res;
}
// выдача: только новые, назад не отзываются; дата — когда условие впервые выполнилось
function awAward() {
  const g = gameS(), nw = []; if (!g.aw || typeof g.aw !== "object") g.aw = {};
  for (const x of awCalc()) if (x.date && !g.aw[x.a.id]) { g.aw[x.a.id] = { date: x.date, seen: false }; nw.push(x.a.id); }
  const others = AW.filter(a => a.id !== "d6");
  if (!g.aw.d6 && others.every(a => g.aw[a.id])) { const d = others.map(a => g.aw[a.id].date).sort((p, q) => awKey(p) < awKey(q) ? -1 : 1).pop(); g.aw.d6 = { date: d || curM(), seen: false }; nw.push("d6"); }
  return nw;
}
function awFmtDate(d, low) { if (!d) return ""; return d.length >= 10 ? dLabel(d) + (d.slice(0, 4) === TODAYS.slice(0, 4) ? " " + d.slice(0, 4) : "") : mLabel(d.slice(0, 7), !low); }
function awMedal(id, sz, locked) { return '<span class="awm' + (locked ? " awlk" : "") + '" style="width:' + sz + 'px;height:' + sz + 'px"><svg viewBox="-20 -20 240 240" width="' + sz + '" height="' + sz + '" aria-hidden="true"><use href="#M-' + id + '"/></svg>' + (locked && sz >= 40 ? '<span class="awlb" aria-hidden="true">' + svg("lock", Math.max(8, Math.round(sz * .15))) + '</span>' : "") + '</span>'; }
function awBar(f) { return '<span class="bar awbar" role="img" aria-label="Прогресс ' + Math.round(f * 100) + '%"><i style="width:' + (f * 100).toFixed(1) + '%"></i></span>'; }
function gameOn() { try { return !!gameS().on; } catch (e) { return false; } }
/** Графика медалей — отдельным файлом и только когда игра включена. */
let AW_SPRITE = null;
function awSprite() {
  if (!AW_SPRITE) AW_SPRITE = loadScript("js/game/awards-sprite.js").then(() => {
    if (UI.view === "awards") render(true);
    if (FORM && ["award", "medal", "unlock"].includes(FORM.kind)) renderSheet(true);
  }).catch(e => { AW_SPRITE = null; warn("графика медалей", e); });
  return AW_SPRITE;
}
function gameSoon() {
  try { if (!S.loadedMeta || !S.loadedOps || !S.accounts || S.noDb) return; if (gameOn()) awSprite(); clearTimeout(UI.gT); UI.gT = setTimeout(gameCheck, 900); } catch (e) { warn("проверка наград", e); }
}
function gameCheck() {
  try {
    const g = gameS(); if (!g.on || FORM || !allOps().length) return;
    const retro = !g.seen.aw, nw = awAward();
    const unseen = AW.map(a => a.id).filter(k => g.aw[k] && !g.aw[k].seen);
    let dirty = nw.length > 0;
    if (retro) { g.seen.aw = true; dirty = true; }
    if (unseen.length) {
      // не перекрываем экран: сообщение с кнопкой «Посмотреть», анимация — по нажатию
      const form = retro && unseen.length > 1 ? { kind: "medal", title: "Награды за всю историю", retro: true, ids: unseen } : unseen.length > 3 ? { kind: "medal", title: "Новые награды", ids: unseen } : { kind: "unlock", ids: unseen, i: 0 };
      const first = AW.find(x => x.id === unseen[0]);
      toast(retro && unseen.length > 1 ? "Наград по истории: " + unseen.length : unseen.length > 1 ? "Новые награды: " + unseen.length : "Новая награда: «" + (first ? first.n : "") + "»", () => openSheet(form), "Посмотреть");
      for (const k of unseen) g.aw[k].seen = true; dirty = true;
    }
    if (dirty) saveMeta("game").catch(() => {});
  } catch (e) { warn("проверка наград", e); }
}
// итог ретро-расчета: сетка уже полученных медалей
function sMedal() {
  const g = gameS(), items = FORM.ids.map(id => AW.find(a => a.id === id)).filter(Boolean);
  let h = sHead(FORM.title, null);
  h += '<div class="card awretro"><b class="n">' + items.length + '</b><span>' + (FORM.retro ? 'из ' + AW.length + ' наград уже ваши — по истории журнала, сверок и закрытых месяцев' : pl(items.length, 'новая награда', 'новые награды', 'новых наград') + ' · всего ' + Object.keys(g.aw || {}).length + ' из ' + AW.length) + '</span></div>';
  h += '<div class="awgrid sm">' + items.map((a, k) => '<button class="awcard" data-act="award" data-id="' + a.id + '" aria-label="' + esc(a.n) + '"><span class="mpop" style="animation-delay:' + (Math.min(k, 14) * 0.06).toFixed(2) + 's">' + awMedal(a.id, 76, false) + '</span><b>' + esc(a.n) + '</b><small>' + esc(awFmtDate(((g.aw || {})[a.id] || {}).date)) + '</small></button>').join("") + '</div>';
  return h + '<button class="btn pri" data-act="awall">Все награды</button>';
}
// карточка медали: условие, прогресс или дата получения
function sAward() {
  const x = awList().find(q => q.a.id === FORM.id); if (!x) return sHead("Награда", null);
  const has = !!x.st, rr = AW_RAR[x.a.r], col = (AW_COL.find(c => c[0] === x.a.id[0]) || [0, "Награды"])[1];
  let h = sHead(col, null);
  h += '<div class="card awdet"><span class="mpop">' + awMedal(x.a.id, 180, !has) + '</span><h2>' + esc(x.a.n) + '</h2><span class="awrar"><i style="background:' + rr[1] + '"></i>' + rr[0] + '</span><p class="awwhy">' + esc(x.a.why) + '</p>';
  if (has) h += '<p class="mut" style="margin:0;font-size:15px">Получена: ' + esc(awFmtDate(x.st.date, true)) + '</p><button class="btn alt" data-act="uaplay" data-id="' + x.a.id + '" style="height:44px;font-size:15px;background:var(--fill2);margin-top:6px">Показать анимацию</button>';
  else h += '<div class="awprog">' + awBar(x.frac) + '<span class="awpl"><span class="n">' + esc(x.ptxt) + '</span><span class="mut n">' + Math.round(x.frac * 100) + '%</span></span></div>' + (x.hint ? '<p class="mut" style="margin:0;font-size:14px;line-height:1.4">' + esc(x.hint) + '</p>' : "");
  return h + '</div><p class="foot">' + esc(x.a.info) + '</p>';
}
// экран получения: серая медаль вращается, превращается в цветную, вспышка и искры
function sUnlock() {
  const F = FORM, id = F.ids[F.i], a = AW.find(x => x.id === id); if (!a) return "";
  const st = (gameS().aw || {})[id], n = F.ids.length, last = F.i >= n - 1, rr = AW_RAR[a.r];
  const star = (cls, sz, fill, style) => '<span class="' + cls + '" style="width:' + sz + 'px;height:' + sz + 'px;' + (style || "") + '"><svg viewBox="-9 -9 18 18" width="' + sz + '" height="' + sz + '" aria-hidden="true"><path d="' + AW_STAR + '" style="fill:' + fill + '"/></svg></span>';
  let sp = ""; for (let k = 0; k < 12; k++) sp += '<span class="ua-spw" style="transform:rotate(' + k * 30 + 'deg)">' + (k % 2 ? star("ua-sb", 14, "var(--ug)", "margin:-7px 0 0 -7px") : star("ua-sa", 18, k % 4 ? "#FFE9A8" : "#fff", "margin:-9px 0 0 -9px")) + '</span>';
  const med = cls => '<svg class="' + cls + '" viewBox="-20 -20 240 240" width="260" height="260" aria-hidden="true"><use href="#M-' + id + '"/></svg>';
  return '<div class="ua-ov" role="dialog" aria-modal="true" aria-label="' + esc((F.replay ? "Награда: " : "Новая награда: ") + a.n) + '" style="--ug:' + a.g + '">' +
    '<div class="ua-top"><span class="ua-cnt">' + (n > 1 ? (F.i + 1) + " из " + n : "") + '</span><button class="ua-x" data-act="close" aria-label="Закрыть">' + svg("close", 18) + '</button></div>' +
    '<div class="ua-stage"><button class="ua-medal" data-act="uareplay" aria-label="' + esc("Медаль «" + a.n + "». Нажмите, чтобы повторить анимацию") + '">' +
    '<span class="ua-rays"><span class="ua-rays-spin"></span></span><span class="ua-halo"></span><span class="ua-ring"></span>' +
    '<span class="ua-float"><span class="ua-entry"><span class="ua-spin">' + med("ua-grey") + med("ua-color") + '</span></span><span class="ua-lock">' + svg("lock", 22) + '</span></span>' +
    '<span class="ua-flash"></span>' + sp + star("ua-tw", 20, "#fff", "left:18px;top:38px") + star("ua-tw2", 16, "var(--ug)", "left:226px;top:200px") +
    '</button></div>' +
    '<div class="ua-text"><span class="ua-rise"><span class="ua-eb">' + (F.replay ? "НАГРАДА" : "НОВАЯ НАГРАДА") + '</span><span class="ua-nm">' + esc(a.n) + '</span><span class="ua-ds">' + esc(a.why) + '</span></span>' +
    '<span class="ua-rise2"><span class="ua-rar"><i style="background:' + rr[1] + '"></i>' + rr[0] + '</span>' + (st ? '<span class="ua-dt">Получена: ' + esc(awFmtDate(st.date, true)) + '</span>' : "") + '</span></div>' +
    '<div class="ua-btns"><button class="ua-ok" data-act="' + (last ? "close" : "uanext") + '">' + (last ? "Отлично" : "Далее") + '</button></div></div>';
}
/** Экран «Игра»: индекс здоровья, челленджи, серии и все награды — в одном месте, отдельно от «Итогов». */
function vAwards() {
  const g = gameS();
  let html = navHead("Игра", "", backBtn("advice", "Итоги"), '<button class="gbtn icon glass" data-act="go" data-v="game" aria-label="Настройки игры">' + svg("gear", 22) + '</button>', "Индекс финансового здоровья, челленджи месяца, серии и награды.");
  if (!g.on) return html + '<div class="card mut" style="font-size:15px;margin-top:16px">Игра выключена. Включить ее можно в Настройки → Игра.</div>';
  const m = UI.advm || advDefaultM();
  const L = safeBlock("Индекс здоровья", () => gameCard(m)) + safeBlock("Челленджи", () => gameChalCard(m)) + safeBlock("Серии", () => gameStreakCard());
  const R = safeBlock("Награды", () => awGallery());
  return html + cols(L, R);
}
function awGallery() {
  const L = awList(), got = L.filter(x => x.st), cnt = [0, 0, 0, 0]; for (const x of got) cnt[x.a.r]++;
  let h = '<section class="sec"><div class="sechead"><h2>Награды</h2></div><div class="card awsum"><div class="awsumh"><b class="n">' + got.length + '</b><span>из ' + AW.length + ' ' + pl(AW.length, "награды", "наград", "наград") + '</span></div>' + awBar(got.length / AW.length) +
    '<div class="pills">' + AW_RAR.map((r, i) => '<span class="pill awpill"><i style="background:' + r[1] + '"></i>' + r[0] + ' <span class="n mut">' + cnt[i] + ' из ' + AW.filter(a => a.r === i).length + '</span></span>').join("") + '</div></div></section>';
  for (const [c, nm] of AW_COL) {
    const it = L.filter(x => x.a.id[0] === c);
    h += '<section class="sec"><div class="sechead"><h2>' + nm + '</h2><span class="mut n" style="font-size:15px">' + it.filter(x => x.st).length + ' из ' + it.length + '</span></div><div class="awgrid">' + it.map(x => {
      const has = !!x.st;
      return '<button class="awcard" data-act="award" data-id="' + x.a.id + '" aria-label="' + esc(x.a.n + ": " + (has ? "получена, " + awFmtDate(x.st.date, true) : "не получена, " + x.ptxt)) + '">' + awMedal(x.a.id, 96, !has) + '<b>' + esc(x.a.n) + '</b>' +
        (has ? '<small>' + esc(awFmtDate(x.st.date)) + '</small>' : awBar(x.frac) + '<small class="n">' + esc(x.ptxt) + '</small>') + '</button>';
    }).join("") + '</div></section>';
  }
  return h + '<p class="foot" style="margin-top:18px">Нажмите на медаль — откроются условие и прогресс. Расчет идет по журналу, сверкам и закрытым месяцам; текущий месяц засчитывается после его окончания.</p>';
}

/* ---------- действия модуля ---------- */
App.actions({
  award: t => openSheet({ kind: "award", id: t.dataset.id, title: "Награда" }),
  awall: () => { closeSheet(); go("awards"); },
  uaplay: t => openSheet({ kind: "unlock", ids: [t.dataset.id], i: 0, replay: true }),
  uareplay: () => { if (FORM && FORM.kind === "unlock") { FORM.n = (FORM.n || 0) + 1; renderSheet(true); } },
  uanext: () => { if (FORM && FORM.kind === "unlock" && FORM.i < FORM.ids.length - 1) { FORM.i++; renderSheet(true); } else closeSheet(); }
});

/* ---------- экраны модуля ---------- */
App.view("awards", vAwards);
