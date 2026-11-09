const CACHE='oxprompter-mobile-v2-2.0.0-beta1';
const ASSETS=['./','./index.html','./styles.css','./manifest.json','./studio-v2/app.js','./studio-v2/store.js','./studio-v2/media-session.js','./studio-v2/reader.js','./studio-v2/speech.js','./studio-v2/documents.js','./vendor/jszip.min.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
// Não força atualização durante uma gravação. A nova versão assume após fechar as abas antigas.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('oxprompter-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==location.origin)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate'){try{return await fetch(event.request)}catch(_){return await cache.match('./index.html')||Response.error();}}return await cache.match(event.request)||fetch(event.request);})());
});
