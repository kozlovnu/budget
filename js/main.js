/* Запуск приложения */
"use strict";
authStart();
setInterval(dayTick, 60000);
setInterval(() => autoBackup(), 60 * 60e3);
document.addEventListener("visibilitychange", () => { if (!document.hidden) dayTick(); });
window.addEventListener("focus", dayTick);
window.addEventListener("unhandledrejection", e => { const r = e.reason; if (r && typeof r === "object" && typeof r.code === "string") e.preventDefault(); });

// privacy: blurred amounts open for 30 s on tap; whole page blurs while the tab is hidden
document.addEventListener("click", e => {
  const r = document.documentElement; if (!r.classList.contains("privacy") || r.classList.contains("revealed")) return;
  if (!e.target.closest || e.target.closest("input,select,textarea")) return;
  if (!e.target.closest(".n,.big,.ichart")) return;
  e.preventDefault(); e.stopPropagation(); r.classList.add("revealed"); clearTimeout(UI.revT); UI.revT = setTimeout(() => r.classList.remove("revealed"), 30000);
}, true);
document.addEventListener("visibilitychange", () => { const u = S.settings && S.settings.my && S.settings.my.ui; document.body.classList.toggle("veiled", !!(document.hidden && u && u.blur)); if (document.hidden) document.documentElement.classList.remove("revealed"); });
window.addEventListener("resize", () => { const n = window.innerWidth < 760; if (n !== NARROW) { NARROW = n; if (UI.view === "capital") render(true); } });
render();
