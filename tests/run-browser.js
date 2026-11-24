/* Вывод результатов тестов на страницу tests.html */
"use strict";
(function () {
  const res = runTests(), bad = res.filter(r => !r.ok).length;
  document.getElementById("sum").innerHTML = '<b class="' + (bad ? "bad" : "ok") + '">' + (res.length - bad) + " из " + res.length + " тестов пройдено</b>";
  document.getElementById("list").innerHTML = res.map(r => '<li class="' + (r.ok ? "ok" : "bad") + '">' + (r.ok ? "✓ " : "✗ ") + esc(r.name) + (r.ok ? "" : "<br><small>" + esc(r.err) + "</small>") + "</li>").join("");
})();
