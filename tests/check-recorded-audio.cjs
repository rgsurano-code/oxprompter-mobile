const {chromium}=require('playwright');
const fs=require('fs'),p=require('path'),assert=require('assert/strict'),crypto=require('crypto');
(async()=>{let browser;const result={};try{
 const file=p.join(__dirname,'results-ios-voice/voz.mp4');const bytes=fs.readFileSync(file);
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
 await page.setContent('<video controls playsinline></video><button id="play">Reproduzir</button>');
 await page.evaluate(encoded=>{
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const v=document.querySelector('video');v.src=URL.createObjectURL(new Blob([bytes],{type:'video/mp4'}));window.audioMaxRms=0;
  document.querySelector('#play').onclick=()=>{
   const ac=new AudioContext(),source=ac.createMediaElementSource(v),analyser=ac.createAnalyser(),sink=ac.createGain();sink.gain.value=0;source.connect(analyser);analyser.connect(sink);sink.connect(ac.destination);ac.resume();v.play().catch(e=>window.playError=e.message);
   const data=new Float32Array(analyser.fftSize);const tick=()=>{analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,n)=>sum+n*n,0)/data.length);audioMaxRms=Math.max(audioMaxRms,rms);requestAnimationFrame(tick)};tick();
  };
 },bytes.toString('base64'));
 await page.locator('#play').click();await page.waitForFunction(()=>audioMaxRms>.01,null,{timeout:20000});
 const rms=await page.evaluate(()=>audioMaxRms);assert(rms>.01);
 Object.assign(result,{status:'APROVADO',file:'voz.mp4',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),decodedAudioMaxRms:rms,engine:'Edge '+browser.version(),physicalAudio:'NÃO TESTADO'});
}catch(e){Object.assign(result,{status:'FALHOU',error:e.stack});process.exitCode=1}finally{fs.writeFileSync(p.join(__dirname,'results-ios-voice/audio-gravado.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser?.close()}})();