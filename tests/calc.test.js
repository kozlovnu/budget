/* Тесты расчётов: остатки, лимиты, долги, частичная запись настроек, миграция схемы.
   Запуск: в браузере — tests.html; в Node — node tests/run-node.js.
   Тесты подменяют S (данные) своими наборами и не трогают базу. */
"use strict";
const TESTS = [];
function test(name, fn) { TESTS.push([name, fn]); }
function eq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((msg || "ожидалось равенство") + ": " + x + " ≠ " + y); }
function near(a, b, eps, msg) { if (Math.abs(a - b) > (eps || 1e-6)) throw new Error((msg || "ожидалось ≈") + ": " + a + " ≠ " + b); }
function ok(v, msg) { if (!v) throw new Error(msg || "ожидалось истина"); }

/* Набор данных: два счёта в разных валютах, сверка, операции до и после неё, перевод с конвертацией. */
function fixture() {
  S.accounts = { list: [
    { id: "r", name: "Рубли", type: "card", cur: "RUB", country: "RU", inCap: true },
    { id: "u", name: "Сумы", type: "card", cur: "UZS", country: "UZ", inCap: true },
    { id: "n", name: "Новый", type: "card", cur: "RUB", country: "RU", inCap: true, openDate: "2026-03-10", openBal: 500 }
  ] };
  S.rates = { m: { "2026-01": { usd: 90, eur: 100, uzs: 140, kzt: 6 }, "2026-03": { usd: 95, eur: 105, uzs: 135, kzt: 6 } } };
  S.snaps = { items: { "2026-02-01": { bal: { r: 10000, u: 1400000 } } } };
  S.ops = {
    "2026-01": [{ id: "o1", d: "2026-01-15", t: "e", a: 999, ac: "r", c: "Кафе" }],             // до сверки — на остаток не влияет
    "2026-02": [{ id: "o2", d: "2026-02-05", t: "i", a: 5000, ac: "r", c: "Зарплата" },
                { id: "o3", d: "2026-02-10", t: "e", a: 1200, ac: "r", c: "Продукты" },
                { id: "o4", d: "2026-02-20", t: "t", a: 1000, ac: "r", to: "u", ta: 140000 }],    // перевод с явной суммой зачисления
    "2026-03": [{ id: "o5", d: "2026-03-12", t: "e", a: 100, ac: "n", c: "Кафе" },
                { id: "o6", d: "2026-03-15", t: "t", a: 2000, ac: "r", to: "u" }]                 // перевод без ta — по курсу месяца
  };
  ALLOPS = null; bumpEpoch();
}
/* Прямой расчёт остатка «как раньше» — эталон для проверки индекса. */
function naiveBalance(id, date) {
  const a = acc(id); const ks = snapKeys().filter(k => k <= date); const sk = ks[ks.length - 1];
  let base = 0, from = "0000";
  if (sk) { base = (snap(sk).bal || {})[id] || 0; from = sk; }
  if (a.openDate && a.openDate > from && a.openDate <= date) { base = a.openBal || 0; from = a.openDate; }
  for (const o of allOps()) { if (o.d > date) break; if (o.d >= from) base += opDelta(o, id); }
  return base;
}

test("остаток: операции до сверки не учитываются", () => { fixture(); eq(balanceAt("r", "2026-02-01"), 10000); });
test("остаток: доход, расход и перевод после сверки", () => { fixture(); eq(balanceAt("r", "2026-02-28"), 10000 + 5000 - 1200 - 1000); eq(balanceAt("u", "2026-02-28"), 1400000 + 140000); });
test("остаток: перевод без суммы зачисления — по курсу месяца", () => { fixture(); near(balanceAt("u", "2026-03-31"), 1400000 + 140000 + 2000 * 135); });
test("остаток: новый счёт считается от даты открытия", () => { fixture(); eq(balanceAt("n", "2026-03-09"), 0); eq(balanceAt("n", "2026-03-31"), 400); });
test("остаток: индекс совпадает с прямым расчётом на каждую дату", () => {
  fixture();
  for (const id of ["r", "u", "n"]) for (const d of ["2026-01-01", "2026-01-15", "2026-02-01", "2026-02-05", "2026-02-19", "2026-02-20", "2026-03-10", "2026-03-12", "2026-12-31"]) near(balanceAt(id, d), naiveBalance(id, d), 1e-9, id + " на " + d);
});
test("остаток: индекс пересобирается после изменения операций", () => {
  fixture(); const before = balanceAt("r", "2026-02-28");
  S.ops["2026-02"].push({ id: "o9", d: "2026-02-25", t: "e", a: 300, ac: "r", c: "Кафе" }); ALLOPS = null;
  eq(balanceAt("r", "2026-02-28"), before - 300);
});

test("лимиты: сумма лимитов сравнивается только с категориями, где лимит есть", () => {
  fixture(); S.settings = { cats: { e: [{ name: "Продукты", subs: [] }, { name: "Аренда", subs: [] }], i: [] }, budgets: { "Продукты": { v: 1000, cur: "RUB" } } };
  const r = limitCheck({ "Продукты": 800, "Аренда": 50000 }, "2026-03");
  eq(r, { src: "cats", limit: 1000, spend: 800, n: 1 });
});
test("лимиты: общий лимит сравнивается со всеми тратами, кроме исключённых", () => {
  fixture(); S.settings = { cats: { e: [], i: [] }, budgets: {}, limitTotal: { v: 60000, cur: "RUB" } };
  eq(limitCheck({ "Продукты": 800, "Аренда": 50000, "Путешествия": 9000 }, "2026-03", c => c === "Путешествия"), { src: "total", limit: 60000, spend: 50800, n: 0 });
});
test("лимиты: без лимитов — null", () => { fixture(); S.settings = { cats: { e: [], i: [] }, budgets: {} }; eq(limitCheck({ "Кафе": 1 }, "2026-03"), null); });

test("долги: простые проценты за год", () => {
  const d = { cur: "RUB", comp: "event", events: [{ d: "2025-01-01", k: "rate", r: 10 }, { d: "2025-01-01", k: "lend", a: 1000 }] };
  near(debtCalc(d, "2026-01-01").bal, 1100, 0.01);
});
test("долги: возврат уменьшает остаток", () => {
  const d = { cur: "RUB", comp: "none", events: [{ d: "2025-01-01", k: "lend", a: 1000 }, { d: "2025-06-01", k: "return", a: 400 }] };
  eq(debtCalc(d, "2026-01-01").bal, 600);
});

test("запись настроек: в базу уходят только изменённые поля", () => {
  const a = { my: { ui: { theme: "auto", curs: ["RUB", "USD"] }, about: "x" }, budgets: { "Кафе": { v: 1 } } };
  const b = JSON.parse(JSON.stringify(a)); b.my.ui.theme = "dark"; delete b.budgets["Кафе"]; b.budgets["Продукты"] = { v: 2 };
  eq(metaDiff(a, b), { my: { ui: { theme: "dark" } }, budgets: { "Продукты": { v: 2 }, "Кафе": null } });
});
test("запись настроек: массивы заменяются целиком, без изменений — null", () => {
  const a = { list: [1, 2], x: { y: 1 } };
  eq(metaDiff(a, { list: [1, 2, 3], x: { y: 1 } }), { list: [1, 2, 3] });
  eq(metaDiff(a, JSON.parse(JSON.stringify(a))), null);
});
test("загрузка: поля null (удалённые) отбрасываются", () => {
  eq(stripNulls({ a: 1, b: null, c: { d: null, e: [1, null, { f: null, g: 2 }] } }), { a: 1, c: { e: [1, null, { g: 2 }] } });
});

test("схема настроек: старые fc2 и forecast сводятся в один раздел forecast", () => {
  S.ops = { "2025-05": [{ id: "x", d: "2025-05-03", t: "e", a: 1, ac: "r", c: "Кафе" }] };
  const st = { cats: { e: [], i: [] }, fc2: { hz: 24, fx: "trend", by: 12, kinds: { "Кафе": "fix" }, sal: 30000000, salCur: "UZS", premOn: true, premM: [3, 9] },
               forecast: { events: [{ label: "Отпуск", m: "2026-07", v: -100000 }], incOverride: 5, brokerYield: 7 } };
  const changed = normalizeSettings(st);
  ok(changed, "миграция должна сообщить об изменениях");
  eq(st.v, SETTINGS_V); ok(!("fc2" in st), "fc2 удалён");
  eq([st.forecast.hz, st.forecast.fx, st.forecast.by, st.forecast.kinds], [24, "trend", 12, { "Кафе": "fix" }]);
  eq(st.forecast.events.length, 1); ok(!("incOverride" in st.forecast) && !("brokerYield" in st.forecast), "старые поля удалены");
  eq(st.my.salary.hist, [{ from: "2025-05", v: 30000000, cur: "UZS" }]);
  eq([st.my.bonus.on, st.my.bonus.months], [true, [3, 9]]);
});
test("схема настроек: повторное приведение ничего не меняет", () => {
  const st = { cats: { e: [], i: [] } }; normalizeSettings(st); const snap1 = JSON.stringify(st);
  eq(normalizeSettings(st), false); eq(JSON.stringify(st), snap1);
});

test("журнал: общая валюта списка — только если она у всех операций одна", () => {
  fixture();
  eq(listCur(S.ops["2026-02"]), "RUB");                    // перевод не учитывается
  eq(listCur(S.ops["2026-02"].concat([{ id: "z", d: "2026-02-21", t: "e", a: 1, ac: "u", c: "Кафе" }])), null);
});

test("темп трат: «обычно к этому дню» считается по тем же числам прошлых месяцев", () => {
  fixture(); UI.cur = "RUB";
  S.rates = { m: { "2026-01": { usd: 90, eur: 100, uzs: 140, kzt: 6 } } };
  S.ops = {};
  const add = (d, a) => { const m = d.slice(0, 7); (S.ops[m] = S.ops[m] || []).push({ id: d + a, d, t: "e", a, ac: "r", c: "Аренда" }); };
  for (const m of ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]) { add(m + "-05", 1000); add(m + "-25", 500); }   // аренда 5-го, прочее 25-го
  add("2026-07-05", 1000); add("2026-07-08", 300);
  ALLOPS = null; bumpEpoch();
  const keep = TODAYS; TODAYS = "2026-07-10";
  try {
    const P = paceData("all");
    eq([P.day, P.dim, P.n], [10, 31, 6]);
    eq([P.now, P.usualToday, P.usualMonth], [1300, 1000, 1500]);
    near(P.diff, 0.3); near(P.perDay, 200 / 22);
  } finally { TODAYS = keep; }
});
test("схема настроек v3: стартовый экран «Капитал» становится «Главной», раскладка чистится", () => {
  const st = { v: 2, cats: { e: [], i: [] }, my: { ui: { start: "capital", home: [{ id: "cap", size: "M" }, { id: "cap", size: "S" }, { id: "acc:a1", size: "XL" }, null] } } };
  normalizeSettings(st);
  eq(st.v, 3); eq(st.my.ui.start, "home");
  eq(st.my.ui.home, [{ id: "cap", size: "M" }, { id: "acc:a1", size: "S" }]);
});
test("схема настроек v3: явно выбранный «Журнал» не меняется", () => {
  const st = { v: 2, cats: { e: [], i: [] }, my: { ui: { start: "journal" } } };
  normalizeSettings(st); eq(st.my.ui.start, "journal");
});

test("средние траты в день: без исключённых категорий, «обычно» — на все дни прошлых месяцев", () => {
  fixture(); UI.cur = "RUB";
  S.rates = { m: { "2026-01": { usd: 90, eur: 100, uzs: 140, kzt: 6 } } };
  S.settings = { cats: { e: [{ name: "Аренда квартиры", subs: [] }, { name: "Продукты", subs: [] }, { name: "Путешествия", subs: [] }], i: [] }, budgets: {}, forecast: { kinds: {} }, my: {} };
  S.ops = {};
  const add = (d, a, c) => { const m = d.slice(0, 7); (S.ops[m] = S.ops[m] || []).push({ id: d + c + a, d, t: "e", a, ac: "r", c }); };
  for (const m of ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]) { add(m + "-05", 30000, "Аренда квартиры"); add(m + "-10", 1810, "Продукты"); }
  add("2026-03-20", 50000, "Путешествия");
  add("2026-07-05", 30000, "Аренда квартиры"); add("2026-07-06", 1000, "Продукты"); add("2026-07-08", 20000, "Путешествия");
  ALLOPS = null; bumpEpoch();
  const keep = TODAYS; TODAYS = "2026-07-10";
  try {
    // по умолчанию: аренда (постоянная) и поездки не учитываются
    let D = dailyAvg("all");
    eq(D.excluded.sort(), ["Аренда квартиры", "Путешествия"]);
    near(D.now, 100); near(D.usual, 1810 * 6 / 181);   // 181 день в январе–июне 2026
    // свой выбор: учитывать и поездки
    S.settings.my.daily = { exclude: ["Аренда квартиры"] }; bumpEpoch();
    D = dailyAvg("all"); near(D.now, 2100); near(D.usual, (1810 * 6 + 50000) / 181);
  } finally { TODAYS = keep; }
});

test("траты в день за месяц: по дням, по категориям, исключённые отдельно", () => {
  fixture(); UI.cur = "RUB";
  S.rates = { m: { "2026-01": { usd: 90, eur: 100, uzs: 140, kzt: 6 } } };
  S.settings = { cats: { e: [], i: [] }, budgets: {}, forecast: { kinds: {} }, my: { daily: { exclude: ["Аренда квартиры"] } } };
  S.ops = {};
  const add = (d, a, c) => { const m = d.slice(0, 7); (S.ops[m] = S.ops[m] || []).push({ id: d + c + a, d, t: "e", a, ac: "r", c }); };
  add("2026-05-03", 3000, "Продукты"); add("2026-05-05", 30000, "Аренда квартиры");             // база: май
  add("2026-06-02", 600, "Продукты"); add("2026-06-02", 400, "Кафе"); add("2026-06-05", 30000, "Аренда квартиры"); add("2026-06-30", 300, "Продукты");
  ALLOPS = null; bumpEpoch();
  const keep = TODAYS; TODAYS = "2026-07-10";
  try {
    const D = dailyMonth("2026-06", "all");                     // прошлый месяц — целиком
    eq([D.partial, D.days, D.dim, D.total], [false, 30, 30, 1300]);
    eq([D.byDay[1], D.byDay[4], D.byDay[29]], [1000, 0, 300]);  // аренда 5-го не входит
    near(D.avg, 1300 / 30); near(D.usual, 3000 / 31);           // обычно — по маю (31 день)
    const pr = D.cats.find(x => x.c === "Продукты"), kf = D.cats.find(x => x.c === "Кафе");
    near(pr.now, 900 / 30); near(pr.usual, 3000 / 31); eq(kf.usual, 0); eq(kf.diff, null);
    eq(D.excl, [{ c: "Аренда квартиры", month: 30000 }]);
  } finally { TODAYS = keep; }
});

test("архивный вклад учитывается в истории, пока был открыт (до срока), и не задваивается после", () => {
  fixture();
  S.accounts.list.push({ id: "old", name: "Старый вклад", type: "deposit", cur: "RUB", inCap: true, archived: true, till: "2026-03-07" },
                       { id: "new", name: "Новый вклад", type: "deposit", cur: "RUB", inCap: true, openDate: "2026-03-10", openBal: 50000 });
  S.snaps.items["2026-02-01"].bal.old = 50000;
  ALLOPS = null; bumpEpoch();
  const old = acc("old");
  ok(accLiveAt(old, "2026-02-28"), "в феврале вклад открыт"); ok(accLiveAt(old, "2026-03-07"), "в день окончания — ещё открыт");
  ok(!accLiveAt(old, "2026-03-31"), "после срока — не учитывается");
  // рублёвые деньги на конец февраля и марта: старый вклад (50 000) заменён новым (50 000) — без провала и без двойного счёта
  const rub = d => accs().filter(a => a.inCap && a.cur === "RUB" && accLiveAt(a, d)).reduce((s, a) => s + balanceAt(a.id, d), 0);
  eq(rub("2026-02-28"), 12800 + 0 + 50000);            // r + новый счёт n (ещё не открыт) + старый вклад
  eq(rub("2026-03-31"), 10800 + 400 + 50000);          // r после перевода 2000, n: 500 − 100, новый вклад
});
test("архивный счёт без срока учитывается до последней сверки с ним", () => {
  fixture();
  S.accounts.list.push({ id: "brk", name: "Старый брокер", type: "broker", cur: "RUB", inCap: true, archived: true });
  S.snaps.items["2026-02-01"].bal.brk = 7000;
  ALLOPS = null; bumpEpoch();
  eq(accEnd(acc("brk")), "2026-02-01"); ok(accLiveAt(acc("brk"), "2026-01-31")); ok(!accLiveAt(acc("brk"), "2026-02-02"));
});
test("прогноз и факт: капитал на конец месяца и ошибка прогноза", () => {
  fixture(); UI.cur = "RUB";
  acc("u").inCap = false; bumpEpoch();
  eq(capEndRUB("2026-02", "all"), 12800);                 // r после зарплаты, трат и перевода; n ещё не открыт
  eq(capEndRUB("2026-03", "all"), 10800 + 400);           // r − 2000, n: 500 − 100
  eq(capEndRUB(curM(), "all"), null, "текущий месяц не закончился — факта нет");
  const R1 = { usd: 90, eur: 100, uzs: 140, kzt: 6 };
  const doc = { v: 1, kind: "auto", made: "2026-01-31", m0: "2026-01", months: ["2026-02", "2026-03", "2099-01"], rates: [R1, R1, R1, R1],
    band: { all: { p10: [12000, 12500, 11500, 0], p50: [12000, 13000, 12000, 0], p90: [12000, 13500, 12500, 0] } } };
  const rows = fcCompare(doc, "all");
  eq(rows.length, 2, "будущие месяцы не сравниваются");
  eq(rows[0].i, 1); eq(rows[0].fact, 12800); near(rows[0].err, 200 / 12800); ok(rows[0].inBand, "12 800 в полосе 12 500–13 500");
  near(rows[1].err, 800 / 11200); ok(!rows[1].inBand, "11 200 ниже полосы 11 500–12 500");
  S.fcsaved = { "auto-2026-01": doc, "m-x": Object.assign({}, doc, { kind: "manual" }) };
  const A = fcAccuracy("all");
  eq(A.map(x => x.n), [1, 0, 0, 0], "в сводке только автопрогнозы и горизонты 1/3/6/12");
  near(A[0].mae, 200 / 12800);
  ok(FC_HZ[0] === 1 && FC_HZ[1] === 3, "есть горизонты 1 и 3 месяца");
  S.fcsaved = null;
});
test("недели месяца: с понедельника, в границах месяца; траты по дням", () => {
  const W = monthWeeks("2026-11");                       // 1 ноября 2026 — воскресенье, 30-е — понедельник
  eq(W.length, 6); eq([W[0].d1, W[0].d2], ["2026-11-01", "2026-11-01"]); eq([W[1].d1, W[1].d2], ["2026-11-02", "2026-11-08"]);
  eq(W[5].days, ["2026-11-30"]); eq(W.reduce((s, w) => s + w.days.length, 0), 30);
  eq(monthWeeks("2026-10").map(w => w.days.length), [4, 7, 7, 7, 6]);
  fixture(); UI.cur = "RUB";
  eq(spendDays("2026-02", "all"), { "2026-02-10": 1200 }, "только траты: без дохода и перевода");
  eq(spendDays("2026-03", "all", "Кафе"), { "2026-03-12": 100 });
  eq(spendDays("2026-03", "all", "Продукты"), {});
});
test("типы счетов: расчётные, депозиты, инвестиционные, наличные", () => {
  eq(["card", "other", "deposit", "broker", "fund", "cash", "незнакомый"].map(type => accKind({ type })), ["pay", "pay", "deposit", "invest", "invest", "cash", "pay"]);
});
test("долг по месяцам: тело, набежавшие проценты и изменение за месяц сходятся", () => {
  const d = { cur: "RUB", comp: "monthly", events: [{ d: "2026-01-01", k: "lend", a: 1000 }, { d: "2026-01-01", k: "rate", r: 12 }, { d: "2026-03-01", k: "return", a: 500 }] };
  const M = debtMonths(d), last = debtCalc(d);
  eq(M[0].m, curM(), "новые месяцы первыми"); eq(M[M.length - 1].m, "2026-01");
  const jan = M[M.length - 1], mar = M.find(x => x.m === "2026-03");
  eq(jan.body, 1000); eq(jan.lent, 1000); near(jan.int, 1000 * 0.12 * 30 / 365, 0.01);
  eq(mar.body, 500); eq(mar.ret, 500);
  for (const x of M) { near(x.bal, x.body + x.int, 1e-6); near(x.dBal, x.lent - x.ret + x.dInt, 1e-6); }
  near(M.reduce((s, x) => s + x.dBal, 0), last.bal, 1e-6, "изменения складываются в текущий остаток");
  near(M[0].bal, last.bal, 1e-6);
  const closed = debtMonths({ cur: "RUB", comp: "monthly", events: [{ d: "2026-01-05", k: "lend", a: 100 }, { d: "2026-02-10", k: "return", a: 100 }] });
  eq(closed.map(x => x.m), ["2026-02", "2026-01"], "закрытый долг — до месяца закрытия");
});

/* Регулярные счета («Платежи»): какие траты к какому счёту и месяцу относятся. Месяцы — от текущего, чтобы тесты не устаревали. */
function billFixture() {
  const m0 = curM(), M = k => addMonth(m0, k), d = (k, day) => M(k) + "-" + String(day).padStart(2, "0");
  S.accounts = { list: [{ id: "ru", name: "Карта RU", type: "card", cur: "RUB", country: "RU", inCap: true }, { id: "uz", name: "Карта UZ", type: "card", cur: "UZS", country: "UZ", inCap: true }] };
  S.rates = { m: { [M(-12)]: { usd: 90, eur: 100, uzs: 140, kzt: 6 } } }; S.snaps = { items: {} };
  S.settings = { cats: { e: [{ name: "Коммунальные", subs: ["квартира", "паркинг"] }, { name: "Связь", subs: [] }], i: [] }, budgets: {}, forecast: { kinds: {} },
    my: { bills: { list: [
      { id: "kv", name: "Квартплата", c: "Коммунальные", subs: ["квартира"], pf: "ru", txt: "", per: -1, from: "" },
      { id: "el", name: "Электричество", c: "Коммунальные", subs: ["квартира"], pf: "ru", txt: "свет", per: -1, from: "" },
      { id: "p1", name: "Паркинг 1", c: "Коммунальные", subs: ["паркинг"], pf: "ru", txt: "", per: -1, from: "" },
      { id: "p2", name: "Паркинг 2", c: "Коммунальные", subs: ["паркинг"], pf: "ru", txt: "", per: -1, from: "" },
      { id: "tel", name: "Телефон", c: "Связь", subs: [], pf: "ru", txt: "", per: 0, from: M(-3) }], marks: { tel: { [M(-2)]: "paid" } } } } };
  normalizeSettings(S.settings);
  const ops = [
    { id: "a1", d: d(-2, 10), t: "e", a: 5000, ac: "ru", c: "Коммунальные", s: "квартира" },                 // квартплата за M(-3)
    { id: "a2", d: d(-1, 10), t: "e", a: 5100, ac: "ru", c: "Коммунальные", s: "квартира" },                 // за M(-2)
    { id: "a3", d: d(-1, 12), t: "e", a: 900, ac: "ru", c: "Коммунальные", s: "квартира", n: "свет и мусор" }, // электричество за M(-2)
    { id: "a4", d: d(-1, 15), t: "e", a: 3000, ac: "ru", c: "Коммунальные", s: "паркинг" },                  // подходит под оба паркинга
    { id: "a5", d: d(-1, 16), t: "e", a: 3000, ac: "ru", c: "Коммунальные", s: "паркинг", b: "p2" },         // явно — второй паркинг
    { id: "a6", d: d(-1, 20), t: "e", a: 1200, ac: "ru", c: "Коммунальные", s: "квартира", p: M(-4), p2: M(-3) }, // сразу за два месяца
    { id: "a7", d: d(0, 3), t: "e", a: 700, ac: "ru", c: "Связь" },                                         // телефон за текущий
    { id: "a8", d: d(0, 4), t: "e", a: 99000, ac: "uz", c: "Связь" },                                       // другой портфель — не телефон RU
    { id: "a9", d: d(0, 5), t: "e", a: 500, ac: "ru", c: "Связь", b: "-" }                                  // явно не счёт
  ];
  S.ops = {}; for (const o of ops) (S.ops[o.d.slice(0, 7)] = S.ops[o.d.slice(0, 7)] || []).push(o);
  ALLOPS = null; bumpEpoch();
  return M;
}
test("платежи: счёт по правилу, точное правило важнее, явная привязка и «не счёт»", () => {
  billFixture(); const id = x => (billOf(allOps().find(o => o.id === x)) || {}).id || null;
  eq(["a1", "a3", "a4", "a5", "a7", "a8", "a9"].map(id), ["kv", "el", "p1", "p2", "tel", null, null]);
});
test("платежи: месяц оплаты — по правилу счёта или из поля «За период»", () => {
  const M = billFixture(), P = billPays().by;
  eq(Object.keys(P.kv).sort(), [M(-4), M(-3), M(-2)]);
  near(P.kv[M(-3)].rub, 5000 + 600, 1e-6, "оплата за два месяца делится поровну");
  ok(P.tel[M(0)] && !P.tel[M(-1)], "связь — за текущий месяц");
  eq(billPays().amb.map(o => o.id), ["a4"], "неоднозначная операция — только без явной привязки");
});
test("платежи: состояние месяцев — оплачено, вручную, к оплате, пропуск, до начала", () => {
  const M = billFixture(), st = (b, k) => billCell(billById(b), M(k)).st;
  eq([st("kv", -2), st("kv", -1), st("kv", 0), st("kv", -5)], ["paid", "due", "soon", "none"]);
  eq([st("tel", -3), st("tel", -2), st("tel", 0), st("tel", -4)], ["late", "manual", "paid", "none"]);
  eq(st("el", -3), "none", "без «следить с» — с первой оплаты");
  const N = billsNow(); eq([N.n, N.done], [5, 1]); eq(N.rows.find(r => r.b.id === "tel").late, [M(-1), M(-3)], "пропуски — от последнего");
});
test("платежи: подпись периода и пустые настройки", () => {
  const M = billFixture();
  eq(opPerTxt({ p: M(-1) }), "за " + MONS[+M(-1).slice(5) - 1] + (M(-1).slice(0, 4) !== TODAYS.slice(0, 4) ? " " + M(-1).slice(0, 4) : ""));
  eq(opPerTxt({}), "");
  S.settings = { cats: { e: [], i: [] }, budgets: {} }; bumpEpoch(); eq(billList().length, 0); eq(billOf({ t: "e", c: "Связь", d: TODAYS }), null);
});

function runTests() {
  const res = [];
  for (const [name, fn] of TESTS) { try { fn(); res.push({ name, ok: true }); } catch (e) { res.push({ name, ok: false, err: String(e && e.message || e) }); } }
  return res;
}
