var CACHE_NAME = 'olive-pwa-v9';
var CORE_ASSETS = ['./', './index.html', './manifest.json'];
var OPTIONAL_ASSETS = ['./icon.svg', './icon-192.png', './icon-512.png'];

// ==================== التثبيت ====================
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      var promises = [];
      CORE_ASSETS.forEach(function (url) {
        promises.push(cache.add(url).catch(function () {}));
      });
      OPTIONAL_ASSETS.forEach(function (url) {
        promises.push(cache.add(url).catch(function () {}));
      });
      return Promise.all(promises);
    }).then(function () { return self.skipWaiting(); })
  );
});

// ==================== التفعيل ====================
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) { if (k !== CACHE_NAME) return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// ==================== اعتراض الطلبات ====================
self.addEventListener('fetch', function (e) {
  var req = e.request;

  if (req.method !== 'GET') return;

  // تجاهل طلبات Google الخارجية
  if (req.url.indexOf('script.google.com') !== -1 ||
      req.url.indexOf('drive.google.com') !== -1 ||
      req.url.indexOf('googleusercontent.com') !== -1 ||
      req.url.indexOf('googleapis.com') !== -1) {
    return;
  }

  // ✅ التنقل والتحديث: الكاش أولاً (يتجاهل ? في الرابط) ثم الشبكة
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      caches.match('./index.html', { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (c) { c.put('./index.html', copy); });
          }
          return res;
        });

        if (cached) {
          network.catch(function () {});
          return cached;
        }

        return network.catch(function () {
          return new Response(
            '<html dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px;background:#F5F3E7;color:#2C3E1F;">' +
            '<h1 style="color:#556B2F;">🫒 معاصر الزيتون</h1>' +
            '<p style="font-size:18px;font-weight:bold;">لا يوجد اتصال بالإنترنت</p>' +
            '<p style="font-size:14px;color:#666;">افتح التطبيق مرة واحدة وأنت متصل بالإنترنت ليتم تخزينه.</p>' +
            '<button onclick="location.reload()" style="padding:12px 24px;font-size:16px;background:#556B2F;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:15px;">🔄 إعادة المحاولة</button>' +
            '</body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
    );
    return;
  }

  // ✅ بقية الملفات (Cache-First)
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () {
        return new Response('', { status: 404 });
      });
    })
  );
});
