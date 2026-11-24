/* Запуск с входом: проверяем сеанс, при необходимости показываем экран входа, затем подключаем базу (boot). */
"use strict";
function loginBox() {
  let el = document.getElementById("login");
  if (!el) { el = document.createElement("div"); el.id = "login"; document.body.appendChild(el); }
  return el;
}
function showLogin(msg, email) {
  const el = loginBox();
  el.innerHTML = '<form class="lgcard glass" id="lgform" novalidate>' +
    '<img src="assets/icon-180.png" alt="" width="72" height="72" style="border-radius:18px;align-self:center">' +
    '<b style="font-size:24px;text-align:center">Личный бюджет</b>' +
    '<span class="mut" style="text-align:center;font-size:15px;line-height:1.35">Войдите, чтобы открыть свои данные</span>' +
    '<input id="lg-email" type="email" autocomplete="username" inputmode="email" placeholder="Почта" value="' + esc(email || "") + '" required>' +
    '<input id="lg-pass" type="password" autocomplete="current-password" placeholder="Пароль" required>' +
    (msg ? '<span class="lgmsg" role="alert">' + esc(msg) + '</span>' : "") +
    '<button class="btn pri" type="submit" style="height:48px;font-size:17px">Войти</button>' +
    '<button class="lglink" type="button" id="lg-reset">Забыли пароль?</button></form>';
  el.hidden = false; document.documentElement.classList.add("locked");
  const f = document.getElementById("lgform"), em = document.getElementById("lg-email"), pw = document.getElementById("lg-pass");
  (email ? pw : em).focus();
  f.onsubmit = async e => {
    e.preventDefault();
    const b = f.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Вхожу…";
    try { await Cloud.signIn(em.value, pw.value); hideLogin(); boot(); }
    catch (x) { showLogin(Cloud.authErrText(x), em.value); }
  };
  document.getElementById("lg-reset").onclick = async () => {
    if (!/.+@.+\..+/.test(em.value.trim())) return showLogin("Введите почту — пришлём ссылку для нового пароля", em.value);
    try { await Cloud.resetPassword(em.value); showLogin("Ссылка для нового пароля отправлена на " + em.value.trim(), em.value); }
    catch (x) { showLogin(Cloud.authErrText(x), em.value); }
  };
}
function hideLogin() { const el = document.getElementById("login"); if (el) { el.hidden = true; el.innerHTML = ""; } document.documentElement.classList.remove("locked"); }

async function authStart() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || !window.FBSDK) { S.loadedMeta = S.loadedOps = true; S.noDb = true; render(); return; }
  try { Cloud.init(cfg); } catch (e) { warn("подключение Firebase", e); S.loadedMeta = S.loadedOps = true; S.noDb = true; render(); return; }
  const u = await Cloud.ready();
  if (u) boot(); else showLogin();
}

App.actions({
  logout: async () => {
    if (!confirmLogout.armed) { confirmLogout.armed = true; render(); return; }
    try { await Cloud.signOut(); } catch (e) { warn("выход", e); }
    location.reload();
  },
  logoutcancel: () => { confirmLogout.armed = false; render(); }
});
function confirmLogout() { return !!confirmLogout.armed; }

/* Офлайн-запуск: оболочка приложения кэшируется сервис-воркером, данные — самой Firestore. */
if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(e => warn("сервис-воркер", e)));
