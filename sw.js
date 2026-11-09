const CACHE='oxprompter-mobile-1.1.1';
const ASSETS=['./','./index.html','./css/styles.css','./css/camera-ui.css','./js/core.js','./js/library.js','./js/preparation.js','./js/camera.js','./js/media.js','./js/reader.js','./js/speech.js','./js/app.js','./js/documents.js','./vendor/jszip.min.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('oxprompter-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    if(request.mode==='navigate'){
      try{return await fetch(request)}catch(error){return (await cache.match('./index.html'))||Response.error()}
    }
    return (await cache.match(request,{ignoreSearch:true}))||fetch(request);
  }));
});
