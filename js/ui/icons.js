/* Иконки, цвета категорий и счетов */
"use strict";
/* ============ icons ============ */
const IC = {
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M14.1 14.2A3 3 0 0 1 9.8 9.9M6.4 7.4C3.9 9.2 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/>',
  home: '<path d="M4 11.2L12 4.5l8 6.7M6.3 9.6v10h11.4v-10M10 19.6v-5.2h4v5.2"/>',
  cap: '<path d="M12 3.8v8.2h8.2A8.2 8.2 0 1 1 12 3.8z"/><path d="M15 3.9a8.3 8.3 0 0 1 5.1 5.1H15z"/>',
  move: '<path d="M12 3.5v17M3.5 12h17M9 6.5l3-3 3 3M9 17.5l3 3 3-3M6.5 9l-3 3 3 3M17.5 9l3 3-3 3"/>',
  gear: '<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  inc: '<path d="M12 4v10M7.5 9.5L12 14l4.5-4.5M5 19h14"/>',
  fixc: '<path d="M4.5 6.5h15v13h-15zM4.5 10.5h15M9 4v4M15 4v4"/>',
  dep: '<path d="M18 6L6 18M7.5 6a1.8 1.8 0 1 0 .01 0M16.5 14.4a1.8 1.8 0 1 0 .01 0"/>',
  fcst: '<path d="M4 17l5-5.5 4 3L20 6M15 6h5v5"/>',
  ai: '<path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9-1.9 5.6-1.9-5.6-5.6-1.9 5.6-1.9z"/>',
  bk: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5V9h4.5M12 8v4.5l3 2"/>',
  expo: '<path d="M12 14V4M8 8l4-4 4 4M5 13v6.5h14V13"/>',
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  bars: '<path d="M5 20V11M12 20V4M19 20v-7"/>',
  card: '<path d="M3 6h18v12H3zM3 10h18M7 15h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  bank: '<path d="M12 3l9 5H3zM5 11v7M10 11v7M14 11v7M19 11v7M3 21h18"/>',
  broker: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  fund: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/>',
  cash: '<path d="M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5"/>',
  save: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  fx: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  person: '<path d="M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0"/>',
  recon: '<path d="M4 7h16M4 12h10M4 17h7M15 15l2 2 4-4"/>',
  imp: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  tag: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  exp: '<path d="M12 20V6M6 12l6-6 6 6"/>',
  gift: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/>',
  travel: '<path d="M21 4L3 11l7 3 3 7zM10 14l11-10"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 7.7-8 9-4.6-1.3-8-4.5-8-9V6z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  flame: '<path d="M12 3c.6 3-1.4 4.6-3 6.5C7.6 11.2 6.5 12.8 6.5 15a5.5 5.5 0 0 0 11 0c0-2.2-1-3.8-2.1-5-.3 1.2-1 2-2 2.4.7-3-.2-7-1.4-9.4z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  flag: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>'
};
function svg(name, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 24) + '" height="' + (w || 24) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[name] + '</svg>'; }
const CATC = { "Жилье": "#FF9500", "Аренда квартиры": "#FF9500", "Коммунальные": "#32ADE6", "Подписки": "#BF5AF2", "Сдача паркинга": "#30D158", "Переводы людям": "#8E8E93", "Продукты": "#34C759", "Кафе": "#A2845E", "Транспорт": "#FFCC00", "Путешествия": "#007AFF", "Покупки": "#FF2D55", "Здоровье": "#FF3B30", "Красота": "#AF52DE", "Развлечения": "#30B0C7", "Вредности": "#5856D6", "Подарки": "#FF6482", "Обучение": "#64D2FF", "Авто": "#8E8E93", "Финансы": "#636366", "Зарплата": "#34C759", "Проценты": "#30B0C7", "Продажа имущества": "#FF9500", "Возвраты": "#5AC8FA", "Перевод": "#8E8E93" };
function catColor(c) { if (CATC[c]) return CATC[c]; let h = 0; for (const ch of c || "") h = (h * 31 + ch.charCodeAt(0)) % 360; return "hsl(" + h + " 55% 50%)"; }
function catTile(c) { return '<span class="tile" style="background:' + catColor(c) + ';font-size:13px;font-weight:700">' + esc((c || "?").slice(0, 1)) + '</span>'; }
const SKINS = { emerald: ["Изумруд", "#0F6E56", 0], copper: ["Медь", "#C97A52", 1], aurora: ["Сияние", "#1E4A6E", 0], graphite: ["Графит", "#2C2C2E", 0], sunset: ["Закат", "#D4537E", 0], champagne: ["Шампань", "#E6D6B8", 1] };
function skinOf(a) { return a && a.skin && SKINS[a.skin] ? a.skin : ""; }
const ACCT = { card: ["card", "#007AFF"], deposit: ["bank", "#34C759"], broker: ["broker", "#5856D6"], fund: ["fund", "#AF52DE"], cash: ["cash", "#8E8E93"], other: ["card", "#636366"] };
function accTile(a) { const t = ACCT[a.type] || ACCT.other, k = a.skin && SKINS[a.skin], bg = k ? k[1] : a.color || t[1]; return '<span class="tile" style="background:' + bg + ';color:' + ((k || a.color) && isLight(bg) ? "#1C1C1E" : "#fff") + '">' + svg(t[0], 18) + '</span>'; }
const TYPEN = { card: "Карта", deposit: "Депозит", broker: "Брокерский", fund: "Фонд", cash: "Наличные", other: "Другое" };
const COUNTRY = { RU: "Россия", UZ: "Узбекистан", KZ: "Казахстан", "": "Другое" };
