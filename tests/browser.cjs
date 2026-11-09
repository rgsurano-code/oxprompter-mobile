const {chromium,webkit}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));fs.readFile(file,(e,data)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'text/plain'});res.end(e?'Not found':data)})});
(async()=>{
 await new Promise(r=>server.listen(8765,'127.0.0.1',r));const results=[];
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.OXPROMPTER_ENGINE||name===process.env.OXPROMPTER_ENGINE)){
  let browser;try{browser=await type.launch({headless:true,...(engine==='chromium'&&process.env.OXPROMPTER_BROWSER_CHANNEL?{channel:process.env.OXPROMPTER_BROWSER_CHANNEL}:{}),args:engine==='chromium'?['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']:[]})}catch(e){results.push({engine,unavailable:e.message});continue}
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  try{
   await page.goto('http://127.0.0.1:8765');await page.locator('#splashStart').click();
   await page.locator('#p1').fill('teste123');await page.locator('#p2').fill('teste123');await page.locator('#create').click();
   await page.locator('#login').fill('teste123');await page.locator('#enter').click();
   await page.locator('#quickName').fill('Roteiro de teste');await page.locator('#quickText').fill(('Olá mundo. Este é um roteiro de teste com acentuação e bastante texto para rolar.\n').repeat(40));await page.locator('#quickCreate').click();
   await page.locator('#mode').selectOption('noaudio');await page.locator('#recordOn').uncheck();await page.locator('#recordAudioOn').uncheck();await page.locator('#mobileCameraBg').uncheck();await page.locator('#count').selectOption('5');
   for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'prep overflow '+JSON.stringify(size))}
   await page.setViewportSize({width:390,height:844});await page.locator('#timerOn').uncheck();await page.locator('#start').click();await page.waitForFunction(()=>started&&(!(current.settings.recordOn||current.settings.recordAudioOn)||mediaRecorder?.state==='recording'),null,{timeout:30000});
   assert(await page.evaluate(()=>started),'reading started');assert.equal(await page.locator('#timer').evaluate(el=>getComputedStyle(el).visibility),'hidden');
   let y=await page.evaluate(()=>manualY);await page.waitForTimeout(700);assert(await page.evaluate(()=>manualY)<y,'auto scroll');
   await page.locator('#pause').click();y=await page.evaluate(()=>manualY);let elapsed=await page.locator('#timer').textContent();await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>manualY),y,'pause scroll');assert.equal(await page.locator('#timer').textContent(),elapsed,'pause timer');
   await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>paused),false);
   const before=await page.evaluate(()=>(scrollStartY-manualY)/(scrollStartY-scrollEndY));await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);
   const after=await page.evaluate(()=>(scrollStartY-manualY)/(scrollStartY-scrollEndY));assert(Math.abs(after-before)<.02,'resize progress');
   await page.locator('#hideControls').click();assert(await page.locator('.controls').evaluate(e=>getComputedStyle(e).display==='none'));await page.locator('#showControls').click();
   await page.locator('#backTele').click();assert(await page.locator('#mode').isVisible());await page.locator('#back2').click();assert.equal(await page.locator('[data-load-script]').count(),1);
   const downloadPromise=page.waitForEvent('download');await page.locator('#exportScripts').click();assert((await downloadPromise).suggestedFilename().endsWith('.json'));
   const importText=await page.evaluate(async()=>{const z=new JSZip();z.file('word/document.xml','<w:document><w:p><w:t>Teste &amp; revisão</w:t></w:p></w:document>');return readDocumentFile(new File([await z.generateAsync({type:'uint8array',compression:'DEFLATE'})],'teste.docx'))});assert(importText.includes('Teste & revisão'));
   assert.equal(await page.evaluate(()=>parseTime('00:05:30')),330);assert.equal(await page.evaluate(()=>parseTime('inválido')),0);
   await page.locator('#fileInput').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({scripts:[{name:'<img src=x onerror=alert(1)>',text:'Texto restaurado'}]}))});await page.waitForTimeout(100);assert.equal(await page.locator('[data-load-script]').count(),2);assert.equal(await page.locator('#list img').count(),0);
   for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'home overflow '+JSON.stringify(size))}
   await page.screenshot({path:path.join(__dirname,'results')+'/'+engine+'-library.png',fullPage:true});
   if(engine==='chromium'){
    await page.locator('[data-open]').first().click();await page.locator('#quickCreate').click();await page.locator('#mode').selectOption('noaudio');await page.locator('#recordOn').uncheck();await page.locator('#recordAudioOn').check();await page.locator('#start').click();await page.waitForFunction(()=>started&&(!(current.settings.recordOn||current.settings.recordAudioOn)||mediaRecorder?.state==='recording'),null,{timeout:30000});
    assert.equal(await page.evaluate(()=>mediaRecorder?.state),'recording');assert((await page.evaluate(()=>recordingMime)).startsWith('audio/'));
    await page.evaluate(()=>window.previousRecorder=mediaRecorder);await page.locator('#restartTele').click();await page.locator('#exitDiscard').click();await page.waitForFunction(()=>started&&(!(current.settings.recordOn||current.settings.recordAudioOn)||mediaRecorder?.state==='recording'),null,{timeout:30000});assert(await page.evaluate(()=>mediaRecorder!==window.previousRecorder));assert.equal(await page.evaluate(()=>mediaRecorder.state),'recording');
    const speed=await page.evaluate(()=>scrollSpeed);await page.locator('#faster').click();assert(await page.evaluate(()=>scrollSpeed)>speed);const font=await page.locator('#promptText').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));await page.locator('#fontMore').click();assert(await page.locator('#promptText').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>font);
    await page.locator('#pause').click();assert.equal(await page.evaluate(()=>mediaRecorder.state),'paused');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>mediaRecorder.state),'recording');await page.waitForTimeout(1200);
    await page.locator('#finishTele').click();await page.locator('#recordedReviewAudio').waitFor();assert(await page.evaluate(()=>recordedBlob.size)>0);assert.equal(await page.evaluate(()=>prepMicStream),null);
    await page.locator('#deleteRecording').click();await page.locator('#backTele').click();await page.locator('#recordOn').check();await page.locator('#recordAudioOn').uncheck();await page.locator('#mode').selectOption('semi');await page.locator('#start').click();await page.waitForFunction(()=>started&&(!(current.settings.recordOn||current.settings.recordAudioOn)||mediaRecorder?.state==='recording'),null,{timeout:30000});
    assert.equal(await page.evaluate(()=>mediaRecorder?.state),'recording');assert.equal(await page.evaluate(()=>recordStream.getVideoTracks().length),1);
    await page.waitForTimeout(1200);await page.locator('#finishTele').click();await page.locator('#recordedReviewVideo').waitFor();assert(await page.evaluate(()=>recordedBlob.size)>0);
    await page.locator('#deleteRecording').click();await page.locator('#backTele').click();
   }
   // Speech backend is deliberately mocked here: test exact command matching only.
   const commandResult=await page.evaluate(()=>{const Old=window.SpeechRecognition;let hits=0;class Fake{constructor(){window.fakeSpeech=this}start(){}stop(){}abort(){}}window.SpeechRecognition=Fake;current.settings.startCmds=[{phrase:'começar agora'}];startStartCommandListener(()=>hits++);fakeSpeech.onresult({resultIndex:0,results:[[{transcript:'começar'}]]});const partial=hits;fakeSpeech.onresult({resultIndex:0,results:[[{transcript:'começar agora'}]]});window.SpeechRecognition=Old;return {partial,hits}});assert.deepEqual(commandResult,{partial:0,hits:1});
   await page.evaluate(()=>{stopAll();showBiblioteca()});
   await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForTimeout(300);assert(await page.evaluate(async()=>{const c=await caches.open('oxprompter-mobile-1.1.0');return !!(await c.match('./js/reader.js'))}));
   if(engine==='chromium'){await context.setOffline(true);await page.reload();await page.locator('#splashStart').waitFor();assert(await page.evaluate(()=>typeof showBiblioteca==='function'));await context.setOffline(false)}
   const recovery=await context.newPage();await recovery.addInitScript(()=>localStorage.setItem('tp_data_v1','{invalid'));await recovery.goto('http://127.0.0.1:8765');await recovery.locator('#splashStart').click();await recovery.locator('#p1').waitFor();assert.equal(await recovery.evaluate(()=>localStorage.getItem('tp_data_v1')),'{invalid');await recovery.close();
   assert.deepEqual(errors,[]);results.push({engine,version:browser.version(),passed:true,errors});
  }catch(e){results.push({engine,passed:false,error:e.stack,errors,state:await page.evaluate(()=>({started,settings:current?.settings,recorder:mediaRecorder?.state,status:document.querySelector('#statusText')?.textContent}))});await page.screenshot({path:path.join(__dirname,'results')+'/'+engine+'-failure.png',fullPage:true})}
  await browser.close();
 }
 fs.writeFileSync(path.join(__dirname,'results/browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;server.close();
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
