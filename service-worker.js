var CACHE_NAME = 'olive-pwa-v10';
var CORE_ASSETS = ['./', './index.html', './manifest.json'];
var OPTIONAL_ASSETS = ['./icon.svg', './icon-192.png', './icon-512.png'];

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

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) { if (k !== CACHE_NAME) return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// ✅ صفحة أوفلاين موحّدة
function offlinePage() {
  var html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>معاصر الزيتون</title>' +
    '<style>' +
    'body{font-family:"Segoe UI",Tahoma,sans-serif;text-align:center;padding:40px 20px;background:#F5F3E7;color:#2C3E1F;margin:0}' +
    'h1{color:#556B2F;font-size:1.5rem}' +
    '.box{max-width:400px;margin:0 auto;background:white;padding:30px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1)}' +
    'button{padding:12px 24px;font-size:16px;background:#556B2F;color:white;border:none;border-radius:8px;margin-top:20px;cursor:pointer;font-weight:bold}' +
    '.icon{font-size:60px;margin-bottom:15px}' +
    '</style></head><body>' +
    '<div class="box">' +
    '<div class="icon">🫒</div>' +
    '<h1>معاصر الزيتون</h1>' +
    '<p style="font-size:16px;font-weight:bold;">لا يوجد اتصال بالإنترنت</p>' +
    '<p style="font-size:14px;color:#666;">افتح التطبيق مرة واحدة وأنت متصل بالإنترنت ليتم حفظه للاستخدام الأوفلاين.</p>' +
    '<button onclick="location.reload()">🔄 إعادة المحاولة</button>' +
    '</div></body></html>';
  
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ✅ معالج Navigation — محصّن 100%
async function handleNavigate(req) {
  try {
    try {
      var cached = await caches.match(req);
      if (cached) {
        try {
          var network = await fetch(req);
          if (network && network.status === 200) {
            var cache = await caches.open(CACHE_NAME);
            try { cache.put(req, network.clone()); } catch (e) {}
          }
        } catch (e) {}
        return cached;
      }
    } catch (e) {}

    try {
      var indexCache = await caches.match('./index.html');
      if (indexCache) return indexCache;
    } catch (e) {}

    try {
      var rootCache = await caches.match('./');
      if (rootCache) return rootCache;
    } catch (e) {}

    try {
      var absCache = await caches.match('/index.html');
      if (absCache) return absCache;
    } catch (e) {}

    try {
      var networkRes = await fetch(req);
      if (networkRes) return networkRes;
    } catch (e) {}

    return offlinePage();
  } catch (e) {
    return offlinePage();
  }
}

// ✅ معالج الملفات العادية
async function handleAsset(req) {
  try {
    var cached = await caches.match(req);
    if (cached) return cached;
    
    try {
      var res = await fetch(req);
      if (res && res.status === 200) {
        var cache = await caches.open(CACHE_NAME);
        try { cache.put(req, res.clone()); } catch (e) {}
      }
      return res;
    } catch (e) {
      return new Response('', { status: 404 });
    }
  } catch (e) {
    return new Response('', { status: 404 });
  }
}

// ✅ معالج Fetch الرئيسي
self.addEventListener('fetch', function (e) {
  var req = e.request;
  
  if (req.method !== 'GET') return;
  
  if (req.url.indexOf('script.google.com') !== -1 ||
      req.url.indexOf('drive.google.com') !== -1 ||
      req.url.indexOf('googleusercontent.com') !== -1 ||
      req.url.indexOf('googleapis.com') !== -1) {
    return;
  }
  
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(handleNavigate(req));
    return;
  }
  
  e.respondWith(handleAsset(req));
});
