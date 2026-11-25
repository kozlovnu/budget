/* Запуск с входом: проверяем сеанс, при необходимости показываем экран входа, затем подключаем базу (boot). */
"use strict";
function loginBox() {
  let el = document.getElementById("login");
  if (!el) { el = document.createElement("div"); el.id = "login"; document.body.appendChild(el); }
  return el;
}
const LG_HEAD = '<img src="assets/icon-180.png" alt="" width="72" height="72" style="border-radius:18px;align-self:center">' +
  '<b style="font-size:24px;text-align:center">Личный бюджет</b>';
const lgSub = t => '<span class="mut" style="text-align:center;font-size:15px;line-height:1.35">' + t + '</span>';
const lgMsg = m => m ? '<span class="lgmsg" role="alert">' + esc(m) + '</span>' : "";
function lgShow(html) {
  const el = loginBox(); el.innerHTML = '<form class="lgcard glass" id="lgform" novalidate>' + LG_HEAD + html + '</form>';
  el.hidden = false; document.documentElement.classList.add("locked");
  return document.getElementById("lgform");
}
const $id = id => document.getElementById(id);
function lgBusy(f, text) { const b = f.querySelector("button[type=submit]"); b.disabled = true; b.textContent = text; }

/** Вход. */
function showLogin(msg, email) {
  const f = lgShow(lgSub("Войдите, чтобы открыть свои данные") +
    '<input id="lg-email" type="email" autocomplete="username" inputmode="email" placeholder="Почта" value="' + esc(email || "") + '" required>' +
    '<input id="lg-pass" type="password" autocomplete="current-password" placeholder="Пароль" required>' + lgMsg(msg) +
    '<button class="btn pri" type="submit" style="height:48px;font-size:17px">Войти</button>' +
    '<button class="lglink" type="button" id="lg-reset">Забыли пароль?</button>' +
    '<button class="lglink" type="button" id="lg-new">Нет аккаунта? Создать по приглашению</button>');
  const em = $id("lg-email"), pw = $id("lg-pass");
  (email ? pw : em).focus();
  f.onsubmit = async e => {
    e.preventDefault(); lgBusy(f, "Вхожу…");
    try { await Cloud.signIn(em.value, pw.value); await afterAuth(); }
    catch (x) { showLogin(Cloud.authErrText(x), em.value); }
  };
  $id("lg-reset").onclick = async () => {
    if (!/.+@.+\..+/.test(em.value.trim())) return showLogin("Введите почту — пришлём ссылку для нового пароля", em.value);
    try { await Cloud.resetPassword(em.value); showLogin("Ссылка для нового пароля отправлена на " + em.value.trim(), em.value); }
    catch (x) { showLogin(Cloud.authErrText(x), em.value); }
  };
  $id("lg-new").onclick = () => showSignup("", em.value);
}

/** Регистрация по коду приглашения. */
function showSignup(msg, email, code) {
  const f = lgShow(lgSub("Новый аккаунт. Код приглашения выдаёт владелец приложения.") +
    '<input id="su-email" type="email" autocomplete="username" inputmode="email" placeholder="Почта" value="' + esc(email || "") + '" required>' +
    '<input id="su-pass" type="password" autocomplete="new-password" placeholder="Пароль (от 6 символов)" required>' +
    '<input id="su-pass2" type="password" autocomplete="new-password" placeholder="Пароль ещё раз" required>' +
    '<input id="su-code" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Код приглашения" value="' + esc(code || "") + '" required>' + lgMsg(msg) +
    '<button class="btn pri" type="submit" style="height:48px;font-size:17px">Создать аккаунт</button>' +
    '<button class="lglink" type="button" id="su-back">Уже есть аккаунт? Войти</button>');
  const em = $id("su-email"), pw = $id("su-pass"), pw2 = $id("su-pass2"), cd = $id("su-code");
  (email ? pw : em).focus();
  f.onsubmit = async e => {
    e.preventDefault();
    const again = m => showSignup(m, em.value, cd.value);
    if (!/.+@.+\..+/.test(em.value.trim())) return again("Почта указана с ошибкой");
    if (pw.value.length < 6) return again("Пароль слишком простой — минимум 6 символов");
    if (pw.value !== pw2.value) return again("Пароли не совпадают");
    if (!cd.value.trim()) return again("Введите код приглашения");
    lgBusy(f, "Создаю аккаунт…");
    try { await Cloud.signUp(em.value, pw.value, cd.value); hideLogin(); boot(); }
    catch (x) { warn("регистрация", x); again(Cloud.authErrText(x)); }
  };
  $id("su-back").onclick = () => showLogin("", em.value);
}

/** Аккаунт есть, но доступа к базе нет (создан в консоли или код не привязался) — просим код. */
function showInvite(msg) {
  const f = lgShow(lgSub("Аккаунт " + esc(Cloud.email()) + " ещё не активирован. Введите код приглашения.") +
    '<input id="iv-code" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Код приглашения" required>' + lgMsg(msg) +
    '<button class="btn pri" type="submit" style="height:48px;font-size:17px">Активировать</button>' +
    '<button class="lglink" type="button" id="iv-out">Выйти</button>');
  const cd = $id("iv-code"); cd.focus();
  f.onsubmit = async e => {
    e.preventDefault();
    if (!cd.value.trim()) return showInvite("Введите код приглашения");
    lgBusy(f, "Проверяю…");
    try { if (!(await Cloud.inviteOk(cd.value))) return showInvite("Код приглашения не подходит"); await Cloud.join(cd.value); hideLogin(); boot(); }
    catch (x) { warn("активация", x); showInvite(Cloud.authErrText(x)); }
  };
  $id("iv-out").onclick = async () => { try { await Cloud.signOut(); } catch (e) {} location.reload(); };
}
function hideLogin() { const el = document.getElementById("login"); if (el) { el.hidden = true; el.innerHTML = ""; } document.documentElement.classList.remove("locked"); }

/** После входа: есть доступ — открываем данные, нет — просим код приглашения. */
async function afterAuth() {
  let ok;
  try { ok = await Cloud.isMember(); }
  catch (e) { warn("проверка доступа", e); return showLogin("Нет связи с базой — проверьте интернет и войдите снова"); }
  if (ok) { hideLogin(); boot(); } else showInvite();
}

async function authStart() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || !window.FBSDK) { S.loadedMeta = S.loadedOps = true; S.noDb = true; render(); return; }
  try { Cloud.init(cfg); } catch (e) { warn("подключение Firebase", e); S.loadedMeta = S.loadedOps = true; S.noDb = true; render(); return; }
  const u = await Cloud.ready();
  if (u) await afterAuth(); else showLogin();
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
