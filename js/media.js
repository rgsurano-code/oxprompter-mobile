async function ensurePrepMicAccess(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('media-unavailable');
  const id=$('#mic')?.value||current.settings?.micDeviceId||'';
  const track=prepMicStream?.getAudioTracks()[0];
  if(hasLiveTrack(prepMicStream,'audio')&&(!id||track?.getSettings().deviceId===id))return prepMicStream;
  prepMicStream?.getTracks().forEach(t=>t.stop());
  prepMicStream=await navigator.mediaDevices.getUserMedia({audio:id?{deviceId:{exact:id}}:true});
  return prepMicStream;
}
async function ensurePrepCameraAccess(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('media-unavailable');
  if(hasLiveTrack(prepCameraStream,'video'))return prepCameraStream;
  prepCameraStream=await navigator.mediaDevices.getUserMedia({video:selectedCameraConstraints()});
    updateCameraCapabilityHint(prepCameraStream);
  return prepCameraStream;
}

let micStream=null,micAudioContext=null,micAnalyser=null,micRaf=null;
let prepCameraStream=null;
let prepMicStream=null;
let prepCombinedStream=null;
let prepAccessPromise=null;
let frameCanvas=null,frameCtx=null,frameLoop=null,frameSourceVideo=null,frameTargetW=0,frameTargetH=0,frameName='';
function selectedMicConstraints(){const id=$('#mic')?.value||current.settings?.micDeviceId||'';return id?{deviceId:{exact:id}}:true}
// A câmera usa a resolução nativa do aparelho; o enquadramento final é feito no canvas
// da gravação (9:16 em pé / 16:9 deitado), com recorte automático "cover", sem faixas nem bordas.
function selectedCameraConstraints(){
  const id=$('#camera')?.value||current.settings?.cameraDeviceId||'';
  return id?{deviceId:{exact:id}}:{facingMode:{ideal:current.settings?.mobileCameraFacing||'user'}};
}

function updateCameraCapabilityHint(stream){
  const el=$('#cameraCapabilityHint'); if(!el)return;
  const track=stream?.getVideoTracks?.()[0]; const st=track?.getSettings?.()||{}; const caps=track?.getCapabilities?.()||{};
  const parts=[]; if(st.width&&st.height)parts.push(`Atual: ${st.width} × ${st.height}`); if(st.frameRate)parts.push(`${Math.round(st.frameRate)} fps`);
  const r=caps.width, f=caps.frameRate;
  if(r?.max)parts.push(`largura máx. informada: ${r.max}px`); if(f?.max)parts.push(`até ${Math.round(f.max)} fps informado`);
  el.textContent=parts.length?parts.join(' · '):'A câmera grava na resolução nativa do aparelho. Gire o celular para alternar entre vertical e horizontal.';
}

// Faz a prévia da preparação mostrar o quadro real e completo (sem corte), na proporção real da câmera.
function fitPreviewToTrack(video,stream){
  if(!video)return;
  const track=stream?.getVideoTracks?.()[0]; const st=track?.getSettings?.()||{};
  if(st.width&&st.height)video.style.aspectRatio=(st.width/st.height).toFixed(4);
  else video.style.aspectRatio='';
  video.style.objectFit='contain';
}

// ===== ENQUADRAMENTO AUTOMÁTICO PARA REDES SOCIAIS =====
function getDeviceOrientation(){
  if(window.matchMedia){
    if(matchMedia('(orientation: landscape)').matches)return 'landscape';
    if(matchMedia('(orientation: portrait)').matches)return 'portrait';
  }
  return (window.innerHeight>window.innerWidth)?'portrait':'landscape';
}
function clampFps(n){n=Number(n)||30;return Math.min(60,Math.max(15,Math.round(n)))}
// 9:16 (Stories/Reels/TikTok) com o celular em pé; 16:9 (YouTube/feed) com ele deitado.
function chooseSocialFrame(){
  const pref=current.settings?.recordingFormat;
  const ori=getDeviceOrientation();
  let w=0,h=0,name='';
  if(pref==='square'){w=1080;h=1080;name='1:1 (quadrado)'}
  else if(pref==='landscape'||(pref!=='portrait'&&ori==='landscape')){w=1920;h=1080;name='16:9 (horizontal)'}
  else{w=1080;h=1920;name='9:16 (vertical)'}
  return {w,h,name};
}
function applyCoverCrop(srcW,srcH,dstW,dstH){
  const srcRatio=srcW/srcH,dstRatio=dstW/dstH;
  let sx=0,sy=0,sw=srcW,sh=srcH;
  if(srcRatio>dstRatio){sw=dstRatio*sh;sx=(srcW-sw)/2}
  else{sh=sw/dstRatio;sy=(srcH-sh)/2}
  return {sx,sy,sw,sh};
}
function isIOSDevice(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
// iOS Safari suspende <video> fora do DOM: sem quadros novos, o captureStream
// repete o último frame desenhado (vídeo congelado). Anexar o vídeo-fonte à
// página, invisível e minúsculo, mantém a entrega de quadros da câmera.
function attachSourceVideoToDom(video){
  if(!video||video.isConnected)return;
  video.setAttribute('playsinline','');video.muted=true;video.autoplay=true;video.playsInline=true;
  video.style.cssText='position:fixed;left:-2px;top:-2px;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;';
  video.setAttribute('aria-hidden','true');
  document.body.appendChild(video);
}
function drawFrameCapture(){
  if(!frameSourceVideo||!frameCanvas||!frameCtx){frameLoop=null;return}
  const vw=frameSourceVideo.videoWidth, vh=frameSourceVideo.videoHeight;
  if(vw&&vh){
    const c=applyCoverCrop(vw,vh,frameTargetW,frameTargetH);
    frameCtx.drawImage(frameSourceVideo,c.sx,c.sy,c.sw,c.sh,0,0,frameTargetW,frameTargetH);
  }else{
    frameCtx.fillStyle='#000';frameCtx.fillRect(0,0,frameTargetW,frameTargetH);
  }
}
function startFrameCapture(video){
  stopFrameCapture();
  const frame=chooseSocialFrame();
  frameTargetW=frame.w;frameTargetH=frame.h;frameName=frame.name;
  frameCanvas=document.createElement('canvas');
  frameCanvas.width=frameTargetW;frameCanvas.height=frameTargetH;
  frameCtx=frameCanvas.getContext('2d',{alpha:false});
  frameSourceVideo=video;
  if(isIOSDevice())attachSourceVideoToDom(video);
  // No iOS, requestVideoFrameCallback pode não disparar com o vídeo-fonte
  // oculto/minúsculo, congelando o canvas e o arquivo final com 1 só frame.
  // Por isso usamos rAF no iOS (redesenha sempre) e vfc nas outras plataformas.
  const useVfc=!isIOSDevice()&&'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  if(useVfc){
    frameLoop={type:'vfc',vfcId:0};
    const onFrame=()=>{drawFrameCapture();if(frameSourceVideo)frameLoop.vfcId=frameSourceVideo.requestVideoFrameCallback(onFrame)};
    frameLoop.vfcId=frameSourceVideo.requestVideoFrameCallback(onFrame);
  }else{
    const tick=()=>{drawFrameCapture();frameLoop=requestAnimationFrame(tick)};
    frameLoop=requestAnimationFrame(tick);
  }
  setStatus('green','Enquadramento: '+frameName);
}
function stopFrameCapture(){
  if(frameLoop){
    if(frameLoop?.type==='vfc'){try{frameSourceVideo?.cancelVideoFrameCallback?.(frameLoop.vfcId)}catch(e){}}
    else cancelAnimationFrame(frameLoop);
    frameLoop=null;
  }
  if(frameSourceVideo&&isIOSDevice()&&frameSourceVideo.getAttribute?.('aria-hidden')==='true'&&frameSourceVideo.parentElement===document.body){
    try{frameSourceVideo.pause()}catch(e){}
    try{frameSourceVideo.srcObject=null}catch(e){}
    try{frameSourceVideo.remove()}catch(e){}
  }
  frameSourceVideo=null;
  frameCanvas=null;frameCtx=null;
  frameTargetW=0;frameTargetH=0;frameName='';
}
async function waitForCameraFrame(video,timeout=8000){
  // A faixa pode estar live antes de o Safari entregar a primeira imagem.
  await video.play();
  if(video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0)return;
  await new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',check);video.removeEventListener('canplay',check);video.removeEventListener('error',fail)};
    const check=()=>{if(video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0){cleanup();resolve()}};
    const fail=()=>{cleanup();reject(new Error('A câmera não entregou uma imagem válida. Tente iniciar novamente.'))};
    const timer=setTimeout(fail,timeout);
    video.addEventListener('loadeddata',check);video.addEventListener('canplay',check);video.addEventListener('error',fail);check();
  });
}
async function switchPreviewToFrame(stream){
  const pv=$('#cameraPreview');
  if(!pv)return;
  pv.srcObject=stream;
  const ratio=frameTargetW&&frameTargetH?(frameTargetW/frameTargetH):'';
  if(ratio)pv.style.aspectRatio=ratio.toFixed(4);else pv.style.aspectRatio='';
  pv.style.objectFit='fill';
  try{await pv.play()}catch(e){}
}

async function loadMicrophones(){
  const sel=$('#mic'); if(!sel)return;
  sel.innerHTML='<option value="">Solicitando microfone...</option>';
  try{
    await ensurePrepMicAccess();
    const devices=await navigator.mediaDevices.enumerateDevices();
    const mics=devices.filter(d=>d.kind==='audioinput');
    if(!sel.isConnected){stopPrepMedia();return}sel.innerHTML=mics.length?mics.map((d,i)=>`<option value="${esc(d.deviceId)}">${esc(d.label||('Microfone '+(i+1)))}</option>`).join(''):'<option value="">Nenhum microfone encontrado</option>';
    const wanted=current.settings?.micDeviceId||'';
    if(wanted&&mics.some(d=>d.deviceId===wanted))sel.value=wanted;
    else sel.value='';
    $('#micHint').innerHTML=mics.length?'<span class="permission-ok">✓ Microfone autorizado e mantido ativo.</span>':'Nenhum microfone foi encontrado.';
  }catch(e){
    sel.innerHTML='<option value="">Não foi possível acessar o microfone</option>';
    if($('#micHint'))$('#micHint').textContent='Autorize câmera e microfone quando o Chrome solicitar.';
  }
}
async function previewCamera(){
  const v=$('#cameraPreview'); if(!v||!navigator.mediaDevices?.getUserMedia)return false;
  const hint=$('#cameraHint');
  try{
    const stream=await ensurePrepCameraAccess();
    const id=$('#camera')?.value||current.settings?.cameraDeviceId||'';
    const desiredFacing=current.settings?.mobileCameraFacing||'user';
    const existing=stream?.getVideoTracks?.()[0];
    const settings=existing?.getSettings?.()||{};
    const existingId=settings.deviceId||'';
    const existingFacing=settings.facingMode||'';
    const sameFacing=!existingFacing||existingFacing===desiredFacing;
    if(existing&&sameFacing&&(!id||existingId===id)){
      v.srcObject=stream;
      fitPreviewToTrack(v,stream);
      try{await v.play()}catch(e){}
      if(hint)hint.innerHTML='<span class="permission-ok">✓ Câmera autorizada e funcionando.</span>';
      return true;
    }
    if(prepCameraStream){try{prepCameraStream.getTracks().forEach(t=>t.stop())}catch(e){}}
    prepCameraStream=await navigator.mediaDevices.getUserMedia({video:selectedCameraConstraints()});
    v.srcObject=prepCameraStream;
    fitPreviewToTrack(v,prepCameraStream);
    try{await v.play()}catch(e){}
    if(hint)hint.innerHTML='<span class="permission-ok">✓ Câmera autorizada e funcionando.</span>';
    return true;
  }catch(e){
    if(v)v.srcObject=null;
    const name=e?.name||'';
    if(hint){
      if(name==='NotAllowedError')hint.textContent='⚠️ Câmera bloqueada. Permita a câmera nas permissões do navegador para este site.';
      else if(name==='NotFoundError')hint.textContent='⚠️ Nenhuma câmera foi encontrada neste aparelho.';
      else if(name==='NotReadableError')hint.textContent='⚠️ A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.';
      else hint.textContent='⚠️ Não foi possível abrir a câmera. Toque em “Testar câmera” para tentar novamente.';
    }
    return false;
  }
}

async function loadCameras(){
  const sel=$('#camera');if(!sel)return;
  try{
    await ensurePrepCameraAccess();
    const devices=await navigator.mediaDevices.enumerateDevices();
    const cams=devices.filter(d=>d.kind==='videoinput');
    if(!sel.isConnected){stopPrepMedia();return}sel.innerHTML=cams.length?'<option value="">Automática (frontal/traseira)</option>'+cams.map((d,i)=>`<option value="${esc(d.deviceId)}">${esc(d.label||('Câmera '+(i+1)))}</option>`).join(''):'<option value="">Nenhuma câmera encontrada</option>';
    const wanted=current.settings?.cameraDeviceId||'';
    if(wanted&&cams.some(d=>d.deviceId===wanted))sel.value=wanted;
    else sel.value='';
    await previewCamera();
  }catch(e){
    sel.innerHTML='<option value="">Não foi possível acessar a câmera</option>';
    const hint=$('#cameraHint');
    if(hint){
      if(e?.name==='NotAllowedError')hint.textContent='⚠️ O navegador bloqueou a câmera. Permita a câmera nas permissões deste site e toque em “Testar câmera”.';
      else hint.textContent='⚠️ Não foi possível acessar a câmera. Toque em “Testar câmera” para tentar novamente.';
    }
  }
}
let cameraStream=null,recordStream=null,mediaRecorder=null,recordChunks=[],recordingActive=false,recordingMime='',recordedBlob=null,recordedUrl=null,recordingHasVideo=false;
let liveMicContext=null,liveMicAnalyser=null,liveMicRaf=null,readingMicStream=null,voiceHoldUntil=0,voiceNoiseFloor=0.004;
let liveMicSource=null,liveMicSink=null,liveMicStream=null;
function stopLiveMicMeter(closeContext=true){
  if(liveMicRaf){cancelAnimationFrame(liveMicRaf);liveMicRaf=null}
  for(const node of [liveMicSource,liveMicAnalyser,liveMicSink]){try{node?.disconnect()}catch(e){}}
  liveMicSource=null;liveMicAnalyser=null;liveMicSink=null;liveMicStream=null;currentMicRms=0;voiceHoldUntil=0;
  if(closeContext&&liveMicContext){const ctx=liveMicContext;liveMicContext=null;ctx.onstatechange=null;try{ctx.close().catch(()=>{})}catch(e){}}
}
function resumeLiveMicContext(){
  const ctx=liveMicContext;
  if(ctx&&(ctx.state==='suspended'||ctx.state==='interrupted')){
    try{const pending=ctx.resume();pending?.catch(()=>{if(liveMicContext===ctx)setStatus('yellow','Toque na tela para ativar o microfone')});return pending}catch(e){setStatus('yellow','Toque na tela para ativar o microfone')}
  }
}
function primeLiveMicContext(){
  const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;
  if(!liveMicContext||liveMicContext.state==='closed'){
    const ctx=new AudioCtx();liveMicContext=ctx;
    ctx.onstatechange=()=>{if(liveMicContext===ctx&&ctx.state!=='running'){currentMicRms=0;voiceHoldUntil=0}};
    // Esta função é chamada pelo toque de iniciar, antes de aguardar o comando.
    const unlock=ctx.createBufferSource();unlock.buffer=ctx.createBuffer(1,1,ctx.sampleRate);unlock.connect(ctx.destination);unlock.onended=()=>unlock.disconnect();unlock.start();
  }
  resumeLiveMicContext();return liveMicContext;
}
function readingMicIssue(){
  if(!liveMicAnalyser)return 'Não foi possível analisar o microfone';
  if(liveMicContext?.state!=='running')return 'Toque na tela para ativar o microfone';
  const track=liveMicStream?.getAudioTracks?.()[0];
  if(!track||track.readyState!=='live')return 'O microfone foi desconectado';
  if(track.muted)return 'O navegador interrompeu a entrada do microfone';
  return '';
}
function startLiveMicMeter(stream){
  if(!hasLiveTrack(stream,'audio')){setStatus('red','Microfone sem faixa de áudio ativa');return false}
  if(liveMicStream===stream&&liveMicAnalyser&&liveMicContext?.state!=='closed'){resumeLiveMicContext();return true}
  stopLiveMicMeter(false);
  try{
    const ctx=primeLiveMicContext();if(!ctx){setStatus('red','Análise de áudio indisponível neste navegador');return false}
    liveMicStream=stream;liveMicSource=ctx.createMediaStreamSource(stream);
    const analyser=ctx.createAnalyser();liveMicAnalyser=analyser;analyser.fftSize=512;
    liveMicSource.connect(analyser);
    // Mantém o grafo sendo processado, sem enviar a voz aos alto-falantes.
    liveMicSink=ctx.createGain();liveMicSink.gain.value=0;analyser.connect(liveMicSink);liveMicSink.connect(ctx.destination);
    const data=new Uint8Array(analyser.fftSize);
    const tick=()=>{
      if(liveMicAnalyser!==analyser||liveMicContext!==ctx)return;
      const issue=readingMicIssue();let rms=0;
      if(!issue){analyser.getByteTimeDomainData(data);let sum=0;for(const v of data){const n=(v-128)/128;sum+=n*n}rms=Math.sqrt(sum/data.length)}
      currentMicRms=rms;const pct=Math.min(100,Math.max(0,rms*300));
      const bar=$('#liveMicLevel');if(bar){bar.style.width=pct+'%';bar.parentElement?.setAttribute('aria-valuenow',String(Math.round(pct)))}
      if(started&&!paused&&(current.settings?.mode||'audio')!=='noaudio'){
        if(issue){voiceHoldUntil=0;voiceActive=false;setStatus('yellow',issue)}
        else{voiceNoiseFloor=voiceNoiseFloor*0.92+Math.min(rms,0.01)*0.08;const threshold=Math.max(0.0055,voiceNoiseFloor*2.2);if(rms>threshold)voiceHoldUntil=performance.now()+850;voiceActive=performance.now()<voiceHoldUntil;setStatus(voiceActive?'green':'yellow',voiceActive?'🎙️ Lendo — texto rolando':'Pausa — aguardando sua fala')}
      }
      liveMicRaf=requestAnimationFrame(tick);
    };tick();return true;
  }catch(e){stopLiveMicMeter(false);setStatus('red','Não foi possível ativar a análise do microfone');return false}
}
function hasLiveTrack(stream,type){
  return !!stream?.getTracks?.().some(t=>t.kind===type && t.readyState==='live');
}

async function ensureReadingMic(){
  if((current.settings?.mode||'audio')==='noaudio')return null;
  // A silent video recording still owns live video tracks; retain its stream.
  if(!hasLiveTrack(readingMicStream,'audio'))readingMicStream=null;
  if(!hasLiveTrack(prepMicStream,'audio'))prepMicStream=null;
  if(recordStream&&hasLiveTrack(recordStream,'audio')){return startLiveMicMeter(recordStream)?recordStream:null}
  if(readingMicStream&&hasLiveTrack(readingMicStream,'audio')){return startLiveMicMeter(readingMicStream)?readingMicStream:null}
  if(prepMicStream&&hasLiveTrack(prepMicStream,'audio')){return startLiveMicMeter(prepMicStream)?prepMicStream:null}
  try{
    const deviceId=current.settings?.micDeviceId||current.settings?.mic||'';
    readingMicStream=await navigator.mediaDevices.getUserMedia({audio:deviceId?{deviceId:{exact:deviceId}}:true});
    return startLiveMicMeter(readingMicStream)?readingMicStream:null;
  }catch(e){
    setStatus('red','Não foi possível acessar o microfone para controlar a rolagem');
    return null;
  }
}

function ensureRecordingPreview(stream){
  // No MOBILE: a câmera deve ocupar o fundo do teleprompter, sem uma janela de prévia sobre o texto.
  return !!stream;
}

function chooseMime(withVideo=true){const types=withVideo?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']:['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'];return types.find(t=>window.MediaRecorder?.isTypeSupported?.(t))||''}
function recordingExt(mime){if(mime.includes('mp4'))return 'mp4';if(mime.includes('ogg'))return 'ogg';return 'webm'}

async function restoreLiveCameraPreview(){
  try{
    const stream=prepCameraStream;
    const track=stream?.getVideoTracks?.().find(t=>t.readyState==='live');
    if(!track)return false;
    let pv=$('#cameraPreview');
    if(!pv){
      const host=$('.cameraPreviewHost')||$('.cameraPreview')||$('#cameraPreviewWrap');
      if(host){
        pv=document.createElement('video');
        pv.id='cameraPreview';
        pv.autoplay=true;pv.muted=true;pv.playsInline=true;
        host.appendChild(pv);
      }
    }
    if(!pv)return false;
    if(pv.srcObject!==stream)pv.srcObject=stream;
    pv.autoplay=true;pv.muted=true;pv.playsInline=true;
    try{await pv.play()}catch(e){}
    return true;
  }catch(e){return false}
}

async function startCameraAndRecording(){
  const wantVideo=current.settings?.recordOn===true;
  const wantAudioRecord=current.settings?.recordAudioOn===true;
  const needMic=current.settings?.mode!=='noaudio';
  if(!wantVideo&&!wantAudioRecord){if(current.settings?.mobileCameraBg){try{const st=await ensurePrepCameraAccess();const bg=$('#mobileCameraBgVideo');if(bg){bg.srcObject=st;await bg.play()}}catch(e){setStatus('yellow','Câmera indisponível; leitura disponível')}}return true;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){alert('Este navegador não oferece gravação de mídia necessária.');return false}
  try{
    const needAudio=wantAudioRecord||needMic;
    let audioStream=null,videoStream=null;

    if(!hasLiveTrack(prepMicStream,'audio'))prepMicStream=null;
    if(!hasLiveTrack(prepCameraStream,'video'))prepCameraStream=null;

    if(needAudio){
      const id=current.settings?.micDeviceId||$('#mic')?.value||'';
      const existing=prepMicStream?.getAudioTracks?.().find(t=>t.readyState==='live');
      const existingId=existing?.getSettings?.().deviceId||'';
      if(existing&&(!id||existingId===id))audioStream=prepMicStream;
      else{
        audioStream=await navigator.mediaDevices.getUserMedia({audio:id?{deviceId:{exact:id}}:true});
        prepMicStream=audioStream;
      }
    }
    if(wantVideo){
      const id=current.settings?.cameraDeviceId||$('#camera')?.value||'';
      const existing=prepCameraStream?.getVideoTracks?.().find(t=>t.readyState==='live');
      const existingId=existing?.getSettings?.().deviceId||'';
      if(existing&&(!id||existingId===id))videoStream=prepCameraStream;
      else{
        videoStream=await navigator.mediaDevices.getUserMedia({video:selectedCameraConstraints()});
        prepCameraStream=videoStream;
      }
    }

    // ENQUADRAMENTO: a câmera nativa quase sempre entrega o quadro em paisagem.
    // Para postar SEM faixas nem bordas, o vídeo passa por um canvas na proporção
    // da rede social (9:16 em pé / 16:9 deitado), com recorte automático "cover".
    let canvasStream=null;
    if(wantVideo&&videoStream){
      // Reutiliza a câmera visível sem mudar seu estilo ou enquadramento.
      // Evita uma segunda reprodução oculta como fonte principal no iPhone.
      const hidden=(current.settings?.mobileCameraBg&&$('#mobileCameraBgVideo'))||document.createElement('video');
      hidden.muted=true;hidden.playsInline=true;hidden.autoplay=true;
      hidden.setAttribute('playsinline','');
      hidden.srcObject=videoStream;
      startFrameCapture(hidden);
      await waitForCameraFrame(hidden);
      drawFrameCapture();
      const fps=clampFps(Number(current.settings?.recordFps)||30);
      try{canvasStream=frameCanvas.captureStream(fps)}catch(e){try{canvasStream=frameCanvas.captureStream()}catch(e2){canvasStream=null}}
      if(!canvasStream||!canvasStream.getVideoTracks().length){
        stopFrameCapture();
        setStatus('red','Este navegador não conseguiu enquadrar a gravação. Atualize o navegador ou use o Chrome.');
        return false;
      }
    }

    const tracks=[];
    if(wantVideo&&canvasStream)canvasStream.getVideoTracks().forEach(t=>tracks.push(t));
    if(wantAudioRecord&&audioStream)audioStream.getAudioTracks().filter(t=>t.readyState==='live').forEach(t=>tracks.push(t.clone()));
    if(!tracks.length){stopFrameCapture();setStatus('red','Nenhuma faixa de gravação disponível');return false}

    recordStream=new MediaStream(tracks);
    cameraStream=recordStream;

    if(wantVideo&&canvasStream){
      await switchPreviewToFrame(canvasStream);
    }else{
      await restoreLiveCameraPreview();
    }
    if(needMic&&audioStream)startLiveMicMeter(audioStream);

    if(wantVideo){
      // Usa o mesmo stream enquadrado que será gravado. Não abre a câmera novamente.
      ensureRecordingPreview(recordStream||videoStream);
      if(current.settings?.mobileCameraBg){const bg=$('#mobileCameraBgVideo');if(bg){bg.srcObject=videoStream;bg.muted=true;bg.autoplay=true;bg.playsInline=true;try{await bg.play()}catch(e){}}}
    }

    if(!wantVideo&&current.settings.mobileCameraBg){try{const st=await ensurePrepCameraAccess();const bg=$('#mobileCameraBgVideo');if(bg){bg.srcObject=st;await bg.play()}}catch(e){setStatus('yellow','Câmera de fundo indisponível')}}
    const mime=chooseMime(wantVideo);
    mediaRecorder=mime?new MediaRecorder(recordStream,{mimeType:mime}):new MediaRecorder(recordStream);
    recordingHasVideo=wantVideo;
    recordingMime=mime||mediaRecorder.mimeType||(wantVideo?'video/webm':'audio/webm');
    recordChunks=[];recordingActive=false;reviewAfterStop=false;
    if(recordedUrl){URL.revokeObjectURL(recordedUrl);recordedUrl=null}recordedBlob=null;

    const rec=mediaRecorder, chunks=recordChunks, mimeType=recordingMime;
    rec.ondataavailable=e=>{if(e.data&&e.data.size>0)chunks.push(e.data)};
    rec.onstart=()=>{if(mediaRecorder!==rec)return;recordingActive=true;document.body.classList.add('recording');if($('#recLabel'))$('#recLabel').textContent='GRAVANDO'};
    rec.onstop=()=>{
      // Uma sessão encerrada não pode apagar os recursos de outra gravação.
      if(mediaRecorder!==rec)return;
      // Usa sempre o recorder desta sessão, mesmo que outra ação já tenha
      // alterado a variável global mediaRecorder.
      if(chunks.length){
        const actualMime=rec.mimeType||mimeType||(recordingHasVideo?'video/mp4':'audio/mp4');
        const blob=new Blob(chunks,{type:actualMime});
        if(blob.size){
          if(recordedUrl)URL.revokeObjectURL(recordedUrl);
          recordedBlob=blob;
          recordedUrl=URL.createObjectURL(blob);
          recordingMime=actualMime;
        }
      }

      stopFrameCapture();

      if(mediaRecorder===rec)mediaRecorder=null;
      recordingActive=false;
      document.body.classList.remove('recording');

      try{rec.stream?.getTracks?.().forEach(t=>t.stop())}catch(e){}
      try{recordStream?.getTracks?.().forEach(t=>t.stop())}catch(e){}
      recordStream=null;
      cameraStream=null;
      $('#recordPreview')?.remove();
      stopLiveMicMeter();stopPrepMedia();readingMicStream?.getTracks().forEach(t=>t.stop());readingMicStream=null;

      if(reviewAfterStop){
        reviewAfterStop=false;
        if(recordedBlob?.size){
          setStatus('green','Gravação finalizada — confira a prévia');
          setTimeout(()=>showRecordingPreview(),120);
        }else{
          setStatus('red','A gravação não gerou um arquivo. Tente novamente.');
          alert('A gravação terminou, mas não gerou arquivo.');
        }
      }
    };
    rec.onerror=()=>{if(mediaRecorder!==rec)return;recordingActive=false;document.body.classList.remove('recording');setStatus('red','A gravação foi interrompida pelo navegador. Confira o arquivo antes de salvar.')};
    return true;
  }catch(e){
    stopFrameCapture();
    stopCameraStreams();alert(e.name==='NotAllowedError'?'O navegador bloqueou o acesso à câmera/microfone. Autorize o site e tente novamente.':'Não foi possível iniciar a gravação: '+e.message);
    return false;
  }
}

function stopRecordingUiOnly(){stopLiveMicMeter();stopFrameCapture();try{recordStream?.getTracks?.().forEach(t=>t.stop())}catch(e){}recordStream=null;cameraStream=null;$('#recordPreview')?.remove()}
function stopCameraStreams(clearRecording=false){stopLiveMicMeter();stopFrameCapture();if(recordStream){recordStream.getTracks().forEach(t=>t.stop());recordStream=null}cameraStream=null;$('#recordPreview')?.remove();if(clearRecording){recordedBlob=null;if(recordedUrl){URL.revokeObjectURL(recordedUrl);recordedUrl=null}recordChunks=[]}}
function saveRecordingFile(){if(!recordedBlob)return false;const ext=recordingExt(recordedBlob.type||recordingMime);const a=document.createElement('a');a.href=recordedUrl;a.download=(current?.name||'teleprompter')+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+ext;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove()},500);return true}
function showRecordingPreview(){
  if(!recordedBlob||!recordedUrl)return;

  const mime=(recordedBlob.type||recordingMime||'').toLowerCase();
  const isWebm=mime.includes('webm');
  const isOgg=mime.includes('ogg');

  const mediaTag=recordingHasVideo
    ? `<div class="review-preview-card"><div class="review-preview-title"><span>GRAVAÇÃO</span></div><video id="recordedReviewVideo" controls playsinline webkit-playsinline preload="metadata"></video></div>`
    : '<audio id="recordedReviewAudio" controls preload="metadata"></audio>';

  const modal=document.createElement('div');
  modal.id='recordReview';
  modal.className='record-review';
  modal.innerHTML=`
    <style>
    #recordReview .record-review-actions .dangerBtn{background:#5f0f0f !important;color:#ffe3e3 !important;border:1px solid #ff6b6b !important;font-weight:800 !important;box-shadow:0 0 12px rgba(255,70,70,.25) !important;}
    #recordReview .record-review-actions .dangerBtn:hover,#recordReview .record-review-actions .dangerBtn:focus{background:#8f1515 !important;color:#fff !important;}
    #recordReview .record-review-actions .primaryBtn{background:#0a4aa8 !important;color:#dbeaff !important;border:1px solid #69a9ff !important;font-weight:800 !important;box-shadow:0 0 12px rgba(70,140,255,.25) !important;}
    #recordReview .record-review-actions .primaryBtn:hover,#recordReview .record-review-actions .primaryBtn:focus{background:#0e5cc8 !important;color:#fff !important;}
    </style>
    <div class="record-review-card">
      <div class="record-review-head">
        <div class="record-review-title">🎬 GRAVAÇÃO FINALIZADA</div>
        <div class="record-review-sub">Toque em reproduzir para conferir o áudio e o vídeo antes de salvar.</div>
      </div>
      <div class="record-review-media">${mediaTag}</div>
      <div class="record-review-actions">
        <button id="deleteRecording" class="dangerBtn">EXCLUIR</button>
        <button id="saveRecording" class="primaryBtn">SALVAR PRODUÇÃO</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const v=$('#recordedReviewVideo')||$('#recordedReviewAudio');
  const sub=$('.record-review-sub');
  if(v){
    v.src=recordedUrl;
    v.setAttribute('playsinline','');
    v.setAttribute('webkit-playsinline','');
    v.preload='auto';

    if(isIOSDevice()&&isWebm&&sub){
      sub.textContent='O iOS não reproduz WebM na prévia. Clique em SALVAR PRODUÇÃO para baixar e abrir em outro app.';
    }
    if(isIOSDevice()&&isOgg&&sub){
      sub.textContent='O iOS não reproduz OGG na prévia. Clique em SALVAR PRODUÇÃO para baixar e abrir em outro app.';
    }

    // Reprodução com som iniciada pelo controle nativo: sem temporizadores
    // que pausam o vídeo ou o devolvem ao primeiro quadro após o toque.
    v.controls=true;v.autoplay=false;v.muted=false;
    v.onerror=()=>{if(sub)sub.textContent='Não foi possível reproduzir a prévia. Use SALVAR PRODUÇÃO para baixar o arquivo.'};
    try{v.load()}catch(e){}
  }

  $('#deleteRecording').onclick=()=>{
    if(recordedUrl){try{URL.revokeObjectURL(recordedUrl)}catch(e){}}
    recordedUrl=null;
    recordedBlob=null;
    recordChunks=[];
    modal.remove();
    setStatus('yellow','Gravação excluída');
  };

  $('#saveRecording').onclick=()=>{
    if(!saveRecordingFile()){
      alert('Não foi possível salvar a gravação.');
      return;
    }
    modal.remove();
    setStatus('green','Download solicitado — confira seus arquivos');
  };
}

function fmtTime(sec){sec=Math.max(0,Number(sec)||0);const m=Math.floor(sec/60),s=Math.floor(sec%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function stopRecordingForReview(){if(mediaRecorder&&mediaRecorder.state!=='inactive'){started=false;paused=true;if(manualRaf)cancelAnimationFrame(manualRaf);clearInterval(elapsedTimer);mediaRecorder.stop();return true}return false}
function discardCurrentRecording(){
  reviewAfterStop=false;
  if(mediaRecorder&&mediaRecorder.state!=='inactive'){
    try{mediaRecorder.onstop=null;mediaRecorder.ondataavailable=null;mediaRecorder.onerror=null;mediaRecorder.stop()}catch(e){}
  }
  mediaRecorder=null;
  recordingActive=false;
  stopCameraStreams(true);
  if(recordedUrl)URL.revokeObjectURL(recordedUrl);
  recordedUrl=null;
  recordedBlob=null;
  recordChunks=[];
  $('#recordReview')?.remove();
}
async function testMic(){
  try{
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('media-unavailable');
    const deviceId=$('#mic')?.value||current.settings?.micDeviceId||'';
    const existing=prepMicStream?.getAudioTracks?.()[0];
    const existingId=existing?.getSettings?.().deviceId||'';
    if(!existing || (deviceId&&existingId!==deviceId)){
      if(prepMicStream)prepMicStream.getTracks().forEach(t=>t.stop());
      prepMicStream=await navigator.mediaDevices.getUserMedia({audio:deviceId?{deviceId:{exact:deviceId}}:true});
    }
    micStream=prepMicStream;
    const modal=document.createElement('div');modal.className='mic-modal';modal.innerHTML='<div class="mic-box"><h3>Teste do microfone</h3><div class="mic-meter"><div id="micLevel" class="mic-level"></div></div><div id="micTestStatus" class="mic-status">Fale normalmente. A barra deve se movimentar.</div><div class="mic-actions"><button id="micClose">Fechar teste</button></div></div>';document.body.appendChild(modal);
    $('#micClose').onclick=closeMicTest;
    micAudioContext=new (window.AudioContext||window.webkitAudioContext)();
    const source=micAudioContext.createMediaStreamSource(micStream);micAnalyser=micAudioContext.createAnalyser();micAnalyser.fftSize=512;source.connect(micAnalyser);
    const data=new Uint8Array(micAnalyser.fftSize);
    const meter=()=>{if(!micAnalyser)return;micAnalyser.getByteTimeDomainData(data);let sum=0;for(const v of data){const n=(v-128)/128;sum+=n*n}const rms=Math.sqrt(sum/data.length);const pct=Math.min(100,Math.max(2,rms*260));const bar=$('#micLevel');if(bar)bar.style.width=pct+'%';micRaf=requestAnimationFrame(meter)};meter();
  }catch(e){stopCameraStreams();alert(e.name==='NotAllowedError'?'O navegador bloqueou o acesso ao microfone. Verifique a permissão do site.':'Não foi possível abrir o microfone para teste.');}
}

function closeMicTest(){if(micRaf){cancelAnimationFrame(micRaf);micRaf=null}micStream=null;if(micAudioContext){micAudioContext.close().catch(()=>{});micAudioContext=null}micAnalyser=null;$('.mic-modal')?.remove()}
