/* Автообновление курсов ЦБ РФ на 1-е число месяца.
   При открытии приложения дозаполняет месяцы без курсов — от последнего месяца в базе до текущего.
   Источник — зеркало ЦБ РФ www.cbr-xml-daily.ru (официальные курсы в JSON, доступно из браузера).
   Если на 1-е число курс не устанавливался (выходной, праздник), берётся действующий — с ближайшей прошлой даты.
   Пересчёт как в прежней задаче Claude: usd, eur — рублей за единицу; uzs, kzt — сумов и тенге за 1 рубль.
   Месяцы, введённые вручную или из файла, не перезаписываются: заполняются только пустые. */
"use strict";
const RATES_SRC = "ЦБ РФ · авто";
function mNext(m) { let y = +m.slice(0, 4), mo = +m.slice(5) + 1; if (mo > 12) { mo = 1; y++; } return y + "-" + String(mo).padStart(2, "0"); }
function ratesMissing() {
  const have = Object.keys((S.rates && S.rates.m) || {}).filter(m => /^\d{4}-\d{2}$/.test(m)).sort(), cur = curM(), out = [];
  for (let m = have.length ? mNext(have[have.length - 1]) : cur; m <= cur && out.length < 24; m = mNext(m)) if (!(S.rates && S.rates.m && S.rates.m[m])) out.push(m);
  return out;
}
/** Курсы ЦБ, действующие на дату d (ГГГГ-ММ-ДД): ищем публикацию назад до 10 дней. */
async function cbrOn(d) {
  const t = new Date(d + "T12:00:00Z");
  for (let i = 0; i < 10; i++, t.setUTCDate(t.getUTCDate() - 1)) {
    const y = t.getUTCFullYear(), m = String(t.getUTCMonth() + 1).padStart(2, "0"), dd = String(t.getUTCDate()).padStart(2, "0");
    let r; try { r = await fetch("https://www.cbr-xml-daily.ru/archive/" + y + "/" + m + "/" + dd + "/daily_json.js", { cache: "force-cache" }); } catch (e) { return null; } // нет сети
    if (r.status === 404) continue;
    if (!r.ok) return null;
    const j = await r.json(), V = j && j.Valute; if (!V) return null;
    const per = c => V[c] && V[c].Value > 0 && V[c].Nominal > 0 ? V[c].Value / V[c].Nominal : 0;
    const usd = per("USD"), eur = per("EUR"), uzs = per("UZS"), kzt = per("KZT");
    if (!(usd && eur && uzs && kzt)) return null;
    const r4 = x => Math.round(x * 10000) / 10000;
    return { usd: r4(usd), eur: r4(eur), uzs: r4(1 / uzs), kzt: r4(1 / kzt), src: RATES_SRC };
  }
  return null;
}
async function ratesAuto() {
  if (!DB || ratesAuto.busy || ratesAuto.day === TODAYS || !S.loadedMeta || !S.loadedOps || !S.accounts) return;
  const need = ratesMissing(); if (!need.length) { ratesAuto.day = TODAYS; return; }
  ratesAuto.busy = true;
  try {
    const got = {};
    for (const m of need) { const r = await cbrOn(m + "-01"); if (!r) break; got[m] = r; }
    if (!Object.keys(got).length) return;
    if (!S.rates) S.rates = { m: {} };
    if (!S.rates.m) S.rates.m = {};
    for (const m in got) if (!S.rates.m[m]) S.rates.m[m] = got[m]; // за время загрузки месяц могли ввести вручную
    ALLOPS = null; render();
    await saveMeta("rates");
    if (Object.keys(got).length === need.length) ratesAuto.day = TODAYS;
  } catch (e) { warn("автообновление курсов", e); }
  finally { ratesAuto.busy = false; }
}
App.onData(() => setTimeout(ratesAuto, 2500));
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(ratesAuto, 2500); });
