/* Экраны «Счета», «Сверка», «Долги», «Курсы» */
"use strict";
/* ---------- Счета ---------- */
function vAccounts() {
  const act = accs().filter(a => !a.archived), arch = accs().filter(a => a.archived);
  let html = navHead("Счета", "", eyeBtn(), headRight('<button class="gbtn glass" data-act="editacc" style="font-weight:' + (UI.editAcc ? 700 : 500) + '">' + (UI.editAcc ? "Готово" : "Изменить") + '</button>'), act.filter(a => a.inCap).length + " в капитале · " + D(capitalNowRUB()));
  let L = "", R = "";
  const byType = PZ().accBy === "type";
  if (act.length > 1) html += '<div class="seg glass mini" role="group" aria-label="Группировка счетов" style="align-self:flex-start;margin-bottom:4px">' + [["country", "По странам"], ["type", "По типам"]].map(x => '<button data-act="accby" data-v="' + x[0] + '" aria-pressed="' + ((x[0] === "type") === byType) + '">' + x[1] + '</button>').join("") + '</div>';
  // по типам — все счета в группах, а сверху структура капитала; большие карточки «Основных» — в режиме по странам
  const mains = UI.editAcc || byType ? [] : act.filter(a => a.main).sort((x, y) => (x.order || 0) - (y.order || 0));
  if (byType && !UI.editAcc) html += accStructure(act);
  if (mains.length) html += '<section class="sec" style="gap:8px"><div class="caps"><span>Основные</span><span class="n">' + D(mains.filter(a => a.inCap).reduce((s, a) => s + toRUB(balanceAt(a.id, TODAYS), a.cur, curM()), 0)) + '</span></div><div class="mains">' + mains.map(mainCard).join("") + '</div></section>';
  const order = ["RU", "UZ", "KZ", ""], cOrd = a => { const i = order.indexOf(a.country || ""); return i < 0 ? order.length : i; };
  const byC = {}; for (const a of act) if (!mains.includes(a)) { const k = byType ? accKind(a) : a.country || ""; (byC[k] = byC[k] || []).push(a); }
  const keys = byType ? ACC_KINDS.map(k => k[0]) : order.concat(Object.keys(byC).filter(k => !order.includes(k)));
  for (const c of keys) {
    const list = byC[c]; if (!list) continue;
    if (byType) list.sort((x, y) => cOrd(x) - cOrd(y) || (x.order || 0) - (y.order || 0));
    let t = 0; for (const a of list) if (a.inCap) t += toRUB(balanceAt(a.id, TODAYS), a.cur, curM());
    L += '<section class="sec" style="gap:6px"><div class="caps"><span>' + esc(byType ? ACC_KINDS.find(k => k[0] === c)[1] : COUNTRY[c] || c) + '</span><span class="n">' + D(t) + '</span></div><div class="group">' + (byType ? list : list.sort((x, y) => (x.order || 0) - (y.order || 0))).map(a => accRow(a, byType)).join("") + '</div></section>';
  }
  R += '<section class="sec"><div class="group"><button class="row" data-act="newacc"><span class="minus" style="background:var(--green)" aria-hidden="true">+</span><span class="body"><span class="t"><b style="color:var(--link)">Добавить счет</b></span></span></button>' +
    (arch.length ? '<button class="row" data-act="togarch"><span class="body"><span class="t"><b>Архив</b></span><span class="mut" style="font-size:15px">' + esc(arch.map(a => a.name).join(", ")) + ' ' + (UI.showArch ? "⌃" : "›") + '</span></span></button>' : "") + '</div></section>';
  if (UI.showArch && arch.length) R += '<section class="sec" style="gap:6px"><div class="caps"><span>Архив · не в капитале</span></div><div class="group">' + arch.map(a => accRow(a)).join("") + '</div></section>';
  const more = [["Долги", D(debtsTotalRUB()), "debts", "#FF9500", "person"], ["Сверка остатков", (snapKeys().length ? "последняя " + dLabel(snapKeys().slice(-1)[0]) : "нет"), "reconcile", "#007AFF", "recon"], ["Импорт", "Excel, CSV, PDF", "import", "#34C759", "imp"]].concat(gameOn() ? [["Игра", "индекс, челленджи, награды", "awards", "#FF9500", "trophy"]] : [], [["Настройки", "доходы, курсы, вид", "prefs", "#636366", "gear"]]);
  R += '<section class="sec" style="gap:6px"><div class="caps"><span>Еще</span></div><div class="group">' + more.map(x => '<button class="row" data-act="go" data-v="' + x[2] + '"><span class="tile" style="background:' + x[3] + '">' + svg(x[4], 18) + '</span><span class="body"><span class="t"><b>' + x[0] + '</b></span><span class="mut n" style="font-size:15px">' + x[1] + '</span><span class="chev">›</span></span></button>').join("") + '</div></section>';
  return html + cols(L, R);
}
const MAINC = { card: "#0A84FF", deposit: "#28A860", broker: "#5E5CE6", fund: "#AF52DE", cash: "#6E6E73", other: "#48484A" };
const ACC_COLORS = ["#0A84FF", "#1E3A8A", "#28A860", "#0F766E", "#5E5CE6", "#AF52DE", "#E0245E", "#FF7A00", "#D4A017", "#B08D57", "#6E6E73", "#1C1C1E"];
function accColor(a) { const k = skinOf(a); return k ? SKINS[k][1] : a.color || MAINC[a.type] || MAINC.other; }
function isLight(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return false; const n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; const L = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126 * L(r) + .7152 * L(g) + .0722 * L(b) > .45; }
const CHIP = '<svg class="cchip" viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><defs><linearGradient id="chg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3DFA2"/><stop offset=".5" stop-color="#D4B25E"/><stop offset="1" stop-color="#B8913A"/></linearGradient></defs><rect x=".5" y=".5" width="39" height="29" rx="6" fill="url(#chg)" stroke="rgba(0,0,0,.25)"/><path d="M0 10h12M0 20h12M28 10h12M28 20h12M12 0v30M28 0v30M12 15h16" stroke="rgba(90,60,10,.45)" stroke-width="1" fill="none"/></svg>';
const NFC = '<svg class="cnfc" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 7.5a6.5 6.5 0 0 1 0 9M11.5 5a10 10 0 0 1 0 14M15 2.6a13.5 13.5 0 0 1 0 18.8M4.6 10a3 3 0 0 1 0 4"/></svg>';
// the card graphic: bank-card proportions, chosen color, chip, decorative waves
function cardFace(a, bal, extra) {
  const sk = skinOf(a), col = accColor(a), light = sk ? !!SKINS[sk][2] : isLight(col), b = money(bal, a.cur), bl = b.length, ic = (ACCT[a.type] || ACCT.other)[0];
  const tail = a.type === "card" ? (a.last4 ? "•••• " + esc(a.last4) : esc(TYPEN[a.type])) : esc([TYPEN[a.type], a.rate ? a.rate + "%" : ""].filter(Boolean).join(" · "));
  return '<span class="cface' + (light ? " lt" : "") + (sk ? " sk-" + sk : "") + '" style="--c1:' + esc(col) + '">' +
    '<svg class="cwave" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 150 C 70 110, 140 190, 330 120 L330 210 L-10 210Z" fill="currentColor" opacity=".10"/><path d="M-10 175 C 90 140, 170 215, 330 160 L330 210 L-10 210Z" fill="currentColor" opacity=".10"/><circle cx="292" cy="22" r="70" fill="currentColor" opacity=".08"/><circle cx="250" cy="-10" r="44" fill="currentColor" opacity=".07"/></svg>' +
    '<span class="ctop"><span class="cnm"><small>' + esc(a.bank || TYPEN[a.type] || "") + '</small><b>' + esc(a.name || "Новый счет") + '</b></span>' + (a.type === "card" ? NFC : '<span class="cic">' + svg(ic, 20) + '</span>') + '</span>' +
    '<span class="cmid">' + (a.type === "card" ? CHIP : "") + (extra && extra.spark ? extra.spark : "") + '</span>' +
    '<span class="cbal n" style="font-size:' + (bl > 17 ? 19 : bl > 14 ? 22 : 26) + 'px">' + b + '</span>' +
    '<span class="cbot"><span class="n">' + tail + '</span><span>' + esc(extra && extra.sub || SYM[a.cur] || a.cur) + '</span></span></span>';
}
function mainCard(a) {
  const bal = balanceAt(a.id, TODAYS), m = curM(), light = isLight(accColor(a));
  const store = ["deposit", "broker", "fund"].includes(a.type); let ex = 0, inc = 0, last = null;
  for (const o of allOps()) { if (o.ac !== a.id && o.to !== a.id) continue; if (o.d > TODAYS) break; if (o.d.slice(0, 7) === m) { if (store) { const d = opDelta(o, a.id); if (d < 0) ex -= d; else inc += d; } else { if (o.t === "e" && o.ac === a.id) ex += o.a; if (o.t === "i" && o.ac === a.id) inc += o.a; } } last = o; }
  const pts = []; for (let i = 29; i >= 0; i--) pts.push(balanceAt(a.id, iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - i))));
  const hi = Math.max(...pts), lo = Math.min(...pts), rg = hi - lo || 1, W = 70, H = 26;
  const sp = '<svg class="msp" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true"><polyline points="' + pts.map((v, i) => (2 + (W - 4) * i / 29).toFixed(1) + "," + (H - 3 - (H - 6) * (v - lo) / rg).toFixed(1)).join(" ") + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/></svg>';
  const ld = last ? dLabel(last.d) + " · " + (last.t === "t" ? "Перевод" : last.c) + (last.n ? " · " + last.n : "") : "операций пока нет";
  const lv = last ? money(opDelta(last, a.id), a.cur, { sign: true }) : "";
  return '<button class="mcard" data-act="accdet" data-id="' + esc(a.id) + '" aria-label="' + esc(a.name) + ': ' + esc(money(bal, a.cur)) + '">' +
    cardFace(a, bal, { spark: sp, sub: a.cur !== UI.cur ? "≈ " + D(toRUB(bal, a.cur, m)) : SYM[a.cur] }) +
    '<span class="minfo"><span class="mrow"><span>' + (store ? "Пополнения" : "Доходы") + ' в ' + MONS[+m.slice(5) - 1] + ' <b class="n pos">' + money(inc, a.cur, { sign: inc > 0 }) + '</b></span><span>' + (store ? "Списания" : "Расходы") + ' <b class="n">' + money(ex ? -ex : 0, a.cur) + '</b></span></span>' +
    '<span class="mlast"><span>' + esc(ld) + '</span><b class="n">' + lv + '</b></span></span></button>';
}
/** Структура капитала по типам счетов: полоса долей и легенда. Считаются только счета «в капитале». */
function accStructure(act) {
  const T = ACC_KINDS.map(k => ({ k: k[0], n: k[3], c: (ACCT[k[2][0]] || ACCT.other)[1], v: act.filter(a => a.inCap && accKind(a) === k[0]).reduce((s, a) => s + toRUB(balanceAt(a.id, TODAYS), a.cur, curM()), 0) })).filter(x => x.v > 0);
  const tot = T.reduce((s, x) => s + x.v, 0); if (!tot) return "";
  const pc = x => Math.round(x.v / tot * 100);
  return '<section class="sec" style="gap:6px"><div class="caps"><span>Структура капитала</span><span class="n">' + D(tot) + '</span></div><div class="card" style="display:flex;flex-direction:column;gap:10px">' +
    '<div role="img" aria-label="' + esc(T.map(x => x.n + " " + pc(x) + "%").join(", ")) + '" style="display:flex;height:12px;border-radius:6px;overflow:hidden;gap:2px">' + T.map(x => '<span style="flex:' + x.v + ';background:' + x.c + '"></span>').join("") + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px">' + T.map(x => '<div style="display:flex;align-items:center;gap:7px;font-size:14px;min-width:0"><span aria-hidden="true" style="width:9px;height:9px;border-radius:3px;background:' + x.c + ';flex:none"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.n) + '</span><b class="n">' + pc(x) + '%</b></div>').join("") + '</div></div></section>';
}
function accRow(a, byType) {
  const bal = balanceAt(a.id, TODAYS); const armed = UI.editAcc && UI.armed === a.id;
  return '<div class="row">' + (UI.editAcc ? '<button class="minus" data-act="arm" data-id="' + a.id + '" aria-label="Удалить ' + esc(a.name) + '">−</button>' : "") + accTile(a) +
    '<span class="body"' + (UI.editAcc ? "" : ' data-act="accdet" data-id="' + a.id + '" style="cursor:pointer"') + '><button class="t" data-act="' + (UI.editAcc ? "noop" : "accdet") + '" data-id="' + a.id + '" style="text-align:left"><b>' + esc(a.name) + '</b><small>' + esc([byType && a.country ? COUNTRY[a.country] || a.country : "", byType ? (a.type === "other" || a.type === "fund" ? TYPEN[a.type] : "") : !byType ? TYPEN[a.type] || "" : "", SYM[a.cur], a.rate ? a.rate + "%" : "", a.inCap ? "" : "не в капитале", a.note].filter(Boolean).join(" · ")) + '</small></button>' +
    (armed ? '<button class="delbtn" data-act="delacc" data-id="' + a.id + '">Удалить</button>' : '<span class="v n' + (bal < 0 ? " neg" : "") + '">' + money(bal, a.cur) + '</span>' + (UI.editAcc ? "" : '<span class="chev" aria-hidden="true">›</span>')) + '</span></div>';
}

/* ---------- Сверка ---------- */
function vReconcile() {
  const ks = snapKeys(); const last = ks[ks.length - 1];
  const next = last ? addMonth(last.slice(0, 7), 1) + "-01" : curM() + "-01";
  const opts = ks.concat(ks.includes(next) || next > TODAYS ? [] : [next]);
  if (!UI.recDate || !opts.includes(UI.recDate)) UI.recDate = next <= TODAYS ? next : last || next;
  const D0 = UI.recDate, exists = !!(S.snaps && S.snaps.items[D0]);
  const prevK = ks.filter(k => k < D0).slice(-1)[0];
  const ix = opts.indexOf(D0);
  let html = navHead("Сверка", "", backBtn("accounts", "Счета"), "", "Остатки по всем счетам на 1-е число");
  html += '<div style="display:flex;align-items:center;gap:8px;margin-top:14px"><button class="mbtn glass" data-act="recdate" data-d="' + (opts[ix - 1] || D0) + '" aria-label="Предыдущий снимок"' + (ix > 0 ? "" : " disabled") + '>‹</button><div style="flex:1;text-align:center;font-size:17px;font-weight:600">' + dLabel(D0) + (exists ? ' <span class="pos">✓</span>' : ' <span class="neg" style="font-size:14px">· не заполнен</span>') + '</div><button class="mbtn glass" data-act="recdate" data-d="' + (opts[ix + 1] || D0) + '" aria-label="Следующий снимок"' + (ix < opts.length - 1 ? "" : " disabled") + '>›</button></div>';
  const list = accs().filter(a => a.inCap && !a.archived);
  const m = D0.slice(0, 7);
  let L = "", R = "";
  L += '<section class="sec" style="gap:6px"><div class="caps"><span>Счет · было ' + (prevK ? dLabel(prevK) : "—") + '</span><span>' + dLabel(D0) + '</span></div><div class="group">' + list.map(a => {
    const prev = prevK ? ((snap(prevK).bal || {})[a.id] || 0) : 0;
    const expect = balanceAt(a.id, D0);
    const cur = exists ? ((snap(D0).bal || {})[a.id] || 0) : null;
    const delta = cur != null ? cur - prev : null;
    return '<div class="row" style="padding:8px 14px 8px 16px;border-bottom:1px solid var(--sep)"><span class="t" style="flex:1;min-width:0"><label for="rc-' + a.id + '" style="font-size:16px">' + esc(a.name) + '</label><small class="n">было ' + money(prev, a.cur) + '</small></span><span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><input id="rc-' + a.id + '" data-rc="' + a.id + '" class="n" inputmode="decimal" value="' + (cur != null ? esc(nf(cur, Math.abs(cur % 1) > 0.004 ? 2 : 0)) : "") + '" placeholder="' + esc(nf(expect, 0)) + '" style="width:150px;border:0;background:var(--fill2);border-radius:10px;padding:7px 9px;text-align:right;font-size:16px"><small class="n ' + (delta > 0 ? "pos" : delta < 0 ? "neg" : "mut") + '" style="font-size:12px;font-weight:600">' + (delta == null ? SYM[a.cur] : delta ? money(delta, a.cur, { sign: true }) : "без изменений") + '</small></span></div>';
  }).join("") + '</div><p class="foot">Пустое поле = остаток по журналу (серым). Значения вводятся в валюте счета.</p></section>';
  const r = (S.rates && S.rates.m && S.rates.m[m]) || rateM(m);
  R += '<section class="sec" style="gap:6px"><div class="caps"><span>Курсы на ' + dLabel(D0) + '</span><span>' + ((S.rates && S.rates.m && S.rates.m[m]) ? esc(S.rates.m[m].src || "") : "нет — подставлены последние") + '</span></div><div class="group">' +
    [["usd", "$ в рублях"], ["eur", "€ в рублях"], ["uzs", "сум за 1 ₽"], ["kzt", "₸ за 1 ₽"]].map(x => '<div class="field"><label for="rr-' + x[0] + '">' + x[1] + '</label><input id="rr-' + x[0] + '" data-rr="' + x[0] + '" class="n" inputmode="decimal" value="' + nf(r[x[0]] || 0, 2) + '"></div>').join("") + '</div></section>';
  R += '<section class="sec"><button class="btn pri" data-act="savesnap">' + (exists ? "Обновить снимок" : "Сохранить снимок") + '</button>' + (exists ? '<button class="btn danger" data-act="delsnap">Удалить снимок</button>' : "") + '</section>';
  if (exists && prevK) {
    const dc = decomp(prevK, D0); const mb = m;
    R += '<section class="sec"><h2 style="padding:0 4px">Итог: ' + dLabel(prevK) + ' → ' + dLabel(D0) + '</h2><div class="card" style="display:flex;flex-direction:column;gap:9px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span>Капитал</span><span class="n ' + (dc.delta >= 0 ? "pos" : "neg") + '" style="font-size:20px;font-weight:700">' + D(dc.delta, mb, { sign: true }) + '</span></div>' +
      [["Курсовая разница", dc.fx], ["Брокер и фонды", dc.inv], ["Разовые поступления", dc.oneoff]].filter(x => Math.abs(x[1]) > 0.5).map(x => '<div class="n" style="display:flex;justify-content:space-between;font-size:15px;color:var(--label2)"><span>' + x[0] + '</span><span>' + D(x[1], mb, { sign: true }) + '</span></div>').join("") +
      '<div class="n" style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;border-top:1px solid var(--sep);padding-top:9px"><span>Сбережения</span><span>' + D(dc.save, mb, { sign: true }) + '</span></div></div></section>';
    const est = dc.income - dc.save;
    R += '<section class="sec"><div class="warn" style="display:flex;flex-direction:column;gap:10px"><b style="font-size:13px;text-transform:uppercase;letter-spacing:.02em">Траты за период</b><span>В журнале: доходы ' + D(dc.income, mb) + ', расходы ' + D(dc.spent, mb) + '.' + (dc.income > 0 ? ' По сверке траты ≈ доходы − сбережения = <b class="n">' + D(est, mb) + '</b>.' : ' Доход не записан — введите его, и траты посчитаются как доход минус сбережения.') + '</span>' +
      '<div style="display:flex;gap:8px;align-items:center"><label for="rc-inc" style="flex:none">Доход, ₽</label><input id="rc-inc" class="n" inputmode="decimal" placeholder="' + (dc.income > 0 ? "уже учтен" : "сумма за период") + '" style="flex:1;min-width:0;border:0;background:var(--card);border-radius:12px;padding:10px 12px;font-size:16px"></div>' +
      '<button class="btn alt" data-act="untracked" data-a="' + prevK + '" data-b="' + D0 + '" style="height:44px;font-size:15px">Записать неучтенные траты</button></div></section>';
  }
  return html + cols(L, R);
}

/* ---------- Долги ---------- */
function vDebts() {
  const DLIST = (S.debts && S.debts.list) || [];
  let html = navHead("Долги", "", backBtn("accounts", "Счета"), '<button class="gbtn icon glass" data-act="newdebt" aria-label="Добавить должника">' + svg("plus", 20) + '</button>');
  let tot = 0, intr = 0; const rows = DLIST.map(d => { const c = debtCalc(d); if (c.bal > 0.5) { tot += toRUB(c.bal, d.cur, curM()); intr += toRUB(c.interest, d.cur, curM()); } return [d, c]; });
  html += '<div style="padding:16px 4px 0;display:flex;flex-direction:column;gap:4px"><span style="font-size:15px;color:var(--label2)">Вам должны на ' + dLabel(TODAYS) + '</span><span class="big n">' + D(tot) + '</span><span class="n" style="font-size:15px;color:var(--label2)">в т.ч. проценты ' + D(intr) + ' · <span class="neg" style="font-weight:600">не входит в капитал</span></span></div>';
  const open = rows.filter(x => x[1].bal > 0.5), closed = rows.filter(x => x[1].bal <= 0.5);
  const COL = ["#FF9500", "#5856D6", "#30B0C7", "#34C759", "#FF2D55", "#007AFF"];
  const row = ([d, c], i) => '<button class="row" data-act="debt" data-id="' + d.id + '" style="min-height:66px"><span class="av" style="background:' + (c.bal > 0.5 ? COL[i % COL.length] : "var(--gray)") + '">' + esc(d.name[0]) + '</span><span class="body"><span class="t"><b>' + esc(d.name) + '</b><small>' + (c.bal > 0.5 ? (c.rate ? nf(c.rate, c.rate % 1 ? 1 : 0) + "% годовых" : "без процентов") + " · выдано " + money(c.lent, d.cur) + (c.ret ? " · вернул " + money(c.ret, d.cur) : "") : "закрыт · вернул " + money(c.ret, d.cur)) + '</small></span><span class="v n' + (c.bal > 0.5 ? "" : " mut") + '">' + money(Math.max(0, c.bal), d.cur) + '</span><span class="chev">›</span></span></button>';
  let L = '<section class="sec">' + (open.length ? '<div class="group">' + open.map(row).join("") + '</div>' : '<div class="card empty">Никто ничего не должен. Нажмите «+», чтобы записать займ.</div>') + '</section>';
  let R = "";
  if (closed.length) R += '<section class="sec" style="gap:6px"><div class="caps"><span>Закрытые</span></div><div class="group">' + closed.map(row).join("") + '</div></section>';
  R += '<p class="foot" style="margin-top:14px">Проценты начисляются на остаток долга и капитализируются при каждой выдаче и возврате (или ежемесячно — настраивается у каждого должника).</p>';
  return html + cols(L, R);
}

/* ---------- Курсы ---------- */
function vRates() {
  const RM = (S.rates && S.rates.m) || {}; const ms = Object.keys(RM).sort().reverse();
  let html = navHead("Курсы и ставки", "", backBtn("prefs", "Настройки"), '<button class="gbtn icon glass" data-act="newrate" aria-label="Добавить месяц">' + svg("plus", 20) + '</button>');
  let R = '<section class="sec"><div class="grid3"><button class="btn alt" data-act="newrate" style="height:44px;font-size:15px">Вручную</button><button class="btn alt" data-act="go" data-v="import" style="height:44px;font-size:15px">Из файла</button><button class="btn alt" data-act="ratehelp" style="height:44px;font-size:15px">Авто</button></div><p class="foot">Курс на 1-е число месяца. По нему пересчитываются снимки и операции этого месяца.</p></section>';
  let L = '<section class="sec" style="gap:6px"><div class="group scrollx"><table class="tbl n"><thead><tr><th>Месяц</th><th>$ в ₽</th><th>€ в ₽</th><th>сум за ₽</th><th>₸ за ₽</th></tr></thead><tbody>' + ms.slice(0, 36).map(m => '<tr data-act="editrate" data-m="' + m + '" style="cursor:pointer"><td>' + MONS[+m.slice(5) - 1] + ' ' + m.slice(0, 4) + '</td><td>' + nf(RM[m].usd, 2) + '</td><td>' + nf(RM[m].eur, 2) + '</td><td>' + nf(RM[m].uzs, 2) + '</td><td>' + nf(RM[m].kzt, 2) + '</td></tr>').join("") + '</tbody></table></div></section>';
  const deps = accs().filter(a => a.rate && !a.archived);
  const DLIST = (S.debts && S.debts.list) || [];
  R += '<section class="sec" style="gap:6px"><div class="caps"><span>Ставки</span></div><div class="group">' + deps.map(a => '<button class="row" data-act="accform" data-id="' + a.id + '"><span class="body"><span class="t"><b>' + esc(a.name) + '</b><small>депозит · меняется в карточке счета</small></span><span class="v n">' + nf(a.rate, a.rate % 1 ? 1 : 0) + '%</span><span class="chev">›</span></span></button>').join("") +
    DLIST.filter(d => debtCalc(d).rate && debtCalc(d).bal > 0.5).map(d => '<button class="row" data-act="debt" data-id="' + d.id + '"><span class="body"><span class="t"><b>Займ: ' + esc(d.name) + '</b><small>меняется в карточке долга</small></span><span class="v n">' + nf(debtCalc(d).rate, debtCalc(d).rate % 1 ? 1 : 0) + '%</span><span class="chev">›</span></span></button>').join("") + '</div></section>';
  return html + cols(L, R);
}

/* ---------- действия модуля ---------- */
App.actions({
  togmain: async t => { const a = acc(t.dataset.id); if (!a) return; a.main = !a.main; render(); toast(a.main ? "Счет добавлен в основные" : "Счет убран из основных"); await saveMeta("accounts"); },
  editacc: () => { UI.editAcc = !UI.editAcc; UI.armed = null; render(); },
  arm: t => { UI.armed = UI.armed === t.dataset.id ? null : t.dataset.id; render(); },
  delacc: async t => { const a0 = acc(t.dataset.id), i0 = accs().indexOf(a0); S.accounts.list = accs().filter(a => a.id !== t.dataset.id); UI.armed = null; render(); await saveMeta("accounts"); toast("Счет удален", () => restoreAcc(a0, i0)); },
  togarch: () => { UI.showArch = !UI.showArch; render(); },
  accby: t => { if (PZ().accBy === t.dataset.v) return; PZ().accBy = t.dataset.v; savePZ(); },
  newacc: () => openSheet({ kind: "acc", title: "Новый счет", name: "", bank: "", type: "card", cur: "UZS", country: "UZ", rate: "", inCap: true, archived: false, note: "", openBal: "", openDate: TODAYS }),
  accform: t => { const a = acc(t.dataset.id); if (UI.editAcc && UI.view === "accounts") return; if (a) openSheet(Object.assign({ kind: "acc", title: a.name }, JSON.parse(JSON.stringify(a)), { rate: a.rate == null ? "" : String(a.rate) })); },
  acctype: t => { readForm(); FORM.type = t.dataset.t; renderSheet(); },
  acccur: t => { readForm(); FORM.cur = t.dataset.c; renderSheet(); },
  acccol: t => { readForm(); FORM.color = t.dataset.c || null; renderSheet(); },
  accskin: t => { readForm(); FORM.skin = t.dataset.s || null; renderSheet(); },
  acctog: t => { readForm(); FORM[t.dataset.k] = !FORM[t.dataset.k]; renderSheet(); },
  archacc: async () => { readForm(); FORM.archived = !FORM.archived; await ACT.saveacc(); },
  armdelacc: () => { readForm(); FORM.armDel = true; renderSheet(); },
  delaccf: async () => { const id = FORM.id, a0 = acc(id), i0 = accs().indexOf(a0); closeSheet(); S.accounts.list = accs().filter(a => a.id !== id); render(); await saveMeta("accounts"); toast("Счет удален", () => restoreAcc(a0, i0)); },
  saveacc: async () => {
    readForm(); const F = FORM; if (!F.name.trim()) return toast("Введите название");
    const a = { id: F.id || uid("a"), name: F.name.trim(), bank: (F.bank || "").trim(), type: F.type, cur: F.cur, country: F.country || "", rate: parseNum(F.rate) > 0 ? parseNum(F.rate) : null, till: F.type === "deposit" && F.till ? F.till : null, inCap: !!F.inCap, main: !!F.main, color: /^#[0-9a-f]{6}$/i.test(F.color || "") ? F.color : null, skin: skinOf(F) || null, last4: F.type === "card" && /^\d{4}$/.test(F.last4 || "") ? F.last4 : null, archived: !!F.archived, note: (F.note || "").trim(), order: F.order != null ? F.order : accs().length };
    if (!F.id) { const ob = parseNum(F.openBal); if (ob) a.openBal = ob; a.openDate = F.openDate || TODAYS; } else { if (F.openBal != null && F.openBal !== "") a.openBal = parseNum(F.openBal); if (F.openDate) a.openDate = F.openDate; }
    if (!S.accounts) S.accounts = { list: [] };
    const L = accs().filter(x => x.id !== a.id); L.push(a); L.sort((x, y) => (x.order || 0) - (y.order || 0)); S.accounts.list = L;
    closeSheet(); render(); await saveMeta("accounts"); toast(F.id ? "Счет сохранен" : "Счет добавлен");
  },
  recdate: t => { UI.recDate = t.dataset.d; render(); },
  savesnap: async () => {
    const D0 = UI.recDate, m = D0.slice(0, 7); const bal = {};
    if (D0 > TODAYS) return toast("Сверку можно сохранить только на наступившую дату");
    for (const a of accs().filter(a => a.inCap && !a.archived)) { const el = document.querySelector('[data-rc="' + a.id + '"]'); let v = parseNum(el && el.value); if (!isFinite(v)) v = Math.round(balanceAt(a.id, D0) * 100) / 100; if (v) bal[a.id] = v; }
    const r = {}; for (const k of ["usd", "eur", "uzs", "kzt"]) { const el = document.querySelector('[data-rr="' + k + '"]'); const v = parseNum(el && el.value); if (v > 0) r[k] = v; }
    if (Object.keys(r).length < 4) return toast("Заполните все четыре курса");
    if (!S.snaps) S.snaps = { items: {} }; if (!S.rates) S.rates = { m: {} };
    S.snaps.items[D0] = { bal }; r.src = (S.rates.m[m] && S.rates.m[m].src && JSON.stringify(Object.assign({}, S.rates.m[m], { src: 0 })) === JSON.stringify(Object.assign({}, r, { src: 0 }))) ? S.rates.m[m].src : "вручную"; S.rates.m[m] = r;
    ALLOPS = null; render(); await saveMeta("snaps"); await saveMeta("rates"); toast("Снимок на " + dLabel(D0) + " сохранен");
  },
  delsnap: async () => { const k = UI.recDate, v = S.snaps.items[k]; delete S.snaps.items[k]; UI.recDate = null; render(); await saveMeta("snaps"); toast("Снимок удален", async () => { S.snaps.items[k] = v; UI.recDate = k; await saveMeta("snaps"); }); },
  untracked: async t => {
    const dc = decomp(t.dataset.a, t.dataset.b); const inp = parseNum((document.getElementById("rc-inc") || {}).value);
    const income = dc.income > 0 ? dc.income : inp; if (!(income > 0)) return toast("Введите доход за период");
    const est = income - dc.save - dc.spent; if (!(est > 1)) return toast("Неучтенных трат нет: записано не меньше, чем по сверке");
    const pref = acc(mySt().untrackedAcc);
    const main = pref && !pref.archived ? pref : (accs().find(a => !a.archived && !NOSPEND.includes(a.type)) || accs().find(a => !a.archived));
    const dEnd = iso(new Date(new Date(t.dataset.b + "T00:00:00").getTime() - 864e5));
    const op = { id: uid("o"), d: dEnd, t: "e", a: Math.round(fromRUB(est, main.cur, t.dataset.b.slice(0, 7))), ac: main.id, c: "Прочее", s: "неучтенные траты", n: "по сверке " + dLabel(t.dataset.a) + " → " + dLabel(t.dataset.b) };
    const ops = [op];
    if (!(dc.income > 0)) ops.push({ id: uid("o"), d: dEnd, t: "i", a: Math.round(fromRUB(inp, main.cur, t.dataset.b.slice(0, 7))), ac: main.id, c: "Зарплата", n: "по сверке" });
    try { for (const o of ops) await putOp(o); } catch (e) { return; }
    render(); toast("Записано: неучтенные траты " + D(est, t.dataset.b.slice(0, 7)));
  },
  debt: t => openSheet({ kind: "debt", id: t.dataset.id, title: "Долг" }),
  newdebt: () => openSheet({ kind: "debtev", k: "new", d: TODAYS, a: "", r: "", name: "", cur: "RUB", title: "Новый должник" }),
  debtev: t => { const id = FORM.id; openSheet({ kind: "debtev", k: t.dataset.k, debt: id, d: TODAYS, a: "", r: "", title: "Запись" }); },
  savedebtev: async () => {
    readForm(); const F = FORM; if (!S.debts) S.debts = { list: [] };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(F.d)) return toast("Укажите дату");
    if (F.k === "new") {
      const a = calcNum(F.a), r = parseNum(F.r) || 0; if (!F.name.trim()) return toast("Введите имя"); if (!(a > 0)) return toast("Введите сумму");
      const d = { id: uid("d"), name: F.name.trim(), cur: F.cur || "RUB", comp: r ? "event" : "none", events: [{ d: F.d, k: "lend", a }] }; if (r) d.events.unshift({ d: F.d, k: "rate", r });
      S.debts.list.push(d); await saveMeta("debts"); openSheet({ kind: "debt", id: d.id, title: "Долг" }); render(); return;
    }
    const d = S.debts.list.find(x => x.id === F.debt); if (!d) return closeSheet();
    if (F.k === "rate") { const r = parseNum(F.r); if (!(r >= 0)) return toast("Введите ставку"); d.events.push({ d: F.d, k: "rate", r }); if (r && (!d.comp || d.comp === "none")) d.comp = "event"; }
    else { const a = calcNum(F.a); if (!(a > 0)) return toast("Введите сумму"); d.events.push({ d: F.d, k: F.k, a }); }
    await saveMeta("debts"); openSheet({ kind: "debt", id: d.id, title: "Долг" }); render();
  },
  debtevdel: async t => { const d = S.debts.list.find(x => x.id === FORM.id), i = +t.dataset.i, ev = d.events[i]; d.events.splice(i, 1); renderSheet(); render(); await saveMeta("debts"); toast("Запись удалена", async () => { const dd = S.debts.list.find(x => x.id === d.id); if (!dd) return; dd.events.splice(Math.min(i, dd.events.length), 0, ev); await saveMeta("debts"); if (FORM && FORM.kind === "debt") renderSheet(); }); },
  debtallm: () => { FORM.allM = true; renderSheet(); },
  armdeldebt: () => { FORM.armDel = true; renderSheet(); },
  deldebt: async () => { const i = S.debts.list.findIndex(x => x.id === FORM.id), d = S.debts.list[i]; S.debts.list = S.debts.list.filter(x => x.id !== FORM.id); closeSheet(); render(); await saveMeta("debts"); toast("Должник удален", async () => { if (S.debts.list.some(x => x.id === d.id)) return; S.debts.list.splice(Math.min(i, S.debts.list.length), 0, d); await saveMeta("debts"); }); },
  newrate: () => { const r = rateM(curM()); openSheet({ kind: "rate", isNew: true, m: curM(), usd: nf(r.usd, 2), eur: nf(r.eur, 2), uzs: nf(r.uzs, 2), kzt: nf(r.kzt, 2) }); },
  editrate: t => { const r = S.rates.m[t.dataset.m]; openSheet({ kind: "rate", m: t.dataset.m, usd: nf(r.usd, 2), eur: nf(r.eur, 2), uzs: nf(r.uzs, 2), kzt: nf(r.kzt, 2) }); },
  saverate: async () => { readForm(); const F = FORM; const r = { src: "вручную" }; for (const k of ["usd", "eur", "uzs", "kzt"]) { const v = parseNum(F[k]); if (!(v > 0)) return toast("Заполните все четыре курса"); r[k] = v; } if (!/^\d{4}-\d{2}$/.test(F.m)) return toast("Укажите месяц"); if (!S.rates) S.rates = { m: {} }; S.rates.m[F.m] = r; closeSheet(); render(); await saveMeta("rates"); toast("Курсы сохранены"); },
  delrate: async () => { const m = FORM.m, v = S.rates.m[m]; delete S.rates.m[m]; closeSheet(); render(); await saveMeta("rates"); toast("Курсы за " + mLabel(m) + " удалены", async () => { S.rates.m[m] = v; await saveMeta("rates"); }); },
  ratehelp: () => openSheet({ kind: "help", title: "Автообновление курсов", html: "<b>Включено.</b> При открытии приложения оно проверяет, есть ли курсы за текущий месяц. Если месяца нет, берет официальные курсы ЦБ РФ на 1-е число — доллар, евро, сум и тенге — и записывает их сюда с пометкой «ЦБ РФ · авто». Пропущенные месяцы тоже дозаполняются.<br><br>Месяцы, введенные вручную или из файла, не перезаписываются. Исправить курс можно в любой момент — нажмите на строку месяца." }),
  accdet: t => { if (UI.editAcc) return; UI.det = { kind: "acc", key: t.dataset.id, from: UI.view === "detail" ? "accounts" : (UI.view || "accounts") }; UI.dm = null; go("detail"); }
});

/* ---------- поля модуля ---------- */
App.change(t => t.dataset.f === "color" || ((t.dataset.f === "name" || t.dataset.f === "bank" || t.dataset.f === "last4") && document.querySelector("#sheet .cprev")), async t => { readForm(); renderSheet(); });
App.change(t => t.dataset.dcomp, async t => { const d = S.debts.list.find(x => x.id === FORM.id); d.comp = t.value; renderSheet(); render(); await saveMeta("debts"); });

/* ---------- экраны модуля ---------- */
App.view("accounts", vAccounts);
App.view("debts", vDebts, { section: "accounts" });
App.view("reconcile", vReconcile, { section: "accounts" });
App.view("rates", vRates, { section: "prefs", group: "settings" });
