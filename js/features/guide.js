/* Гид «С чего начать» — карточка вверху Главной для новых пользователей.
   Шаги отмечаются сами, по данным: остатки, первая операция, доход, лимиты, установка на экран «Домой».
   Карточка пропадает, когда всё сделано или её скрыли (my.ui.guide = "off"; вернуть — Настройки → О данных).
   В демо-режиме не показывается. */
"use strict";
function standalone() { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
function guideSteps() {
  const M = mySt(), st = S.settings || {}, u = PZ();
  return [
    { k: "acc", t: "Добавьте счета", s: "Карты, вклады, наличные — всё, где лежат деньги", done: accs().some(a => !a.archived) },
    { k: "rec", t: "Укажите остатки", s: "Сверка: сколько сейчас на каждом счёте", done: snapKeys().length > 0 || accs().some(a => +a.openBal) },
    { k: "op", t: "Запишите первую операцию", s: "Трату, доход или перевод — кнопка «+»", done: allOps().length > 0 },
    { k: "inc", t: "Укажите доход", s: "Зарплата и регулярные поступления — для прогноза", done: (M.salary.hist || []).length > 0 || (M.incomes || []).length > 0 },
    { k: "lim", t: "Поставьте лимиты на траты", s: "На месяц — по категориям или общий", done: Object.keys(st.budgets || {}).length > 0 || !!(st.limitTotal && st.limitTotal.v) },
    { k: "home", t: "Установите на экран «Домой»", s: "Откроется как приложение, без адресной строки", done: standalone() || !!u.guideHome }
  ];
}
function guideHTML() {
  if (Demo.on() || PZ().guide === "off") return "";
  const L = guideSteps(), n = L.filter(x => x.done).length;
  if (n === L.length) return "";
  const next = L.find(x => !x.done).k;
  const rows = L.map((x, i) => '<button class="row gd-row' + (x.done ? " done" : "") + (x.k === next ? " next" : "") + '" data-act="guide" data-k="' + x.k + '"' + (x.done ? ' aria-disabled="true"' : "") + '>' +
    '<span class="gd-n" aria-hidden="true">' + (x.done ? svg("check", 16) : i + 1) + '</span>' +
    '<span class="body"><span class="t"><b>' + x.t + '</b><small>' + x.s + '</small></span>' + (x.done ? "" : '<span class="gd-go" aria-hidden="true">›</span>') + '</span></button>').join("");
  return '<section class="sec"><div class="gd-head"><span>С чего начать · ' + n + ' из ' + L.length + '</span><button data-act="guidehide">Скрыть</button></div>' +
    '<div class="gd-bar" role="progressbar" aria-label="Пройдено шагов" aria-valuenow="' + n + '" aria-valuemin="0" aria-valuemax="' + L.length + '"><i style="width:' + Math.round(n / L.length * 100) + '%"></i></div>' +
    '<div class="group">' + rows + '</div></section>';
}
const A2HS_HELP = '<b>iPhone и iPad (Safari)</b><br>Откройте приложение в Safari → кнопка «Поделиться» (квадрат со стрелкой) → «На экран «Домой»» → «Добавить».<br><br>' +
  '<b>Android (Chrome)</b><br>Меню ⋮ → «Добавить на главный экран» или «Установить приложение».<br><br>' +
  '<b>Компьютер (Chrome, Edge)</b><br>Значок установки в правой части адресной строки → «Установить».<br><br>' +
  'После установки приложение открывается отдельным окном и работает без интернета; данные синхронизируются, когда связь появится.';
App.actions({
  guide: t => {
    const k = t.dataset.k, x = guideSteps().find(s => s.k === k); if (!x || x.done) return;
    if (k === "acc") ACT.newacc();
    else if (k === "rec") go("reconcile");
    else if (k === "op") ACT.newop();
    else if (k === "inc") go("income");
    else if (k === "lim") go("categories");
    else if (k === "home") openSheet({ kind: "help", title: "Установка на экран «Домой»", html: A2HS_HELP + '<br><br><button class="btn pri" style="width:100%;height:44px" data-act="guidehomedone">Готово, установил</button>' });
  },
  guidehomedone: () => { PZ().guideHome = true; closeSheet(); savePZ(); },
  guidehide: () => { PZ().guide = "off"; savePZ(); toast("Гид скрыт — вернуть можно в Настройках → О данных"); },
  guideshow: () => { delete PZ().guide; savePZ(); go("home"); }
});
