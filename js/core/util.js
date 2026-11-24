/* Общие утилиты: даты, числа, строки, localStorage */
"use strict";
function pl(n, a, b, c) { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; }
function dayTick() { const n = iso(new Date()); if (n === TODAYS) return; TODAY = new Date(); TODAYS = n; ALLOPS = null; if (typeof RB !== "undefined") RB = null; render(true); if (typeof autoBackup === "function") { BK_LAST_CHECK = 0; autoBackup(); } }

function lsGet(k) { try { return localStorage.getItem("budget." + k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem("budget." + k, v); } catch (e) { /* хранилище браузера недоступно — это только удобства */ } }
function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function uid(p) { return (p || "o") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
const MON = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONG = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WD = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
function mLabel(m, cap) { const s = MON[+m.slice(5) - 1] + " " + m.slice(0, 4); return cap ? s[0].toUpperCase() + s.slice(1) : s; }
function dLabel(d) { return +d.slice(8) + " " + MONG[+d.slice(5, 7) - 1] + (d.slice(0, 4) !== TODAYS.slice(0, 4) ? " " + d.slice(0, 4) : ""); }
function addMonth(m, k) { let y = +m.slice(0, 4), mo = +m.slice(5) - 1 + k; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12; return y + "-" + String(mo + 1).padStart(2, "0"); }
function calcNum(s) {
  if (s == null) return NaN;
  s = String(s).replace(/[\s  ]/g, "").replace(/−/g, "-").replace(/×/g, "*").replace(/÷|:/g, "/").replace(/,/g, ".");
  if (!s || !/^[0-9.+\-*/()]+$/.test(s)) return NaN;
  let i = 0;
  const pk = () => s[i];
  const expr = () => { let v = term(); while (pk() === "+" || pk() === "-") { const op = s[i++]; const r = term(); v = op === "+" ? v + r : v - r; } return v; };
  const term = () => { let v = fac(); while (pk() === "*" || pk() === "/") { const op = s[i++]; const r = fac(); v = op === "*" ? v * r : v / r; } return v; };
  const fac = () => { if (pk() === "-") { i++; return -fac(); } if (pk() === "+") { i++; return fac(); } if (pk() === "(") { i++; const v = expr(); if (s[i] !== ")") throw 0; i++; return v; } const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); };
  try { const v = expr(); return i === s.length && isFinite(v) ? Math.round(v * 100) / 100 : NaN; } catch (e) { return NaN; }
}
function isExpr(s) { return /[+\-*/×÷−:]/.test(String(s || "").trim().replace(/^[-−]/, "")); }
function calcPreview(s, cur) { if (!isExpr(s)) return ""; const v = calcNum(s); return isFinite(v) ? "= " + money(v, cur, { dec: Math.abs(v - Math.round(v)) > 0.004 ? 2 : 0 }) : (/[+\-*/×÷−]\s*$/.test(s) ? "" : "проверьте выражение"); }
function formCur(F) { return F.ac ? accCur(F.ac) : F.t === "t" && F.to ? accCur(F.to) : accCur(F.ac); }
function updCalc() { const el = document.getElementById("f-a"), r = document.getElementById("f-a-res"); if (el && r && FORM) r.textContent = calcPreview(el.value, formCur(FORM)); }
function parseNum(s) { if (s == null) return NaN; s = String(s).replace(/\s| | /g, "").replace(/−/g, "-").replace(",", "."); return s === "" ? NaN : Number(s); }
/** Подключить скрипт по требованию (свой файл или библиотеку с CDN). */
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("не загрузилось: " + src)); document.head.appendChild(s); }); }
