/* Лимиты трат: одно правило сравнения для Аналитики и Игры */
"use strict";
function budObj(c) { const B = (S.settings && S.settings.budgets) || {}; const b = B[c]; if (b == null) return null; return typeof b === "number" ? { v: b, cur: "RUB" } : b; }
function budRUB(c, m) { const b = budObj(c); return b && b.v > 0 ? toRUB(b.v, b.cur || "RUB", m) : 0; }
function totalLimitRUB(m) { const t = S.settings && S.settings.limitTotal; return t && t.v > 0 ? toRUB(t.v, t.cur || "RUB", m) : 0; }
/**
 * Сравнение трат с лимитами.
 * Если задан общий лимит — с ним сравниваются все траты (кроме исключённых skip).
 * Иначе сумма лимитов по категориям сравнивается только с тратами тех категорий, у которых лимит есть:
 * траты без лимита (аренда, поездки) не должны давать «превышение».
 * @param {object} spend   траты по категориям {категория: сумма}
 * @param {string} m       месяц, по курсу которого берутся лимиты
 * @param {Function} [skip] категории, которые не учитываются (например, разовые траты в Игре)
 * @param {Function} [toR]  перевод суммы трат в рубли (по умолчанию суммы уже в рублях)
 * @returns {{src:"total"|"cats", limit:number, spend:number, n:number}|null} суммы в рублях; null — лимитов нет
 */
function limitCheck(spend, m, skip, toR) {
  const R = toR || (v => v), sk = skip || (() => false);
  const tl = totalLimitRUB(m);
  if (tl > 0) { let s = 0; for (const c in spend) if (!sk(c)) s += R(spend[c] || 0); return { src: "total", limit: tl, spend: s, n: 0 }; }
  const names = new Set(Object.keys(spend).concat(((S.settings && S.settings.cats && S.settings.cats.e) || []).map(x => x.name)));
  let lim = 0, s = 0, n = 0;
  for (const c of names) { if (sk(c)) continue; const b = budRUB(c, m); if (b > 0) { lim += b; s += R(spend[c] || 0); n++; } }
  return lim > 0 ? { src: "cats", limit: lim, spend: s, n } : null;
}
