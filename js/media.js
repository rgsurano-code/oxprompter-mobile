function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function setupIOSCameraBackground(videoStream){
  const bg = document.getElementById('mobileCameraBgVideo');
  if(!bg || !isIOS()) return null;

  let canvas = document.getElementById('mobileCameraBgCanvas');
  if(!canvas){
    canvas = document.createElement('canvas');
    canvas.id = 'mobileCameraBgCanvas';
    canvas.className = 'mobileCameraBg';
    if(bg.nextSibling) bg.parentNode.insertBefore(canvas, bg.nextSibling);
    else bg.parentNode.appendChild(canvas);
  }

  bg.style.display = 'none';
  canvas.style.display = 'block';

  function resizeCanvas(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  resizeCanvas();

  if(window.__iosCamResize){
    window.removeEventListener('resize', window.__iosCamResize);
    window.removeEventListener('orientationchange', window.__iosCamResize);
  }
  window.__iosCamResize = () => { resizeCanvas(); };
  window.addEventListener('resize', window.__iosCamResize);
  window.addEventListener('orientationchange', window.__iosCamResize);

  const ctx = canvas.getContext('2d');
  
  const src = document.createElement('video');
  src.autoplay = true;
  src.muted = true;
  src.playsInline = true;
  src.setAttribute('playsinline', '');
  src.setAttribute('x5-playsinline', '');
  src.srcObject = videoStream;
  
  const playPromise = src.play();
  if(playPromise){
    playPromise.catch(e => {
      console.warn('iOS camera: vídeo não conseguiu tocar automaticamente', e);
      setTimeout(() => {
        src.play().catch(e2 => console.error('iOS camera: falha ao tocar vídeo', e2));
      }, 100);
    });
  }

  const settings = videoStream.getVideoTracks()[0]?.getSettings?.() || {};
  const nativeW = settings.width || 1920;
  const nativeH = settings.height || 1080;
  const sourcePortrait = nativeH > nativeW;

  window.__iosCam = {canvas, ctx, src, sourcePortrait, active: true};

  const drawFrame = () => {
    const cam = window.__iosCam;
    if(!cam || !cam.active) return;
    
    const {canvas:c, ctx:x, src:v, sourcePortrait:srcPort} = cam;

    x.fillStyle = '#000';
    x.fillRect(0, 0, c.width, c.height);

    if(!v.videoWidth || !v.videoHeight){
      return;
    }

    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const needsRotation = !srcPort;

    if(needsRotation){
      x.save();
      x.translate(c.width / 2, c.height / 2);
      x.rotate(Math.PI / 2);
      const availW = c.height;
      const availH = c.width;
      const scale = Math.max(availW / vw, availH / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      x.drawImage(v, -dw / 2, -dh / 2, dw, dh);
      x.restore();
    } else {
      const scale = Math.max(c.width / vw, c.height / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      x.drawImage(v, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    }
  };

  let animFrameId = null;
  let intervalId = null;
  
  const startAnimation = () => {
    const animate = () => {
      if(!window.__iosCam || !window.__iosCam.active) return;
      drawFrame();
      animFrameId = requestAnimationFrame(animate);
    };
    animFrameId = requestAnimationFrame(animate);
    
    intervalId = setInterval(() => {
      if(!window.__iosCam || !window.__iosCam.active) return;
      drawFrame();
    }, 33);
  };
  
  startAnimation();
  
  window.__iosCam.animFrameId = animFrameId;
  window.__iosCam.intervalId = intervalId;
  
  console.log('iOS camera background configurado:', {
    videoWidth: src.videoWidth,
    videoHeight: src.videoHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    sourcePortrait
  });

  return canvas;
}

function stopIOSCameraBackground(){
  const cam = window.__iosCam;
  if(cam){
    cam.active = false;
    if(cam.animFrameId) cancelAnimationFrame(cam.animFrameId);
    if(cam.intervalId) clearInterval(cam.intervalId);
    try{ 
      cam.src.pause(); 
      cam.src.srcObject = null;
    }catch(e){}
    window.__iosCam = null;
  }
  if(window.__iosCamResize){
    window.removeEventListener('resize', window.__iosCamResize);
    window.removeEventListener('orientationchange', window.__iosCamResize);
    window.__iosCamResize = null;
  }
  const canvas = document.getElementById('mobileCameraBgCanvas');
  if(canvas) canvas.style.display = 'none';
  const bg = document.getElementById('mobileCameraBgVideo');
  if(bg) bg.style.display = '';
}

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
function selectedMicConstraints(){const id=$('#mic')?.value||current.settings?.micDeviceId||'';return id?{deviceId:{exact:id}}:true}
function recordingOrientationConstraints(base){
  const o=current.settings?.mobileRecordOrientation||'portrait';
  const res=String(current.settings?.recordResolution||'auto');
  const fps=String(current.settings?.recordFps||'auto');
  let w=res==='720'?1280:res==='1080'?1920:res==='2160'?3840:1920;
  let h=res==='720'?720:res==='1080'?1080:res==='2160'?2160:1080;
  if(o==='portrait'){const t=w;w=h;h=t}
  const video={...base,width:{ideal:w},height:{ideal:h},aspectRatio:{ideal:o==='landscape'?16/9:9/16},resizeMode:{ideal:'none'}};
  if(fps!=='auto')video.frameRate={ideal:Number(fps),max:Number(fps)};
  return video;
}
async function applyRecordingOrientation(stream){
  const track=stream?.getVideoTracks?.()[0];
  try{await track?.applyConstraints(recordingOrientationConstraints({}));}catch(e){}
  updateCameraCapabilityHint(stream);
}
function selectedCameraConstraints(){
  const id=$('#camera')?.value||current.settings?.cameraDeviceId||'';
  return recordingOrientationConstraints(id?{deviceId:{exact:id}}:{facingMode:{ideal:current.settings?.mobileCameraFacing||'user'}});
}

function updateCameraCapabilityHint(stream){
  const el=$('#cameraCapabilityHint'); if(!el)return;
  const track=stream?.getVideoTracks?.()[0]; const st=track?.getSettings?.()||{}; const caps=track?.getCapabilities?.()||{};
  const parts=[]; if(st.width&&st.height)parts.push(`Atual: ${st.width} × ${st.height}`); if(st.frameRate)parts.push(`${Math.round(st.frameRate)} fps`);
  const r=caps.width, f=caps.frameRate;
  if(r?.max)parts.push(`largura máx. informada: ${r.max}px`); if(f?.max)parts.push(`até ${Math.round(f.max)} fps informado`);
  el.textContent=parts.length?parts.join(' · '):'O navegador não informou todos os recursos. A gravação usará a configuração mais próxima disponível.';
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
      try{await v.play()}catch(e){}
      if(hint)hint.innerHTML='<span class="permission-ok">✓ Câmera autorizada e funcionando.</span>';
      return true;
    }
    if(prepCameraStream){try{prepCameraStream.getTracks().forEach(t=>t.stop())}catch(e){}}
    prepCameraStream=await navigator.mediaDevices.getUserMedia({video:selectedCameraConstraints()});
    v.srcObject=prepCameraStream;
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
      else hint.textContent='⚠️ Não foi possível abrir a câmera. Toque em "Testar câmera" para tentar novamente.';
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
      if(e?.name==='NotAllowedError')hint.textContent='⚠️ O navegador bloqueou a câmera. Permita a câmera nas permissões deste site e toque em "Testar câmera".';
      else hint.textContent='⚠️ Não foi possível acessar a câmera. Toque em "Testar câmera" para tentar novamente.';
    }
  }
}
let cameraStream=null,recordStream=null,mediaRecorder=null,recordChunks=[],recordingActive=false,recordingMime='',recordedBlob=null,recordedUrl=null,recordingHasVideo=false;
let liveMicContext=null,liveMicAnalyser=null,liveMicRaf=null,readingMicStream=null,voiceHoldUntil=0,voiceNoiseFloor=0.004;
function stopLiveMicMeter(){if(liveMicRaf){cancelAnimationFrame(liveMicRaf);liveMicRaf=null}if(liveMicContext){liveMicContext.close().catch(()=>{});liveMicContext=null}liveMicAnalyser=null;voiceHoldUntil=0}
function resumeLiveMicContext(){
  if(liveMicContext && liveMicContext.state==='suspended'){
    try{const p=liveMicContext.resume();if(p&&typeof p.catch==='function')p.catch(()=>{})}catch(e){}
  }
}
function startLiveMicMeter(stream){
  stopLiveMicMeter(); if(!stream?.getAudioTracks?.().length)return;
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx){setStatus('yellow','Medição de áudio indisponível neste navegador');return;}
    liveMicContext=new AudioCtx();
    resumeLiveMicContext();
    liveMicContext.onstatechange=()=>{if(liveMicContext?.state==='suspended')resumeLiveMicContext()};
    const source=liveMicContext.createMediaStreamSource(stream);
    liveMicAnalyser=liveMicContext.createAnalyser(); liveMicAnalyser.fftSize=512; source.connect(liveMicAnalyser);
    const data=new Uint8Array(liveMicAnalyser.fftSize);
    const tick=()=>{
      if(!liveMicAnalyser)return;
      liveMicAnalyser.getByteTimeDomainData(data);
      let sum=0;for(const v of data){const n=(v-128)/128;sum+=n*n}
      const rms=Math.sqrt(sum/data.length); currentMicRms=rms; const pct=Math.min(100,Math.max(2,rms*300));
      const bar=$('#liveMicLevel');if(bar)bar.style.width=pct+'%';
      const db=20*Math.log10(Math.max(rms,.0001));const txt=$('#liveMicDb');if(txt)txt.textContent=Math.max(-60,Math.round(db))+' dB';
      if(started && !paused && (current.settings?.mode||'audio')!=='noaudio'){
        voiceNoiseFloor=voiceNoiseFloor*0.92+Math.min(rms,0.01)*0.08;
        const threshold=Math.max(0.0055,voiceNoiseFloor*2.2);
        const speaking=rms>threshold;
        if(speaking)voiceHoldUntil=performance.now()+850;
        voiceActive=performance.now()<voiceHoldUntil;
        if($('#statusText'))setStatus(voiceActive?'green':'yellow',voiceActive?'🎙️ Lendo — texto rolando':'Pausa — aguardando sua fala');
      }
      liveMicRaf=requestAnimationFrame(tick);
    }; tick();
  }catch(e){}
}
function hasLiveTrack(stream,type){
  return !!stream?.getTracks?.().some(t=>t.kind===type && t.readyState==='live');
}

async function ensureReadingMic(){
  if((current.settings?.mode||'audio')==='noaudio')return null;
  if(!hasLiveTrack(readingMicStream,'audio'))readingMicStream=null;
  if(!hasLiveTrack(prepMicStream,'audio'))prepMicStream=null;
  if(recordStream&&hasLiveTrack(recordStream,'audio')){startLiveMicMeter(recordStream);return recordStream}
  if(readingMicStream&&hasLiveTrack(readingMicStream,'audio')){startLiveMicMeter(readingMicStream);return readingMicStream}
  if(prepMicStream&&hasLiveTrack(prepMicStream,'audio')){startLiveMicMeter(prepMicStream);return prepMicStream}
  try{
    const deviceId=current.settings?.micDeviceId||current.settings?.mic||'';
    readingMicStream=await navigator.mediaDevices.getUserMedia({audio:deviceId?{deviceId:{exact:deviceId}}:true});
    startLiveMicMeter(readingMicStream);
    return readingMicStream;
  }catch(e){
    setStatus('red','Não foi possível acessar o microfone para controlar a rolagem');
    return null;
  }
}

function ensureRecordingPreview(stream){
  return !!stream;
}

function chooseMime(withVideo=true){const types=withVideo?['video/mp4','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=h264,aac','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']:['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'];return types.find(t=>window.MediaRecorder?.isTypeSupported?.(t))||''}
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

    if(videoStream) await applyRecordingOrientation(videoStream);

    let canvasStream = null;
    if(wantVideo && isIOS()){
      const canvas = setupIOSCameraBackground(videoStream);
      if(canvas){
        const fps = Number(current.settings?.recordFps) || 30;
        canvasStream = canvas.captureStream(fps);
      }
    }

    const tracks=[];
    if(canvasStream){
      canvasStream.getVideoTracks().filter(t=>t.readyState==='live').forEach(t=>tracks.push(t.clone()));
    } else if(wantVideo&&videoStream){
      videoStream.getVideoTracks().filter(t=>t.readyState==='live').forEach(t=>tracks.push(t.clone()));
    }
    if(wantAudioRecord&&audioStream){
      audioStream.getAudioTracks().filter(t=>t.readyState==='live').forEach(t=>tracks.push(t.clone()));
    }
    if(!tracks.length){setStatus('red','Nenhuma faixa de gravação disponível');return false}

    recordStream=new MediaStream(tracks);
    cameraStream=recordStream;
    await restoreLiveCameraPreview();
    if(needMic&&audioStream)startLiveMicMeter(audioStream);

    if(wantVideo){
      ensureRecordingPreview(recordStream||videoStream);
      if(current.settings?.mobileCameraBg){
        if(isIOS()){
          // fundo já está no canvas criado acima
        } else {
          const bg=$('#mobileCameraBgVideo');
          if(bg){bg.srcObject=videoStream;bg.muted=true;bg.autoplay=true;bg.playsInline=true;try{await bg.play()}catch(e){}}
        }
      }
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
      stopIOSCameraBackground();
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
    rec.onerror=()=>{recordingActive=false;document.body.classList.remove('recording')};
    return true;
  }catch(e){
    stopCameraStreams();alert(e.name==='NotAllowedError'?'O navegador bloqueou o acesso à câmera/microfone. Autorize o site e tente novamente.':'Não foi possível iniciar a gravação: '+e.message);
    return false;
  }
}

function stopRecordingUiOnly(){stopLiveMicMeter();try{recordStream?.getTracks?.().forEach(t=>t.stop())}catch(e){}recordStream=null;cameraStream=null;$('#recordPreview')?.remove()}
function stopCameraStreams(clearRecording=false){
  stopIOSCameraBackground();
  stopLiveMicMeter();
  if(recordStream){recordStream.getTracks().forEach(t=>t.stop());recordStream=null}
  cameraStream=null;
  $('#recordPreview')?.remove();
  if(clearRecording){
    recordedBlob=null;
    if(recordedUrl){URL.revokeObjectURL(recordedUrl);recordedUrl=null}
    recordChunks=[]
  }
}
function saveRecordingFile(){if(!recordedBlob)return false;const ext=recordingExt(recordedBlob.type||recordingMime);const a=document.createElement('a');a.href=recordedUrl;a.download=(current?.name||'teleprompter')+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+ext;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove()},500);return true}
function showRecordingPreview(){
  if(!recordedBlob||!recordedUrl)return;

  const mediaTag=recordingHasVideo
    ? `<div class="review-preview-card"><div class="review-preview-title"><span>GRAVAÇÃO</span></div><video id="recordedReviewVideo" controls playsinline preload="metadata"></video></div>`
    : '<audio id="recordedReviewAudio" controls preload="metadata"></audio>';

  const modal=document.createElement('div');
  modal.id='recordReview';
  modal.className='record-review';
  modal.innerHTML=`
    <div class="record-review-card">
      <div class="record-review-head">
        <div class="record-review-title">🎬 GRAVAÇÃO FINALIZADA</div>
        <div class="record-review-sub">Confira o áudio e o vídeo antes de salvar.</div>
      </div>
      <div class="record-review-media">${mediaTag}</div>
      <div class="record-review-actions">
        <button id="deleteRecording" class="dangerBtn">EXCLUIR</button>
        <button id="saveRecording" class="primaryBtn">SALVAR PRODUÇÃO</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const v=$('#recordedReviewVideo')||$('#recordedReviewAudio');
  if(v){
    v.src=recordedUrl;
    v.playsInline=true; v.preload='metadata';
    v.onerror=()=>{const sub=$('.record-review-sub');if(sub)sub.textContent='O Safari não conseguiu reproduzir a prévia. Tente SALVAR PRODUÇÃO e abrir o arquivo em Fotos/Arquivos.'};
    v.load();
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
  stopIOSCameraBackground();
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
