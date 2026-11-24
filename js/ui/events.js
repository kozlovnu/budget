/* Делегирование событий: нажатия, ввод, изменения полей → действия модулей */
"use strict";
document.addEventListener("click", e => {
  bumpEpoch();
  const ic = e.target.closest(".ichart");
  if (ic && !e.target.closest("[data-act]")) { chClick(ic, e); return; }
  const t = e.target.closest("[data-act]"); if (!t) return;
  const f = ACT[t.dataset.act]; if (!f) return;
  if (t.tagName === "A") e.preventDefault();
  f(t, e);
});
document.addEventListener("pointerdown", e => { if (e.target.closest(".calcb button")) e.preventDefault(); });
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "f-a") { if (FORM) FORM.a = t.value; updCalc(); }
  if (t.dataset.in === "jq") { UI.jq = t.value; document.getElementById("jlist").innerHTML = journalList(); }
});
document.addEventListener("change", async e => {
  bumpEpoch();
  const t = e.target;
  for (const [test, run] of App.changes) if (test(t)) { await run(t, e); return; }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && FORM) closeSheet(); });
