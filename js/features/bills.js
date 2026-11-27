/* Экран «Платежи»: регулярные счета (ЖКУ, электричество, связь…) — что оплачено и за какой месяц.
   Расчёт — calc/bills.js; здесь экран, шторки (счёт, ячейка месяца) и виджет Главной.
   Какие траты считаются его оплатой, задаёт пользователь: категория, подкатегории, портфель, текст в заметке. */
"use strict";
const BST = {
  paid: ["var(--green)", "#fff", "check", "оплачено"],
  manual: ["transparent", "var(--greenT)", "check", "отмечено вручную"],
  skip: ["var(--fill2)", "var(--muted)", "", "платить не нужно"],
  due: ["transparent", "var(--link)", "", "ждёт оплаты"],
  late: ["var(--red)", "#fff", "close", "не оплачено"],
  soon: ["transparent", "var(--gray)", "", "ещё рано"],
  none: ["transparent", "transparent", "", "до начала учёта"]
};
function bDot(st, sz) {
  const x = BST[st] || BST.none, z = sz || 24, ring = st === "manual" || st === "due" || st === "soon";
  const inner = x[2] ? svg(x[2], Math.round(z * 0.6)) : st === "skip" ? "–" : st === "due" ? "" : "";
  return '<span class="bdot' + (st === "soon" ? " soon" : "") + '" style="width:' + z + 'px;height:' + z + 'px;background:' + x[0] + ';color:' + x[1] + ';' + (ring ? "box-shadow:inset 0 0 0 2px " + x[1] + ";" : "") + '" aria-hidden="true">' + inner + '</span>';
}
const bPer = m => MON[+m.slice(5) - 1] + (m.slice(0, 4) !== curM().slice(0, 4) ? " " + m.slice(0, 4) : "");
const bForm = m => "за " + bPer(m);
/** Короткое описание правила счёта. */
/** Компактные суммы для строки «Итого»: тысячи (в сумах — миллионы) с одним знаком. */
function bK(cur) {
  const d = cur === "UZS" ? 1e6 : 1e3, f = v => { const x = v / d; return nf(x, x < 100 ? 1 : 0); };
  return [f, (cur === "UZS" ? "млн " : "тыс ") + (SYM[cur] || cur)];
}
function billRuleTxt(b) {
  return [b.c || "категория не выбрана", (b.subs || []).length ? b.subs.join(", ") : "", b.pf && b.pf !== "all" ? pfLabel(b.pf) : "", b.txt ? "«" + b.txt + "» в заметке" : ""].filter(Boolean).join(" · ");
}
function billsSt() { const M = mySt(); if (!isObj(M.bills)) M.bills = { list: [], marks: {} }; return M.bills; }

/* ---------- экран ---------- */
function vBills() {
  const all = billList(true), list = billList(), M = v => money(fromRUB(v, UI.cur, curM()), UI.cur);
  let html = navHead("Платежи", "", backBtn("accounts", "Счета"), headRight(), "Ежемесячные счета — квартплата, свет, связь: что оплачено и за какой месяц.");
  if (!all.length) return html + billsEmpty();
  const N = billsNow(), P = billPays();
  // сейчас
  const sum = N.left.length ? '<b class="n" style="font-size:28px">' + N.done + ' из ' + N.n + '</b><span class="mut" style="font-size:15px">оплачено' + (N.late ? ' · <span style="color:var(--orangeT);font-weight:600">' + N.late + ' ' + pl(N.late, "месяц", "месяца", "месяцев") + ' без оплаты</span>' : "") + '</span>'
    : '<b style="font-size:22px">' + (N.late ? "Текущие оплачены" : "Всё оплачено") + '</b><span class="mut" style="font-size:15px">' + (N.late ? '<span style="color:var(--orangeT);font-weight:600">' + N.late + " " + pl(N.late, "месяц", "месяца", "месяцев") + " в прошлом без оплаты</span>" : "пропусков нет") + '</span>';
  let L = '<section class="sec"><div class="card" style="display:flex;align-items:center;gap:14px">' + bDot(N.left.length ? (N.late ? "late" : "due") : "paid", 40) + '<span style="display:flex;flex-direction:column;gap:2px;min-width:0">' + sum + '</span><span style="flex:1"></span><span class="n" style="text-align:right;font-size:15px"><span class="mut" style="font-size:13px">в этом месяце</span><br><b>' + M(N.paidRUB) + '</b></span></div></section>';
  L += '<section class="sec" style="gap:6px"><div class="caps"><span>Сейчас к оплате</span><span>' + esc(mLabel(curM())) + '</span></div><div class="group">' + N.rows.map(r => {
    const c = r.c, u = billUsual(r.b);
    const sub = bForm(c.m) + " · " + (c.st === "paid" ? "оплачено " + dLabel(c.ops[c.ops.length - 1].d) : BST[c.st][3]) + (c.st !== "paid" && u ? " · обычно ≈ " + shortM(fromRUB(u, UI.cur, curM()), UI.cur) : "");
    const late = r.late.length ? "без оплаты: " + r.late.slice(0, 3).map(bPer).join(", ") + (r.late.length > 3 ? " и ещё " + (r.late.length - 3) : "") : "";
    return '<button class="row" data-act="blcell" data-b="' + esc(r.b.id) + '" data-m="' + c.m + '">' + bDot(c.st, 30) + '<span class="body"><span class="t"><b>' + esc(r.b.name) + '</b><small>' + esc(sub) + '</small>' + (late ? '<small style="color:var(--orangeT)">' + esc(late) + '</small>' : "") + '</span><span class="v n' + (c.rub ? "" : " mut") + '" style="font-size:16px">' + (c.rub ? M(c.rub) : c.st === "due" ? "—" : "") + '</span><span class="chev" aria-hidden="true">›</span></span></button>';
  }).join("") + (list.length ? "" : '<div class="row"><span class="body"><span class="t mut">Все платежи выключены</span></span></div>') + '</div><p class="foot">Месяц оплаты — из поля «За период» операции, а если оно пустое — по правилу платежа (за прошлый или текущий месяц).</p></section>';
  if (P.amb.length) L += '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:6px"><b style="font-size:16px">Уточните ' + P.amb.length + ' ' + pl(P.amb.length, "операцию", "операции", "операций") + '</b><span class="mut" style="font-size:14px;line-height:1.4">Они подходят сразу под несколько платежей — сейчас засчитаны в первый по списку. Откройте операцию и выберите нужный в блоке «Платёж».</span><div class="group" style="margin-top:4px">' + P.amb.slice(-5).reverse().map(o => opRow(o, null, false)).join("") + '</div></div></section>';
  // история по году
  const y = UI.blY || curM().slice(0, 4), ms = Array.from({ length: 12 }, (_, i) => y + "-" + String(i + 1).padStart(2, "0"));
  const nav = '<span style="display:flex;gap:6px;align-items:center"><button class="mbtn glass" data-act="bly" data-k="-1" aria-label="Предыдущий год">‹</button><b class="n" style="min-width:44px;text-align:center">' + y + '</b><button class="mbtn glass" data-act="bly" data-k="1" aria-label="Следующий год"' + (y >= curM().slice(0, 4) ? " disabled" : "") + '>›</button></span>';
  const tot = ms.map(() => 0), K = bK(UI.cur);
  const rows = list.map(b => '<tr><th scope="row"><button data-act="bledit" data-id="' + esc(b.id) + '" class="ell">' + esc(b.name) + '</button></th>' + ms.map((m, i) => { const c = billCell(b, m); tot[i] += c.rub; return '<td>' + (c.st === "none" ? "" : '<button data-act="blcell" data-b="' + esc(b.id) + '" data-m="' + m + '" aria-label="' + esc(b.name + ", " + mLabel(m) + ": " + BST[c.st][3] + (c.rub ? ", " + M(c.rub) : "")) + '">' + bDot(c.st, 20) + '</button>') + '</td>'; }).join("") + '</tr>').join("");
  const yt = tot.reduce((s, v) => s + v, 0);
  let R = '<section class="sec" style="gap:6px"><div class="sechead"><h2>По месяцам</h2>' + nav + '</div><div class="card" style="padding:10px 0"><div class="bgrid-w"><table class="bgrid"><thead><tr><th></th>' + ms.map(m => '<th scope="col"' + (m === curM() ? ' class="cur"' : "") + '>' + MONS[+m.slice(5) - 1] + '</th>').join("") + '</tr></thead><tbody>' + rows +
    '<tr class="tot"><th scope="row">Итого, ' + K[1] + '</th>' + tot.map(v => '<td class="n">' + (v ? K[0](fromRUB(v, UI.cur, curM())) : "") + '</td>').join("") + '</tr></tbody></table></div>' +
    '<div class="mut n" style="padding:8px 14px 0;font-size:13px">За ' + y + ' год: <b style="color:var(--label)">' + M(yt) + '</b></div>' +
    '<div class="blegend">' + ["paid", "manual", "due", "late", "skip"].map(s => '<span>' + bDot(s, 14) + BST[s][3] + '</span>').join("") + '</div></div><p class="foot">Столбец — месяц, за который платёж, а не дата оплаты. Нажмите на кружок — оплаты месяца, ручная отметка, новая оплата.</p></section>';
  R += billsCfgBlock(all);
  return html + cols(L, R);
}
function billsCfgBlock(all) {
  let h = '<section class="sec" style="gap:6px"><div class="caps"><span>Платежи и правила</span><span>' + all.length + '</span></div><div class="group">' + all.map(b => '<button class="row" data-act="bledit" data-id="' + esc(b.id) + '"><span class="tile" style="background:' + (b.off ? "var(--gray)" : catColor(b.c)) + '">' + svg("bill", 18) + '</span><span class="body"><span class="t"><b' + (b.off ? ' class="mut"' : "") + '>' + esc(b.name) + '</b><small>' + esc((b.off ? "выключен · " : "") + billRuleTxt(b) + " · " + (BILL_PER.find(x => x[0] === (+b.per || 0)) || BILL_PER[0])[1]) + '</small></span><span class="chev" aria-hidden="true">›</span></span></button>').join("") +
    '<button class="row" data-act="blnew"><span class="minus" style="background:var(--green)" aria-hidden="true">+</span><span class="body"><span class="t"><b style="color:var(--link)">Добавить платёж</b></span></span></button></div><p class="foot">Правило говорит, какие траты считаются его оплатой. Если под платёж подходят чужие траты, уточните подкатегорию или текст в заметке.</p></section>';
  const sg = billSuggest(UI.blPf || "ru");
  if (sg.length) h += billSugBlock(sg);
  return h;
}
function billSugBlock(sg) {
  return '<section class="sec" style="gap:6px"><div class="caps"><span>Похоже на регулярные платежи</span><span>' + esc(pfLabel(UI.blPf || "ru")) + '</span></div><div class="group">' + sg.map(x => '<button class="row" data-act="blsug" data-c="' + esc(x.c) + '" data-s="' + esc(x.s) + '">' + catTile(x.c) + '<span class="body"><span class="t"><b>' + esc(x.s || x.c) + '</b><small>' + esc((x.s ? x.c + " · " : "") + x.n + " " + pl(x.n, "месяц", "месяца", "месяцев") + " за год · обычно ≈ " + shortM(fromRUB(x.usual, UI.cur, curM()), UI.cur)) + '</small></span><span style="color:var(--link);font-size:15px">Добавить</span></span></button>').join("") + '</div>' +
    '<div class="pfbar" role="group" aria-label="Портфель для подсказок" style="margin:4px 0 0;padding:2px 0">' + PFS.filter(p => p[0] !== "inv").map(p => '<button data-act="blpf" data-p="' + p[0] + '" aria-pressed="' + ((UI.blPf || "ru") === p[0]) + '">' + p[1] + '</button>').join("") + '</div></section>';
}
function billsEmpty() {
  const sg = billSuggest(UI.blPf || "ru");
  return '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:10px"><span style="display:flex;gap:12px;align-items:center"><span class="tile" style="background:var(--blue);width:44px;height:44px;border-radius:12px">' + svg("bill", 24) + '</span><b style="font-size:19px">Следите за ежемесячными счетами</b></span>' +
    '<span class="mut" style="font-size:15px;line-height:1.45">Добавьте то, что платите каждый месяц: квартплату, электричество, паркинг, телефон. Для каждого укажите, какие траты считаются его оплатой, — и здесь будет видно, за какие месяцы всё оплачено, а где пропуск.</span>' +
    '<button class="btn pri" data-act="blnew">Добавить платёж</button></div></section>' + (sg.length ? billSugBlock(sg) : '<p class="foot" style="margin-top:12px">Подсказки появятся, когда в журнале наберутся траты, повторяющиеся из месяца в месяц.</p>');
}

/* ---------- шторка: настройка счёта ---------- */
function billForm(b) {
  return b ? { kind: "bill", id: b.id, name: b.name || "", c: b.c || "", subs: (b.subs || []).slice(), pf: b.pf || "all", txt: b.txt || "", per: +b.per || 0, from: b.from || "", off: !!b.off, armDel: false }
    : { kind: "bill", name: "", c: "", subs: [], pf: "ru", txt: "", per: -1, from: "", off: false };
}
function billSubsOf(c) {
  const s = new Set(((((S.settings || {}).cats || {}).e || []).find(x => x.name === c) || {}).subs || []);
  for (const o of allOps()) if (o.t === "e" && o.c === c && o.s) s.add(o.s);
  return [...s];
}
App.sheet("bill", () => {
  const F = FORM, cats = expenseCats();
  let h = sHead(F.id ? F.name || "Платёж" : "Новый платёж", "blsave");
  h += '<div class="group"><div class="field"><label for="f-name">Название</label><input id="f-name" data-f="name" value="' + esc(F.name) + '" placeholder="например, квартплата"></div>' +
    '<div class="field"><label for="f-blc">Категория</label><select id="f-blc" data-f="c" data-blc="1"><option value="">выберите</option>' + cats.map(c => '<option' + (c === F.c ? " selected" : "") + '>' + esc(c) + '</option>').join("") + '</select></div>' +
    '<div class="field"><label for="f-blpf">Счета списания</label><select id="f-blpf" data-f="pf" data-blc="1">' + PFS.filter(p => p[0] !== "inv").map(p => '<option value="' + p[0] + '"' + (F.pf === p[0] ? " selected" : "") + '>' + (p[0] === "all" ? "любые" : p[1]) + '</option>').join("") + '</select></div>' +
    '<div class="field"><label for="f-bltxt">В заметке есть</label><input id="f-bltxt" data-f="txt" value="' + esc(F.txt) + '" placeholder="необязательно"></div></div>';
  if (F.c) {
    const subs = billSubsOf(F.c);
    h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Подкатегории' + (F.subs.length ? "" : " · не выбраны — любая") + '</span>' + (subs.length ? '<div class="chips">' + subs.map(s => '<button class="chipb" data-act="blsub" data-s="' + esc(s) + '" aria-pressed="' + F.subs.includes(s) + '">' + esc(s) + '</button>').join("") + '</div>' : '<span class="mut" style="padding:0 4px;font-size:14px">У категории пока нет подкатегорий.</span>') + '</section>';
  }
  h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Обычно платите</span><div class="seg glass" role="group" aria-label="За какой месяц платите">' + BILL_PER.map(x => '<button data-act="blper" data-k="' + x[0] + '" aria-pressed="' + (F.per === x[0]) + '">' + x[1] + '</button>').join("") + '</div><span class="mut" style="padding:0 4px;font-size:13px;line-height:1.4">' + (F.per ? "Оплата в ноябре засчитывается за октябрь." : "Оплата в ноябре засчитывается за ноябрь.") + ' У отдельной операции месяц можно поменять полем «За период».</span></section>';
  const fm = [""]; for (let k = 0; k < 36; k++) fm.push(addMonth(curM(), -k));
  if (F.from && !fm.includes(F.from)) fm.push(F.from);
  h += '<div class="group"><div class="field"><label for="f-blfrom">Следить с</label><select id="f-blfrom" data-f="from">' + fm.map(m => '<option value="' + m + '"' + (F.from === m ? " selected" : "") + '>' + (m ? mLabel(m) : "первой оплаты") + '</option>').join("") + '</select></div>' +
    (F.id ? '<div class="field"><span style="flex:1;font-size:17px">Следить за платежом</span><button class="sw" role="switch" aria-checked="' + !F.off + '" aria-label="Следить за платежом" data-act="bloff"></button></div>' : "") + '</div>';
  // что попадает под правило
  if (F.c) {
    const tmp = { id: F.id || "_new", c: F.c, subs: F.subs, pf: F.pf, txt: (F.txt || "").trim(), per: F.per };
    const from = addMonth(curM(), -12), ops = allOps().filter(o => o.d.slice(0, 7) >= from && (o.b === tmp.id || (!o.b && billRuleFits(tmp, o))));
    const ms = new Set(ops.map(o => opPeriods(o, tmp)[0]));
    h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px"><span>Подходит за год</span><span>' + ops.length + ' ' + pl(ops.length, "операция", "операции", "операций") + ' · ' + ms.size + ' мес.</span></span>' +
      (ops.length ? '<div class="group">' + ops.slice(-4).reverse().map(o => opRow(o, null, false)).join("") + '</div>' : '<span class="mut" style="padding:0 4px;font-size:14px">Под это правило трат за год нет — проверьте категорию, подкатегории и счета списания.</span>') + '</section>';
  }
  if (F.id) h += F.armDel ? '<button class="btn danger" data-act="bldel" style="color:#fff;background:var(--red)">Удалить без возврата</button>' : '<button class="btn danger" data-act="blarm">Удалить платёж</button>';
  if (F.id) h += '<p class="foot">Операции журнала при удалении не меняются — пропадут только правило и ручные отметки платежа.</p>';
  return h;
});

/* ---------- шторка: счёт за месяц ---------- */
App.sheet("billcell", () => {
  const F = FORM, b = billById(F.b); if (!b) return sHead("Платёж", null) + '<div class="card mut">Платёж удалён.</div>';
  const c = billCell(b, F.m), M = v => money(fromRUB(v, UI.cur, curM()), UI.cur);
  let h = sHead(b.name, null);
  h += '<div class="card" style="display:flex;align-items:center;gap:14px">' + bDot(c.st, 40) + '<span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><b style="font-size:19px">' + esc(mLabel(F.m, true)) + '</b><span class="mut" style="font-size:14px">' + esc(BST[c.st][3] + (c.st === "due" || c.st === "late" || c.st === "soon" ? " · платят в " + MONP[+billPayM(b, F.m).slice(5) - 1] : "")) + '</span></span>' + (c.rub ? '<b class="n" style="font-size:19px">' + M(c.rub) + '</b>' : "") + '</div>';
  if (c.ops.length) h += '<section style="display:flex;flex-direction:column;gap:8px"><span class="caps" style="padding:0 4px">Оплаты</span><div class="group">' + c.ops.map(o => opRow(o, null, false)).join("") + '</div>' + (c.ops.some(o => opPeriods(o, b).length > 1) ? '<span class="mut" style="padding:0 4px;font-size:13px">Оплата сразу за несколько месяцев делится между ними поровну.</span>' : "") + '</section>';
  h += '<div class="group"><button class="row" data-act="blpay"><span class="tile" style="background:var(--blue)">' + svg("plus", 18) + '</span><span class="body"><span class="t"><b>Внести оплату</b><small>' + esc(bForm(F.m)) + " · " + esc(billRuleTxt(b)) + '</small></span><span class="chev" aria-hidden="true">›</span></span></button>';
  if (!c.ops.length) {
    if (c.mark !== "paid") h += '<button class="row" data-act="blmark" data-k="paid"><span class="tile" style="background:var(--green)">' + svg("check", 18) + '</span><span class="body"><span class="t"><b>Оплачено без операции</b><small>например, платил кто-то другой</small></span></span></button>';
    if (c.mark !== "skip") h += '<button class="row" data-act="blmark" data-k="skip"><span class="tile" style="background:var(--gray)">–</span><span class="body"><span class="t"><b>Платить не нужно</b><small>счёта за этот месяц не было</small></span></span></button>';
    if (c.mark) h += '<button class="row" data-act="blmark" data-k=""><span class="body"><span class="t"><b style="color:var(--link)">Снять отметку</b></span></span></button>';
  }
  h += '<button class="row" data-act="bledit" data-id="' + esc(b.id) + '"><span class="tile" style="background:var(--gray)">' + svg("sliders", 18) + '</span><span class="body"><span class="t"><b>Правило платежа</b><small>' + esc(billRuleTxt(b)) + '</small></span><span class="chev" aria-hidden="true">›</span></span></button></div>';
  return h;
});

async function billsSave(undoMsg, prev) {
  render(); if (FORM && (FORM.kind === "bill" || FORM.kind === "billcell")) renderSheet();
  try { await saveMeta("settings"); } catch (e) { return; }
  if (undoMsg) toast(undoMsg, prev ? async () => { mySt().bills = prev; render(); await saveMeta("settings"); } : null);
}
App.actions({
  bly: t => { const y = +(UI.blY || curM().slice(0, 4)) + +t.dataset.k; if (y > +curM().slice(0, 4)) return; UI.blY = String(y); render(); },
  blpf: t => { UI.blPf = t.dataset.p; render(); },
  blnew: () => openSheet(billForm(null)),
  bledit: t => { const b = billById(t.dataset.id); if (b) openSheet(billForm(b)); },
  blsug: t => { const c = t.dataset.c, s = t.dataset.s; openSheet(Object.assign(billForm(null), { name: s || c, c, subs: s ? [s] : [], pf: UI.blPf || "ru", per: catKind(c) === "fix" ? -1 : 0 })); },
  blsub: t => { readForm(); const s = t.dataset.s, L = FORM.subs; const i = L.indexOf(s); if (i >= 0) L.splice(i, 1); else L.push(s); renderSheet(); },
  blper: t => { readForm(); FORM.per = +t.dataset.k; renderSheet(); },
  bloff: () => { readForm(); FORM.off = !FORM.off; renderSheet(); },
  blarm: () => { readForm(); FORM.armDel = true; renderSheet(); },
  blsave: async () => {
    readForm(); const F = FORM, name = (F.name || "").trim();
    if (!name) return toast("Назовите платёж");
    if (!F.c) return toast("Выберите категорию трат");
    const B = billsSt(), b = { id: F.id || uid("b"), name, c: F.c, subs: F.subs.slice(), pf: F.pf || "all", txt: (F.txt || "").trim(), per: +F.per || 0, from: /^\d{4}-\d{2}$/.test(F.from || "") ? F.from : "" };
    if (F.off) b.off = true;
    const i = B.list.findIndex(x => x.id === b.id); if (i >= 0) B.list[i] = b; else B.list.push(b);
    closeSheet(); if (UI.view !== "bills") go("bills"); await billsSave(i >= 0 ? "Сохранено" : "Платёж добавлен");
  },
  bldel: async () => {
    const B = billsSt(), prev = clone(B); B.list = B.list.filter(x => x.id !== FORM.id); if (B.marks) delete B.marks[FORM.id];
    closeSheet(); await billsSave("Платёж удалён", prev);
  },
  blcell: t => openSheet({ kind: "billcell", b: t.dataset.b, m: t.dataset.m }),
  blmark: async t => {
    const B = billsSt(), id = FORM.b, m = FORM.m, k = t.dataset.k; B.marks = B.marks || {};
    const o = B.marks[id] = Object.assign({}, B.marks[id]); if (k) o[m] = k; else delete o[m];
    if (!Object.keys(o).length) delete B.marks[id];
    await billsSave();
  },
  blpay: () => {
    const b = billById(FORM.b); if (!b) return; const m = FORM.m, F = newOpForm();
    if (b.pf && b.pf !== "all" && !pfHas(acc(F.ac), b.pf)) { const a = accs().find(a => !a.archived && pfHas(a, b.pf) && !NOSPEND.includes(a.type)); if (a) F.ac = a.id; }
    // месяц, который подставится сам по правилу, не записываем — иначе он не сдвинется при смене даты
    openSheet(Object.assign(F, { c: b.c, s: (b.subs || [])[0] || "", n: b.txt || "", b: b.id, p: m === billDueP(b) ? "" : m }));
  }
});
App.change(t => t.dataset.blc && FORM && FORM.kind === "bill", async t => { readForm(); if (t.dataset.f === "c") FORM.subs = []; renderSheet(); });

App.view("bills", vBills, { section: "accounts" });

/* ---------- виджет Главной ---------- */
App.widget("bills", {
  name: "Платежи", icon: "bill", color: "#30B0C7", desc: "какие счета оплачены в этом месяце", sizes: ["S", "M"], size: "S",
  render(c, size) {
    const go = 'data-act="go" data-v="bills"';
    if (!billList().length) return { act: go, inner: wLab("Платежи") + '<span style="font-size:15px;font-weight:600;line-height:1.25">Следите за счетами</span><span class="mut" style="font-size:12.5px;line-height:1.25">квартплата, связь, паркинг — оплачено ли за месяц</span>' };
    const N = billsNow(), st = N.left.length ? (N.late || N.left.some(r => r.c.st === "late") ? "late" : "due") : "paid";
    const left = N.left.map(r => r.b.name), badge = '<span class="n" style="font-size:13px;font-weight:600;color:' + (st === "late" ? "var(--orangeT)" : st === "paid" ? "var(--green)" : "var(--muted)") + '">' + (st === "paid" ? "всё оплачено" : N.late ? N.late + " " + pl(N.late, "пропуск", "пропуска", "пропусков") : "ждут оплаты") + '</span>';
    if (size === "M") return { act: go, inner: '<span class="wrow">' + wLab("Платежи · " + MON[+curM().slice(5) - 1]) + badge + '</span><span class="blw">' + N.rows.slice(0, 6).map(r => '<span>' + bDot(r.c.st, 18) + '<span class="ell">' + esc(r.b.name) + '</span></span>').join("") + '</span>' };
    return { act: go, inner: '<span class="wrow">' + wLab("Платежи") + '</span>' + wBig(N.done + ' <span style="font-size:15px;font-weight:600" class="mut">из ' + N.n + '</span>', 26) + '<span class="mut ell" style="font-size:12.5px;line-height:1.25' + (N.late ? ";color:var(--orangeT)" : "") + '">' + esc(left.length ? "ждут: " + left.join(", ") : N.late ? N.late + " " + pl(N.late, "месяц", "месяца", "месяцев") + " без оплаты" : "всё оплачено") + '</span>' };
  }
});
