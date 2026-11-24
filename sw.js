/* Сервис-воркер: приложение открывается и без сети.
   Файлы приложения берутся из сети (так обновления видны сразу), при отсутствии сети — из кэша.
   Данные сюда не попадают: их хранит и синхронизирует сама Firestore. */
const CACHE = "budget-shell-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  const ours = u.origin === location.origin, fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (r.method !== "GET" || !(ours || fonts)) return; // запросы к базе и курсам — мимо кэша
  e.respondWith(fetch(r).then(res => { if (res.ok || res.type === "opaque") { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === "navigate" ? caches.match("./") : Response.error()))));
});
