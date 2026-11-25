/* Облачная база: вход по почте (Firebase Auth) и хранилище Firestore.
   Даёт db.js тот же интерфейс, что была у базы Claude, поэтому остальной код не меняется:
     DB.doc(путь).set / update / delete / get / acquire
     DB.collection(путь).onSnapshot / orderBy / limit / get
   Все документы пользователя лежат в users/{uid}/…, правила Firestore пускают туда только его самого.
   update сливает вложенные объекты (как и раньше); null в update удаляет поле.
   Firestore не хранит массив внутри массива — такие массивы прозрачно заворачиваются в {__arr: […]}. */
"use strict";
const Cloud = (() => {
  const F = window.FBSDK;
  let app = null, auth = null, fs = null, user = null, firstAuth = null;

  /* ---------- значения: запись и чтение ---------- */
  const EMPTY = "_~empty"; // Firestore не принимает пустое имя поля
  // обычный объект {…}, а не служебное значение Firestore (у тех свой класс)
  const plain = v => { if (v === null || typeof v !== "object" || Array.isArray(v)) return false; const p = Object.getPrototypeOf(v); return p === null || !!(p.constructor && p.constructor.name === "Object"); };
  function enc(x) {
    if (Array.isArray(x)) return x.map(v => Array.isArray(v) ? { __arr: enc(v) } : enc(v === undefined ? null : v));
    if (!plain(x)) return x;
    const o = {}; for (const k in x) if (x[k] !== undefined) o[k === "" ? EMPTY : k] = enc(x[k]);
    return o;
  }
  function dec(x) {
    if (Array.isArray(x)) return x.map(dec);
    if (!plain(x)) return x;
    const ks = Object.keys(x);
    if (ks.length === 1 && ks[0] === "__arr" && Array.isArray(x.__arr)) return x.__arr.map(dec);
    const o = {}; for (const k of ks) o[k === EMPTY ? "" : k] = dec(x[k]);
    return o;
  }
  /** Для частичной записи: null → удалить поле (внутри массивов null остаётся значением). */
  function nullsToDelete(x) {
    if (!plain(x)) return x;
    const o = {}; for (const k in x) { const v = x[k]; o[k] = v === null ? F.deleteField() : plain(v) ? nullsToDelete(v) : v; }
    return o;
  }
  const CODES = { "resource-exhausted": "quota_exceeded", "permission-denied": "invalid_argument", unauthenticated: "invalid_argument", "invalid-argument": "invalid_argument" };
  function err(e) { const x = new Error((e && e.message) || "db"); x.code = (e && CODES[e.code]) || (e && e.code) || "unavailable"; x.cause = e; return x; }
  const wrap = p => p.catch(e => { throw err(e); });
  const snapOf = s => ({ id: s.id, exists: s.exists(), data: () => dec(s.data() || {}) });

  /* ---------- пути ---------- */
  function parts(path) { if (!user) throw err({ code: "unauthenticated", message: "нет входа" }); return ["users", user.uid].concat(String(path).split("/").filter(Boolean)); }
  const docRef = path => F.doc(fs, ...parts(path));
  const colRef = path => F.collection(fs, ...parts(path));

  function docApi(path) {
    return {
      set: data => wrap(F.setDoc(docRef(path), enc(data))),
      update: data => wrap(F.setDoc(docRef(path), nullsToDelete(enc(data)), { merge: true })),
      delete: () => wrap(F.deleteDoc(docRef(path))),
      get: () => wrap(F.getDoc(docRef(path)).then(snapOf)),
      /** Блокировка между устройствами: {acquired:true}, если документ свободен, просрочен или уже наш. */
      acquire: ({ holder, ttlMs }) => wrap(F.runTransaction(fs, async tx => {
        const ref = docRef(path), s = await tx.get(ref), d = s.exists() ? s.data() : null, now = Date.now();
        if (d && d.holder !== holder && d.exp > now) return { acquired: false };
        tx.set(ref, { holder, exp: now + (ttlMs || 60000) });
        return { acquired: true };
      }))
    };
  }
  function colApi(path, cons) {
    cons = cons || [];
    return {
      orderBy: (f, dir) => colApi(path, cons.concat(F.orderBy(f, dir || "asc"))),
      limit: n => colApi(path, cons.concat(F.limit(n))),
      get: () => wrap(F.getDocs(F.query(colRef(path), ...cons)).then(q => ({ docs: q.docs.map(snapOf) }))),
      onSnapshot: (ok, no) => F.onSnapshot(F.query(colRef(path), ...cons), q => ok({ docs: q.docs.map(snapOf) }), e => no && no(err(e)))
    };
  }
  const db = { doc: docApi, collection: path => colApi(path) };

  /* ---------- подключение и вход ---------- */
  function init(cfg) {
    if (app) return;
    app = F.initializeApp(cfg);
    try { auth = F.initializeAuth(app, { persistence: [F.indexedDBLocalPersistence, F.browserLocalPersistence] }); } catch (e) { auth = F.getAuth(app); }
    try { fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }), ignoreUndefinedProperties: true }); }
    catch (e) { warn("кэш базы на устройстве недоступен", e); fs = F.initializeFirestore(app, { localCache: F.memoryLocalCache(), ignoreUndefinedProperties: true }); }
    firstAuth = new Promise(res => { let first = true; F.onAuthStateChanged(auth, u => { user = u; if (first) { first = false; res(u); } }); });
  }
  const AUTH_ERR = {
    "auth/invalid-credential": "Неверная почта или пароль", "auth/wrong-password": "Неверная почта или пароль", "auth/user-not-found": "Неверная почта или пароль",
    "auth/invalid-email": "Почта указана с ошибкой", "auth/too-many-requests": "Слишком много попыток — подождите несколько минут",
    "auth/network-request-failed": "Нет связи — проверьте интернет", "auth/user-disabled": "Учётная запись отключена",
    "auth/email-already-in-use": "Эта почта уже зарегистрирована — войдите", "auth/weak-password": "Пароль слишком простой — минимум 6 символов",
    "auth/operation-not-allowed": "Регистрация выключена в настройках Firebase", "auth/admin-restricted-operation": "Регистрация выключена в настройках Firebase",
    "permission-denied": "Код приглашения не подходит"
  };
  const authErrText = e => AUTH_ERR[e && e.code] || "Не удалось войти — повторите";
  async function signIn(email, pass) { const r = await F.signInWithEmailAndPassword(auth, email.trim(), pass); user = r.user; return user; }
  const resetPassword = email => F.sendPasswordResetEmail(auth, email.trim());

  /* ---------- доступ по приглашению ----------
     Пользователь получает доступ к своей базе, когда у него есть документ members/{uid}.
     Создать его можно только с действующим кодом из invites/{код} — это проверяют правила Firestore.
     Коды заводит владелец в консоли Firebase; посторонний без кода не сможет ничего записать в базу. */
  const CODE_RE = /^[A-Za-z0-9_-]{4,64}$/;
  const memberKey = () => "budget.member." + (user && user.uid);
  const normCode = c => String(c || "").trim();
  /** Есть ли такой код. Читать отдельный код по имени можно без входа, список кодов — нельзя. */
  async function inviteOk(code) {
    code = normCode(code); if (!CODE_RE.test(code)) return false;
    return (await F.getDoc(F.doc(fs, "invites", code))).exists();
  }
  async function isMember() {
    if (!user) return false;
    try {
      const ok = (await F.getDoc(F.doc(fs, "members", user.uid))).exists();
      try { ok ? localStorage.setItem(memberKey(), "1") : localStorage.removeItem(memberKey()); } catch (e) {}
      return ok;
    } catch (e) {
      // без сети — верим отметке с прошлого запуска на этом устройстве
      let was = false; try { was = localStorage.getItem(memberKey()) === "1"; } catch (x) {}
      if (was && e && (e.code === "unavailable" || e.code === "failed-precondition")) return true;
      if (e && e.code === "permission-denied") return false;
      throw err(e);
    }
  }
  async function join(code) {
    code = normCode(code);
    if (!CODE_RE.test(code)) { const x = new Error("code"); x.code = "permission-denied"; throw x; }
    await F.setDoc(F.doc(fs, "members", user.uid), { code, email: user.email || "", at: new Date().toISOString() });
    try { localStorage.setItem(memberKey(), "1"); } catch (e) {}
  }
  /** Регистрация: сначала проверяем код, потом создаём учётную запись и сразу привязываем код.
      Если привязать не вышло — удаляем только что созданную запись, чтобы не оставлять пустых аккаунтов. */
  async function signUp(email, pass, code) {
    if (!(await inviteOk(code))) { const x = new Error("code"); x.code = "permission-denied"; throw x; }
    const r = await F.createUserWithEmailAndPassword(auth, email.trim(), pass); user = r.user;
    try { await join(code); } catch (e) { try { await r.user.delete(); } catch (x) {} user = null; throw e; }
    return user;
  }
  /** Выход: кроме сеанса стираем и копию базы на этом устройстве. */
  async function signOut() {
    try { localStorage.removeItem(memberKey()); } catch (e) {}
    try { await F.signOut(auth); } finally {
      try { await F.terminate(fs); await F.clearIndexedDbPersistence(fs); } catch (e) { warn("очистка кэша базы", e); }
    }
  }

  /* ---------- скачивание файлов (вместо downloads из Claude) ---------- */
  const downloads = {
    async save({ filename, data }) {
      const type = /\.csv$/i.test(filename) ? "text/csv" : "application/json";
      const file = new File([data], filename, { type });
      // на iPhone — системное меню «Поделиться» → «Сохранить в Файлы»
      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch (e) { const x = new Error("declined"); x.code = e && e.name === "AbortError" ? "declined" : "share_failed"; throw x; }
      }
      const url = URL.createObjectURL(file), a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  return {
    init, db, downloads, signIn, signOut, signUp, resetPassword, authErrText, isMember, join, inviteOk,
    ready: () => firstAuth, email: () => (user && user.email) || "",
    _codec: { enc, dec, nullsToDelete } // для тестов
  };
})();
