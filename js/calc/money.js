/* Валюты и курсы: форматирование сумм, пересчёт через рубль */
"use strict";
/* ============ money ============ */
const SYM = { RUB: "₽", USD: "$", EUR: "€", UZS: "сум", KZT: "₸" };
function nf(v, dec) { const p = Math.abs(v).toFixed(dec).split("."); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, " "); return p.join(","); }
function money(v, cur, o) {
  o = o || {}; if (!isFinite(v)) v = 0;
  if (FMT === "short" && o.dec == null && Math.abs(v) >= 1e6) return (o.sign ? (v > 0 ? "+" : v < 0 ? "−" : "") : (v < 0 ? "−" : "")) + shortM(Math.abs(v), cur);
  let dec = o.dec != null ? o.dec : FMT === "dec" ? 2 : ((cur === "USD" || cur === "EUR") && Math.abs(v) < 10000 && Math.abs(v - Math.round(v)) > 0.004 ? 2 : 0);
  const r = Number(Math.abs(v).toFixed(dec));
  const sg = o.sign ? (v > 0 && r ? "+" : v < 0 && r ? "−" : "") : (v < 0 && r ? "−" : "");
  const n = nf(v, dec);
  if (cur === "USD") return sg + "$" + n;
  if (cur === "EUR") return sg + "€" + n;
  return sg + n + " " + (SYM[cur] || cur);
}
function shortM(v, cur) {
  const a = Math.abs(v), sg = v < 0 ? "−" : "";
  let s;
  if (a >= 1e9) s = (a / 1e9).toFixed(2).replace(".", ",") + " млрд";
  else if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace(".", ",") + " млн";
  else if (a >= 1e4) s = Math.round(a / 1e3) + " тыс";
  else s = nf(a, 0);
  return sg + (cur === "USD" ? "$" + s : cur === "EUR" ? "€" + s : s + " " + SYM[cur]);
}
/** Курсов ещё нет ни за один месяц — суммы пересчитываются по примерным курсам (см. rateM). */
function ratesMissing() { return !Object.keys((S.rates && S.rates.m) || {}).length; }
/** Курсы месяца: свои, иначе ближайшие более ранние, иначе самые ранние; если курсов нет вовсе — примерные. */
function rateM(m) {
  const R = (S.rates && S.rates.m) || {};
  if (R[m]) return R[m];
  const ks = Object.keys(R).sort(); let best = null;
  for (const k of ks) if (k <= m) best = k;
  return R[best || ks[0]] || { usd: 90, eur: 100, uzs: 140, kzt: 6.5 };
}
function toRUB(v, cur, m) { const r = rateM(m); switch (cur) { case "USD": return v * r.usd; case "EUR": return v * r.eur; case "UZS": return v / r.uzs; case "KZT": return v / r.kzt; default: return v; } }
function fromRUB(v, cur, m) { const r = rateM(m); switch (cur) { case "USD": return v / r.usd; case "EUR": return v / r.eur; case "UZS": return v * r.uzs; case "KZT": return v * r.kzt; default: return v; } }
function conv(v, from, to, m) { return from === to ? v : fromRUB(toRUB(v, from, m), to, m); }
function curM() { return TODAYS.slice(0, 7); }
function D(vRUB, m, o) { return money(fromRUB(vRUB, UI.cur, m || curM()), UI.cur, o); }
function DS(vRUB, m) { return shortM(fromRUB(vRUB, UI.cur, m || curM()), UI.cur); }
