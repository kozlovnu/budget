/* Демо-режим: приложение на вымышленных данных, без записи в настоящую базу.
   Включается кнопкой «Посмотреть демо» (на приветствии пустой базы или в Настройках → О данных),
   живёт до закрытия вкладки (sessionStorage) или до кнопки «Начать со своими».
   Вместо Firestore подключается база в памяти браузера с тем же интерфейсом, что у js/core/cloud.js,
   поэтому все экраны и действия работают как обычно — просто ничего никуда не сохраняется.
   Данные: полгода до сегодняшнего дня, суммы в сумах, рублях и долларах, курсы ЦБ, сверка на 1-е число каждого месяца. */
"use strict";
const Demo = (() => {
  const KEY = "budget.demo";
  const on = () => { try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; } };
  function start() { try { sessionStorage.setItem(KEY, "1"); } catch (e) {} location.hash = "home"; location.reload(); }
  function stop() { try { sessionStorage.removeItem(KEY); } catch (e) {} location.hash = ""; location.reload(); }

  /* ---------- база в памяти: тот же интерфейс, что Cloud.db ---------- */
  function memDb(seed) {
    const store = new Map(Object.entries(seed)), subs = [];
    const cp = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
    const plain = v => v !== null && typeof v === "object" && !Array.isArray(v);
    const merge = (a, b) => { const o = Object.assign({}, a); for (const k in b) { const v = b[k]; if (v === null) delete o[k]; else if (plain(v) && plain(o[k])) o[k] = merge(o[k], v); else o[k] = cp(v); } return o; };
    const snap = p => ({ id: p.split("/").pop(), exists: store.has(p), data: () => cp(store.get(p)) });
    const inCol = (c, p) => p.startsWith(c + "/") && p.split("/").length === c.split("/").length + 1;
    const colSnap = c => ({ docs: [...store.keys()].filter(p => inCol(c, p)).sort().map(snap) });
    let tick = null;
    const fire = () => { clearTimeout(tick); tick = setTimeout(() => { for (const s of subs) s.ok(colSnap(s.c)); }, 0); };
    const doc = p => ({
      set: async d => { store.set(p, cp(d)); fire(); },
      update: async d => { store.set(p, merge(store.get(p) || {}, d)); fire(); },
      delete: async () => { store.delete(p); fire(); },
      get: async () => snap(p),
      acquire: async () => ({ acquired: true })
    });
    const col = (c, ord, lim) => ({
      orderBy: (f, dir) => col(c, [f, dir], lim), limit: n => col(c, ord, n),
      get: async () => { let d = colSnap(c).docs; if (ord) { const [f, dir] = ord; d.sort((a, b) => (a.data()[f] > b.data()[f] ? 1 : -1) * (dir === "desc" ? -1 : 1)); } if (lim) d = d.slice(0, lim); return { docs: d }; },
      onSnapshot: (ok, no) => { const s = { c, ok }; subs.push(s); setTimeout(() => ok(colSnap(c)), 0); return () => subs.splice(subs.indexOf(s), 1); }
    });
    return { doc, collection: c => col(c) };
  }

  /* ---------- вымышленные данные ---------- */
  function data() {
    let seed = 20261125; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const between = (a, b, step) => Math.round((a + rnd() * (b - a)) / step) * step;
    const pad = n => String(n).padStart(2, "0");
    const m0 = curM(), first = addMonth(m0, -5), months = []; for (let i = 0; i < 6; i++) months.push(addMonth(first, i));
    const day = (m, d) => { const last = new Date(+m.slice(0, 4), +m.slice(5), 0).getDate(); return m + "-" + pad(Math.min(d, last)); };
    const lastDay = m => day(m, 31);

    const accounts = [
      { id: "dv", name: "Зарплатная Visa", bank: "Kapitalbank", type: "card", cur: "UZS", country: "UZ", inCap: true, main: true, last4: "4417", order: 1 },
      { id: "dh", name: "Humo на продукты", bank: "Hamkorbank", type: "card", cur: "UZS", country: "UZ", inCap: true, last4: "8102", order: 2 },
      { id: "dt", name: "Т-Банк", bank: "Т-Банк", type: "card", cur: "RUB", country: "RU", inCap: true, last4: "5530", order: 3 },
      { id: "dd", name: "Накопительный вклад", bank: "Т-Банк", type: "deposit", cur: "RUB", country: "RU", rate: 16, till: day(addMonth(m0, 7), 15), inCap: true, order: 4 },
      { id: "db", name: "Брокерский счёт", bank: "Т-Банк", type: "broker", cur: "RUB", country: "RU", inCap: true, order: 5 },
      { id: "dc", name: "Наличные доллары", bank: "", type: "cash", cur: "USD", country: "UZ", inCap: true, order: 6 }
    ];
    const rates = {}; months.forEach((m, i) => { const usd = 80.4 + i * 0.45; rates[m] = { usd: +usd.toFixed(4), eur: +(usd * 1.158).toFixed(4), uzs: +(151.2 - i * 0.35).toFixed(4), kzt: +(6.31 - i * 0.02).toFixed(4), src: "ЦБ РФ · авто" }; });

    const bal = { dv: 4800000, dh: 1250000, dt: 86000, dd: 420000, db: 650000, dc: 1500 };
    const snaps = { [day(first, 1)]: { bal: Object.assign({}, bal) } };
    const ops = {}; let n = 0;
    const add = (m, d, o) => { const date = day(m, d); if (date > TODAYS) return; o.id = "demo" + (++n); o.d = date; (ops[m] = ops[m] || {})[o.id] = o;
      if (o.t === "e") bal[o.ac] -= o.a; else if (o.t === "i") bal[o.ac] += o.a; else { bal[o.ac] -= o.a; bal[o.to] += o.ta; } };
    const exp = (m, d, ac, a, c, s, note) => add(m, d, Object.assign({ t: "e", ac, a, c }, s ? { s } : {}, note ? { n: note } : {}));

    months.forEach((m, i) => {
      const r = rates[m];
      if (i > 0 && day(m, 1) <= TODAYS) { bal.db = Math.round(bal.db * (1 + between(-0.01, 0.025, 0.001))); snaps[day(m, 1)] = { bal: Object.assign({}, bal) }; }
      exp(m, 1, "dv", 7000000, "Аренда квартиры", "", "Квартира на Чиланзаре");
      add(m, 5, { t: "i", ac: "dv", a: 26000000, c: "Зарплата" });
      add(m, 6, { t: "t", ac: "dv", a: 3000000, to: "dh", ta: 3000000 });
      add(m, 7, { t: "t", ac: "dv", a: 6000000, to: "dt", ta: Math.round(6000000 / r.uzs) });
      add(m, 8, { t: "t", ac: "dt", a: 25000, to: "dd", ta: 25000 });
      exp(m, 10, "dh", between(560000, 720000, 1000), "Коммунальные", "", "Свет, газ, интернет");
      exp(m, 12, "dt", 399, "Подписки", "", "Музыка");
      // квартира в Москве: квартплата (в одном месяце пропущена — видно в «Платежах»), свет, телефон
      if (i !== 3) exp(m, 11, "dt", between(5200, 6100, 10), "Коммунальные", "квартплата", "");
      exp(m, 15, "dt", between(900, 1500, 10), "Коммунальные", "электричество", "");
      exp(m, 9, "dt", 650, "Коммунальные", "телефон", "");
      exp(m, 14, "dt", 1290, "Подписки", "", "Облако и кино");
      for (let k = 0; k < 9; k++) exp(m, 2 + k * 3, rnd() < 0.7 ? "dh" : "dv", between(110000, 560000, 1000), "Продукты", "", k % 3 ? "" : "Korzinka");
      for (let k = 0; k < 7; k++) exp(m, 3 + k * 4, "dv", between(85000, 340000, 1000), "Кафе", "", ["Кофейня", "Обед с коллегами", "Ужин", "Плов-центр", "Пицца", "Кофейня", "Суши"][k]);
      for (let k = 0; k < 10; k++) exp(m, 1 + k * 3, "dv", between(14000, 62000, 1000), "Транспорт", "", k % 2 ? "Такси" : "Метро и автобус");
      exp(m, 16, "dv", between(320000, 1450000, 1000), "Покупки", "", "Одежда");
      exp(m, 21, "dt", between(2400, 8200, 10), "Покупки", "", "Маркетплейс");
      exp(m, 18, "dv", between(150000, 420000, 1000), "Развлечения", "", "Кино и боулинг");
      if (i === 1 || i === 4) exp(m, 19, "dv", 420000, "Здоровье", "", "Стоматолог");
      if (i === 2) { add(m, 11, { t: "t", ac: "dv", a: 6000000, to: "dc", ta: 470 }); exp(m, 22, "dv", 9200000, "Путешествия", "", "Билеты в Стамбул"); exp(m, 24, "dc", 860, "Путешествия", "", "Отель и экскурсии"); }
      if (i === 4) exp(m, 13, "dv", 1200000, "Подарки", "", "День рождения мамы");
      if (lastDay(m) <= TODAYS) add(m, 31, { t: "i", ac: "dd", a: Math.round(bal.dd * 0.16 / 12), c: "Проценты" });
    });

    const st = { v: SETTINGS_V, cats: DEF_CATS(), budgets: { "Кафе": { v: 2500000, cur: "UZS" }, "Продукты": { v: 4500000, cur: "UZS" }, "Развлечения": { v: 600000, cur: "UZS" } }, forecast: {},
      my: { name: "Демо", salary: { hist: [{ from: first, v: 26000000, cur: "UZS" }] }, ui: { home: null },
        bills: { list: [{ id: "bkv", name: "Квартплата", c: "Коммунальные", subs: ["квартплата"], pf: "ru", txt: "", per: -1, from: "" }, { id: "bel", name: "Электричество", c: "Коммунальные", subs: ["электричество"], pf: "ru", txt: "", per: -1, from: "" }], marks: {} } } };
    delete st.my.ui.home;
    const seedDocs = {
      "meta/accounts": { list: accounts }, "meta/rates": { m: rates }, "meta/snaps": { items: snaps }, "meta/settings": st
    };
    for (const m in ops) seedDocs["ops/" + m] = { items: ops[m] };
    return seedDocs;
  }

  /* ---------- плашка демо и приветствие пустой базы ---------- */
  function bar() {
    if (document.getElementById("demobar")) return;
    const el = document.createElement("div"); el.id = "demobar";
    el.innerHTML = '<span><b>Демо-режим</b> · ничего не сохраняется</span><button class="btn pri" data-act="demostop">Начать со своими</button>';
    const page = document.getElementById("page"); page.insertBefore(el, page.firstChild);
    document.documentElement.classList.add("demo");
  }
  /** Экран пустой базы: что можно сделать первым делом. */
  function welcome() {
    return navHead("Добро пожаловать", "") + '<section class="sec"><div class="card wlc">' +
      '<b style="font-size:20px">Здесь будут ваши счета, траты и капитал</b>' +
      '<p class="mut" style="margin:0;font-size:15px;line-height:1.45">Пока данных нет. Посмотрите, как приложение выглядит на готовом примере, или сразу начните со своих счетов.</p>' +
      '<button class="btn pri wlc-btn" data-act="demostart">' + svg("eye", 18) + ' Посмотреть демо</button>' +
      '<p class="mut" style="margin:-4px 0 4px;font-size:13px;line-height:1.4;text-align:center">Полгода вымышленных трат, доходов и сверок. В демо можно нажимать всё — ваши данные это не затронет.</p>' +
      '<button class="btn alt wlc-btn" data-act="newacc">' + svg("plus", 18) + ' Добавить первый счёт</button>' +
      '<button class="btn alt wlc-btn" data-act="welcomerestore">' + svg("bk", 18) + ' Перенести из резервной копии</button>' +
      '</div></section>';
  }
  App.actions({
    demostart: () => start(),
    demostop: () => stop(),
    welcomerestore: () => go("backups")
  });
  App.onBoot(() => { if (on()) bar(); });

  return { on, start, stop, db: () => memDb(data()), welcome, _data: data };
})();
