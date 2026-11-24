/* Запуск тестов расчётов в Node: node tests/run-node.js
   Загружает те же модули, что и приложение, в изолированный контекст с минимальными заглушками браузера. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const files = ["js/core/util.js", "js/core/app.js", "js/core/state.js", "js/calc/money.js", "js/calc/ledger.js", "js/calc/limits.js",
  "js/model/settings.js", "js/core/db.js", "js/calc/insights.js", "js/calc/pulse.js", "js/calc/forecast.js", "js/features/fctrack.js", "js/views/journal.js", "tests/calc.test.js"];
const stubEl = () => ({ innerHTML: "", dataset: {}, classList: { toggle() {}, add() {}, remove() {}, contains: () => false }, setAttribute() {}, removeAttribute() {}, querySelector: () => null, querySelectorAll: () => [], appendChild() {} });
const ctx = {
  console, setTimeout, clearTimeout, setInterval: () => 0, Intl, Math, JSON, Date,
  localStorage: { getItem: () => null, setItem() {} },
  document: { documentElement: stubEl(), body: stubEl(), getElementById: stubEl, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: stubEl, head: stubEl() },
  location: { hash: "" }, history: { replaceState() {} }, innerWidth: 390, scrollY: 0, scrollTo() {}, addEventListener() {}
};
ctx.window = ctx; vm.createContext(ctx);
// классические скрипты делят одну глобальную область — склеиваем их, как это делает браузер
const code = files.map(f => fs.readFileSync(path.join(root, f), "utf8").replace(/^"use strict";/m, "")).join("\n;\n") + "\n;globalThis.__res = runTests();";
vm.runInContext('"use strict";\n' + code, ctx, { filename: "app-bundle.js" });
let bad = 0;
for (const r of ctx.__res) { console.log((r.ok ? "✓ " : "✗ ") + r.name + (r.ok ? "" : "\n    " + r.err)); if (!r.ok) bad++; }
console.log("\n" + (ctx.__res.length - bad) + " из " + ctx.__res.length + " тестов пройдено");
process.exit(bad ? 1 : 0);
