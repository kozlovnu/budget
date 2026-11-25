/* Раздел «Настройки» */
"use strict";
/* versioned amounts: every value has the month it applies from */
const VERK = {
  sal: { t: "Оклад", f: "vc", fmt: h => money(+h.v || 0, h.cur || "UZS"), nw: "новая сумма" },
  bonus: { t: "Условия премии", f: "tp", fmt: h => nf(+h.target || 0, 0) + "% × " + nf(+h.pct || 0, 0) + "%", nw: "новые условия" },
  inc: { t: "Поступление", f: "v", fmt: (h, x) => +h.v ? money(+h.v, (x && x.cur) || "RUB") : "завершено", nw: "новая сумма" },
  dep: { t: "Ставки вкладов", f: "rt", fmt: h => pct1(h.old) + " / " + pct1(h.nw), nw: "новые ставки" },
  fix: { t: "Постоянный расход", f: "vc", fmt: h => money(+h.v || 0, h.cur || "UZS"), nw: "новая сумма" }
};
function verArr(p) { const r = myPath(p + ".x"); return r && Array.isArray(r.o) ? r.o : null; }
function verOwn(p) { const k = p.split("."); if (k[0] === "incomes") return (mySt().incomes || [])[+k[1]] || null; if (k[0] === "fixed") return { cat: k.slice(1, -1).join(".") }; return null; }
async function verRestore(p, before) { const a = verArr(p); if (!a) return; a.splice(0, a.length, ...before); await mySave(); }
function tlList(arr, p, vk, own) {
  const K = VERK[vk], m0 = curM(), cur = verAt(arr, m0);
  const idx = (arr || []).map((h, i) => i).filter(i => arr[i] && /^\d{4}-\d{2}$/.test(arr[i].from || "")).sort((a, b) => arr[a].from < arr[b].from ? -1 : 1);
  if (!idx.length) return "";
  return '<div class="tlw">' + idx.map(i => {
    const h = arr[i], st = h === cur ? "now" : h.from > m0 ? "next" : "";
    return '<button class="tl ' + st + '" data-act="veredit" data-p="' + esc(p) + '" data-k="' + vk + '" data-i="' + i + '" aria-label="Изменить запись с ' + esc(mLabelG(h.from)) + '"><span class="dotv" aria-hidden="true"></span><span class="tlf">с ' + esc(mLabelG(h.from)) + '</span><span class="tlv n">' + esc(K.fmt(h, own)) + '</span>' + (st === "now" ? '<span class="tag2 now">сейчас</span>' : st === "next" ? '<span class="tag2 next">впереди</span>' : "") + '</button>';
  }).join("") + '</div>';
}
function openVer(p, vk, idx, end, dcur) {
  const arr = verArr(p); if (!arr) return;
  const K = VERK[vk], m1 = addMonth(curM(), 1), e = idx != null ? arr[idx] : null, cur = verAt(arr, curM()), nx = verNext(arr, curM()), own = verOwn(p);
  let last = null; for (const h of arr) if (h && h.from && (!last || h.from > last.from)) last = h;
  const base = e || last || cur || {};
  const from = e ? e.from : (last && last.from >= m1 ? addMonth(last.from, 1) : m1);
  const f0 = v => v == null || v === "" ? "" : nf(+v, (+v) % 1 ? 2 : 0);
  FORM = { kind: "ver", title: K.t, p, vk, idx: e ? idx : null, end: !!end, from, v: e ? f0(e.v) : "", cur: base.cur || dcur || "UZS",
    target: f0(base.target != null ? base.target : 25), pct: f0(base.pct != null ? base.pct : 100), old: f0(base.old), nw: f0(base.nw) };
  renderSheet();
}
function sVer() {
  const F = FORM, K = VERK[F.vk], arr = verArr(F.p) || [], own = verOwn(F.p), cur = verAt(arr, curM());
  const name = F.vk === "inc" && own ? own.name : F.vk === "fix" && own ? own.cat : K.t;
  let h = sHead(F.end ? "Завершить с месяца" : F.idx != null ? "Изменить запись" : "Изменить с месяца", "savever");
  h += '<div class="group"><div class="field"><span style="flex:1;min-width:0;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(name) + '</span><span class="n mut" style="font-size:15px;text-align:right">' + (cur ? "сейчас " + esc(K.fmt(cur, own)) : "не задано") + '</span></div>';
  const inp = (k, label, ph) => '<div class="fstack" style="gap:4px"><label for="f-' + k + '" class="mut" style="font-size:13px">' + label + '</label><input id="f-' + k + '" data-f="' + k + '" class="vin n" inputmode="decimal" autocomplete="off" value="' + esc(F[k]) + '" placeholder="' + esc(ph) + '"></div>';
  if (!F.end) {
    if (K.f === "vc" || K.f === "v") h += inp("v", (F.vk === "inc" ? "Сумма за поступление" : "Сумма в месяц") + (K.f === "v" ? ", " + SYM[(own && own.cur) || "RUB"] : ""), cur && cur.v != null ? nf(+cur.v, (+cur.v) % 1 ? 2 : 0) : "0");
    else if (K.f === "tp") h += inp("target", "Целевая премия, % оклада за квартал", "25") + inp("pct", "Ожидаемая выплата, % от целевой", "100");
    else h += inp("old", "На накопленный остаток, % годовых", "0") + inp("nw", "На новые поступления, % годовых", "0");
  }
  h += '</div>';
  if (K.f === "vc" && !F.end) h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Валюта</span><div class="seg glass" role="group" aria-label="Валюта">' + CURS4.map(c => '<button data-act="vercur" data-c="' + c + '" aria-pressed="' + (F.cur === c) + '">' + SYM[c] + '</button>').join("") + '</div></section>';
  const opts = []; for (let i = 1; i <= 4; i++) opts.push(addMonth(curM(), i));
  h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Действует с</span><div class="pick" role="group" aria-label="Месяц начала">' + opts.map(m => '<button data-act="verm" data-m="' + m + '" aria-pressed="' + (F.from === m) + '">' + esc(mLabel(m, true)) + '</button>').join("") + '</div><div class="group"><div class="field"><label for="f-from">Другой месяц</label><input id="f-from" type="month" data-f="from" value="' + esc(F.from) + '"></div></div></section>';
  const ok = /^\d{4}-\d{2}$/.test(F.from || ""), others = arr.filter((x, i) => i !== F.idx), prev = ok ? verAt(others, addMonth(F.from, -1)) : null;
  if (ok) {
    const pm = addMonth(F.from, -1);
    h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Как будет</span><div class="group" style="padding:4px 0">' +
      (prev ? '<div class="tl"><span class="dotv" aria-hidden="true"></span><span class="tlf">до ' + esc(MONG[+pm.slice(5) - 1] + " " + pm.slice(0, 4)) + ' включительно</span><span class="tlv n">' + esc(K.fmt(prev, own)) + '</span></div>' : "") +
      '<div class="tl now"><span class="dotv" aria-hidden="true"></span><span class="tlf">с ' + esc(mLabelG(F.from)) + '</span><span class="tlv">' + (F.end ? "завершено" : K.nw + (K.f === "vc" ? ", " + SYM[F.cur] : "")) + '</span></div></div>' +
      '<p class="foot">Журнал и прошлые месяцы не меняются. Прогноз пересчитается начиная с выбранного месяца.</p></section>';
  }
  if (F.idx != null) h += F.armDel ? '<button class="btn danger" data-act="verdel" style="color:#fff;background:var(--red)">Удалить без возврата</button>' : '<button class="btn danger" data-act="verarm">Удалить эту запись</button>';
  return h;
}
function sInc() {
  const F = FORM, C = (S.settings.cats && S.settings.cats.i) || [];
  let h = sHead(F.i == null ? "Новое поступление" : "Поступление", "saveinc");
  h += '<div class="group"><div class="field"><label for="f-name">Название</label><input id="f-name" data-f="name" value="' + esc(F.name) + '" placeholder="например, аренда"></div>' +
    '<div class="field"><label for="f-cur">Валюта</label><select id="f-cur" data-f="cur">' + CURS4.map(c => '<option value="' + c + '"' + (F.cur === c ? " selected" : "") + '>' + SYM[c] + '</option>').join("") + '</select></div>' +
    '<div class="field"><label for="f-cat">Категория в журнале</label><select id="f-cat" data-f="cat"><option value="">не связана</option>' + C.map(c => '<option' + (c.name === F.cat ? " selected" : "") + '>' + esc(c.name) + '</option>').join("") + '</select></div>' +
    (F.i == null ? '<div class="field"><label for="f-v">Сумма за поступление</label><input id="f-v" data-f="v" class="n" inputmode="decimal" value="' + esc(F.v) + '" placeholder="0"></div><div class="field"><label for="f-from">Действует с</label><input id="f-from" type="month" data-f="from" value="' + esc(F.from) + '"></div>' : "") + '</div>';
  h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Месяцы поступления' + (F.months.length ? "" : " · не выбраны — каждый месяц") + '</span><div class="mchips">' + MONS.map((n, i) => '<button data-act="incm" data-m="' + (i + 1) + '" aria-pressed="' + F.months.includes(i + 1) + '">' + n + '</button>').join("") + '</div></section>';
  if (F.i != null) h += '<p class="foot">Сумма меняется кнопкой «Изменить с…» на экране «Доходы» — так сохраняется история.</p>' + (F.armDel ? '<button class="btn danger" data-act="incdel" style="color:#fff;background:var(--red)">Удалить без возврата</button>' : '<button class="btn danger" data-act="incarm">Удалить поступление</button>');
  return h;
}
function sFixAdd() {
  const C = ((S.settings.cats || {}).e || []).map(c => c.name).filter(c => catKind(c) !== "fix");
  return sHead("Добавить в постоянные", null) + (C.length ? '<div class="grid4">' + C.map(c => '<button class="opt" data-act="fixpick" data-c="' + esc(c) + '"><span class="tile" style="background:' + catColor(c) + ';width:26px;height:26px;font-size:12px;font-weight:700;color:#fff">' + esc(c[0]) + '</span>' + esc(c) + '</button>').join("") + '</div>' : '<div class="card empty">Все категории уже постоянные.</div>') +
    '<p class="foot">Категория станет постоянной и в прогнозе. Без ручной суммы прогноз берёт медиану её трат за последние 3 месяца.</p>';
}

/* hub */
function vSettings() {
  const M = mySt(), u = PZ(), F = fcS(), r = rateM(curM()), m0 = curM(), m1 = addMonth(m0, 1), nm = (M.name || "").trim();
  bkEnsure();
  const sh = verAt(M.salary.hist, m0), plan = (M.deposits || {}).plan || [], np = verNext(plan, m0), pc = verAt(plan, m0);
  let nMan = 0, nAvg = 0; for (const c of fixList()) { const f = (M.fixed || {})[c]; if (f && f.on && verAt(f.hist, m1)) nMan++; else nAvg++; }
  const row = (t, v, ic, bg, act, view) => '<button class="row" data-act="' + act + '"' + (view ? ' data-v="' + view + '"' : "") + '><span class="tile" style="background:' + bg + '">' + svg(ic, 18) + '</span><span class="body"><span class="t" style="flex:none;max-width:64%"><b>' + t + '</b></span>' + (v ? '<span class="mut n" style="flex:1;min-width:0;font-size:15px;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'  + esc(v) + '</span>' : '<span style="flex:1"></span>') + '<span class="chev" aria-hidden="true">›</span></span></button>';
  const grp = (t, rows, foot) => secT(t, "", '<div class="group">' + rows.join("") + '</div>', foot);
  const TH = { auto: "тема авто", light: "светлая", dark: "тёмная" }, nOps = allOps().length, nAcc = accs().length;
  let html = navHead("Настройки", "", settingsBack());
  let L = '<section class="sec"><div class="group"><button class="hub" data-act="go" data-v="about"><span class="hubav" aria-hidden="true">' + (nm ? esc(initials(nm)) : svg("person", 28)) + '</span><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><b style="font-size:20px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (nm ? esc(nm) : "Профиль") + '</b><span style="font-size:13px;color:var(--muted);line-height:1.35">Вход по почте · данные видите только вы</span></span><span class="chev" aria-hidden="true">›</span></button>' +
    '<div class="hubstat"><span class="n">' + nOps.toLocaleString("ru-RU") + ' ' + pl(nOps, "операция", "операции", "операций") + ' · ' + nAcc + ' ' + pl(nAcc, "счёт", "счёта", "счетов") + '</span><span>копия: ' + esc(lastBkTxt()) + '</span></div></div></section>';
  L += grp("Планы", [
    row("Доходы", sh ? money(+sh.v || 0, sh.cur || "UZS") + (M.bonus.on ? " + премии" : "") : "не заданы", "inc", "#34C759", "go", "income"),
    row("Постоянные расходы", nMan + " вручную · " + nAvg + " по истории", "fixc", "#FF9500", "go", "fixed"),
    row("Вклады", np ? "ставки с " + MONS[+np.from.slice(5) - 1] + " " + np.from.slice(0, 4) : pc ? pct1(pc.old) + " / " + pct1(pc.nw) : "по ставке счёта", "dep", "#00A39A", "go", "deposits"),
    row("Прогноз", (F.hz || 12) + " мес · рост трат " + nf(+F.infl || 0, (+F.infl) % 1 ? 1 : 0) + "%", "fcst", "#5856D6", "go", "fcset")
  ], "Суммы с месяцем начала: прогноз и консультант берут их отсюда, журнал они не меняют.");
  L += grp("Учёт", [
    row("Валюты и курсы", "$ = " + nf(r.usd, 2) + " ₽", "fx", "#30B0C7", "go", "rates"),
    row("Категории и лимиты", String(((S.settings.cats || {}).e || []).length), "tag", "#8E8E93", "go", "categories"),
    row("Счета по умолчанию", M.defAcc && acc(M.defAcc) ? accName(M.defAcc) : "последний", "card", "#007AFF", "go", "defaccs")
  ]);
  let R = grp("Claude", [row("Консультант", M.about ? "о себе заполнено" : "о себе не заполнено", "ai", "#AF52DE", "go", "advisor")]);
  let gTxt = "включена"; try { const gg = gameS(); if (!gg.on) gTxt = "выключена"; else { const hh = gameData().list; const xx = hh.length ? gameIndex(hh[hh.length - 1].m) : null; if (xx) gTxt = "индекс " + xx.score + " · " + xx.lv[1]; } } catch (e) { warn("индекс для настроек", e); }
  R += grp("Приложение", [
    row("Игра", gTxt, "star", "#FF9500", "go", "game"),
    row("Персонализация", SYM[u.cur || UI.cur] + " · " + TH[u.theme || "auto"], "sliders", "#FF2D55", "go", "personal"),
    row("Резервные копии", lastBkTxt(), "bk", "#636366", "go", "backups"),
    row("Экспорт в CSV", "", "expo", "#0A84FF", "exportcsv")
  ]);
  R += '<p class="foot" style="margin-top:18px;text-align:center">Долги, сверка остатков и импорт выписок — на вкладке «Счета».</p>';
  return html + cols(L, R);
}

/* income */
function vIncome() {
  const M = mySt(), m0 = curM(), m1 = addMonth(m0, 1), r0 = rateM(m0), sh = verAt(M.salary.hist, m0);
  let html = navHead("Доходы", "", backBtn("prefs", "Настройки"), "", "Суммы для прогноза и консультанта. Каждая действует с выбранного месяца — прошлое не меняется.");
  let L = secT("Оклад", "в месяц", '<div class="group"><div class="vbig"><b class="n">' + esc(sh ? money(+sh.v || 0, sh.cur || "UZS") : "Не задан") + '</b><span class="n">' + (sh ? (sh.cur && sh.cur !== "UZS" ? "≈ " + esc(money(toUZSr(+sh.v || 0, sh.cur, r0), "UZS")) + " по курсу " + MONG[+m0.slice(5) - 1] : "с " + esc(mLabelG(sh.from))) : "прогноз считает без зарплаты") + '</span></div>' +
    tlList(M.salary.hist, "salary.hist", "sal") + '<button class="lnk" data-act="veredit" data-p="salary.hist" data-k="sal">' + (M.salary.hist.length ? "Изменить с…" : "Указать оклад") + '</button></div>');
  const B = M.bonus, bh = verAt(B.hist, m0), sc = sh ? (sh.cur || "UZS") : "UZS";
  const qU = bh ? salUZSAt(m0, r0) * 3 * (+bh.target || 0) / 100 * (+bh.pct || 0) / 100 : 0, q = sc === "UZS" ? qU : qU / toUZSr(1, sc, r0);
  let np = null; for (let k = 0; k < 12; k++) { const mm = addMonth(m0, k); if ((B.months || []).includes(+mm.slice(5))) { np = mm; break; } }
  let bb = '<div class="group"><div class="field"><span style="flex:1;font-size:17px">Учитывать в прогнозе</span><button class="sw" role="switch" aria-checked="' + !!B.on + '" aria-label="Учитывать премии в прогнозе" data-act="mytog" data-p="bonus.on"></button></div>';
  if (B.on) bb += '<div class="fstack"><span>Месяцы выплат</span><div class="mchips" role="group" aria-label="Месяцы выплат">' + MONS.map((n, i) => '<button data-act="mymonth" data-p="bonus.months" data-m="' + (i + 1) + '" aria-pressed="' + (B.months || []).includes(i + 1) + '">' + n + '</button>').join("") + '</div></div>' +
    (bh ? '<div class="field"><span style="flex:1">Целевая</span><span class="mut n" style="font-size:15px">' + nf(+bh.target || 0, 0) + '% оклада за квартал</span></div><div class="field"><span style="flex:1">Ожидаемая выплата</span><span class="mut n" style="font-size:15px">' + nf(+bh.pct || 0, 0) + '% от целевой</span></div>' +
      '<div class="vbig" style="padding-top:12px"><b class="n" style="font-size:22px">≈ ' + esc(money(q, sc, { dec: 0 })) + ' за квартал</b><span>' + (np ? "ближайшая — в " + MONP[+np.slice(5) - 1] + " " + np.slice(0, 4) : "месяцы выплат не выбраны") + '</span></div>'
      : '<div class="field"><span class="mut" style="font-size:15px;padding:8px 0">Условия премии не заданы.</span></div>');
  bb += tlList(B.hist, "bonus.hist", "bonus") + '<button class="lnk" data-act="veredit" data-p="bonus.hist" data-k="bonus">' + (B.hist.length ? "Изменить условия с…" : "Указать условия") + '</button></div>';
  L += secT("Премии", "квартальные", bb);
  const inc = M.incomes || [];
  let yr = 0; for (const x of inc) for (let k = 0; k < 12; k++) { const mm = addMonth(m1, k), ms = x.months || []; if (ms.length && !ms.includes(+mm.slice(5))) continue; const h = verAt(x.hist, mm); if (h) yr += toRUB(+h.v || 0, x.cur || "RUB", m0); }
  const R = secT("Регулярные поступления", inc.length ? esc(D(yr)) + " в год" : "", inc.map((x, i) => {
    const h = verAt(x.hist, m0) || verNext(x.hist, m0), ended = h && !+h.v, p = "incomes." + i + ".hist";
    return '<div class="group" style="margin-bottom:10px"><button class="row" data-act="incedit" data-i="' + i + '" style="min-height:64px"><span class="tile" style="background:#34C759">' + svg("save", 18) + '</span><span class="body" style="border:0"><span class="t"><b>' + esc(x.name || "Поступление") + '</b><small>' + esc(monthsIn(x.months)) + (x.cat ? " · " + esc(x.cat) : "") + '</small></span><span class="v n">' + (h ? (ended ? '<span class="mut" style="font-weight:500">завершено</span>' : esc(money(+h.v, x.cur || "RUB"))) : "—") + '</span><span class="chev" aria-hidden="true">›</span></span></button>' +
      tlList(x.hist, p, "inc", x) + '<div class="lnk2"><button data-act="veredit" data-p="' + p + '" data-k="inc">Изменить с…</button><button data-act="veredit" data-p="' + p + '" data-k="inc" data-end="1" style="color:var(--orangeT)">Завершить с…</button></div></div>';
  }).join("") + '<div class="group"><button class="row" data-act="incnew"><span class="minus" style="background:var(--green)" aria-hidden="true">+</span><span class="body" style="border:0"><span class="t"><b style="color:var(--link)">Добавить поступление</b></span></span></button></div>',
    "Если поступление связано с категорией журнала, прогноз не считает эту категорию второй раз в прочих доходах.");
  return html + cols(L, R);
}

/* fixed costs */
function fixModel() { const h = fcHist(curM(), null), out = {}; for (const p of ["UZ", "RU"]) for (const c in h.M[p].fixCats) { const o = out[c] = out[c] || { UZ: 0, RU: 0 }; o[p] = h.M[p].fixCats[c]; } return out; }
function fixList() {
  const C = ((S.settings.cats || {}).e || []).map(c => c.name), K = fcS().kinds || {}, st = new Set();
  for (const c of C) if (catKind(c) === "fix") st.add(c);
  for (const c in K) if (K[c] === "fix") st.add(c);
  for (const c in (mySt().fixed || {})) if (catKind(c) === "fix") st.add(c);
  return [...st];
}
function vFixed() {
  const M = mySt(), FX = M.fixed, mod = fixModel(), m0 = curM(), m1 = addMonth(m0, 1), r = rateM(m0), list = fixList();
  let tot = 0, nM = 0, nA = 0;
  const cards = list.map(c => {
    const md = mod[c] || { UZ: 0, RU: 0 }, mR = md.UZ / r.uzs + md.RU;
    const mTxt = md.UZ && md.RU ? D(mR) : md.UZ ? money(md.UZ, "UZS") : md.RU ? money(md.RU, "RUB") : "трат не было";
    const f = FX[c] || { on: false, hist: [] }, h = f.on ? verAt(f.hist, m1) : null, hn = f.on && !h ? verNext(f.hist, m1) : null, man = !!h;
    tot += man ? toRUB(+h.v || 0, h.cur || "UZS", m0) : mR; if (man) nM++; else nA++;
    const pool = md.RU && md.RU >= md.UZ / r.uzs ? "RUB" : "UZS";
    const badge = man ? '<span class="tag2 next">вручную</span>' : f.on ? '<span class="tag2 warn">' + (hn ? "вручную с " + MONS[+hn.from.slice(5) - 1] : "сумма не задана") + '</span>' : '<span class="tag2">по истории</span>';
    const p = "fixed." + c + ".hist";
    return '<div class="group" style="margin-bottom:10px">' +
      '<div class="row" style="min-height:64px">' + catTile(c) + '<span class="body" style="border:0"><span class="t"><b>' + esc(c) + '</b><small>' + (man ? "с " + esc(mLabelG(h.from)) : "медиана за 3 мес") + '</small></span><span class="v n" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' + esc(man ? money(+h.v || 0, h.cur || "UZS") : mTxt) + badge + '</span></span></div>' +
      '<div class="field" style="border-top:1px solid var(--sep);border-bottom:0"><span style="flex:1;display:flex;flex-direction:column;gap:1px;padding:8px 0"><span style="font-size:17px">Вручную</span><small class="n mut" style="font-size:13px">' + (man ? "по истории было бы " + esc(mTxt) : f.on ? "пока прогноз берёт " + esc(mTxt) : "прогноз берёт историю") + '</small></span><button class="sw" role="switch" aria-checked="' + !!f.on + '" aria-label="Задать сумму вручную: ' + esc(c) + '" data-act="fixtog" data-c="' + esc(c) + '" data-cur="' + pool + '"></button></div>' +
      (f.on ? tlList(f.hist, p, "fix", null) + '<button class="lnk" data-act="veredit" data-p="' + esc(p) + '" data-k="fix" data-cur="' + pool + '">' + ((f.hist || []).length ? "Изменить с…" : "Задать сумму с…") + '</button>' : "") +
      '<button class="lnk" data-act="fixrm" data-c="' + esc(c) + '" style="font-size:15px;color:var(--muted)">Убрать из постоянных</button></div>';
  });
  let html = navHead("Постоянные расходы", "", backBtn("prefs", "Настройки"), "", "Прогноз берёт их по истории трат. Если сумма известна точно, включите «Вручную» — с выбранного месяца прогноз возьмёт её.");
  html += '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:2px"><span class="mut" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.02em">В прогнозе за ' + MON[+m1.slice(5) - 1] + '</span><b class="n" style="font-size:30px;line-height:1.2">' + esc(D(tot)) + '</b><span class="n mut" style="font-size:15px">' + nM + ' вручную · ' + nA + ' по истории' + (UI.cur !== "UZS" ? " · ≈ " + esc(money(tot * r.uzs, "UZS")) : "") + '</span></div></section>';
  const L = '<section class="sec" style="gap:0">' + (cards.length ? cards.join("") : '<div class="card empty">Постоянных категорий пока нет.</div>') + '</section>';
  const R = '<section class="sec"><div class="group"><button class="row" data-act="fixadd"><span class="minus" style="background:var(--green)" aria-hidden="true">+</span><span class="body" style="border:0"><span class="t"><b style="color:var(--link)">Добавить категорию</b></span></span></button></div><p class="foot">По истории — медиана трат за последние 3 полных месяца: так прогноз считает постоянные траты. Выключили «Вручную» — прогноз снова берёт историю, а заданные суммы остаются в списке.</p></section>';
  return html + cols(L, R);
}

/* deposits */
function vDeposits() {
  const M = mySt(), D2 = M.deposits || (M.deposits = { plan: [], tax: 0 }), deps = accs().filter(a => a.type === "deposit" && !a.archived);
  if (!Array.isArray(D2.plan)) D2.plan = [];
  let html = navHead("Вклады", "", backBtn("prefs", "Настройки"), "", "Ставки, по которым прогноз начисляет проценты");
  const L = secT("Вклады", "ставка в карточке", '<div class="group">' + (deps.length ? deps.map(a => '<button class="row" data-act="accform" data-id="' + esc(a.id) + '">' + accTile(a) + '<span class="body"><span class="t"><b>' + esc(a.name) + '</b><small>' + (a.till ? "до " + esc(dLabel(a.till)) + " · " : "") + 'меняется в карточке счёта</small></span><span class="v n">' + (a.rate ? pct1(a.rate) : "—") + '</span><span class="chev" aria-hidden="true">›</span></span></button>').join("") : '<div class="field"><span class="mut">Вкладов нет</span></div>') + '</div>', "До первого периода прогноз берёт ставку из карточки вклада.");
  let R = secT("Периоды ставок", "остаток / новые", '<div class="group">' + tlList(D2.plan, "deposits.plan", "dep") + '<button class="lnk" data-act="veredit" data-p="deposits.plan" data-k="dep">Добавить период ставок</button></div>', "С начала периода накопленный вклад идёт по ставке «остаток», новые поступления — по ставке «новые».");
  R += secT("Налог", "", '<div class="group"><div class="field"><label for="my-tax">Налог на проценты, %</label><input id="my-tax" class="n" inputmode="decimal" data-my="deposits.tax" data-k="n" value="' + esc(nf(+D2.tax || 0, (+D2.tax) % 1 ? 1 : 0)) + '"></div></div>');
  return html + cols(L, R);
}

/* forecast parameters */
function vFcSet() {
  const F = fcS();
  let html = navHead("Прогноз", "", backBtn("prefs", "Настройки"), "", "Все параметры прогноза капитала — в одном месте");
  let L = secT("Горизонт", "", '<div class="segs" role="group" aria-label="Горизонт">' + FC_HZ.map(k => '<button data-act="f2hz" data-k="' + k + '" aria-pressed="' + ((F.hz || 12) === k) + '">' + k + ' мес</button>').join("") + '</div>');
  L += safeBlock("Параметры прогноза", () => fcParamsBlocks(fcLive(), curPf()));
  const R = '<section class="sec"><div class="group"><button class="row" data-act="gofc"><span class="tile" style="background:#5856D6">' + svg("fcst", 18) + '</span><span class="body"><span class="t"><b>Открыть прогноз</b><small>график, сценарии и сводка допущений</small></span><span class="chev" aria-hidden="true">›</span></span></button></div></section>' +
    '<p class="foot">Доходы, премии и ставки вкладов задаются в разделах «Доходы» и «Вклады» — прогноз берёт их оттуда.</p>';
  return html + cols(L, R);
}

/* default accounts */
function vDefAccs() {
  const M = mySt(), sp = accs().filter(a => !a.archived && !NOSPEND.includes(a.type));
  const opt = (sel, first) => '<option value="">' + first + '</option>' + sp.map(a => '<option value="' + esc(a.id) + '"' + (a.id === sel ? " selected" : "") + '>' + esc(a.name) + '</option>').join("");
  let h = navHead("Счета по умолчанию", "", backBtn("prefs", "Настройки"));
  h += secT("Новая операция", "", '<div class="group"><div class="field"><label for="da-new">Подставлять счёт</label><select id="da-new" data-my="defAcc" data-k="s">' + opt(M.defAcc, "последний использованный") + '</select></div></div>', "Счёт можно поменять в самой форме.");
  h += secT("Неучтённые траты", "", '<div class="group"><div class="field"><label for="da-un">Записывать на</label><select id="da-un" data-my="untrackedAcc" data-k="s">' + opt(M.untrackedAcc, "первую карту") + '</select></div></div>', "Сверка предлагает записать неучтённые траты, когда по остаткам потрачено больше, чем в журнале.");
  return '<div class="narrow">' + h + '</div>';
}

/* consultant */
function vAdvisor() {
  const M = mySt(), n = accs().filter(a => !a.archived && a.inCap).length;
  let h = navHead("Консультант", "", backBtn("prefs", "Настройки"), "", "Claude разбирает месяц на экране «Итоги»");
  h += secT("О себе", "", '<div class="group"><div class="fstack"><label for="my-about" class="mut" style="font-size:13px">Где получаете зарплату, куда она уходит, цели — то, что поможет советам</label><textarea id="my-about" class="ta" data-my="about" data-k="s" rows="5" placeholder="Например: живу в Ташкенте, коплю на квартиру">' + esc(M.about || "") + '</textarea></div></div>', "Без номеров карт и паролей.");
  h += secT("Что получает Claude", "", '<div class="group">' + [["Текст «О себе»", M.about ? "заполнен" : "пусто"], ["Список счетов", n + " " + pl(n, "счёт", "счёта", "счетов") + ": название, тип, валюта — без остатков по счетам"], ["Итоги месяца", "доходы, траты по категориям, капитал, подушка"]].map(x => '<div class="row"><span class="body"><span class="t"><b>' + x[0] + '</b><small style="white-space:normal">' + esc(x[1]) + '</small></span></span></div>').join("") + '</div>', "Данные уходят Claude, только когда вы нажимаете «Получить разбор».");
  return '<div class="narrow">' + h + '</div>';
}
function vBackups() { return '<div class="narrow">' + navHead("Резервные копии", "", backBtn("prefs", "Настройки")) + backupSec() + '</div>'; }

/* personalization */
function vPersonal() {
  const u = PZ(), mc = u.cur || UI.cur, C = ((S.settings.cats || {}).e || []).map(c => c.name);
  const sg = (k, opts, lab) => '<div class="segs" role="group" aria-label="' + lab + '">' + opts.map(o => '<button data-act="pz" data-k="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (String(k === "cur" ? mc : u[k]) === String(o[0])) + '">' + o[1] + '</button>').join("") + '</div>';
  const swr = (k, t, sub) => '<div class="field"><span style="flex:1;display:flex;flex-direction:column;gap:1px;padding:8px 0"><span style="font-size:17px">' + t + '</span>' + (sub ? '<small class="mut" style="font-size:13px;line-height:1.35">' + sub + '</small>' : "") + '</span><button class="sw" role="switch" aria-checked="' + !!u[k] + '" aria-label="' + t + '" data-act="pztog" data-k="' + k + '"></button></div>';
  let html = navHead("Персонализация", "", backBtn("prefs", "Настройки"), "", "Как приложение выглядит и что показывает. Общее для телефона и ноутбука.");
  let L = secT("Внешний вид", "", '<div class="group"><div class="fstack"><span>Тема</span>' + sg("theme", [["auto", "Авто"], ["light", "Светлая"], ["dark", "Тёмная"]], "Тема") + '</div><div class="fstack"><span>Стекло</span>' + sg("glass", [["full", "Полное"], ["low", "Сниженное"]], "Стекло") + '</div></div>', "Сниженное стекло — меньше прозрачности, если фон мешает читать.");
  const capv = fromRUB(capitalNowRUB(), mc, curM());
  L += secT("Валюта и числа", "", '<div class="group"><div class="fstack"><span>Основная валюта — открывается при запуске</span>' + sg("cur", CURS4.map(c => [c, SYM[c]]), "Основная валюта") + '</div>' +
    '<div class="fstack"><span>В переключателе на экранах</span><div class="chips" role="group" aria-label="Валюты в переключателе">' + CURS4.map(c => '<button class="chipb" data-act="pzcurs" data-c="' + c + '" aria-pressed="' + u.curs.includes(c) + '">' + SYM[c] + '</button>').join("") + '</div></div>' +
    '<div class="fstack"><span>Формат сумм · <span class="n mut">' + esc(u.fmt === "dec" ? moneyF(capv, mc, 2) : u.fmt === "short" ? shortM(capv, mc) : moneyF(capv, mc, 0)) + '</span></span>' + sg("fmt", [["int", "Целые"], ["dec", "С копейками"], ["short", "Кратко"]], "Формат сумм") + '</div></div>');
  const B = u.blocks, nameOf = id => (PZ_BLOCKS.find(x => x[0] === id) || [id, id])[1];
  L += homePrefsBlock();
  L += secT("Экран «Капитал»", "", '<div class="group">' + B.map((b, i) => '<div class="ord"><span class="oname' + (b.on ? "" : " off") + '">' + nameOf(b.id) + '</span><button class="mbtn" data-act="pzmv" data-i="' + i + '" data-d="-1" aria-label="Выше: ' + nameOf(b.id) + '"' + (i ? "" : " disabled") + '>↑</button><button class="mbtn" data-act="pzmv" data-i="' + i + '" data-d="1" aria-label="Ниже: ' + nameOf(b.id) + '"' + (i < B.length - 1 ? "" : " disabled") + '>↓</button><button class="sw" role="switch" aria-checked="' + !!b.on + '" aria-label="Показывать: ' + nameOf(b.id) + '" data-act="pzblk" data-i="' + i + '"></button></div>').join("") + '</div>', "Стрелки меняют порядок блоков. На ноутбуке блоки раскладываются в две колонки.");
  let R = secT("Ввод операции", "", '<div class="group"><button class="row" data-act="pzfavs" aria-expanded="' + !!UI.pzFavs + '"><span class="body"><span class="t"><b style="font-weight:400">Избранные категории</b><small>' + (u.favs.length ? esc(u.favs.join(", ")) : "не выбраны — форма показывает все") + '</small></span><span class="mut n" style="font-size:15px">' + u.favs.length + ' из 8</span><span class="chev" aria-hidden="true">' + (UI.pzFavs ? "⌃" : "⌄") + '</span></span></button>' +
    (UI.pzFavs ? '<div class="fstack"><div class="chips" role="group" aria-label="Избранные категории">' + C.map(c => '<button class="chipb" data-act="pzfav" data-c="' + esc(c) + '" aria-pressed="' + u.favs.includes(c) + '">' + esc(c) + '</button>').join("") + '</div></div>' : "") +
    '<div class="field"><label for="pz-start">Стартовый экран</label><select id="pz-start" data-pz="start">' + [["home", "Главная"], ["capital", "Капитал"], ["journal", "Журнал"], ["newop", "Новая операция"]].map(x => '<option value="' + x[0] + '"' + (u.start === x[0] ? " selected" : "") + '>' + x[1] + '</option>').join("") + '</select></div></div>', "Счёт по умолчанию — в Настройках → «Счета по умолчанию».");
  R += secT("Приватность", "", '<div class="group">' + swr("hide", "Скрывать суммы", "суммы размыты, нажатие открывает их на 30 секунд") + swr("blur", "Размывать при уходе со вкладки", "чтобы суммы не было видно в переключателе вкладок") + '</div>');
  R += secT("Напоминания", "", '<div class="group"><div class="field"><label for="pz-rr">Сверка остатков</label><select id="pz-rr" data-pz="remRecon">' + [[0, "не напоминать"], [1, "с 1-го числа"], [3, "с 3-го числа"], [5, "с 5-го числа"], [10, "с 10-го числа"]].map(x => '<option value="' + x[0] + '"' + (+u.remRecon === x[0] ? " selected" : "") + '>' + x[1] + '</option>').join("") + '</select></div>' +
    '<div class="field"><label for="pz-rf">Копия в файл</label><select id="pz-rf" data-pz="remFile">' + [["", "по умолчанию"], [30, "раз в месяц"], [14, "раз в 2 недели"], [7, "раз в неделю"], [0, "не напоминать"]].map(x => '<option value="' + x[0] + '"' + (String(u.remFile == null ? "" : u.remFile) === String(x[0]) ? " selected" : "") + '>' + x[1] + '</option>').join("") + '</select></div></div>', "Напоминание — баннер на «Капитале» при открытии приложения. По умолчанию копия в файл — раз в месяц, а если автокопии выключены, раз в неделю.");
  return html + cols(L, R);
}

/* about data */
function vAbout() {
  const M = mySt(), nm = (M.name || "").trim(), ops = allOps(), ms = opMonths(), rk = Object.keys((S.rates && S.rates.m) || {}).sort(), dn = ((S.debts && S.debts.list) || []).length;
  bkEnsure();
  let html = navHead("О данных", "", backBtn("prefs", "Настройки"));
  html += '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px 0 0;text-align:center"><span class="hubav" style="width:84px;height:84px;font-size:30px" aria-hidden="true">' + (nm ? esc(initials(nm)) : svg("person", 34)) + '</span><b style="font-size:24px;margin-top:6px">' + (nm ? esc(nm) : "Профиль") + '</b><span class="chip glass" style="color:var(--label2)">' + esc(Cloud.email() || "Вход по почте") + '</span></div>';
  let L = secT("Имя", "", '<div class="group"><div class="field"><label for="ab-name">Как вас называть</label><input id="ab-name" data-my="name" data-k="s" value="' + esc(nm) + '" placeholder="имя и фамилия" autocomplete="name"></div></div>', "Только для карточки в настройках.");
  L += secT("Что хранится", "", '<div class="group">' + [["Операции", ops.length.toLocaleString("ru-RU") + (ms.length ? " · с " + mLabelG(ms[0]) : "")], ["Счета", String(accs().length)], ["Сверки остатков", String(snapKeys().length)], ["Курсы валют", rk.length ? "с " + mLabelG(rk[0]) : "нет"], ["Должники", String(dn)], ["Автокопии", UI.bkList ? String(UI.bkList.length) : "…"]].map(x => '<div class="field"><span style="flex:1;font-size:17px">' + x[0] + '</span><span class="n mut" style="font-size:15px">' + esc(x[1]) + '</span></div>').join("") + '</div>');
  L += secT("Кто видит", "", '<div class="group">' + [["Вы", "читаете и меняете всё, с телефона и ноутбука, после входа по почте и паролю"], ["Тот, у кого есть ссылка", "увидит только экран входа: база закрыта правилами доступа, данные открываются только вашей учётной записи"]].map(x => '<div class="row"><span class="body"><span class="t"><b>' + x[0] + '</b><small style="white-space:normal;line-height:1.35">' + x[1] + '</small></span></span></div>').join("") + '</div>');
  let R = '<section class="sec"><div class="group">' +
    (DL ? '<button class="row" data-act="backup"><span class="body"><span class="t"><b style="color:var(--link)">Скачать все данные</b><small>файл JSON: операции, счета, сверки, курсы, долги, настройки</small></span></span></button>' : "") +
    '<button class="row" data-act="go" data-v="backups"><span class="body"><span class="t"><b>Резервные копии</b></span><span class="mut n" style="font-size:15px">' + esc(lastBkTxt()) + '</span><span class="chev" aria-hidden="true">›</span></span></button>' +
    '<button class="row" data-act="exportcsv"><span class="body"><span class="t"><b style="color:var(--link)">Экспорт операций в CSV</b></span></span></button>' +
    (UI.delArm ? "" : '<button class="row" data-act="delarm"><span class="body"><span class="t"><b style="color:var(--redT)">Удалить все данные</b><small>спросим ещё раз и предложим сначала скачать файл</small></span></span></button>') + '</div></section>';
  if (UI.delArm) R += '<section class="sec"><div class="warn" style="display:flex;flex-direction:column;gap:10px"><b>Удалить все данные?</b><span>Удалятся ' + ops.length.toLocaleString("ru-RU") + ' ' + pl(ops.length, "операция", "операции", "операций") + ', счета, сверки и долги. Настройки, курсы и автокопии останутся: перед удалением приложение сохранит копию «перед удалением», из неё всё можно вернуть.</span>' +
    (DL ? '<button class="btn alt" data-act="backup" style="height:44px;font-size:15px">Сначала скачать файл</button>' : "") +
    '<button class="btn" data-act="delall" style="height:44px;font-size:15px;background:var(--red);color:#fff"' + (UI.delBusy ? " disabled" : "") + '>' + (UI.delBusy ? "Удаляю…" : "Удалить всё") + '</button><button class="btn alt" data-act="delcancel" style="height:44px;font-size:15px">Отмена</button></div></section>';
  R += secT("Аккаунт", "", '<div class="group"><div class="field"><span style="flex:1;font-size:17px">Почта</span><span class="mut" style="font-size:15px">' + esc(Cloud.email() || "—") + '</span></div>' +
    (Demo.on() ? '<button class="row" data-act="demostop"><span class="body"><span class="t"><b style="color:var(--link);font-weight:400">Выйти из демо — к своим данным</b></span></span></button>'
      : '<button class="row" data-act="demostart"><span class="body"><span class="t"><b style="color:var(--link);font-weight:400">Посмотреть демо-версию</b><span class="mut" style="font-size:13px">вымышленные данные, ваши не затрагиваются</span></span></span></button>') +
    (PZ().guide === "off" && !Demo.on() ? '<button class="row" data-act="guideshow"><span class="body"><span class="t"><b style="color:var(--link);font-weight:400">Показать гид «С чего начать»</b></span></span></button>' : "") +
    (confirmLogout() ? '<div class="field" style="flex-direction:column;align-items:stretch;gap:10px;padding:12px 16px"><span style="font-size:15px;line-height:1.4">Выйти на этом устройстве? Данные останутся в базе, копия на устройстве удалится.</span><div style="display:flex;gap:8px"><button class="btn danger" style="flex:1;height:44px;font-size:15px" data-act="logout">Выйти</button><button class="btn alt" style="flex:1;height:44px;font-size:15px" data-act="logoutcancel">Отмена</button></div></div>'
      : '<button class="row" data-act="logout"><span class="body" style="border:0"><span class="t"><b style="color:var(--redT)">Выйти</b></span></span></button>') + '</div>', "Пароль меняется по ссылке «Забыли пароль?» на экране входа. Вход на iPhone подставляется из Связки ключей с Face ID.");
  return html + cols(L, R);
}
/* ---------- Категории и лимиты ---------- */
function vCategories() {
  const C = S.settings.cats; const T = S.settings.limitTotal || {};
  const curSel = (attr, key, cur) => '<select ' + attr + '="' + esc(key) + '" aria-label="Валюта лимита" class="cursel">' + Object.keys(SYM).map(c => '<option value="' + c + '"' + (c === (cur || "RUB") ? " selected" : "") + '>' + SYM[c] + '</option>').join("") + '</select>';
  let html = navHead("Категории", "", backBtn("prefs", "Настройки"), "", "Лимиты на месяц — в любой валюте, пересчитываются по курсу месяца");
  const m = curM(); let sum = 0; for (const c of C.e) sum += budRUB(c.name, m);
  let L = '<section class="sec" style="gap:6px"><div class="caps"><span>Общий лимит</span></div><div class="group"><div class="field lim"><label for="lim-total" class="limn">Все траты в месяц</label><span class="limc"><input id="lim-total" class="n" data-limt="1" inputmode="decimal" value="' + (T.v ? esc(nf(T.v, T.v % 1 ? 2 : 0)) : "") + '" placeholder="нет">' + curSel("data-limtcur", "1", T.cur) + '</span></div></div><p class="foot">Сумма лимитов по категориям: ' + D(sum) + '. Если общий лимит не задан, в аналитике используется эта сумма.</p></section>';
  L += '<section class="sec" style="gap:6px"><div class="caps"><span>Расходы</span><span>лимит в месяц</span></div><div class="group">' + C.e.map((c, i) => { const b = budObj(c.name) || {}; return '<div class="field lim">' + catTile(c.name) + '<label for="bud-' + i + '" class="limn">' + esc(c.name) + '</label><span class="limc"><input id="bud-' + i + '" class="n" data-bud="' + esc(c.name) + '" inputmode="decimal" value="' + (b.v ? esc(nf(b.v, b.v % 1 ? 2 : 0)) : "") + '" placeholder="нет">' + curSel("data-budcur", c.name, b.cur) + '<button class="mbtn" data-act="delcat" data-t="e" data-i="' + i + '" aria-label="Удалить категорию ' + esc(c.name) + '">×</button></span></div>'; }).join("") + '</div></section>';
  let R = '<section class="sec" style="gap:6px"><div class="caps"><span>Доходы</span></div><div class="group">' + C.i.map((c, i) => '<div class="field">' + catTile(c.name) + '<span style="flex:1;min-width:0">' + esc(c.name) + '</span><button class="mbtn" data-act="delcat" data-t="i" data-i="' + i + '" aria-label="Удалить категорию ' + esc(c.name) + '">×</button></div>').join("") + '</div></section>';
  R += '<section class="sec"><div class="group"><div class="field"><label for="newcat">Новая</label><input id="newcat" placeholder="название категории"></div></div><div class="grid3" style="grid-template-columns:1fr 1fr"><button class="btn alt" data-act="addcat" data-t="e" style="height:44px;font-size:15px">+ в расходы</button><button class="btn alt" data-act="addcat" data-t="i" style="height:44px;font-size:15px">+ в доходы</button></div><p class="foot">Удаление категории не трогает старые операции — они остаются с прежним названием.</p></section>';
  return html + cols(L, R);
}

/* ---------- действия модуля ---------- */
App.actions({
  pzfavs: () => { UI.pzFavs = !UI.pzFavs; render(); },
  addcat: async t => { const v = (document.getElementById("newcat") || {}).value || ""; if (!v.trim()) return toast("Введите название"); const L = S.settings.cats[t.dataset.t]; if (L.some(c => c.name.toLowerCase() === v.trim().toLowerCase())) return toast("Такая категория уже есть"); L.push({ name: v.trim(), subs: [] }); render(); await saveMeta("settings"); },
  delcat: async t => { const L = S.settings.cats[t.dataset.t], i = +t.dataset.i, c = L[i]; L.splice(i, 1); render(); await saveMeta("settings"); toast("Категория «" + c.name + "» удалена", async () => { const L2 = S.settings.cats[t.dataset.t]; if (L2.some(x => x.name === c.name)) return; L2.splice(Math.min(i, L2.length), 0, c); await saveMeta("settings"); }); },
  exportcsv: async () => {
    if (!DL) return toast("Выгрузка недоступна в этом просмотре");
    const rows = [["Дата", "Тип", "Счет", "Сумма", "Валюта", "Категория", "Подкатегория", "Заметка", "Куда"]];
    for (const o of allOps()) rows.push([o.d, { e: "расход", i: "доход", t: "перевод" }[o.t], accName(o.ac), String(o.a).replace(".", ","), opCur(o), o.c || "", o.s || "", o.n || "", o.to ? accName(o.to) : ""]);
    const csv = "﻿" + rows.map(r => r.map(x => /[;"\n]/.test(x) ? '"' + String(x).replace(/"/g, '""') + '"' : x).join(";")).join("\n");
    try { await DL.save({ filename: "budget-operations-" + TODAYS + ".csv", data: csv }); toast("Файл сохранен"); } catch (e) { if (e && e.code !== "declined") toast("Не удалось сохранить файл"); }
  },
  mymonth: async t => { const r = myPath(t.dataset.p + ".x"); if (!r) return; const m = +t.dataset.m, a = r.o, i = a.indexOf(m); if (i >= 0) a.splice(i, 1); else { a.push(m); a.sort((x, y) => x - y); } await mySave(); },
  mytog: async t => { const r = myPath(t.dataset.p); if (!r) return; r.o[r.key] = !r.o[r.key]; await mySave(); },
  veredit: t => openVer(t.dataset.p, t.dataset.k, t.dataset.i != null ? +t.dataset.i : null, t.dataset.end === "1", t.dataset.cur),
  verm: t => { readForm(); FORM.from = t.dataset.m; renderSheet(); },
  vercur: t => { readForm(); FORM.cur = t.dataset.c; renderSheet(); },
  verarm: () => { readForm(); FORM.armDel = true; renderSheet(); },
  verdel: async () => { const F = FORM, arr = verArr(F.p); if (!arr || F.idx == null) return closeSheet(); const before = JSON.parse(JSON.stringify(arr)); arr.splice(F.idx, 1); closeSheet(); try { await mySave(); } catch (e) { return; } toast("Запись удалена", () => verRestore(F.p, before)); },
  savever: async () => {
    readForm(); const F = FORM, K = VERK[F.vk], arr = verArr(F.p); if (!arr) return closeSheet();
    if (!/^\d{4}-\d{2}$/.test(F.from || "")) return toast("Укажите месяц");
    const e = { from: F.from };
    if (F.end) e.v = 0;
    else if (K.f === "vc" || K.f === "v") { const v = calcNum(F.v); if (!(v >= 0)) return toast("Введите сумму"); e.v = v; if (K.f === "vc") e.cur = F.cur || "UZS"; }
    else if (K.f === "tp") { const a = calcNum(F.target), b = calcNum(F.pct); if (!(a >= 0) || !(b >= 0)) return toast("Введите проценты"); e.target = a; e.pct = b; }
    else { const a = calcNum(F.old), b = calcNum(F.nw); if (!(a >= 0) || !(b >= 0)) return toast("Введите ставки"); e.old = a; e.nw = b; }
    const before = JSON.parse(JSON.stringify(arr));
    if (F.idx != null) arr[F.idx] = e; else { const j = arr.findIndex(x => x && x.from === e.from); if (j >= 0) arr[j] = e; else arr.push(e); }
    if (F.vk === "fix") { const o = verOwn(F.p), fx = o && mySt().fixed[o.cat]; if (fx) fx.on = true; }
    closeSheet(); try { await mySave(); } catch (x) { return; }
    toast((F.end ? "Завершено с " : "Сохранено · с ") + mLabelG(e.from), () => verRestore(F.p, before));
  },
  incnew: () => openSheet({ kind: "inc", title: "Новое поступление", i: null, name: "", cur: "RUB", cat: "", months: [], v: "", from: addMonth(curM(), 1) }),
  incedit: t => { const x = (mySt().incomes || [])[+t.dataset.i]; if (x) openSheet({ kind: "inc", title: x.name || "Поступление", i: +t.dataset.i, name: x.name || "", cur: x.cur || "RUB", cat: x.cat || "", months: (x.months || []).slice() }); },
  incm: t => { readForm(); const m = +t.dataset.m, a = FORM.months, i = a.indexOf(m); if (i >= 0) a.splice(i, 1); else { a.push(m); a.sort((x, y) => x - y); } renderSheet(); },
  incarm: () => { readForm(); FORM.armDel = true; renderSheet(); },
  saveinc: async () => {
    readForm(); const F = FORM, M = mySt(); if (!(F.name || "").trim()) return toast("Введите название");
    if (F.i == null) { const v = calcNum(F.v); if (!(v >= 0)) return toast("Введите сумму"); if (!/^\d{4}-\d{2}$/.test(F.from || "")) return toast("Укажите месяц"); (M.incomes = M.incomes || []).push({ id: uid("n"), name: F.name.trim(), cur: F.cur || "RUB", cat: F.cat || "", months: F.months.slice(), hist: [{ from: F.from, v }] }); }
    else { const x = (M.incomes || [])[F.i]; if (!x) return closeSheet(); x.name = F.name.trim(); x.cur = F.cur || "RUB"; x.cat = F.cat || ""; x.months = F.months.slice(); }
    closeSheet(); try { await mySave(); } catch (e) { return; } toast(F.i == null ? "Поступление добавлено" : "Сохранено");
  },
  incdel: async () => { const M = mySt(), i = FORM.i, x0 = (M.incomes || [])[i]; if (!x0) return closeSheet(); M.incomes.splice(i, 1); closeSheet(); try { await mySave(); } catch (e) { return; } toast("Поступление удалено", async () => { const L = mySt().incomes; if (L.some(x => x.id === x0.id)) return; L.splice(Math.min(i, L.length), 0, x0); await mySave(); }); },
  fixtog: async t => { const M = mySt(), c = t.dataset.c, f = M.fixed[c] || (M.fixed[c] = { on: false, hist: [] }); if (!Array.isArray(f.hist)) f.hist = []; f.on = !f.on; const open = f.on && !f.hist.length; try { await mySave(); } catch (e) { return; } if (open) openVer("fixed." + c + ".hist", "fix", null, false, t.dataset.cur); },
  fixrm: async t => { const c = t.dataset.c, F = fcS(), prevK = F.kinds[c], f = mySt().fixed[c], prevOn = f ? f.on : false; F.kinds[c] = "var"; if (f) f.on = false; try { await mySave(); } catch (e) { return; } toast("«" + c + "» убрана из постоянных", async () => { const K = fcS().kinds; if (prevK == null) delete K[c]; else K[c] = prevK; const g = mySt().fixed[c]; if (g) g.on = prevOn; await mySave(); }); },
  fixadd: () => openSheet({ kind: "fixadd", title: "Добавить в постоянные" }),
  fixpick: async t => { const c = t.dataset.c, M = mySt(); fcS().kinds[c] = "fix"; if (!M.fixed[c]) M.fixed[c] = { on: false, hist: [] }; closeSheet(); try { await mySave(); } catch (e) { return; } toast("«" + c + "» теперь в постоянных"); },
  pz: async t => { const u = PZ(), k = t.dataset.k, v = t.dataset.v; u[k] = v; if (k === "cur") { UI.cur = v; lsSet("cur", v); if (!u.curs.includes(v)) u.curs.push(v); } await savePZ(); },
  pztog: async t => { const u = PZ(), k = t.dataset.k; u[k] = !u[k]; await savePZ(); if (k === "hide" && u.hide) toast("Суммы скрыты — нажмите на число, чтобы открыть на 30 секунд"); },
  pzcurs: async t => { const u = PZ(), c = t.dataset.c, i = u.curs.indexOf(c); if (i >= 0) { if (c === (u.cur || UI.cur)) return toast("Основная валюта всегда в переключателе"); if (u.curs.length <= 2) return toast("Оставьте хотя бы две валюты"); u.curs.splice(i, 1); if (UI.cur === c) UI.cur = u.cur || "RUB"; } else u.curs.push(c); await savePZ(); },
  pzmv: async t => { const B = PZ().blocks, i = +t.dataset.i, j = i + +t.dataset.d; if (j < 0 || j >= B.length) return; const x = B[i]; B[i] = B[j]; B[j] = x; await savePZ(); },
  pzblk: async t => { const b = PZ().blocks[+t.dataset.i]; if (!b) return; b.on = !b.on; await savePZ(); },
  pzfav: async t => { const u = PZ(), c = t.dataset.c, i = u.favs.indexOf(c); if (i >= 0) u.favs.splice(i, 1); else { if (u.favs.length >= 8) return toast("Не больше 8 избранных"); u.favs.push(c); } await savePZ(); },
  delarm: () => { UI.delArm = true; render(); },
  delcancel: () => { UI.delArm = false; render(); },
  delall: async () => {
    if (!DB || UI.delBusy) return; UI.delBusy = true; render();
    try { await bkCreate("pre-delete"); } catch (e) { UI.delBusy = false; render(); return toast("Не удалось сохранить копию — удаление отменено"); }
    try {
      for (const m of Object.keys(S.ops)) { await save("ops/" + m, { items: {} }); OPSFMT[m] = "map"; }
      await save("meta/accounts", { list: [] }); await save("meta/snaps", { items: {} }); await save("meta/debts", { list: [] }); await save("meta/advice", {});
      toast("Данные удалены. Копия «перед удалением» — в резервных копиях");
    } catch (e) { toast("Удаление прервано — часть данных осталась. Повторите"); }
    UI.delBusy = false; UI.delArm = false; UI.bkList = undefined; render();
  }
});

/* ---------- поля модуля ---------- */
App.change(t => t.dataset.f === "from" && FORM && FORM.kind === "ver", async t => { readForm(); renderSheet(); });
App.change(t => t.dataset.bud, async t => { const v = parseNum(t.value); const B = S.settings.budgets = S.settings.budgets || {}; const cur = (budObj(t.dataset.bud) || {}).cur || (t.parentElement.querySelector("[data-budcur]") || {}).value || "RUB"; if (v > 0) B[t.dataset.bud] = { v, cur }; else delete B[t.dataset.bud]; await saveMeta("settings"); render(); });
App.change(t => t.dataset.budcur, async t => { const B = S.settings.budgets = S.settings.budgets || {}; const b = budObj(t.dataset.budcur); if (b && b.v > 0) B[t.dataset.budcur] = { v: roundCur(conv(b.v, b.cur || "RUB", t.value, curM()), t.value), cur: t.value }; await saveMeta("settings"); render(); });
App.change(t => t.dataset.limt, async t => { const v = parseNum(t.value); const cur = ((S.settings.limitTotal || {}).cur) || (t.parentElement.querySelector("[data-limtcur]") || {}).value || "RUB"; if (v > 0) S.settings.limitTotal = { v, cur }; else delete S.settings.limitTotal; await saveMeta("settings"); render(); });
App.change(t => t.dataset.limtcur, async t => { const T = S.settings.limitTotal; if (T && T.v > 0) S.settings.limitTotal = { v: roundCur(conv(T.v, T.cur || "RUB", t.value, curM()), t.value), cur: t.value }; else S.settings.limitTotal = { v: 0, cur: t.value }; await saveMeta("settings"); render(); });
App.change(t => t.dataset.pz, async t => { const u = PZ(), k = t.dataset.pz; u[k] = k === "remRecon" ? +t.value : k === "remFile" ? (t.value === "" ? null : +t.value) : t.value; await savePZ(); });
App.change(t => t.dataset.my, async t => {
    const r = myPath(t.dataset.my); if (!r) return; const k = t.dataset.k;
    if (k === "m") { if (!/^\d{4}-\d{2}$/.test(t.value)) { toast("Укажите месяц в формате ГГГГ-ММ"); render(); return; } r.o[r.key] = t.value; }
    else if (k === "n") { const v = calcNum(t.value); if (!isFinite(v) || v < 0) { toast("Введите число"); render(); return; } r.o[r.key] = v; }
    else r.o[r.key] = t.value;
    await mySave();
  });

/* ---------- экраны модуля ---------- */
for (const [name, fn] of [["prefs", vSettings], ["params", vSettings], ["income", vIncome], ["fixed", vFixed], ["deposits", vDeposits], ["fcset", vFcSet], ["defaccs", vDefAccs], ["advisor", vAdvisor], ["backups", vBackups], ["personal", vPersonal], ["about", vAbout], ["categories", vCategories]])
  App.view(name, fn, { section: "prefs", group: "settings" });
