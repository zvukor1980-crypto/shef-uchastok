/* v14: app-scoped caches, bounded network waits, offline shell fallback. */
const CACHE='policeuch-v14';
const SHELL=['./','./index.html','./style.css?v=14','./data.js?v=14','./game.js?v=14','./manifest.webmanifest?v=14'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(SHELL);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()) if(key.startsWith('policeuch-')&&key!==CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP') self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin) return;
  const shell=req.mode==='navigate'||/\.(js|css|webmanifest)$/.test(url.pathname);
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req,{ignoreSearch:!shell});
    if(!shell && cached) return cached;
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),4000);
    try{
      const res=await fetch(req,{signal:ctrl.signal,cache:shell?'no-cache':'default'});
      if(res.ok){await cache.put(req,res.clone());return res;}
      if(cached) return cached;
      return res;
    }catch(error){
      if(cached) return cached;
      if(req.mode==='navigate'){
        const fallback=await cache.match('./index.html');
        if(fallback) return fallback;
      }
      return new Response('Ресурс пока недоступен офлайн',{status:503});
    }finally{clearTimeout(timer);}
  })());
});
