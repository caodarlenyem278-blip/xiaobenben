// 小本本 Service Worker – PWA 离线缓存
const CACHE = "xiaobenben-v2";
const SHELL = [
  "/xiaobenben/",
  "/xiaobenben/index.html",
  "/xiaobenben/style.css",
  "/xiaobenben/app.js",
  "/xiaobenben/sync.js",
  "/xiaobenben/manifest.json",
  "/xiaobenben/icon-192.png",
  "/xiaobenben/icon-512.png"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(e) {
  // 跳过非 GET 请求和 chrome-extension
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.protocol === "chrome-extension:") return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetched = fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type === "basic") {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
      return cached || fetched;
    })
  );
});
