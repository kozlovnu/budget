/* Импорт выписок из Excel и PDF */
"use strict";
/* ---------- Импорт ---------- */
function vImport() {
  const I = UI.imp || (UI.imp = { kind: "xlsx" });
  let html = navHead("Импорт", "", backBtn("accounts", "Счета"), "", "Операции из выписки банка или таблицы");
  html += '<section class="sec"><div class="grid3">' + [["xlsx", "Excel / CSV"], ["pdf", "PDF-выписка"], ["rates", "Курсы"]].map(x => '<button class="opt" data-act="impkind" data-k="' + x[0] + '" aria-pressed="' + (I.kind === x[0]) + '" style="min-height:64px;font-size:15px">' + x[1] + '</button>').join("") + '</div></section>';
  if (I.kind === "pdf" && !SAMPLE) html += '<div class="warn" style="margin-top:14px">Разбор PDF работал через Claude и в этой версии приложения недоступен. Загрузите выписку в Excel или CSV.</div>';
  html += '<section class="sec"><label class="btn pri" style="cursor:pointer">' + (I.file ? "Выбрать другой файл" : "Выбрать файл") + '<input type="file" id="impfile" data-in="impfile" accept="' + (I.kind === "pdf" ? ".pdf" : ".xlsx,.xls,.csv") + '" style="position:absolute;left:-9999px"></label>' + (I.file ? '<p class="foot">' + esc(I.file) + (I.status ? " · " + esc(I.status) : "") + '</p>' : '<p class="foot">' + (I.kind === "pdf" ? "Claude прочитает выписку и предложит дату, сумму и категорию для каждой строки. Перед сохранением вы проверяете список." : I.kind === "rates" ? "Таблица с колонками: месяц (дата), $ в ₽, € в ₽, сум за ₽, ₸ за ₽ — в любом порядке, выберете ниже." : "Первая строка — заголовки. Нужны дата и сумма (или отдельные колонки расход/приход); описание и категория — по желанию.") + '</p>') + '</section>';
  if (I.sheetNames && I.sheetNames.length > 1) html += '<section class="sec"><div class="group"><div class="field"><label for="impsheet">Лист</label><select id="impsheet" data-in="impsheet">' + I.sheetNames.map(n => '<option' + (n === I.sheet ? " selected" : "") + '>' + esc(n) + '</option>').join("") + '</select></div></div></section>';
  if (I.headers && I.kind !== "pdf") {
    const sel = (key, label, opt) => '<div class="field"><label for="map-' + key + '">' + label + '</label><select id="map-' + key + '" data-map="' + key + '"><option value="">' + (opt ? "—" : "выберите") + '</option>' + I.headers.map((h, i) => '<option value="' + i + '"' + (I.map[key] === i ? " selected" : "") + '>' + esc(h || "колонка " + (i + 1)) + '</option>').join("") + '</select></div>';
    if (I.kind === "rates") html += '<section class="sec" style="gap:6px"><div class="caps"><span>Колонки</span></div><div class="group">' + sel("date", "Месяц") + sel("usd", "$ в ₽", 1) + sel("eur", "€ в ₽", 1) + sel("uzs", "сум за ₽", 1) + sel("kzt", "₸ за ₽", 1) + '</div></section>';
    const dsel = '<div class="field"><label for="impdfmt">Формат дат</label><select id="impdfmt" data-in="impdfmt"><option value="dmy"' + (I.dfmt !== "mdy" ? " selected" : "") + '>дд.мм.гггг</option><option value="mdy"' + (I.dfmt === "mdy" ? " selected" : "") + '>мм/дд/гггг</option></select></div>';
    if (I.kind !== "rates") html += '<section class="sec" style="gap:6px"><div class="caps"><span>Колонки</span></div><div class="group">' + sel("date", "Дата") + dsel + sel("amount", "Сумма", 1) + sel("debit", "Расход", 1) + sel("credit", "Приход", 1) + sel("desc", "Описание", 1) + sel("cat", "Категория", 1) + '</div><p class="foot">Для «Суммы»: отрицательные — расходы, положительные — доходы' + '.</p></section>';
  }
  if (I.rows && I.kind !== "rates") {
    html += '<section class="sec"><div class="group"><div class="field"><label for="impacc">На счет</label><select id="impacc" data-in="impacc">' + accs().filter(a => !a.archived && !NOSPEND.includes(a.type)).map(a => '<option value="' + a.id + '"' + (I.acc === a.id ? " selected" : "") + '>' + esc(a.name) + ' · ' + SYM[a.cur] + '</option>').join("") + '</select></div></div></section>';
    const rows = I.rows; const nSel = rows.filter(r => r.on).length; const dup = rows.filter(r => r.dup).length;
    const sk = I.skip || { date: 0, amount: 0, ex: [] };
    if (sk.date + sk.amount) html += '<div class="warn" style="margin-top:14px">Пропущено строк: ' + (sk.date + sk.amount) + ' (' + [sk.date ? "без распознанной даты — " + sk.date : "", sk.amount ? "без распознанной суммы — " + sk.amount : ""].filter(Boolean).join(", ") + '). Например, строки ' + sk.ex.join(", ") + ' файла. Проверьте колонки и формат дат выше.</div>';
    html += '<section class="sec" style="gap:6px"><div class="caps"><span>Найдено ' + rows.length + (dup ? " · дубликатов " + dup : "") + '</span><button data-act="impall" style="color:var(--link);text-transform:none;font-size:13px">' + (nSel === rows.length ? "Снять все" : "Выбрать все") + '</button></div><div class="group">' + rows.slice(0, 300).map((r, i) => '<div class="row" style="padding-right:12px"><input type="checkbox" data-impon="' + i + '"' + (r.on ? " checked" : "") + ' aria-label="Импортировать строку ' + (i + 1) + '" style="width:22px;height:22px;flex:none"><span class="body" style="flex-wrap:wrap;row-gap:6px"><span class="t" style="min-width:150px"><b style="font-size:15px">' + esc(r.desc || "без описания") + '</b><small>' + dLabel(r.d) + (r.dup ? " · уже есть в журнале" : "") + '</small></span><select data-impcat="' + i + '" aria-label="Категория" style="max-width:130px;border:0;background:var(--fill2);border-radius:10px;padding:6px 8px;font-size:14px">' + catOptions(r.t, r.c) + '</select><span class="v n ' + (r.t === "i" ? "pos" : "") + '" style="font-size:15px">' + (r.t === "i" ? "+" : "−") + nf(r.a, r.a % 1 ? 2 : 0) + '</span></span></div>').join("") + '</div>' + (rows.length > 300 ? '<p class="foot">Показаны первые 300 строк, импортируются все выбранные.</p>' : "") + '</section>';
    html += '<section class="sec"><button class="btn ok" data-act="impgo"' + (nSel ? "" : " disabled") + '>Импортировать ' + nSel + ' опер.</button></section>';
  }
  if (I.rows && I.kind === "rates") html += '<section class="sec"><p class="foot">Найдено месяцев: ' + I.rows.length + '</p><button class="btn ok" data-act="impgo"' + (I.rows.length ? "" : " disabled") + '>Сохранить курсы</button></section>';
  return '<div class="narrow">' + html + '</div>';
}
function catOptions(t, sel) { const C = (S.settings && S.settings.cats && S.settings.cats[t === "i" ? "i" : "e"]) || []; const names = C.map(c => c.name); if (sel && !names.includes(sel)) names.unshift(sel); return names.map(n => '<option' + (n === sel ? " selected" : "") + '>' + esc(n) + '</option>').join(""); }

/* ============ import ============ */
function parseAmt(v) {
  if (typeof v === "number") return v;
  if (v == null) return NaN;
  let s = String(v).replace(/[\s\u00a0\u202f]/g, "").replace(/[−–—]/g, "-");
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/-$/.test(s)) { neg = !neg; s = s.slice(0, -1); }
  s = s.replace(/[^\d,.\-+]/g, "");
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); } else if (s.startsWith("+")) s = s.slice(1);
  if (!s || /[-+]/.test(s)) return NaN;
  const hasC = s.includes(","), hasD = s.includes(".");
  if (hasC && hasD) { const dec = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : "."; s = s.split(dec === "," ? "." : ",").join(""); if (dec === ",") s = s.replace(",", "."); }
  else if (hasC) s = s.split(",").length > 2 ? (/^\d{1,3}(,\d{3})+$/.test(s) ? s.split(",").join("") : "x") : s.replace(",", ".");
  else if (hasD && s.split(".").length > 2) s = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.split(".").join("") : "x";
  const n = Number(s);
  return isFinite(n) ? (neg ? -n : n) : NaN;
}
function dateFmtGuess(vals) {
  let dmy = 0, mdy = 0;
  for (const v of vals) { const m = String(v || "").trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/); if (!m) continue; if (+m[1] > 12) dmy++; else if (+m[2] > 12) mdy++; }
  return mdy > dmy ? "mdy" : "dmy";
}
function excelDate(v, fmt) {
  if (v instanceof Date) return iso(v);
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return iso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
  const s = String(v || "").trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  if ((m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/))) { const dd = fmt === "mdy" ? m[2] : m[1], mm = fmt === "mdy" ? m[1] : m[2]; if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return null; return (m[3].length === 2 ? "20" + m[3] : m[3]) + "-" + mm.padStart(2, "0") + "-" + dd.padStart(2, "0"); }
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) return m[1] + "-" + m[2].padStart(2, "0") + "-01";
  return null;
}
/* Библиотеки чтения Excel и PDF (≈2 МБ) грузятся только при импорте, а не при каждом запуске. */
const IMP_LIBS = {
  xlsx: ["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"],
  // worker подключается обычным скриптом: pdf.js тогда разбирает файл в основном потоке (воркеры с CDN запрещены)
  pdf: ["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"]
};
const IMP_LIB_P = {};
function needLib(name) {
  if (!IMP_LIB_P[name]) IMP_LIB_P[name] = IMP_LIBS[name].reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve()).catch(e => { delete IMP_LIB_P[name]; throw e; });
  return IMP_LIB_P[name];
}
async function impFile(f) {
  const I = UI.imp; I.file = f.name; I.status = "читаю…"; I.rows = null; I.headers = null; render();
  try {
    if (I.kind === "pdf") return await impPdf(f);
    try { await needLib("xlsx"); } catch (e) { warn("загрузка чтения Excel", e); throw new Error("no xlsx"); }
    const buf = await f.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const bin = (u8[0] === 0x50 && u8[1] === 0x4b) || (u8[0] === 0xd0 && u8[1] === 0xcf);
    if (bin) { I.wb = XLSX.read(buf, { type: "array", cellDates: true }); I.enc = ""; }
    else {
      let text, enc = "UTF-8";
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(u8); } catch (e) { text = new TextDecoder("windows-1251").decode(u8); enc = "Windows-1251"; }
      text = text.replace(/^\ufeff/, "");
      I.wb = XLSX.read(text, { type: "string", raw: true });
      I.enc = enc;
    }
    I.dfmtUser = false;
    I.sheetNames = I.wb.SheetNames; I.sheet = I.sheetNames[0];
    impParseSheet(); render();
  } catch (e) { I.status = "не удалось прочитать файл"; render(); }
}
function impParseSheet() {
  const I = UI.imp; const ws = I.wb.Sheets[I.sheet];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  let hi = aoa.findIndex(r => r.filter(x => String(x).trim() !== "").length >= 2); if (hi < 0) hi = 0;
  I.headers = (aoa[hi] || []).map(x => String(x).trim()); I.data = aoa.slice(hi + 1);
  const find = re => { const i = I.headers.findIndex(h => re.test(h.toLowerCase())); return i < 0 ? null : i; };
  I.map = I.kind === "rates"
    ? { date: find(/дата|date|месяц|month/), usd: find(/usd|\$|доллар/), eur: find(/eur|€|евро/), uzs: find(/uzs|сум/), kzt: find(/kzt|тенге|₸/) }
    : { date: find(/дата|date/), amount: find(/сумма|amount|sum/), debit: find(/расход|списан|debit|withdraw/), credit: find(/приход|зачисл|поступл|credit|deposit/), desc: find(/описан|назнач|коммент|desc|detail|merchant|получат/), cat: find(/категор|categor|cat$/) };
  if (!I.dfmtUser) I.dfmt = I.map.date != null ? dateFmtGuess(I.data.map(r => r[I.map.date])) : "dmy";
  I.status = I.data.length + " строк" + (I.enc ? " · " + I.enc : ""); impBuildRows();
}
function guessCat(desc, t) {
  const d = String(desc || "").toLowerCase(); if (!d) return t === "i" ? "Прочие доходы" : "Прочее";
  const hist = {};
  for (const o of allOps()) if (o.t === t && o.n && d.includes(String(o.n).toLowerCase()) && o.n.length > 3) hist[o.c] = (hist[o.c] || 0) + 1;
  const best = Object.keys(hist).sort((a, b) => hist[b] - hist[a])[0]; if (best) return best;
  const rules = [[/кафе|ресторан|coffee|кофе|cafe|food|еда|бургер|пицц|evos|bon|starbucks/, "Кафе"], [/корзинк|korzinka|makro|магазин|супермаркет|market|havas|пятерочк|перекрест|магнит|ашан/, "Продукты"], [/такси|taxi|yandex go|uber|метро|transport|mytaxi/, "Транспорт"], [/аптек|pharm|клиник|врач|стомат|med/, "Здоровье"], [/аренд/, "Аренда квартиры"], [/коммун|электр|газ|вода|интернет|связь|beeline|ucell|uzmobile|мтс|билайн|еирц|жкх/, "Коммунальные"], [/подписк|chatgpt|openai|anthropic|claude|yandex plus|яндекс плюс|telegram premium|netflix|spotify/, "Подписки"], [/авиа|air|hotel|отел|booking|билет/, "Путешествия"], [/uzum|ozon|wildberr|amazon|aliexpress|магазин одежды/, "Покупки"]];
  if (t === "i") return /зарплат|salary|оклад/.test(d) ? "Зарплата" : /процент|interest/.test(d) ? "Проценты" : /возврат|кэшбэк|cashback|refund/.test(d) ? "Возвраты" : "Прочие доходы";
  for (const [re, c] of rules) if (re.test(d)) return c;
  return "Прочее";
}
function impBuildRows() {
  const I = UI.imp, M = I.map; I.rows = [];
  if (I.kind === "rates") {
    for (const r of I.data) { const d = excelDate(r[M.date], I.dfmt); if (!d) continue; const o = { m: d.slice(0, 7) }; for (const k of ["usd", "eur", "uzs", "kzt"]) if (M[k] != null) { const v = parseAmt(r[M[k]]); if (v > 0) o[k] = v; } if (Object.keys(o).length > 1) I.rows.push(o); }
    return;
  }
  const sk = I.skip = { date: 0, amount: 0, ex: [] };
  I.data.forEach((r, ri) => {
    if (!r.some(x => String(x).trim() !== "")) return;
    const d = excelDate(M.date != null ? r[M.date] : "", I.dfmt);
    if (!d) { sk.date++; if (sk.ex.length < 4) sk.ex.push(ri + 2); return; }
    let v = NaN;
    if (M.amount != null) v = parseAmt(r[M.amount]);
    if (!isFinite(v) || !v) { const db = M.debit != null ? Math.abs(parseAmt(r[M.debit]) || 0) : 0, cr = M.credit != null ? Math.abs(parseAmt(r[M.credit]) || 0) : 0; v = cr - db; }
    if (!isFinite(v) || !v) { sk.amount++; if (sk.ex.length < 4) sk.ex.push(ri + 2); return; }
    const t = v < 0 ? "e" : "i", desc = M.desc != null ? String(r[M.desc] || "").trim() : "";
    let c = M.cat != null ? String(r[M.cat] || "").trim() : ""; const C = S.settings.cats[t].map(x => x.name); if (!C.includes(c)) c = guessCat(desc, t);
    I.rows.push({ d, a: Math.abs(v), t, desc, c, on: true });
  });
  if (!I.acc) I.acc = (accs().find(a => !a.archived && !NOSPEND.includes(a.type)) || {}).id;
  impMarkDups();
}
function impMarkDups() {
  const I = UI.imp; if (!I.rows || I.kind === "rates") return;
  const have = new Set(allOps().filter(o => o.ac === I.acc).map(o => o.d + "|" + o.t + "|" + Math.round(o.a * 100)));
  for (const r of I.rows) { r.dup = have.has(r.d + "|" + r.t + "|" + Math.round(r.a * 100)); if (r.dup) r.on = false; }
}
async function impPdf(f) {
  const I = UI.imp;
  if (!SAMPLE) { I.status = "разбор PDF недоступен — загрузите Excel или CSV"; render(); return; }
  try { await needLib("pdf"); } catch (e) { warn("загрузка чтения PDF", e); I.status = "не удалось загрузить чтение PDF"; render(); return; }
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
  let text = "";
  for (let p = 1; p <= pdf.numPages && text.length < 120000; p++) {
    const pg = await pdf.getPage(p); const tc = await pg.getTextContent();
    let lastY = null, line = "";
    for (const it of tc.items) { const y = Math.round(it.transform[5]); if (lastY != null && Math.abs(y - lastY) > 2) { text += line.trim() + "\n"; line = ""; } line += it.str + " "; lastY = y; }
    text += line.trim() + "\n";
  }
  if (!text.trim()) { I.status = "в PDF нет текста (скан?) — загрузите выписку в Excel или CSV"; render(); return; }
  I.status = "Claude разбирает выписку…"; render();
  const cats = { e: S.settings.cats.e.map(c => c.name), i: S.settings.cats.i.map(c => c.name) };
  const prompt = "Ниже текст банковской выписки. Извлеки все операции по счету. Ответь только JSON-массивом объектов вида " +
    '{"date":"YYYY-MM-DD","amount":123.45,"direction":"out" или "in","description":"кратко: магазин/получатель","category":"..."}' +
    ". amount — всегда положительное число в валюте счета. Не включай остатки, итоги и заголовки. Категорию выбери из списка: для out — " + cats.e.join(", ") + "; для in — " + cats.i.join(", ") + ". Если не уверен — Прочее (out) или Прочие доходы (in).\n\nВЫПИСКА:\n" + text.slice(0, 100000);
  try {
    const arr = await SAMPLE.json(prompt);
    if (!Array.isArray(arr)) throw { code: "invalid_json" };
    I.rows = arr.map(x => { const d = excelDate(x.date); const a = Math.abs(parseAmt(x.amount)); const t = x.direction === "in" ? "i" : "e"; let c = String(x.category || ""); if (!cats[t].includes(c)) c = guessCat(x.description, t); return d && a > 0 ? { d, a, t, desc: String(x.description || "").slice(0, 80), c, on: true } : null; }).filter(Boolean);
    if (!I.acc) I.acc = (accs().find(a => !a.archived && !NOSPEND.includes(a.type)) || {}).id;
    impMarkDups(); I.status = "распознано строк: " + I.rows.length;
  } catch (e) {
    const code = e && e.code;
    I.status = code === "not_granted" || code === "sampling_disabled" ? "разбор PDF не разрешен — загрузите Excel/CSV" : code === "rate_limited" ? "слишком много запросов, попробуйте позже" : code === "prompt_too_large" ? "выписка слишком большая — разбейте на части" : "не получилось разобрать выписку, попробуйте еще раз";
  }
  render();
}
async function impGo() {
  const I = UI.imp;
  if (I.kind === "rates") { if (!S.rates) S.rates = { m: {} }; for (const r of I.rows) { const cur = S.rates.m[r.m] || rateM(r.m); S.rates.m[r.m] = Object.assign({}, cur, r, { src: "файл" }); delete S.rates.m[r.m].m; } await saveMeta("rates"); toast("Курсы сохранены: " + I.rows.length + " мес"); UI.imp = { kind: "rates" }; go("rates"); return; }
  const sel = I.rows.filter(r => r.on); if (!sel.length) return;
  const byM = {};
  for (const r of sel) { const o = { id: uid("i"), d: r.d, t: r.t, a: Math.round(r.a * 100) / 100, ac: I.acc, c: r.c, src: "import" }; if (r.desc) o.n = r.desc; (byM[r.d.slice(0, 7)] = byM[r.d.slice(0, 7)] || []).push(o); }
  toast("Сохраняю…");
  let done = 0;
  for (const m of Object.keys(byM).sort()) { const ch = {}; for (const o of byM[m]) ch[o.id] = o; try { await writeOps(m, ch); done += byM[m].length; } catch (e) { toast("Импорт прерван: сохранено " + done + " из " + sel.length + " — повторите для остальных"); render(); return; } }
  toast("Импортировано операций: " + sel.length); const last = Object.keys(byM).sort().pop(); UI.imp = { kind: I.kind }; UI.jm = last; go("journal");
}

/* ---------- действия модуля ---------- */
App.actions({
  impkind: t => { UI.imp = { kind: t.dataset.k }; needLib(t.dataset.k === "pdf" ? "pdf" : "xlsx").catch(e => warn("предзагрузка библиотеки импорта", e)); render(); },
  impall: () => { const R = UI.imp.rows; const all = R.every(r => r.on); R.forEach(r => r.on = !all); render(); },
  impgo: () => impGo()
});

/* ---------- поля модуля ---------- */
App.change(t => t.dataset.in === "impfile", async t => { const f = t.files && t.files[0]; if (f) impFile(f); });
App.change(t => t.dataset.in === "impsheet", async t => { UI.imp.sheet = t.value; impParseSheet(); render(); });
App.change(t => t.dataset.in === "impdfmt", async t => { UI.imp.dfmt = t.value; UI.imp.dfmtUser = true; impBuildRows(); render(); });
App.change(t => t.dataset.map != null, async t => { UI.imp.map[t.dataset.map] = t.value === "" ? null : +t.value; impBuildRows(); render(); });
App.change(t => t.dataset.in === "impacc", async t => { UI.imp.acc = t.value; impMarkDups(); render(); });
App.change(t => t.dataset.impon != null, async t => { UI.imp.rows[+t.dataset.impon].on = t.checked; render(); });
App.change(t => t.dataset.impcat != null, async t => { UI.imp.rows[+t.dataset.impcat].c = t.value; });

/* ---------- экраны модуля ---------- */
App.view("import", vImport, { section: "accounts" });
