var CACHE_NAME = 'olive-pwa-v1';
var CORE_ASSETS = ['./', './index.html'];
var OPTIONAL_ASSETS = ['./manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS).then(function () {
        return Promise.all(
          OPTIONAL_ASSETS.map(function (url) {
            return cache.add(url).catch(function () {});
          })
        );
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) { if (k !== CACHE_NAME) return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf('script.google.com') !== -1 ||
      req.url.indexOf('drive.google.com') !== -1 ||
      req.url.indexOf('googleusercontent.com') !== -1) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(function (res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(req, clone); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('./index.html') || caches.match('./');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});