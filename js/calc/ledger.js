/* Счета, остатки, портфели, капитал, разбор изменения, долги */
"use strict";
/* ============ data helpers ============ */
function accs() { return (S.accounts && S.accounts.list) || []; }
/* Поиск счёта по id: словарь пересобирается, только когда меняется сам список счетов. */
let ACCMAP = { list: null, n: -1, map: null };
function acc(id) {
  const L = accs();
  if (ACCMAP.list !== L || ACCMAP.n !== L.length) { const map = {}; for (const a of L) map[a.id] = a; ACCMAP = { list: L, n: L.length, map }; }
  return ACCMAP.map[id];
}
function accCur(id) { const a = acc(id); return a ? a.cur : "RUB"; }
function opCur(o) { return o.ac ? accCur(o.ac) : accCur(o.to); }
function accName(id) { const a = acc(id); return a ? a.name : (id ? "удаленный счет" : "вне учета"); }
function allOps() {
  if (ALLOPS) return ALLOPS;
  const out = [];
  for (const m of Object.keys(S.ops)) for (const o of S.ops[m]) out.push(o);
  out.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  return (ALLOPS = out);
}
function snapKeys() { return Object.keys((S.snaps && S.snaps.items) || {}).sort(); }
function snap(k) { return S.snaps.items[k]; }
function opDelta(o, id) {
  let v = 0;
  if (o.ac === id) v += (o.t === "i" ? o.a : -o.a);
  if (o.t === "t" && o.to === id) v += (o.ta != null ? o.ta : o.ac ? conv(o.a, accCur(o.ac), accCur(id), o.d.slice(0, 7)) : o.a);
  return v;
}
/* Индекс движений по счетам: для каждого счёта — даты и суммы его операций по порядку.
   Остаток считается от последней сверки только по операциям этого счёта (раньше — по всем операциям
   при каждом вызове). Индекс живёт одну «эпоху» расчётов (см. core/app.js) и пересобирается
   при любом изменении операций, курсов или счетов. */
let BIDX = { ops: null, epoch: -1, map: null };
function balIndex() {
  const ops = allOps();
  if (BIDX.ops === ops && BIDX.epoch === CALC_EPOCH) return BIDX.map;
  const map = {};
  for (const o of ops) {
    const ids = o.t === "t" && o.to && o.to !== o.ac ? [o.ac, o.to] : [o.ac];
    for (const id of ids) { if (!id) continue; const e = map[id] || (map[id] = { d: [], v: [] }); e.d.push(o.d); e.v.push(opDelta(o, id)); }
  }
  BIDX = { ops, epoch: CALC_EPOCH, map };
  return map;
}
/** Первая позиция в отсортированном массиве дат, где дата > x (strict) или >= x. */
function bsearch(arr, x, strict) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (strict ? arr[m] <= x : arr[m] < x) lo = m + 1; else hi = m; } return lo; }
function balanceAt(id, date) {
  const a = acc(id); if (!a) return 0;
  const ks = snapKeys().filter(k => k <= date); const sk = ks[ks.length - 1];
  let base = 0, from = "0000";
  if (sk) { base = (snap(sk).bal || {})[id] || 0; from = sk; }
  if (a.openDate && a.openDate > from && a.openDate <= date) { base = a.openBal || 0; from = a.openDate; }
  const e = balIndex()[id]; if (!e) return base;
  for (let i = bsearch(e.d, from, false), end = bsearch(e.d, date, true); i < end; i++) base += e.v[i];
  return base;
}
const PFS = [["all", "Общий"], ["uz", "Узбекистан"], ["inv", "Инвестиционный"], ["ru", "Россия"], ["cash", "Наличные"], ["other", "Другое"]];
function pfOf(a) { return a.type === "broker" || a.type === "fund" ? "inv" : a.type === "cash" ? "cash" : a.country === "UZ" ? "uz" : a.country === "RU" ? "ru" : "other"; }
function pfHas(a, pf) { return !pf || pf === "all" || (!!a && pfOf(a) === pf); }
function opPf(o, pf) { return !pf || pf === "all" || pfHas(acc(o.ac), pf); }
function pfXfer(o, pf) { if (!pf || pf === "all" || o.t !== "t") return 0; const i = pfHas(acc(o.to), pf), f = pfHas(acc(o.ac), pf); return i && !f ? 1 : f && !i ? -1 : 0; }
function curPf() { const p = UI.pf || "all"; return p !== "all" && !accs().some(a => !a.archived && a.inCap && pfOf(a) === p) ? "all" : p; }
function pfLabel(pf) { return (PFS.find(p => p[0] === pf) || PFS[0])[1]; }
function pfBar() { const av = PFS.filter(p => p[0] === "all" || accs().some(a => !a.archived && a.inCap && pfOf(a) === p[0])); if (av.length < 3) return ""; const cur = curPf(); return '<div class="pfbar" role="group" aria-label="Портфель">' + av.map(p => '<button data-act="pf" data-p="' + p[0] + '" aria-pressed="' + (cur === p[0]) + '">' + p[1] + '</button>').join("") + '</div>'; }
function capitalNowRUB(pf) {
  let s = 0; const m = curM();
  for (const a of accs()) if (a.inCap && !a.archived && pfHas(a, pf)) s += toRUB(balanceAt(a.id, TODAYS), a.cur, m);
  return s;
}
function snapTotalRUB(k, pf) {
  const b = snap(k).bal || {}, m = k.slice(0, 7); let s = 0;
  for (const id in b) { const a = acc(id); if (a && a.inCap && pfHas(a, pf)) s += toRUB(b[id], a.cur, m); }
  return s;
}
function anchorDate(id) { const ks = snapKeys().filter(k => k <= TODAYS); let d = ks[ks.length - 1] || ""; const a = acc(id); if (a && a.openDate && a.openDate > d && a.openDate <= TODAYS) d = a.openDate; return d; }
function anchorNote(o) { const ids = [o.ac, o.t === "t" ? o.to : null].filter(Boolean); const hit = ids.filter(id => o.d < anchorDate(id)); return hit.length ? ". Остаток не изменился: " + hit.map(id => accName(id) + " сверен на " + dLabel(anchorDate(id))).join(", ") : ""; }
function opsBetween(a, b) { return allOps().filter(o => o.d >= a && o.d < b); }
function opRUB(o) { return toRUB(o.a, opCur(o), o.d.slice(0, 7)); }
function nowBal() { const b = {}; for (const a of accs()) if (!a.archived) b[a.id] = balanceAt(a.id, TODAYS); return b; }
function decomp(A, B, pf) {
  const now = B === "now", ba = snap(A).bal || {}, bb = now ? nowBal() : (snap(B).bal || {}), ma = A.slice(0, 7), mb = now ? curM() : B.slice(0, 7);
  const ids = new Set([...Object.keys(ba), ...Object.keys(bb)]);
  let tA = 0, tB = 0, fx = 0, inv = 0;
  for (const id of ids) {
    const a = acc(id); if (!a || !a.inCap || !pfHas(a, pf)) continue;
    const va = ba[id] || 0, vb = bb[id] || 0;
    tA += toRUB(va, a.cur, ma); tB += toRUB(vb, a.cur, mb);
    fx += toRUB(va, a.cur, mb) - toRUB(va, a.cur, ma);
    if (a.type === "broker" || a.type === "fund") inv += toRUB(vb - va, a.cur, mb);
  }
  let oneoff = 0, flowsInv = 0, income = 0, spent = 0, xfer = 0; const withInv = !pf || pf === "all" || pf === "inv";
  for (const o of (now ? allOps().filter(o => o.d >= A && o.d <= TODAYS) : opsBetween(A, B))) {
    const v = opRUB(o), ta = acc(o.ac), tt = o.to ? acc(o.to) : null;
    xfer += pfXfer(o, pf) * v;
    if (pf && pf !== "all" && !(pfHas(ta, pf) || (o.t === "t" && pfHas(tt, pf)))) continue;
    const isInv = x => x && (x.type === "broker" || x.type === "fund");
    if (o.t === "i" && o.c === "Продажа имущества") oneoff += v;
    if (withInv && o.t === "i" && isInv(ta)) flowsInv += v;
    if (withInv && o.t === "t" && isInv(tt) && !isInv(ta)) flowsInv += v;
    if (withInv && o.t === "t" && isInv(ta) && !isInv(tt)) flowsInv -= v;
    if (o.t === "i" && o.c !== "Продажа имущества" && !isInv(ta)) income += v;
    if (o.t === "e") spent += v;
  }
  inv -= flowsInv;
  const delta = tB - tA;
  return { A, B, tA, tB, delta, fx, inv, oneoff, xfer, save: delta - fx - inv - oneoff - xfer, income, spent };
}
function roundCur(v, cur) { const st = cur === "UZS" ? 1000 : cur === "KZT" || cur === "RUB" ? 100 : 1; return Math.round(v / st) * st; }
function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; }

/* debts */
function addMonthDate(d) { const dt = new Date(d + "T00:00:00"); const day = dt.getDate(); dt.setDate(1); dt.setMonth(dt.getMonth() + 1); const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate(); dt.setDate(Math.min(day, last)); return iso(dt); }
function days(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5); }
function debtCalc(dbt, at) {
  at = at || TODAYS;
  const ev = (dbt.events || []).slice().sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : (x.k === "rate" ? -1 : 1));
  let bal = 0, rate = 0, t = null, lent = 0, ret = 0, interest = 0;
  const accrue = (to) => {
    if (t == null) return;
    const r = dbt.comp === "none" ? 0 : rate;
    if (dbt.comp === "monthly") { while (addMonthDate(t) < to) { const n = addMonthDate(t); const i = bal > 0 ? bal * r / 100 * days(t, n) / 365 : 0; bal += i; interest += i; t = n; } }
    const i = bal > 0 ? bal * r / 100 * days(t, to) / 365 : 0; bal += i; interest += i; t = to;
  };
  for (const e of ev) {
    if (e.d > at) break;
    accrue(e.d); if (t == null) t = e.d;
    if (e.k === "lend") { bal += e.a; lent += e.a; }
    else if (e.k === "return") { bal -= e.a; ret += e.a; }
    else if (e.k === "rate") rate = e.r;
  }
  accrue(at);
  return { bal, lent, ret, interest: bal - lent + ret, rate: dbt.comp === "none" ? 0 : rate };
}
/** Долг по месяцам: на конец каждого месяца (текущего — на сегодня) остаток, тело, накопленные проценты
    и что изменилось за месяц. Тело = выдано − возвращено, проценты = остаток − тело (как в debtCalc).
    От месяца первой записи до текущего; у закрытого долга — до месяца закрытия. Новые месяцы — первыми. */
function debtMonths(dbt) {
  const ev = dbt.events || []; if (!ev.length) return [];
  const m0 = ev.reduce((a, e) => e.d < a ? e.d : a, ev[0].d).slice(0, 7), out = [];
  let prev = { bal: 0, lent: 0, ret: 0, interest: 0 };
  for (let m = m0; m <= curM(); m = addMonth(m, 1)) {
    const end = m === curM() ? TODAYS : m + "-" + String(new Date(+m.slice(0, 4), +m.slice(5), 0).getDate()).padStart(2, "0");
    const c = debtCalc(dbt, end);
    out.push({ m, end, bal: c.bal, body: c.lent - c.ret, int: c.interest, rate: c.rate, dBal: c.bal - prev.bal, dInt: c.interest - prev.interest, lent: c.lent - prev.lent, ret: c.ret - prev.ret });
    if (c.bal <= 0.5 && prev.bal > 0.5 && !ev.some(e => e.d > end && e.k === "lend")) break;
    prev = c;
  }
  return out.reverse();
}
function debtsTotalRUB() { let s = 0; for (const d of ((S.debts && S.debts.list) || [])) { const c = debtCalc(d); if (c.bal > 0.5) s += toRUB(c.bal, d.cur || "RUB", curM()); } return s; }

/* Отпечаток данных для долгих расчётов (прогноз, проверка на истории): если операции, сверки, курсы,
   счета и параметры не менялись, результат берётся из кэша, а не пересчитывается при каждой отрисовке. */
const SIG_STORE = {};
function hashStr(h, str) { for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function dataSig() {
  return memoEpoch(SIG_STORE, "sig", () => {
    let h = 2166136261;
    for (const o of allOps()) h = hashStr(h, o.id + o.d + o.t + o.a + (o.ac || "") + (o.to || "") + (o.ta || "") + (o.c || "") + "|");
    const st = S.settings || {}, my = Object.assign({}, st.my || {}); delete my.ui;
    h = hashStr(h, JSON.stringify([S.snaps, S.rates, S.accounts, st.forecast, my, st.cats, st.budgets, st.limitTotal]));
    return h.toString(36) + ":" + TODAYS + ":" + UI.cur;
  });
}

/* Архивный счёт в истории: он существовал, пока был открыт. Без этого прошлые месяцы теряли
   деньги, которые тогда лежали на ныне закрытых счетах (например, вклад, закрытый в ноябре,
   исчезал из подушки и капитала за все прошлые месяцы). */
const LIVE_STORE = {};
/** Последняя дата, когда архивный счёт ещё учитывается: срок вклада (till), иначе последняя сверка или операция с ним. */
function accEnd(a) {
  if (!a.archived) return null;
  return memoEpoch(LIVE_STORE, a.id, () => {
    if (a.till) return a.till;
    let end = "";
    for (const k of snapKeys()) { const b = (snap(k).bal || {})[a.id]; if (b != null && k > end) end = k; }
    const e = balIndex()[a.id]; if (e && e.d.length && e.d[e.d.length - 1] > end) end = e.d[e.d.length - 1];
    return end || "0000";
  });
}
/** Учитывать ли счёт на дату: обычный — всегда (открытие учитывает balanceAt), архивный — до даты закрытия. */
function accLiveAt(a, date) { return !a.archived || date <= accEnd(a); }

/** Группы счетов по назначению: [ключ, название, типы, коротко — для легенды]. */
const ACC_KINDS = [["pay", "Расчётные", ["card", "other"], "Расчётные"], ["deposit", "Депозиты", ["deposit"], "Депозиты"], ["invest", "Инвестиционные", ["broker", "fund"], "Инвестиции"], ["cash", "Наличные", ["cash"], "Наличные"]];
const accKind = a => (ACC_KINDS.find(k => k[2].includes(a.type)) || ACC_KINDS[0])[0];
