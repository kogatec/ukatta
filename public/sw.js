const CACHE_NAME = "ukatta-shell-v2";
// "/" は precache しない。ログイン中に install が走ると、その人のダッシュボード
// （成績入り）がそのまま端末に焼き付いてしまうため。オフライン時は静的な案内を出す。
const APP_SHELL = ["/offline.html", "/manifest.json"];

// キャッシュしてよいのは「誰が見ても同じ静的アセット」だけ。
//
// 以前は全てのGETレスポンスを保存していたが、それだと
// /api/daily-mission/today や /weekly などの認証済みレスポンス（本人の成績）が
// 端末のCache Storageに無期限で残り、ログアウト後や共有端末で他人がオフライン閲覧できた。
// 利用者の大半が未成年で、成績は要配慮性が高い（DESIGN.md §13）ため、
// 個人データは一切キャッシュしない方針にする。
function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/auth/")) return false;
  return (
    url.pathname === "/offline.html" ||
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// オフライン時はキャッシュ済みシェルにフォールバック（ネットワーク優先）
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // APIなど個人データを含むリクエストは、保存もフォールバックもせず素通しする。
  // （オフラインで古い成績を見せるより、取得できないことが分かるほうが安全）
  if (!isCacheableAsset(url)) {
    if (event.request.mode === "navigate") {
      event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    }
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 認証付きレスポンスや失敗レスポンスは保存しない
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "UKATTA", body: event.data.text() };
  }

  const title = payload.title ?? "UKATTA";
  const options = {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
