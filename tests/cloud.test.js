/* Тесты слоя базы (js/core/cloud.js) на модели Firestore в памяти.
   Запуск: node tests/cloud.test.js. Проверяют то, что делает сам слой: пути users/{uid}/…,
   слияние вложенных объектов при update, удаление полей через null, массивы в массивах, пустые ключи, блокировку. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DEL = { __del: true };
const store = new Map();
const isMap = v => v && typeof v === "object" && !Array.isArray(v) && v !== DEL;
function check(v, depth) { // как Firestore: нет вложенных массивов, нет пустых ключей, нет undefined
  if (Array.isArray(v)) { for (const x of v) { if (Array.isArray(x)) throw new Error("nested array"); check(x, depth + 1); } return; }
  if (isMap(v)) for (const k in v) { if (k === "") throw new Error("empty field"); if (/^__.*__$/.test(k)) throw new Error("reserved"); if (v[k] === undefined) throw new Error("undefined"); check(v[k], depth + 1); }
}
function merge(a, b) { const o = Object.assign({}, a); for (const k in b) { const v = b[k]; if (v === DEL) delete o[k]; else if (isMap(v) && isMap(o[k])) o[k] = merge(o[k], v); else if (isMap(v)) o[k] = merge({}, v); else o[k] = v; } return o; }
const strip = v => Array.isArray(v) ? v.map(strip) : isMap(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== DEL).map(([k, x]) => [k, strip(x)])) : v;
const snap = (p) => ({ id: p.split("/").pop(), exists: () => store.has(p), data: () => store.has(p) ? JSON.parse(JSON.stringify(store.get(p))) : undefined });
const listeners = [];
function fire() { for (const l of listeners) l.cb({ docs: [...store.keys()].filter(k => k.startsWith(l.p + "/") && k.split("/").length === l.p.split("/").length + 1).sort().map(snap) }); }
const FBSDK = {
  deleteField: () => DEL,
  doc: (_fs, ...seg) => ({ p: seg.join("/") }),
  collection: (_fs, ...seg) => ({ p: seg.join("/") }),
  query: (c) => c, orderBy: () => null, limit: () => null,
  setDoc: async (r, data, o) => { check(data, 0); store.set(r.p, o && o.merge ? merge(store.get(r.p) || {}, data) : strip(data)); fire(); },
  deleteDoc: async r => { store.delete(r.p); fire(); },
  getDoc: async r => snap(r.p),
  getDocs: async c => ({ docs: [...store.keys()].filter(k => k.startsWith(c.p + "/")).map(snap) }),
  onSnapshot: (c, cb) => { listeners.push({ p: c.p, cb }); fire(); return () => {}; },
  runTransaction: async (_fs, fn) => fn({ get: async r => snap(r.p), set: (r, d) => store.set(r.p, d) }),
  initializeApp: () => ({}), initializeAuth: () => ({}), getAuth: () => ({}),
  initializeFirestore: () => ({}), persistentLocalCache: () => ({}), persistentMultipleTabManager: () => ({}), memoryLocalCache: () => ({}),
  onAuthStateChanged: (_a, cb) => cb({ uid: "U1", email: "me@example.com" })
};
const ctx = { console, setTimeout, Promise, JSON, Object, Array, Date, Math, Error, String, FBSDK, warn: () => {} };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/core/cloud.js"), "utf8") + ";globalThis.Cloud = Cloud;", ctx);
const C = ctx.Cloud; C.init({ apiKey: "x" });
let bad = 0, n = 0;
const T = async (name, fn) => { n++; try { await fn(); console.log("✓ " + name); } catch (e) { bad++; console.log("✗ " + name + "\n    " + e.message); } };
const eq = (a, b, m) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((m || "") + " " + x + " ≠ " + y); };
(async () => {
  await C.ready(); const DB = C.db;
  await T("документы лежат в users/{uid}/…", async () => { await DB.doc("meta/settings").set({ a: 1 }); eq([...store.keys()], ["users/U1/meta/settings"]); });
  await T("update сливает вложенные объекты", async () => {
    await DB.doc("meta/accounts").set({ x: { a: 1, b: 2 }, y: 1 });
    await DB.doc("meta/accounts").update({ x: { b: 3, c: 4 } });
    eq((await DB.doc("meta/accounts").get()).data(), { x: { a: 1, b: 3, c: 4 }, y: 1 });
  });
  await T("null в update удаляет поле, в том числе вложенное", async () => {
    await DB.doc("meta/accounts").update({ y: null, x: { a: null } });
    eq((await DB.doc("meta/accounts").get()).data(), { x: { b: 3, c: 4 } });
  });
  await T("операции месяца: добавление и удаление одной операции", async () => {
    await DB.doc("ops/2026-11").set({ items: { o1: { id: "o1", d: "2026-11-01", a: 5, n: null } } });
    await DB.doc("ops/2026-11").update({ items: { o2: { id: "o2", d: "2026-11-02", a: 7 } } });
    await DB.doc("ops/2026-11").update({ items: { o1: null } });
    eq(Object.keys((await DB.doc("ops/2026-11").get()).data().items), ["o2"]);
  });
  await T("массив в массиве и пустой ключ сохраняются и читаются как были", async () => {
    const v = { grid: [[1, 2], [3, [4, 5]]], "": "пусто", list: [{ k: [[0]] }], u: undefined };
    await DB.doc("meta/game").set(v);
    eq((await DB.doc("meta/game").get()).data(), { grid: [[1, 2], [3, [4, 5]]], "": "пусто", list: [{ k: [[0]] }] });
  });
  await T("подписка на коллекцию отдаёт документы с id и exists", async () => {
    let got; DB.collection("meta").onSnapshot(s => { got = s.docs.map(d => [d.id, d.exists]); });
    eq(got, [["accounts", true], ["game", true], ["settings", true]]);
  });
  await T("блокировка: вторая сторона не получает занятый замок, просроченный — получает", async () => {
    eq(await DB.doc("locks/backup").acquire({ holder: "A", ttlMs: 60000 }), { acquired: true });
    eq(await DB.doc("locks/backup").acquire({ holder: "B", ttlMs: 60000 }), { acquired: false });
    eq(await DB.doc("locks/backup").acquire({ holder: "A", ttlMs: 60000 }), { acquired: true });
    store.get("users/U1/locks/backup").exp = Date.now() - 1;
    eq(await DB.doc("locks/backup").acquire({ holder: "B", ttlMs: 60000 }), { acquired: true });
  });
  await T("ошибки базы приводятся к кодам приложения", async () => {
    const orig = FBSDK.setDoc; FBSDK.setDoc = async () => { const e = new Error("no"); e.code = "permission-denied"; throw e; };
    try { await DB.doc("meta/x").set({ a: 1 }); throw new Error("не упало"); } catch (e) { eq(e.code, "invalid_argument"); } finally { FBSDK.setDoc = orig; }
  });
  console.log("\n" + (n - bad) + " из " + n + " тестов пройдено"); process.exit(bad ? 1 : 0);
})();
