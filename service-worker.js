const CACHE = "dtro-clean-offline-v12-silent";
const CORE = ["./index.html","./manifest.json","./tagu.png"];

self.addEventListener("install", event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const url of CORE){
      try{
        const r=await fetch(url,{cache:"reload"});
        if(r.ok) await cache.put(url,r.clone());
      }catch(e){}
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req=event.request;
  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req).then(async r=>{
        try{
          const c=await caches.open(CACHE);
          await c.put("./index.html",r.clone());
        }catch(e){}
        return r;
      }).catch(()=>caches.match("./index.html"))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req))
  );
});
