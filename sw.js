const CACHE='policeuch-v1';
const FILES=['./', './apple-touch-icon.png', './assets/avatar.webp', './assets/exo2.ttf', './assets/heroes/alina.webp', './assets/heroes/anna.webp', './assets/heroes/darya.webp', './assets/heroes/elena.webp', './assets/heroes/irina.webp', './assets/heroes/katya.webp', './assets/heroes/marina.webp', './assets/heroes/natalya.webp', './assets/heroes/olga.webp', './assets/heroes/polina.webp', './assets/heroes/sofia.webp', './assets/heroes/victoria.webp', './assets/nunito.ttf', './data.js', './favicon.png', './game.js', './icon-192.png', './icon-512.png', './index.html', './manifest.webmanifest', './render.js', './style.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp));return res;})
      .catch(()=>caches.match('./index.html')));return;}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{
    if(res.ok&&new URL(e.request.url).origin===location.origin){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}
    return res;}).catch(()=>caches.match('./index.html'))));
});
