/* Формы в нижней шторке и всплывающие сообщения */
"use strict";
/* ============ sheets (forms) ============ */
function openSheet(f) { FORM = f; renderSheet(); }
function closeSheet() { FORM = null; document.getElementById("sheet").innerHTML = ""; }
function renderSheet(force) {
  const el = document.getElementById("sheet");
  if (!FORM) { el.innerHTML = ""; return; }
  if (FORM.kind === "unlock") { const key = FORM.ids[FORM.i] + ":" + FORM.i + ":" + (FORM.n || 0); if (!force && el.dataset.ua === key && el.querySelector(".ua-ov")) return; el.dataset.ua = key; el.innerHTML = sUnlock(); const ok = el.querySelector(".ua-ok"); if (ok) { try { ok.focus({ preventScroll: true }); } catch (e) { /* фокус не критичен */ } } return; }
  el.dataset.ua = "";
  const fn = { op: sOp, acc: sAcc, debt: sDebt, debtev: sDebtEv, rate: sRate, fcev: sFcEv, help: sHelp, ver: sVer, inc: sInc, fixadd: sFixAdd, medal: sMedal, award: sAward }[FORM.kind] || App.sheets[FORM.kind];
  const sc = el.querySelector(".sheet"); const st = sc ? sc.scrollTop : 0;
  el.innerHTML = '<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(FORM.title || "") + '"><div class="grab" aria-hidden="true"></div>' + fn() + '</div></div>';
  const nsc = el.querySelector(".sheet"); if (nsc) nsc.scrollTop = st;
}
function sHead(title, okAct, okLabel) { return '<div class="shead"><button class="cbtn glass" data-act="close" aria-label="Закрыть">' + svg("close", 18) + '</button><h3>' + esc(title) + '</h3>' + (okAct ? '<button class="cbtn ok" data-act="' + okAct + '" aria-label="' + (okLabel || "Сохранить") + '">' + svg("check", 20) + '</button>' : '<span style="width:44px"></span>') + '</div>'; }
const NOSPEND = ["deposit", "broker", "fund"];
function accSelect(id, val, label, spend) { return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-f="' + id.replace("f-", "") + '">' + accs().filter(a => (!a.archived && !(spend && NOSPEND.includes(a.type))) || a.id === val).map(a => '<option value="' + a.id + '"' + (a.id === val ? " selected" : "") + '>' + esc(a.name) + ' · ' + SYM[a.cur] + '</option>').join("") + (label === "Куда" || label === "Откуда" ? '<option value=""' + (!val ? " selected" : "") + '>Вне учета</option>' : "") + '</select></div>'; }

function newOpForm(o) {
  const spendable = a => a && !a.archived && !["deposit", "broker", "fund"].includes(a.type); const lastAcc = lsGet("lastAcc"); const pref = ((S.settings || {}).my || {}).defAcc; const def = pref && spendable(acc(pref)) ? pref : spendable(acc(lastAcc)) ? lastAcc : (accs().find(spendable) || accs().find(a => !a.archived) || {}).id;
  return o ? { kind: "op", title: "Операция", id: o.id, oldD: o.d, t: o.t, a: String(o.a).replace(".", ","), ac: o.ac, to: o.to || "", ta: o.ta != null ? String(o.ta).replace(".", ",") : "", c: o.c, s: o.s || "", d: o.d, n: o.n || "", card: o.card, src: o.src, p: o.p || "", p2: o.p2 || "", b: o.b || "", oldA: o.a, armDel: false }
    : { kind: "op", title: "Новая операция", t: "e", a: "", ac: def, to: "", ta: "", c: "", s: "", d: TODAYS, n: "", p: "", p2: "", b: "" };
}
function sOp() {
  const F = FORM; const C = (S.settings && S.settings.cats) || { e: [], i: [] };
  let h = sHead(F.id ? "Операция" : "Новая операция", "saveop");
  h += '<div class="seg glass" role="group" aria-label="Тип операции">' + [["e", "Расход"], ["i", "Доход"], ["t", "Перевод"]].map(x => '<button data-act="optype" data-t="' + x[0] + '" aria-pressed="' + (F.t === x[0]) + '">' + x[1] + '</button>').join("") + '</div>';
  const cur = formCur(F);
  h += '<div class="card" style="display:flex;flex-direction:column;gap:2px"><label for="f-a" class="mut" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Сумма, ' + SYM[cur] + '</label><input id="f-a" data-f="a" class="amount n" inputmode="decimal" autocomplete="off" value="' + esc(F.a) + '" placeholder="0" style="color:' + (F.t === "i" ? "var(--greenT)" : "var(--label)") + '"><div class="calc"><small id="f-a-res" class="n mut" aria-live="polite">' + esc(calcPreview(F.a, cur)) + '</small><span class="calcb">' + [["+", "+", "Плюс"], ["−", "-", "Минус"], ["×", "*", "Умножить"], ["÷", "/", "Разделить"], ["=", "=", "Посчитать"]].map(x => '<button type="button" data-act="calcop" data-o="' + x[1] + '" aria-label="' + x[2] + '">' + x[0] + '</button>').join("") + '</span></div></div>';
  h += '<div class="group">' + accSelect("f-ac", F.ac, F.t === "t" ? "Откуда" : "Счет", F.t === "e") + (F.t === "t" ? accSelect("f-to", F.to, "Куда") : "") +
    (F.t === "t" && F.ac && F.to && accCur(F.to) !== cur ? '<div class="field"><label for="f-ta">Зачислено, ' + SYM[accCur(F.to)] + '</label><input id="f-ta" data-f="ta" class="n" inputmode="decimal" value="' + esc(F.ta) + '" placeholder="' + esc(nf(conv(calcNum(F.a) || 0, cur, accCur(F.to), F.d.slice(0, 7)), 2)) + '"></div>' : "") +
    '<div class="field"><label for="f-d">Дата</label><input id="f-d" type="date" data-f="d" value="' + esc(F.d) + '"></div>' + (F.t !== "t" ? perFields(F) : "") + '<div class="field"><label for="f-n">Заметка</label><input id="f-n" data-f="n" value="' + esc(F.n) + '" placeholder="место, повод"></div></div>';
  if (F.t !== "t") {
    const list = C[F.t] || [], fav = F.t === "e" ? PZ().favs.filter(n => list.some(c => c.name === n)) : [];
    const allC = !fav.length || F.allCats || (F.c && !fav.includes(F.c)), shown = fav.map(n => list.find(c => c.name === n)).concat(allC ? list.filter(c => !fav.includes(c.name)) : []);
    h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Категория</span><div class="grid4">' + shown.map(c => '<button class="opt" data-act="opcat" data-c="' + esc(c.name) + '" aria-pressed="' + (F.c === c.name) + '"><span class="tile" style="background:' + catColor(c.name) + ';width:26px;height:26px;font-size:12px;font-weight:700;color:#fff">' + esc(c.name[0]) + '</span>' + esc(c.name) + '</button>').join("") + '</div>' + (allC ? "" : '<button class="chipb" data-act="allcats" style="align-self:flex-start">Все категории</button>') + '</section>';
    const cc = list.find(c => c.name === F.c);
    if (F.c) h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Подкатегория</span><div class="chips">' + ((cc && cc.subs) || []).slice(0, 12).map(s => '<button class="chipb" data-act="opsub" data-s="' + esc(s) + '" aria-pressed="' + (F.s === s) + '">' + esc(s) + '</button>').join("") + '</div><div class="group"><div class="field"><label for="f-s">Своя</label><input id="f-s" data-f="s" value="' + esc(F.s) + '" placeholder="например, обед"></div></div></section>';
    if (F.t === "e" && F.c) h += billChips(F);
  }
  if (F.id) h += F.armDel ? '<button class="btn danger" data-act="delop" style="color:#fff;background:var(--red)">Удалить без возврата</button>' : '<button class="btn danger" data-act="armdelop">Удалить операцию</button>';
  return h;
}
/** Черновик операции из формы — чтобы понять, к какому регулярному счёту она относится. */
function formOp(F) { return { t: F.t, c: F.c, s: (F.s || "").trim(), n: F.n || "", ac: F.ac, d: /^\d{4}-\d{2}-\d{2}$/.test(F.d || "") ? F.d : TODAYS, b: F.b || "" }; }
/** Поле «За период»: месяц, за который операция (счёт за квартиру за октябрь, оплаченный в ноябре).
    Пусто — месяц по правилу регулярного счёта, а без счёта — месяц даты. «по» — если оплачено сразу несколько месяцев. */
function perAuto(F) {
  const b = F.t === "e" ? billOf(formOp(F)) : null, dm = formOp(F).d.slice(0, 7), auto = addMonth(dm, b ? +b.per || 0 : 0);
  return b ? "авто · " + MON[+auto.slice(5) - 1] + (auto.slice(0, 4) !== dm.slice(0, 4) ? " " + auto.slice(0, 4) : "") : "как дата";
}
function perFields(F) {
  const dm = formOp(F).d.slice(0, 7);
  const ms = []; for (let k = 3; k >= -14; k--) ms.push(addMonth(dm, k));
  if (F.p && !ms.includes(F.p)) ms.push(F.p);
  let h = '<div class="field"><label for="f-p">За период</label><select id="f-p" data-f="p"><option value="">' + perAuto(F) + '</option>' + ms.map(m => '<option value="' + m + '"' + (F.p === m ? " selected" : "") + '>' + mLabel(m) + '</option>').join("") + '</select></div>';
  if (F.p) { const to = []; for (let k = 1; k <= 12; k++) to.push(addMonth(F.p, k)); if (F.p2 && !to.includes(F.p2)) to.push(F.p2); h += '<div class="field"><label for="f-p2">по</label><select id="f-p2" data-f="p2"><option value="">тот же месяц</option>' + to.map(m => '<option value="' + m + '"' + (F.p2 === m ? " selected" : "") + '>' + mLabel(m) + '</option>').join("") + '</select></div>'; }
  return h;
}
/** Выбор регулярного счёта, если под категорию операции заведены счета (раздел «Платежи»). */
function billChips(F) {
  const L = billList().filter(b => b.c === F.c); if (!L.length) return "";
  const cur = F.b === "-" ? "-" : (billOf(formOp(F)) || {}).id || "";
  return '<section id="f-bills" style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px"><span>Платёж</span><span>' + (F.b ? "выбран вручную" : cur ? "по правилу" : "") + '</span></span><div class="chips">' + L.map(b => '<button class="chipb" data-act="opbill" data-b="' + esc(b.id) + '" aria-pressed="' + (cur === b.id) + '">' + esc(b.name) + '</button>').join("") + '<button class="chipb" data-act="opbill" data-b="-" aria-pressed="' + (cur === "-") + '">не платёж</button></div></section>';
}
function sAcc() {
  const F = FORM;
  let h = sHead(F.id ? F.name || "Счет" : "Новый счет", "saveacc");
  h += '<div class="cprev">' + cardFace({ name: F.name, bank: F.bank, type: F.type, cur: F.cur, rate: parseNum(F.rate) > 0 ? parseNum(F.rate) : null, color: F.color, skin: F.skin, last4: F.last4 }, F.id ? balanceAt(F.id, TODAYS) : (parseNum(F.openBal) || 0)) + '</div>';
  const fsk = skinOf(F);
  h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Дизайн карты</span><div class="skins">' + [["", "Свой цвет"]].concat(Object.keys(SKINS).map(k => [k, SKINS[k][0]])).map(x => '<button class="skin" data-act="accskin" data-s="' + x[0] + '" aria-pressed="' + (fsk === x[0]) + '"><span class="cface' + (x[0] ? " sk-" + x[0] + (SKINS[x[0]][2] ? " lt" : "") : (isLight(accColor(Object.assign({}, F, { skin: "" }))) ? " lt" : "")) + '" style="--c1:' + esc(accColor(Object.assign({}, F, { skin: "" }))) + '" aria-hidden="true"></span>' + x[1] + '</button>').join("") + '</div></section>';
  if (!fsk) h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Цвет</span><div class="swatches">' + ACC_COLORS.map(c => '<button class="swatch" data-act="acccol" data-c="' + c + '" style="background:' + c + '" aria-label="Цвет ' + c + '" aria-pressed="' + ((F.color || "").toLowerCase() === c.toLowerCase()) + '"></button>').join("") + '<label class="swatch custom" aria-label="Свой цвет" title="Свой цвет"><input type="color" data-f="color" value="' + esc(F.color || accColor(F)) + '"></label>' + (F.color ? '<button class="chipb" data-act="acccol" data-c="" style="height:32px;font-size:13px">По типу</button>' : "") + '</div></section>';
  h += '<div class="group"><div class="field"><label for="f-name">Название</label><input id="f-name" data-f="name" value="' + esc(F.name) + '" placeholder="например, Visa"></div><div class="field"><label for="f-bank">Банк</label><input id="f-bank" data-f="bank" value="' + esc(F.bank) + '"></div></div>';
  h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Тип</span><div class="grid3">' + Object.keys(TYPEN).map(t => '<button class="opt" data-act="acctype" data-t="' + t + '" aria-pressed="' + (F.type === t) + '">' + TYPEN[t] + '</button>').join("") + '</div></section>';
  h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Валюта</span><div class="seg glass" role="group" aria-label="Валюта">' + Object.keys(SYM).map(c => '<button data-act="acccur" data-c="' + c + '" aria-pressed="' + (F.cur === c) + '">' + SYM[c] + '</button>').join("") + '</div></section>';
  h += '<div class="group"><div class="field"><label for="f-country">Страна</label><select id="f-country" data-f="country">' + Object.keys(COUNTRY).map(c => '<option value="' + c + '"' + (F.country === c ? " selected" : "") + '>' + COUNTRY[c] + '</option>').join("") + '</select></div>' +
    '<div class="field"><label for="f-rate">Ставка, % год.</label><input id="f-rate" data-f="rate" class="n" inputmode="decimal" value="' + esc(F.rate || "") + '" placeholder="для депозита"></div>' +
    (F.type === "card" ? '<div class="field"><label for="f-last4">Последние 4 цифры</label><input id="f-last4" data-f="last4" class="n" inputmode="numeric" maxlength="4" value="' + esc(F.last4 || "") + '" placeholder="необязательно"></div>' : "") +
    (F.type === "deposit" ? '<div class="field"><label for="f-till">Действует до</label><input id="f-till" data-f="till" type="date" value="' + esc(F.till || "") + '"></div>' : "") +
    (F.id ? '<div class="field"><span style="font-size:17px">Остаток сейчас</span><span class="n mut" style="flex:1;text-align:right">' + money(balanceAt(F.id, TODAYS), F.cur) + '</span></div>' : '<div class="field"><label for="f-openBal">Остаток</label><input id="f-openBal" data-f="openBal" class="n" inputmode="decimal" value="' + esc(F.openBal || "") + '" placeholder="0"></div><div class="field"><label for="f-openDate">на дату</label><input id="f-openDate" type="date" data-f="openDate" value="' + esc(F.openDate || TODAYS) + '"></div>') +
    '<div class="field"><label for="f-note">Заметка</label><input id="f-note" data-f="note" value="' + esc(F.note || "") + '"></div></div>';
  h += '<div class="group"><div class="field"><span style="flex:1;font-size:17px">Учитывать в капитале</span><button class="sw" role="switch" aria-checked="' + !!F.inCap + '" aria-label="Учитывать в капитале" data-act="acctog" data-k="inCap"></button></div><div class="field"><span style="flex:1;display:flex;flex-direction:column;gap:1px"><span style="font-size:17px">Основной</span><small class="mut" style="font-size:13px">карточка счета наверху раздела «Счета»</small></span><button class="sw" role="switch" aria-checked="' + !!F.main + '" aria-label="Основной счет" data-act="acctog" data-k="main"></button></div></div>';
  if (F.id) h += '<div class="group"><button class="row" data-act="archacc"><span class="body"><span class="t"><b style="color:var(--link)">' + (F.archived ? "Вернуть из архива" : "Перенести в архив") + '</b></span></span></button><button class="row" data-act="' + (F.armDel ? "delaccf" : "armdelacc") + '"><span class="body"><span class="t"><b style="color:var(--redT);font-weight:' + (F.armDel ? 700 : 400) + '">' + (F.armDel ? "Точно удалить? Нажмите еще раз" : "Удалить счет") + '</b></span></span></button></div><p class="foot">Архив прячет счет и убирает из капитала, история сохраняется. Удаление стирает счет; его операции останутся в журнале как «удаленный счет».</p>';
  return h;
}
function sDebt() {
  const d = ((S.debts && S.debts.list) || []).find(x => x.id === FORM.id);
  if (!d) return sHead("Долг") + '<div class="card empty">Должник удален.</div>';
  const c = debtCalc(d);
  let h = sHead(d.name, null);
  // длинные суммы (сумы) — без знака валюты, иначе три колонки наезжают; валюта видна в «Итого»
  const long = [c.lent, c.ret, c.interest].some(v => money(v, d.cur).length > 11), hm = v => long ? money(v, d.cur).replace(/\s*(₽|€|сум|₸)\s*$/, "").replace(/^\$/, "") : money(v, d.cur);
  h += '<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="grid3"><div><div class="mut" style="font-size:13px">Выдано</div><div class="n" style="font-weight:600">' + hm(c.lent) + '</div></div><div><div class="mut" style="font-size:13px">Вернул</div><div class="n pos" style="font-weight:600">' + hm(c.ret) + '</div></div><div><div class="mut" style="font-size:13px">Проценты</div><div class="n neg" style="font-weight:600">' + hm(c.interest) + '</div></div></div>' +
    (c.bal > 0 ? '<div class="stack"><i style="width:' + Math.max(0, (c.lent - c.ret) / c.bal * 100).toFixed(1) + '%;background:var(--blue)"></i><i style="width:' + Math.max(0, c.interest / c.bal * 100).toFixed(1) + '%;background:var(--orange)"></i></div>' : "") +
    '<div style="display:flex;justify-content:space-between;font-size:15px"><span class="mut">Ставка ' + (c.rate ? nf(c.rate, c.rate % 1 ? 1 : 0) + "%" : "0%") + '</span><span>Итого <b class="n">' + money(c.bal, d.cur) + '</b></span></div></div>';
  h += '<div class="grid3"><button class="btn alt glass" data-act="debtev" data-k="lend" style="height:46px;font-size:15px">Выдал</button><button class="btn alt glass" data-act="debtev" data-k="return" style="height:46px;font-size:15px;color:var(--greenT)">Вернул</button><button class="btn alt glass" data-act="debtev" data-k="rate" style="height:46px;font-size:15px;color:var(--label2)">Ставка</button></div>';
  h += '<div class="group"><div class="field"><span style="flex:1;font-size:17px">Капитализация</span><select data-dcomp="1" aria-label="Капитализация процентов" style="flex:none;text-align:right"><option value="event"' + (d.comp === "event" || !d.comp ? " selected" : "") + '>при движении</option><option value="monthly"' + (d.comp === "monthly" ? " selected" : "") + '>ежемесячно</option><option value="none"' + (d.comp === "none" ? " selected" : "") + '>без процентов</option></select></div></div>';
  // по месяцам — когда проценты капитализируются
  if (d.comp !== "none" && (d.events || []).some(e => e.k === "rate" && e.r > 0)) {
    const MS = debtMonths(d), show = FORM.allM ? MS : MS.slice(0, 12), nb = v => money(v, d.cur).replace(/\s*(₽|\$|€|сум|₸)\s*$/, "").replace(/^(\$)/, "");
    const sg = v => (v >= 0 ? "+" : "−") + nb(Math.abs(v));
    h += '<section style="display:flex;flex-direction:column;gap:6px"><div class="caps"><span>По месяцам</span><span>' + esc(SYM[d.cur] || d.cur) + '</span></div><div class="group">' + show.map(x => {
      const why = [x.lent > 0.5 ? "выдал " + nb(x.lent) : "", x.ret > 0.5 ? "вернул " + nb(x.ret) : "", Math.abs(x.dInt) > 0.5 ? "% " + sg(x.dInt) : ""].filter(Boolean).join(" · ");
      return '<div class="row" style="align-items:flex-start;padding-top:10px;padding-bottom:10px"><span class="body" style="flex-direction:column;align-items:stretch;gap:3px">' +
        '<span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="font-size:16px">' + esc(mLabel(x.m, true)) + (x.m === curM() ? ' <span class="mut" style="font-weight:400;font-size:13px">на сегодня</span>' : "") + '</b><b class="n" style="font-size:16px">' + nb(x.bal) + '</b></span>' +
        '<span class="n" style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span class="mut" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (why || "без движения") + '</span><span style="flex:none;font-weight:600;color:var(--label)">' + (Math.abs(x.dBal) > 0.5 ? sg(x.dBal) : "0") + '</span></span>' +
        '<span class="n mut" style="font-size:13px;display:flex;gap:10px;align-items:center"><span><i aria-hidden="true" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--blue);margin-right:4px"></i>тело ' + nb(x.body) + '</span><span><i aria-hidden="true" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--orange);margin-right:4px"></i>набежало ' + nb(x.int) + '</span></span></span></div>';
    }).join("") + '</div>' + (MS.length > 12 && !FORM.allM ? '<button class="btn alt glass" data-act="debtallm" style="height:40px;font-size:15px">Показать все месяцы (' + MS.length + ')</button>' : "") +
      '<p class="foot" style="margin:0">Долг на конец месяца и его изменение за месяц: выдано, возвращено, % — начисленные проценты. Тело — выдано минус возвращено; «набежало» — проценты, накопленные с начала.</p></section>';
  }
  const ev = (d.events || []).map((e, i) => [e, i]).sort((a, b) => a[0].d < b[0].d ? 1 : -1);
  h += '<section style="display:flex;flex-direction:column;gap:6px"><span class="caps">История</span><div class="group">' + ev.map(([e, i]) => '<div class="row"><span class="body"><span class="t"><b>' + (e.k === "lend" ? "Выдал" : e.k === "return" ? "Вернул" : "Ставка") + '</b><small>' + dLabel(e.d) + '</small></span><span class="v n ' + (e.k === "return" ? "pos" : "") + '">' + (e.k === "rate" ? nf(e.r, e.r % 1 ? 1 : 0) + "%" : (e.k === "return" ? "−" : "+") + money(e.a, d.cur)) + '</span><button class="mbtn" data-act="debtevdel" data-i="' + i + '" aria-label="Удалить запись">×</button></span></div>').join("") + '</div></section>';
  h += FORM.armDel ? '<button class="btn danger" data-act="deldebt" style="color:#fff;background:var(--red)">Удалить без возврата</button>' : '<button class="btn danger" data-act="armdeldebt">Удалить должника</button>';
  return h;
}
function sDebtEv() {
  const F = FORM; const nm = { lend: "Выдал", return: "Вернул", rate: "Новая ставка", new: "Новый должник" }[F.k];
  let h = sHead(nm, "savedebtev");
  h += '<div class="group">' + (F.k === "new" ? '<div class="field"><label for="f-name">Имя</label><input id="f-name" data-f="name" value="' + esc(F.name || "") + '"></div><div class="field"><label for="f-cur">Валюта</label><select id="f-cur" data-f="cur">' + Object.keys(SYM).map(c => '<option value="' + c + '"' + ((F.cur || "RUB") === c ? " selected" : "") + '>' + SYM[c] + '</option>').join("") + '</select></div>' : "") +
    '<div class="field"><label for="f-d">Дата</label><input id="f-d" type="date" data-f="d" value="' + esc(F.d) + '"></div>' +
    (F.k === "rate" ? "" : '<div class="field"><label for="f-a">Сумма</label><input id="f-a" data-f="a" class="n" inputmode="decimal" value="' + esc(F.a || "") + '"></div>') +
    (F.k === "rate" || F.k === "new" ? '<div class="field"><label for="f-r">Ставка, % год.</label><input id="f-r" data-f="r" class="n" inputmode="decimal" value="' + esc(F.r || "") + '" placeholder="0 — без процентов"></div>' : "") + '</div>';
  return h;
}
function sRate() {
  const F = FORM;
  return sHead(F.isNew ? "Курсы за месяц" : MON[+F.m.slice(5) - 1] + " " + F.m.slice(0, 4), "saverate") + '<div class="group">' + (F.isNew ? '<div class="field"><label for="f-m">Месяц</label><input id="f-m" type="month" data-f="m" value="' + esc(F.m) + '"></div>' : "") +
    [["usd", "$ в рублях"], ["eur", "€ в рублях"], ["uzs", "сум за 1 ₽"], ["kzt", "₸ за 1 ₽"]].map(x => '<div class="field"><label for="f-' + x[0] + '">' + x[1] + '</label><input id="f-' + x[0] + '" data-f="' + x[0] + '" class="n" inputmode="decimal" value="' + esc(F[x[0]]) + '"></div>').join("") + '</div>' + (F.isNew ? "" : '<button class="btn danger" data-act="delrate">Удалить месяц</button>');
}
function sFcEv() {
  const F = FORM;
  return sHead("Сценарий", "savefcev") + '<div class="group"><div class="field"><label for="f-label">Что</label><input id="f-label" data-f="label" value="' + esc(F.label) + '" placeholder="поездка, покупка"></div><div class="field"><label for="f-m">Месяц</label><input id="f-m" type="month" data-f="m" value="' + esc(F.m) + '"></div><div class="field"><label for="f-v">Сумма, ₽</label><input id="f-v" data-f="v" class="n" inputmode="decimal" value="' + esc(F.v) + '" placeholder="−200 000"></div></div><p class="foot">Трата — со знаком минус, поступление — без знака.</p>';
}
function sHelp() { return sHead(FORM.title, null) + '<div class="card" style="font-size:15px;line-height:1.5">' + FORM.html + '</div>'; }

/* ============ actions ============ */
let UNDO = null;
/** Всплывающее сообщение. undo — функция для кнопки; label — подпись кнопки (по умолчанию «Отменить»). */
function toast(msg, undo, label) { const t = document.getElementById("toast"); UNDO = undo || null; toast.lbl = label || null; t.innerHTML = '<div class="toast glass' + (undo ? " act" : "") + '"><span>' + esc(msg) + '</span>' + (undo ? '<button data-act="undo">' + esc(label || "Отменить") + '</button>' : "") + '</div>'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.innerHTML = ""; UNDO = null; }, undo ? 8000 : Math.max(2600, String(msg).length * 55)); }
function readForm() { document.querySelectorAll("#sheet [data-f]").forEach(el => { FORM[el.dataset.f] = el.value; }); }

/* ---------- действия модуля ---------- */
App.actions({
  newop: () => { dayTick(); if (!S.accounts) return toast("Сначала добавьте счет"); openSheet(newOpForm()); },
  editop: t => { const o = (S.ops[t.dataset.m] || []).find(x => x.id === t.dataset.id); if (o) openSheet(newOpForm(o)); },
  optype: t => { readForm(); FORM.t = t.dataset.t; FORM.c = ""; FORM.s = ""; if (FORM.t !== "t" && !FORM.ac) FORM.ac = newOpForm().ac; renderSheet(); },
  opcat: t => { readForm(); FORM.c = t.dataset.c; FORM.s = ""; FORM.b = ""; renderSheet(); },
  opsub: t => { readForm(); FORM.s = FORM.s === t.dataset.s ? "" : t.dataset.s; if (FORM.b !== "-") FORM.b = ""; renderSheet(); },
  opbill: t => { readForm(); const id = t.dataset.b; FORM.b = FORM.b === id ? "" : id; renderSheet(); },
  armdelop: () => { readForm(); FORM.armDel = true; renderSheet(); },
  delop: async () => { const o = (S.ops[FORM.oldD.slice(0, 7)] || []).find(x => x.id === FORM.id); closeSheet(); if (o) { try { await delOp(o); } catch (e) { return; } render(); toast("Операция удалена" + anchorNote(o), () => putOp(o)); } },
  saveop: async () => {
    readForm(); const F = FORM; const a = calcNum(F.a);
    if (!(a > 0)) return toast("Введите сумму больше нуля");
    if (F.t !== "t" && !F.ac) return toast("Выберите счет");
    if (F.t === "t" && !F.ac && !F.to) return toast("Выберите хотя бы один счет перевода");
    if (F.t === "e" && acc(F.ac) && NOSPEND.includes(acc(F.ac).type)) return toast("Расходы со " + (acc(F.ac).type === "deposit" ? "вклада" : "брокерского счета") + " невозможны — выберите карту");
    if (F.t === "t" && F.to === F.ac) return toast("Счета перевода должны отличаться");
    if (F.t !== "t" && !F.c) return toast("Выберите категорию");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(F.d)) return toast("Укажите дату");
    const op = { id: F.id || uid("o"), d: F.d, t: F.t, a: Math.round(a * 100) / 100 };
    if (F.ac) op.ac = F.ac;
    if (F.t === "t") { op.c = "Перевод"; if (F.to) op.to = F.to; const ta = calcNum(F.ta); if (F.ac && F.to && accCur(F.to) !== accCur(F.ac) && ta > 0) op.ta = ta; }
    else { op.c = F.c; if (F.s && F.s.trim()) op.s = F.s.trim(); }
    if (F.n && F.n.trim()) op.n = F.n.trim();
    if (F.t !== "t" && /^\d{4}-\d{2}$/.test(F.p || "")) { op.p = F.p; if (/^\d{4}-\d{2}$/.test(F.p2 || "") && F.p2 > F.p) op.p2 = F.p2; }
    if (F.t === "e" && F.b && (F.b === "-" || (billById(F.b) || {}).c === op.c)) op.b = F.b;
    if (F.card) op.card = F.card; if (F.src) op.src = F.src;
    const unchanged = F.id && op.d === F.oldD && op.a === F.oldA;
    if (!unchanged) {
      const warn = [];
      if (op.d > TODAYS) warn.push("дата в будущем — " + dLabel(op.d));
      if (op.t !== "t") { const from = iso(new Date(TODAY.getTime() - 365 * 864e5)); const same = allOps().filter(x => x.t === op.t && x.c === op.c && x.id !== op.id && x.d >= from).map(opRUB); if (same.length >= 5) { const med = median(same), v = toRUB(op.a, opCur(op), op.d.slice(0, 7)); if (med > 0 && v > med * 10) warn.push("сумма в " + Math.round(v / med) + " " + pl(Math.round(v / med), "раз", "раза", "раз") + " больше обычной для «" + op.c + "»"); } }
      const key = op.d + "|" + op.a + "|" + op.c + "|" + op.ac;
      if (warn.length && F.warnKey !== key) { F.warnKey = key; return toast("Проверьте: " + warn.join("; ") + ". Если все верно, нажмите ✓ еще раз"); }
    }
    if (F.ac) lsSet("lastAcc", F.ac);
    if (F.t !== "t" && op.s) { const C = S.settings.cats[F.t]; const c = C.find(x => x.name === op.c); if (c && !c.subs.includes(op.s)) { c.subs.unshift(op.s); c.subs = c.subs.slice(0, 16); saveMeta("settings"); } }
    closeSheet(); try { await putOp(op, F.oldD); } catch (e) { openSheet(F); return; } UI.jm = op.d.slice(0, 7); render(); toast((F.id ? "Сохранено" : "Операция добавлена") + anchorNote(op));
  },
  calcop: t => {
    const el = document.getElementById("f-a"); if (!el) return; const o = t.dataset.o;
    if (o === "=") { const v = calcNum(el.value); if (isFinite(v)) el.value = String(v).replace(".", ","); else if (el.value.trim()) toast("Не получается посчитать выражение"); }
    else { const s = el.selectionStart != null ? el.selectionStart : el.value.length, e2 = el.selectionEnd != null ? el.selectionEnd : s; el.value = el.value.slice(0, s) + o + el.value.slice(e2); try { el.focus(); el.setSelectionRange(s + 1, s + 1); } catch (x) { /* поле без выделения (например, type=number) */ } }
    if (FORM) FORM.a = el.value; updCalc();
  },
  allcats: () => { readForm(); FORM.allCats = true; renderSheet(); }
});

/* ---------- поля модуля ---------- */
App.change(t => t.dataset.f === "ac" || t.dataset.f === "to", async t => { readForm(); renderSheet(); });
/* «За период»: после выбора месяца появляется «по»; дата и заметка меняют месяц и счёт по правилу */
App.change(t => FORM && FORM.kind === "op" && t.dataset.f === "p", async t => { readForm(); if (FORM.p2 && FORM.p && FORM.p2 <= FORM.p) FORM.p2 = ""; if (!FORM.p) FORM.p2 = ""; renderSheet(); });
// текстовые поля и дату не перерисовываем целиком (пропало бы нажатие на следующее поле) — только подсказки
App.change(t => FORM && FORM.kind === "op" && ["d", "n", "s"].includes(t.dataset.f) && billList().length, async t => {
  readForm(); const o = document.querySelector('#f-p option[value=""]'); if (o) o.textContent = perAuto(FORM);
  const sec = document.getElementById("f-bills"); if (sec && FORM.t === "e" && FORM.c) sec.outerHTML = billChips(FORM) || "<span></span>";
});
