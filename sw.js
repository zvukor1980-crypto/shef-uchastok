/* policeuch-v6: network-first for HTML/JS/CSS so iOS never mixes a new page with a stale stylesheet.
   Images/fonts are cache-first. All previous caches are deleted on activate. */
const CACHE='policeuch-v6';
const SHELL=/\.(?:js|css|webmanifest)$/i;

self.addEventListener('install', e=>{
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e=>{
  if(e.data && e.data.type==='SKIP') self.skipWaiting();
});

function sameOrigin(req){
  try{ return new URL(req.url).origin===self.location.origin; }catch{ return false; }
}
function isShell(req){
  if(req.mode==='navigate') return true;
  const p=new URL(req.url).pathname;
  if(p.endsWith('/') || p.endsWith('/index.html') || /\/sw\.js$/.test(p)) return true;
  return SHELL.test(p);
}

self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  if(!sameOrigin(e.request)) return;
  if(isShell(e.request)){
    e.respondWith(
      fetch(e.request, {cache:'no-store'}).then(res=>{
        if(res && res.ok){
          const cp=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request, cp)).catch(()=>{});
        }
        return res;
      }).catch(()=>caches.match(e.request).then(r=>r || caches.match('./index.html') || caches.match('/index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(hit=> hit || fetch(e.request).then(res=>{
      if(res && res.ok){
        const cp=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, cp)).catch(()=>{});
      }
      return res;
    }))
  );
});
