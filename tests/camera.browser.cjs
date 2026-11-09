/* Real browser/MediaRecorder tests with synthetic images, never a physical camera. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'results','camera');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(path.relative(root,file).startsWith('..')){response.writeHead(403);response.end();return}
  fs.readFile(file,(error,data)=>{response.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});response.end(error?'not found':data)});
});
const results=[];
async function check(name,fn){try{await fn();results.push({name,status:'APROVADO'});console.log('APROVADO: '+name)}catch(error){results.push({name,status:'FALHOU',error:error.stack});console.error('FALHOU: '+name+'\n'+error.stack);throw error}}
function edgeColors(samples){
  const [top,right,bottom,left]=samples;
  assert.ok(top[0]>180&&top[1]<70&&top[2]<70,'borda superior vermelha visível');
  assert.ok(right[0]>160&&right[1]>160&&right[2]<90,'borda direita amarela visível');
  assert.ok(bottom[2]>160&&bottom[0]<90,'borda inferior azul visível');
  assert.ok(left[1]>100&&left[0]<90&&left[2]<90,'borda esquerda verde visível');
}
async function canvasSamples(page){return page.evaluate(()=>{
  const canvas=cameraController.canvas,ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  return [[w/2,4],[w-5,h/2],[w/2,h-5],[4,h/2]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data]);
})}
(async()=>{
  let browser;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({channel:process.env.OXPROMPTER_BROWSER_CHANNEL||'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded',timeout:60000});
    await page.evaluate(()=>{
      window.originalGetUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      window.fixtureCanvas=document.createElement('canvas');fixtureCanvas.style.cssText='position:fixed;left:-2px;top:-2px;width:1px;height:1px';document.documentElement.appendChild(fixtureCanvas);
      window.fixtureWidth=720;window.fixtureHeight=1280;window.cameraOpenCount=0;window.fixtureStreams=[];
      const draw=()=>{
        if(fixtureCanvas.width!==fixtureWidth||fixtureCanvas.height!==fixtureHeight){fixtureCanvas.width=fixtureWidth;fixtureCanvas.height=fixtureHeight}
        const c=fixtureCanvas.getContext('2d'),w=fixtureCanvas.width,h=fixtureCanvas.height;
        c.fillStyle='#bbb';c.fillRect(0,0,w,h);
        c.fillStyle='#f00';c.fillRect(0,0,w,20);c.fillStyle='#00f';c.fillRect(0,h-20,w,20);
        c.fillStyle='#00c000';c.fillRect(0,20,20,h-40);c.fillStyle='#ff0';c.fillRect(w-20,20,20,h-40);
        c.fillStyle='#111';c.font='32px sans-serif';c.fillText('SEM RECORTE '+Date.now(),30,h/2);
      };draw();window.fixtureTimer=setInterval(draw,30);
      navigator.mediaDevices.getUserMedia=async constraints=>{
        if(!constraints.video)return originalGetUserMedia(constraints);
        cameraOpenCount++;draw();const stream=fixtureCanvas.captureStream(30);fixtureStreams.push(stream);return stream;
      };
      db.passwordHash='test';
    });
    for(const [orientation,width,height] of [['portrait',720,1280],['landscape',1280,720]]){
      await check(orientation+': prévia → leitura sem reabrir câmera nem perder bordas',async()=>{
        await page.setViewportSize(orientation==='portrait'?{width:390,height:844}:{width:844,height:390});
        await page.evaluate(({orientation,width,height})=>{
          discardCurrentRecording();fixtureWidth=width;fixtureHeight=height;cameraOpenCount=0;
          current={id:'camera-test',name:'Teste '+orientation,text:('Texto de leitura.\n\n').repeat(20),settings:{mode:'noaudio',recordOn:true,recordAudioOn:false,mobileCameraBg:true,mobileRecordOrientation:orientation,recordResolution:'720',recordFps:'30',count:5,font:54}};
          db.scripts=[current];prepare();
        },{orientation,width,height});
        await page.locator('#testCamera').click();await page.waitForFunction(()=>cameraController.state==='ready'&&cameraController.info.renderedFrames>2);
        edgeColors(await canvasSamples(page));
        assert.deepEqual(await page.evaluate(()=>[cameraController.canvas.width,cameraController.canvas.height]),[width,height]);
        await page.screenshot({path:path.join(out,orientation+'-preview.png'),fullPage:true});
        await page.locator('#start').click();await page.waitForFunction(()=>started&&mediaRecorder?.state==='recording',{},{timeout:20000});
        assert.equal(await page.evaluate(()=>cameraOpenCount),1);
        assert.equal(await page.evaluate(()=>cameraController.video.isConnected),true);
        assert.equal(await page.locator('#mobileCameraBgVideo').evaluate(video=>video.srcObject===cameraController.output),true);
        assert.equal(await page.locator('#mobileCameraBgVideo').evaluate(video=>getComputedStyle(video).objectFit),'contain');
        edgeColors(await canvasSamples(page));
        await page.screenshot({path:path.join(out,orientation+'-reading.png'),fullPage:true});
      });
      await check(orientation+': formato fixo ao redimensionar e arquivo real com quatro bordas',async()=>{
        await page.setViewportSize({width:700,height:500});await page.waitForTimeout(300);
        assert.deepEqual(await page.evaluate(()=>[cameraController.canvas.width,cameraController.canvas.height]),[width,height]);
        assert.equal(await page.evaluate(()=>cameraOpenCount),1);edgeColors(await canvasSamples(page));
        await page.locator('#finishTele').click();await page.waitForFunction(()=>recordedBlob?.size>0&&!!document.querySelector('#recordedReviewVideo'));
        await page.waitForFunction(()=>{const video=document.querySelector('#recordedReviewVideo');return video.readyState>=2&&video.videoWidth>0});
        const decoded=await page.evaluate(async()=>{
          const video=document.querySelector('#recordedReviewVideo');await video.play();
          await new Promise(resolve=>setTimeout(resolve,400));video.pause();
          const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
          const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0);const w=canvas.width,h=canvas.height;
          return {width:w,height:h,bytes:recordedBlob.size,samples:[[w/2,4],[w-5,h/2],[w/2,h-5],[4,h/2]].map(([x,y])=>[...ctx.getImageData(x,y,1,1).data])};
        });
        assert.equal(decoded.width,width);assert.equal(decoded.height,height);assert.ok(decoded.bytes>1000);edgeColors(decoded.samples);
        const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#saveRecording').click()]);
        const file=path.join(out,orientation+'-recording'+path.extname(download.suggestedFilename()));await download.saveAs(file);assert.ok(fs.statSync(file).size>1000);
        assert.equal(await page.evaluate(()=>prepCameraStream),null);assert.equal(await page.evaluate(()=>cameraController.source),null);
      });
    }
    await check('voltar oferece preservar gravação e Cancelar mantém o arquivo',async()=>{
      await page.locator('#closeRecording').click();const before=await page.evaluate(()=>recordedBlob.size);
      await page.locator('#backTele').click();await page.locator('#exitCancel').click();
      assert.equal(await page.evaluate(()=>recordedBlob.size),before);assert.equal(await page.locator('#backTele').count(),1);
      await page.locator('#backTele').click();await page.locator('#exitDiscard').click();await page.locator('#testCamera').waitFor();
    });
    await check('recomeçar reinicia texto, cronômetro e gravador em uma nova tomada',async()=>{
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(()=>{
        fixtureWidth=720;fixtureHeight=1280;cameraOpenCount=0;
        current.settings={...current.settings,mobileRecordOrientation:'portrait',recordResolution:'720',count:5};prepare();
      });
      await page.locator('#start').click();await page.waitForFunction(()=>started&&mediaRecorder?.state==='recording',{},{timeout:20000});
      await page.waitForTimeout(1200);
      await page.evaluate(()=>{window.previousRecorder=mediaRecorder;window.previousChunks=recordChunks;window.previousTracks=recordStream.getTracks()});
      await page.locator('#restartTele').click();await page.locator('#exitCancel').focus();await page.keyboard.press('Space');
      assert.equal(await page.locator('#recordExit').count(),0);assert.equal(await page.evaluate(()=>mediaRecorder===previousRecorder&&mediaRecorder.state==='paused'),true);
      await page.locator('#restartTele').click();await page.locator('#exitDiscard').click();
      await page.waitForFunction(()=>started&&mediaRecorder?.state==='recording'&&mediaRecorder!==window.previousRecorder,{},{timeout:20000});
      assert.equal(await page.evaluate(()=>previousRecorder.state),'inactive');
      assert.equal(await page.evaluate(()=>previousTracks.every(track=>track.readyState==='ended')),true);
      assert.equal(await page.evaluate(()=>recordChunks!==previousChunks&&recordedBlob===null),true);
      assert.ok(await page.evaluate(()=>Date.now()-startTime<3000));
      assert.ok(await page.evaluate(()=>scrollStartY-manualY<100));
      assert.deepEqual(await page.evaluate(()=>[cameraController.canvas.width,cameraController.canvas.height]),[720,1280]);
      edgeColors(await canvasSamples(page));
      await page.waitForTimeout(1100);await page.locator('#finishTele').click();await page.locator('#closeRecording').waitFor();
      await page.locator('#closeRecording').click();await page.locator('#backTele').click();await page.locator('#exitDiscard').click();await page.locator('#start').waitFor();
    });
    await check('câmera negada mantém tentativa de recuperação e nenhuma fonte ativa',async()=>{
      await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('negada','NotAllowedError')}});
      await page.locator('#start').click();await page.locator('#manualStart').waitFor();
      assert.equal(await page.evaluate(()=>started),false);assert.equal(await page.evaluate(()=>cameraController.source),null);assert.equal(await page.evaluate(()=>recordStream),null);
    });
    await check('nenhum erro JavaScript não tratado',async()=>assert.deepEqual(errors,[]));
    await context.close();
  }catch(error){process.exitCode=1;console.error(error.stack)}
  finally{
    if(browser)await browser.close();server.close();
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({browser:'Chromium/Edge desktop',physicalDevices:false,results},null,2));
  }
})();
