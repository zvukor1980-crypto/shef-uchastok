/* policeuch-v8: network-first for HTML/JS/CSS so an update replaces stale files.
   Images and fonts are cache-first. Only previous cache names are deleted. */
const CACHE='policeuch-v9';
const SHELL=/\.(?:js|css|webmanifest)$/i;
const PRECACHE=[
  './',
  './index.html',
  './style.css?v=9',
  './game.js?v=9',
  './data.js?v=9',
  './manifest.webmanifest?v=9',
  './assets/art/rooms/reception-1.webp',
  './assets/art/rooms/detective-1.webp',
  './assets/art/rooms/interrog-1.webp',
  './assets/art/rooms/cells-1.webp',
  './assets/art/rooms/garage-1.webp',
  './assets/art/heroes/anna-1.webp',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './assets/avatar.webp',
  './assets/nunito.ttf',
  './assets/exo2.ttf',
  './assets/rooms/wing-start.webp',
  './assets/rooms/wing-more.webp',
  './assets/rooms/interrog-bg.webp',
  './assets/sprites/car-police.webp',
  './assets/heroes/nika.webp',
  './assets/heroes/anna.webp',
  './assets/sprites/anna.webp'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
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
      }).catch(()=>caches.match(e.request).then(r=>r || caches.match('./index.html') || caches.match('./') || caches.match('/index.html')))
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
