// Teste com câmera/áudio sintéticos em Edge. Não certifica Safari/iPhone.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'results-ios-video-final');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data)});
});
(async()=>{
  let browser;const results=[];
  try{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',acceptDownloads:true});
    await context.addInitScript(()=>{
      navigator.mediaDevices.getUserMedia=async constraints=>{
        if(!window.testCamera){
          const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
          const ctx=canvas.getContext('2d');let n=0;
          const draw=()=>{n++;ctx.fillStyle=n%40<20?'#e02020':'#2040e0';ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff';ctx.fillRect((n*7)%580,100,60,200);window.testDraw=requestAnimationFrame(draw)};draw();
          window.testCamera=canvas.captureStream(24);
          const ac=new AudioContext(),osc=ac.createOscillator(),dest=ac.createMediaStreamDestination();osc.connect(dest);osc.start();window.testAudio=dest.stream;window.testAudioContext=ac;
        }
        return new MediaStream([...(constraints.video?testCamera.getVideoTracks().map(t=>t.clone()):[]),...(constraints.audio?testAudio.getAudioTracks().map(t=>t.clone()):[])]);
      };
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('#splashStart').click();await page.locator('#p1').fill('teste123');await page.locator('#p2').fill('teste123');await page.locator('#create').click();
    await page.locator('#login').fill('teste123');await page.locator('#enter').click();
    await page.locator('#quickName').fill('Teste vídeo final');await page.locator('#quickText').fill('Teste de gravação com movimento. '.repeat(60));await page.locator('#quickCreate').click();
    for(const [name,size] of [['vertical',{width:390,height:844}],['horizontal',{width:844,height:390}]]){
      await page.setViewportSize(size);
      await page.locator('#mode').selectOption('noaudio');await page.locator('#count').selectOption('5');
      await page.locator('#recordOn').check();await page.locator('#recordAudioOn').check();await page.locator('#mobileCameraBg').check();
      await page.locator('#start').click();await page.waitForFunction(()=>mediaRecorder?.state==='recording',null,{timeout:20000});
      assert(await page.evaluate(()=>frameSourceVideo===document.getElementById('mobileCameraBgVideo')),'fonte visível reutilizada');
      if(name==='vertical'){
        await page.locator('#pause').click();await page.waitForFunction(()=>mediaRecorder.state==='paused');await page.locator('#pause').click();await page.waitForFunction(()=>mediaRecorder.state==='recording');
        await page.evaluate(()=>window.oldRecorder=mediaRecorder);await page.locator('#restartTele').click();
        await page.waitForFunction(()=>mediaRecorder&&mediaRecorder!==window.oldRecorder&&mediaRecorder.state==='recording',null,{timeout:20000});
        assert.equal(await page.evaluate(()=>recordChunks.length),0,'recomeço limpa os dados antigos');
      }
      await page.waitForTimeout(2600);await page.locator('#finishTele').click();await page.locator('#recordedReviewVideo').waitFor();
      await page.waitForFunction(()=>document.getElementById('recordedReviewVideo').readyState>=2);
      const info=await page.evaluate(()=>{const v=document.getElementById('recordedReviewVideo');return {width:v.videoWidth,height:v.videoHeight,bytes:recordedBlob.size,mime:recordedBlob.type}});
      assert(info.bytes>0);assert.equal(info.width/info.height,name==='vertical'?1080/1920:1920/1080);
      await page.evaluate(()=>{const b=document.createElement('button');b.id='testPlay';b.textContent='Reproduzir teste';b.onclick=()=>document.getElementById('recordedReviewVideo').play();document.getElementById('recordReview').appendChild(b)});
      await page.locator('#testPlay').click();await page.locator('#testPlay').evaluate(b=>b.remove());await page.waitForTimeout(1600);
      const playback=await page.locator('#recordedReviewVideo').evaluate(v=>({time:v.currentTime,paused:v.paused}));assert(playback.time>1);assert.equal(playback.paused,false,'nenhuma pausa forçada');
      const samples=await page.locator('#recordedReviewVideo').evaluate(async v=>{
        v.pause();const c=document.createElement('canvas');c.width=32;c.height=32;const x=c.getContext('2d');const pixels=[];
        for(const time of [.2,1.1]){await new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time});x.drawImage(v,0,0,32,32);pixels.push(Array.from(x.getImageData(0,0,32,32).data))}
        return pixels[0].reduce((sum,value,i)=>sum+Math.abs(value-pixels[1][i]),0);
      });assert(samples>10000,'arquivo contém quadros diferentes');
      await page.screenshot({path:path.join(out,name+'.png')});
      const downloadPromise=page.waitForEvent('download');await page.locator('#saveRecording').click();const download=await downloadPromise;await download.saveAs(path.join(out,name+path.extname(download.suggestedFilename())));
      results.push({orientation:name,status:'APROVADO',...info,playback,pixelDifference:samples,pauseResumeRestart:name==='vertical'?'APROVADO':'não repetido'});
      await page.locator('#backTele').click();
    }
    assert.deepEqual(errors,[]);results.push({pageErrors:errors,engine:'Edge '+browser.version(),iPhoneReal:'NÃO TESTADO'});
  }catch(e){results.push({status:'FALHOU',error:e.stack});process.exitCode=1}
  finally{fs.writeFileSync(path.join(out,'resultados.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser?.close();server.close()}
})();
