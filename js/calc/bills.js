/* Регулярные счета («Платежи»): какие ежемесячные счета оплачены и за какой месяц.
   Список счетов и правила — в настройках (my.bills), суммы и названия задаёт пользователь, в коде их нет.
   Схема my.bills:
     list  — [{ id, name, c, subs: [], pf, txt, per, from, off }]
             c — категория расхода; subs — подкатегории (пусто — любая); pf — портфель счёта списания
             ("ru", "uz", … или "all"); txt — текст, который должен быть в заметке или подкатегории;
             per — за какой месяц обычно платят: -1 — за прошлый (коммуналка), 0 — за текущий (связь);
             from — с какого месяца следить (пусто — с первой найденной оплаты); off — выключен.
     marks — ручные отметки { id: { "ГГГГ-ММ": "paid" | "skip" } }: оплачено без операции / не нужно платить.
   Поля операции: p — «за период» (ГГГГ-ММ), p2 — по какой месяц, если оплачено сразу несколько;
   b — к какому счёту отнести (id), "-" — не относить ни к какому. Без b счёт находится по правилам. */
"use strict";
const BILL_PER = [[-1, "за прошлый месяц"], [0, "за текущий месяц"]];
const BILLC = {};
const reYM = /^\d{4}-\d{2}$/;
function billsCfg() { const M = (S.settings && S.settings.my) || {}; return isObj(M.bills) ? M.bills : { list: [], marks: {} }; }
function billList(all) { return (billsCfg().list || []).filter(b => b && b.id && (all || !b.off)); }
function billById(id) { return (billsCfg().list || []).find(b => b && b.id === id) || null; }
function billMark(id, m) { const k = (billsCfg().marks || {})[id]; return (k && k[m]) || ""; }

/** Подходит ли операция под правило счёта (без учёта явной привязки b). */
function billRuleFits(b, o) {
  if (!o || o.t !== "e" || !b.c || o.c !== b.c) return false;
  if ((b.subs || []).length && !b.subs.includes(o.s || "")) return false;
  if (b.pf && b.pf !== "all" && !pfHas(acc(o.ac), b.pf)) return false;
  if (b.txt) { const t = String(b.txt).toLowerCase().trim(); if (t && !((o.n || "") + " " + (o.s || "")).toLowerCase().includes(t)) return false; }
  return true;
}
const billSpec = b => ((b.subs || []).length ? 1 : 0) + (b.txt ? 1 : 0);
/** Счета, под правила которых подходит операция: самые точные правила первыми. */
function billCands(o, list) {
  const L = (list || billList()).filter(b => billRuleFits(b, o));
  return L.map((b, i) => [b, i]).sort((x, y) => billSpec(y[0]) - billSpec(x[0]) || x[1] - y[1]).map(x => x[0]);
}
/** К какому счёту относится операция: явная привязка, иначе самое точное правило. */
function billOf(o) {
  if (!o || o.t !== "e") return null;
  if (o.b === "-") return null;
  if (o.b) { const b = billById(o.b); if (b && !b.off) return b; }
  return billCands(o)[0] || null;
}
/** Месяцы, за которые оплачено операцией. */
function opPeriods(o, b) {
  if (o.p && reYM.test(o.p)) {
    const to = o.p2 && reYM.test(o.p2) && o.p2 > o.p ? o.p2 : o.p, out = [];
    for (let m = o.p; m <= to && out.length < 36; m = addMonth(m, 1)) out.push(m);
    return out;
  }
  return [addMonth(o.d.slice(0, 7), b ? (+b.per || 0) : 0)];
}
/** Месяц, в котором обычно платят за период m. */
const billPayM = (b, m) => addMonth(m, -(+b.per || 0));
/** Период, который сейчас к оплате (за что платим в текущем месяце). */
const billDueP = b => addMonth(curM(), +b.per || 0);

/** Все оплаты: по счёту и месяцу — сумма в рублях и операции. Сумма операции за несколько месяцев делится поровну. */
function billPays() {
  return memoEpoch(BILLC, "pays", () => {
    const by = {}, amb = [];
    const list = billList();
    if (!list.length) return { by, amb };
    for (const o of allOps()) {
      if (o.t !== "e") continue;
      const b = billOf(o); if (!b) continue;
      if (!o.b) { const c = billCands(o, list); if (c.length > 1 && billSpec(c[0]) === billSpec(c[1])) amb.push(o); }
      const ps = opPeriods(o, b), v = opRUB(o) / ps.length;
      const B = by[b.id] = by[b.id] || {};
      for (const m of ps) { const x = B[m] = B[m] || { rub: 0, ops: [] }; x.rub += v; x.ops.push(o); }
    }
    return { by, amb };
  });
}
/** С какого периода следить за счётом. */
function billStart(b) {
  if (b.from && reYM.test(b.from)) return b.from;
  const B = billPays().by[b.id], ks = B ? Object.keys(B).sort() : [];
  const due = billDueP(b);
  return ks.length && ks[0] < due ? ks[0] : due;
}
/** Состояние счёта за период m:
    paid — оплачено (есть операции), manual — отмечено вручную, skip — платить не нужно,
    due — к оплате в этом месяце, late — срок прошёл, а оплаты нет, soon — ещё рано, none — до начала учёта. */
function billCell(b, m) {
  const x = (billPays().by[b.id] || {})[m], mk = billMark(b.id, m);
  const r = { m, rub: x ? x.rub : 0, ops: x ? x.ops : [], mark: mk, st: "" };
  if (x && x.ops.length) r.st = "paid";
  else if (mk === "paid") r.st = "manual";
  else if (mk === "skip") r.st = "skip";
  else if (m < billStart(b)) r.st = "none";
  else { const pm = billPayM(b, m), cm = curM(); r.st = pm > cm ? "soon" : pm === cm ? "due" : "late"; }
  return r;
}
const billDone = c => c.st === "paid" || c.st === "manual" || c.st === "skip";
/** Обычная сумма счёта — медиана последних 6 оплаченных месяцев, в рублях. */
function billUsual(b) {
  const B = billPays().by[b.id] || {}, ks = Object.keys(B).sort().slice(-6);
  return median(ks.map(k => B[k].rub));
}
/** Сводка «что сейчас к оплате»: по каждому счёту — период к оплате и его состояние, плюс просроченные. */
function billsNow() {
  return memoEpoch(BILLC, "now", () => {
    const rows = billList().map(b => {
      const c = billCell(b, billDueP(b));
      const late = []; for (let k = 1; k <= 12; k++) { const m = addMonth(billDueP(b), -k); const x = billCell(b, m); if (x.st === "none") break; if (x.st === "late") late.push(m); }
      return { b, c, late };
    });
    const done = rows.filter(r => billDone(r.c)).length, late = rows.reduce((s, r) => s + r.late.length, 0);
    const left = rows.filter(r => !billDone(r.c));
    return { rows, done, n: rows.length, late, left, paidRUB: rows.reduce((s, r) => s + r.c.rub, 0) };
  });
}
/** Кандидаты в регулярные счета: подкатегории расходов, которые оплачивались хотя бы в 3 разных месяцах за год
    со счетов выбранного портфеля и ещё не покрыты правилами. */
function billSuggest(pf) {
  const from = addMonth(curM(), -12), by = {}, list = billList(true);
  for (const o of allOps()) {
    if (o.t !== "e" || o.d.slice(0, 7) < from || (pf && pf !== "all" && !pfHas(acc(o.ac), pf))) continue;
    if (list.some(b => billRuleFits(b, o))) continue;
    const k = o.c + "|" + (o.s || ""), x = by[k] = by[k] || { c: o.c, s: o.s || "", ms: new Set(), rub: [] };
    x.ms.add(o.d.slice(0, 7)); x.rub.push(opRUB(o));
  }
  // постоянная категория — или почти одинаковая сумма почти каждый месяц (подписка, связь)
  const steady = x => { const s = x.rub.slice().sort((a, b) => a - b), lo = s[Math.floor(s.length * 0.1)], hi = s[Math.ceil(s.length * 0.9) - 1]; return x.ms.size >= 6 && lo > 0 && hi / lo <= 1.6; };
  return Object.values(by).filter(x => x.ms.size >= 3 && (catKind(x.c) === "fix" || steady(x)))
    .map(x => ({ c: x.c, s: x.s, n: x.ms.size, usual: median(x.rub) })).sort((a, b) => b.n - a.n || b.usual - a.usual).slice(0, 8);
}
/** «за окт», «за окт–дек 2026» — подпись поля «За период» в строке операции. */
function opPerTxt(o) {
  if (!o.p || !reYM.test(o.p)) return "";
  const y = TODAYS.slice(0, 4), f = m => MONS[+m.slice(5) - 1] + (m.slice(0, 4) !== y ? " " + m.slice(0, 4) : "");
  return "за " + (o.p2 && reYM.test(o.p2) && o.p2 > o.p ? (o.p.slice(0, 4) === o.p2.slice(0, 4) ? MONS[+o.p.slice(5) - 1] : f(o.p)) + "–" + f(o.p2) : f(o.p));
}
