const CACHE = "dtro-clean-offline-v8-sound";
const CORE = [
  "./index.html",
  "./manifest.json",
  "./tagu.png"
];

async function cacheCore() {
  const cache = await caches.open(CACHE);
  for (const url of CORE) {
    try {
      const response = await fetch(url, {cache:"reload"});
      if (response && response.ok) {
        await cache.put(url, response.clone());
      }
    } catch (e) {
      // Ignore individual failures so SW installation still completes.
    }
  }
}

self.addEventListener("install", event => {
  event.waitUntil(cacheCore());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(async resp => {
          try {
            const cache = await caches.open(CACHE);
            await cache.put("./index.html", resp.clone());
          } catch(e) {}
          return resp;
        })
        .catch(async () => {
          return (await caches.match("./index.html")) ||
                 new Response("오프라인 상태이며 캐시가 준비되지 않았습니다.", {
                   headers: {"Content-Type":"text/plain; charset=utf-8"}
                 });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(async resp => {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(req, resp.clone());
        } catch(e) {}
        return resp;
      });
    })
  );
});

self.addEventListener("message", event => {
  if (event.data === "CHECK_OFFLINE") {
    caches.open(CACHE).then(async cache => {
      const results = await Promise.all(CORE.map(async url => !!(await cache.match(url))));
      event.source?.postMessage({
        type:"OFFLINE_STATUS",
        ready:results.every(Boolean),
        cached:results
      });
    });
  }
});
