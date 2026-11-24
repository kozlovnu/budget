/* Реестр модулей.
   Каркас (ui/shell.js) не знает о конкретных экранах: каждый модуль сам регистрирует
   свои экраны (App.view), действия по нажатию (App.actions) и обработчики полей (App.change).
   Чтобы добавить раздел, достаточно нового файла с этими вызовами и строки в index.html. */
"use strict";
const ACT = {};
const App = {
  views: {},
  /**
   * Экран приложения.
   * @param {string} name   имя в адресе страницы (#name)
   * @param {Function} render  возвращает HTML экрана
   * @param {object} [opts]  section — какая вкладка подсвечена (строка или функция),
   *                         group — "settings" для экранов раздела «Настройки»
   */
  view(name, render, opts) { App.views[name] = Object.assign({ name, render, section: name }, opts || {}); },
  /** Действия по нажатию: элементы с data-act="имя" вызывают ACT[имя](элемент, событие). */
  actions(map) {
    for (const k in map) { if (ACT[k]) console.warn("[app] действие задано дважды:", k); ACT[k] = map[k]; }
  },
  /** Обработчики изменения полей: первый подошедший test(поле) получает run(поле). */
  changes: [],
  change(test, run) { App.changes.push([test, run]); },
  /** Раздел (вкладка), к которому относится экран. */
  /**
   * Виджет Главной.
   * @param {string} id  тип виджета; экземпляры одного типа — "тип:параметр" (например "acc:a1" — счёт)
   * @param {object} w   name, icon, color, desc — для галереи; sizes ["S","M"]; size — размер по умолчанию;
   *                     avail() — доступен ли сейчас (например, игра включена);
   *                     instances() — список экземпляров [{arg, name}] для галереи (у «счёта» — все счета);
   *                     render(ctx, size, arg) → {inner, go | act, bg, fg, raw} или null (нечего показать)
   */
  /** Нижние шторки модулей: App.sheet(kind, fn) — openSheet({kind}) покажет fn(). */
  sheets: {},
  sheet(kind, fn) { App.sheets[kind] = fn; },
  /** Модули, которым нужна своя подписка на базу: App.onBoot(db => …) — один раз после подключения базы. */
  boots: [],
  onBoot(fn) { App.boots.push(fn); },
  /** После каждой загрузки данных (операций и служебных документов): App.onData(() => …). */
  loads: [],
  onData(fn) { App.loads.push(fn); },
  widgets: {},
  widget(id, w) { App.widgets[id] = Object.assign({ id, sizes: ["S"], size: "S", avail: () => true }, w); },
  sectionOf(name) { const v = App.views[name]; if (!v) return name; return typeof v.section === "function" ? v.section() : v.section; },
  isSettings(name) { const v = App.views[name]; return !!v && v.group === "settings"; }
};

/* Номер «эпохи» расчётов: кэши (остатки, прогноз) действительны в пределах одной эпохи.
   Эпоха меняется перед каждой отрисовкой и каждым действием пользователя, поэтому
   кэш никогда не переживает изменение данных. */
let CALC_EPOCH = 0;
function bumpEpoch() { CALC_EPOCH++; }
/** Запомнить результат fn() до конца текущей эпохи. */
function memoEpoch(store, key, fn) {
  if (store.epoch !== CALC_EPOCH) { store.epoch = CALC_EPOCH; store.v = {}; }
  if (!(key in store.v)) store.v[key] = fn();
  return store.v[key];
}

/* Ошибки не глушим молча: пишем в консоль с понятной меткой. */
function warn(where, e) { try { console.warn("[budget] " + where + ":", e); } catch (x) { /* консоль недоступна */ } }
/** Построить блок экрана; при ошибке — заметная карточка вместо пустоты. */
function safeBlock(name, fn) {
  try { return fn(); } catch (e) {
    try { console.error("[budget] блок «" + name + "»:", e); } catch (x) { /* консоль недоступна */ }
    return '<section class="sec"><div class="card mut" style="font-size:14px">Блок «' + name + '» не построился из-за ошибки в расчёте. Остальные данные в порядке.</div></section>';
  }
}
