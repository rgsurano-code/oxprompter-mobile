// Reconhecimento do comando e dispositivos simulados. Não certifica Safari/iPhone.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'results-ios-voice');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'text/plain'});res.end(e?'Not found':b)})});
(async()=>{let browser;const results=[];try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  await context.addInitScript(()=>{
    window.SpeechRecognition=class{constructor(){window.fakeSpeech=this}start(){window.speechMicBusy=true}stop(){setTimeout(()=>{window.speechMicBusy=false;this.onend?.()},200)}abort(){window.speechMicBusy=false}};
    navigator.mediaDevices.getUserMedia=async constraints=>{
      if(constraints.audio&&window.speechMicBusy)throw new Error('Reconhecimento ainda ocupa o microfone');
      window.captureCalls=(window.captureCalls||0)+1;
      if(!window.syntheticCamera){
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const x=canvas.getContext('2d');let n=0;const draw=()=>{n++;x.fillStyle=n%40<20?'#d52b27':'#273bd5';x.fillRect(0,0,640,480);requestAnimationFrame(draw)};draw();window.syntheticCamera=canvas.captureStream(24);
        const ac=new AudioContext(),osc=ac.createOscillator(),gain=ac.createGain(),dest=ac.createMediaStreamDestination();gain.gain.value=0;osc.connect(gain);gain.connect(dest);osc.start();await ac.resume();window.syntheticGain=gain;window.syntheticAudio=dest.stream;
      }
      return new MediaStream([...(constraints.video?syntheticCamera.getVideoTracks().map(t=>t.clone()):[]),...(constraints.audio?syntheticAudio.getAudioTracks().map(t=>t.clone()):[])]);
    };
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('#splashStart').click();await page.locator('#p1').fill('teste123');await page.locator('#p2').fill('teste123');await page.locator('#create').click();await page.locator('#login').fill('teste123');await page.locator('#enter').click();
  await page.locator('#quickName').fill('Voz');await page.locator('#quickText').fill('Texto para verificar a rolagem acionada pela voz. '.repeat(200));await page.locator('#quickCreate').click();await page.locator('#mode').selectOption('audio');await page.locator('#count').selectOption('5');await page.evaluate(()=>current.settings.startCmds=[{phrase:'começar agora'}]);
  await page.locator('#start').click();await page.waitForFunction(()=>window.fakeSpeech&&commandRecognition);
  await page.evaluate(()=>{window.unlockedContext=liveMicContext;fakeSpeech.onresult({results:[[{transcript:'começar agora'}]]})});
  assert.equal(await page.evaluate(()=>window.captureCalls||0),0,'não abre microfone antes de end');
  await page.waitForFunction(()=>started&&mediaRecorder?.state==='recording',null,{timeout:25000});
  assert(await page.evaluate(()=>liveMicContext===unlockedContext&&liveMicContext.state==='running'));
  const initial=await page.evaluate(()=>manualY);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>manualY),initial,'silêncio não rola');
  await page.evaluate(()=>syntheticGain.gain.value=.2);await page.waitForTimeout(1000);const voiced=await page.evaluate(()=>({y:manualY,rms:currentMicRms,bar:parseFloat(document.getElementById('liveMicLevel').style.width)}));assert(voiced.y<initial-1&&voiced.rms>.01&&voiced.bar>10,'áudio move barra e texto');
  await page.evaluate(()=>syntheticGain.gain.value=0);await page.waitForTimeout(1300);const silent=await page.evaluate(()=>manualY);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>manualY),silent,'pausa após silêncio');
  await page.locator('#pause').click();assert.equal(await page.evaluate(()=>mediaRecorder.state),'paused');await page.locator('#pause').click();assert.equal(await page.evaluate(()=>mediaRecorder.state),'recording');
  await page.evaluate(()=>syntheticGain.gain.value=.2);await page.waitForTimeout(500);assert(await page.evaluate(()=>manualY)<silent);
  await page.screenshot({path:path.join(out,'voz-ativa.png')});await page.locator('#finishTele').click();await page.locator('#recordedReviewVideo').waitFor();assert(await page.evaluate(()=>recordedBlob.size)>0);
  const downloadPromise=page.waitForEvent('download');await page.locator('#saveRecording').click();const download=await downloadPromise;await download.saveAs(path.join(out,'voz.mp4'));assert.deepEqual(errors,[]);results.push({status:'APROVADO',commandWaitsForEnd:true,contextReused:true,silenceStopsScroll:true,voiceMovesScroll:true,voiced,pauseResumeRecording:true,recordedBytes:await page.evaluate(()=>recordedBlob.size),pageErrors:errors,engine:'Edge '+browser.version(),iPhoneReal:'NÃO TESTADO'});
}catch(e){results.push({status:'FALHOU',error:e.stack});process.exitCode=1}finally{fs.writeFileSync(path.join(out,'resultados.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser?.close();server.close()}})();
