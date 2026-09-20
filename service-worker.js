var CACHE_NAME = 'ecn-cache-v2';
var CORE_ASSETS = ['.', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS).catch(function(){});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

/* The note page itself is network-first: the whole point of hosting it is that pushing an update
   reaches the app right away, and a cache-first document meant every update only showed up on the
   NEXT launch. The cache stays as the offline fallback. Other assets (icons, manifest) rarely
   change, so those stay cache-first. */
function isDocumentRequest(request){
  return request.mode === 'navigate' ||
         (request.headers.get('accept') || '').indexOf('text/html') !== -1;
}

self.addEventListener('fetch', function(event){
  var request = event.request;
  if(request.method !== 'GET') return;

  if(isDocumentRequest(request)){
    event.respondWith(
      fetch(request).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(request, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(request).then(function(cached){
          return cached || caches.match('.');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function(cached){
      var network = fetch(request).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(request, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
