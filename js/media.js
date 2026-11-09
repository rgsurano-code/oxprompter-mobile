// Variáveis globais
let micStream=null,micAudioContext=null,micAnalyser=null,micRaf=null;
let prepCameraStream=null;
let prepMicStream=null;
let prepCombinedStream=null;
let prepAccessPromise=null;
let verticalCanvasStream=null;
let verticalCanvasElement=null;
let verticalCanvasAnimId=null;

function selectedMicConstraints(){
  const id=$('#mic')?.value||current.settings?.micDeviceId||'';
  return id?{deviceId:{exact:id}}:true;
}

function isIOSWebKit(){
  try{
    const ua=navigator.userAgent||'';
    return /iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  }catch(e){return false}
}

function recordingOrientationConstraints(base,reverseOrientation=false){
  try{
    const requested=current.settings?.mobileRecordOrientation||'portrait';
    const o=reverseOrientation?(requested==='portrait'?'landscape':'portrait'):requested;
    const res=String(current.settings?.recordResolution||'auto');
    const fps=String(current.settings?.recordFps||'auto');
    let w=res==='720'?1280:res==='1080'?1920:res==='2160'?3840:1920;
    let h=res==='720'?720:res==='1080'?1080:res==='2160'?2160:1080;
    if(o==='portrait'){const t=w;w=h;h=t}
    const ratio=o==='landscape'?16/9:9/16;
    const video={...base,width:{ideal:w},height:{ideal:h},aspectRatio:{ideal:ratio}};
    if(fps!=='auto')video.frameRate={ideal:Number(fps),max:Number(fps)};
    return video;
  }catch(e){
    console.error('recordingOrientationConstraints error:',e);
    return base||{};
  }
}

function selectedCameraConstraints(reverseOrientation=false){
  const id=$('#camera')?.value||current.settings?.cameraDeviceId||'';
  return recordingOrientationConstraints(id?{deviceId:{exact:id}}:{facingMode:{ideal:current.settings?.mobileCameraFacing||'user'}},reverseOrientation);
}

async function waitForFirstCameraFrame(stream){
  try{
    const track=stream?.getVideoTracks?.()[0];
    if(!track)return null;
    const video=document.createElement('video');
    video.muted=true;
    video.playsInline=true;
    video.autoplay=true;
    video.width=1;
    video.height=1;
    video.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(video);
    video.srcObject=stream;
    
    let timer=null,finish;
    const firstFrame=new Promise(resolve=>{
      let done=false;
      finish=()=>{
        if(done)return;
        done=true;
        if(timer)clearTimeout(timer);
        resolve();
      };
      timer=setTimeout(finish,1500);
      if(video.readyState>=2&&video.videoWidth)finish();
      else if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(()=>finish());
      else video.addEventListener('loadeddata',finish,{once:true});
    });
    
    try{const play=video.play();if(play?.catch)play.catch(()=>{})}catch(e){}
    await firstFrame;
    
    const settings=track.getSettings?.()||{};
    const result={width:video.videoWidth||settings.width||0,height:video.videoHeight||settings.height||0};
    
    try{video.pause();video.srcObject=null;video.remove()}catch(e){}
    return result;
  }catch(e){
    console.error('waitForFirstCameraFrame error:',e);
    return null;
  }
}

async function requestSelectedCameraStream(){
  try{
    const requested=current.settings?.mobileRecordOrientation||'portrait';
    let stream=await navigator.mediaDevices.getUserMedia({video:selectedCameraConstraints(false)});
    if(!isIOSWebKit())return stream;
    
    const firstSize=await waitForFirstCameraFrame(stream);
    const firstOrientation=firstSize?.width&&firstSize?.height?(firstSize.height>firstSize.width?'portrait':'landscape'):'';
    
    if(!firstOrientation||firstOrientation===requested)return stream;
    
    try{stream.getTracks().forEach(t=>t.stop())}catch(e){}
    
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:selectedCameraConstraints(true)});
      await waitForFirstCameraFrame(stream);
      return stream;
    }catch(e){
      stream=await navigator.mediaDevices.getUserMedia({video:selectedCameraConstraints(false)});
      await waitForFirstCameraFrame(stream);
      return stream;
    }
  }catch(e){
    console.error('requestSelectedCameraStream error:',e);
    throw e;
  }
}

// CORREÇÃO: Função universal para canvas (vertical ou horizontal)
async function getOrientationFixedCanvasStream(videoTrack, orientation, targetWidth, targetHeight){
  try{
    const canvas=document.createElement('canvas');
    canvas.width=targetWidth;
    canvas.height=targetHeight;
    const ctx=canvas.getContext('2d');

    const video=document.createElement('video');
    video.srcObject=new MediaStream([videoTrack]);
    video.muted=true;
    video.playsInline=true;
    video.autoplay=true;
    await video.play();

    verticalCanvasElement=video;

    const draw=()=>{
      try{
        if(video.readyState<2){
          verticalCanvasAnimId=requestAnimationFrame(draw);
          return;
        }

        const vw=video.videoWidth;
        const vh=video.videoHeight;
        const framePortrait=vh>vw;
        const wantPortrait=orientation==='portrait';

        ctx.fillStyle='#000';
        ctx.fillRect(0,0,canvas.width,canvas.height);

        ctx.save();

        if(framePortrait && !wantPortrait){
          ctx.translate(canvas.width/2,canvas.height/2);
          ctx.rotate(-Math.PI/2);
          const scale=Math.max(canvas.height/vw,canvas.width/vh);
          const drawW=vh*scale;
          const drawH=vw*scale;
          ctx.drawImage(video,-drawW/2,-drawH/2,drawW,drawH);
        }else if(!framePortrait && wantPortrait){
          ctx.translate(canvas.width/2,canvas.height/2);
          ctx.rotate(Math.PI/2);
          const scale=Math.max(canvas.width/vh,canvas.height/vw);
          const drawW=vh*scale;
          const drawH=vw*scale;
          ctx.drawImage(video,-drawW/2,-drawH/2,drawW,drawH);
        }else{
          const scale=Math.max(canvas.width/vw,canvas.height/vh);
          const drawW=vw*scale;
          const drawH=vh*scale;
          ctx.drawImage(video,(canvas.width-drawW)/2,(canvas.height-drawH)/2,drawW,drawH);
        }

        ctx.restore();
        verticalCanvasAnimId=requestAnimationFrame(draw);
      }catch(e){
        console.error('draw error:',e);
      }
    };
    
    draw();

    const fps=Number(current.settings?.recordFps)||30;
    return canvas.captureStream(fps);
  }catch(e){
    console.error('getOrientationFixedCanvasStream error:',e);
    throw e;
  }
}

function stopOrientationCanvasStream(){
  try{
    if(verticalCanvasAnimId){
      cancelAnimationFrame(verticalCanvasAnimId);
      verticalCanvasAnimId=null;
    }
    if(verticalCanvasElement){
      try{
        verticalCanvasElement.pause();
        verticalCanvasElement.srcObject=null;
      }catch(e){}
      verticalCanvasElement=null;
    }
    if(verticalCanvasStream){
      verticalCanvasStream.getTracks().forEach(t=>t.stop());
      verticalCanvasStream=null;
    }
  }catch(e){
    console.error('stopOrientationCanvasStream error:',e);
  }
}

async function applyRecordingOrientation(stream){
  try{
    const track=stream?.getVideoTracks?.()[0];
    if(track&&isIOSWebKit())await waitForFirstCameraFrame(stream);
    else try{await track?.applyConstraints(recordingOrientationConstraints({},false));}catch(e){}
    updateCameraCapabilityHint(stream);
  }catch(e){
    console.error('applyRecordingOrientation error:',e);
  }
}

function updateCameraCapabilityHint(stream){
  try{
    const el=$('#cameraCapabilityHint');
    if(!el)return;
    const track=stream?.getVideoTracks?.()[0];
    const st=track?.getSettings?.()||{};
    const caps=track?.getCapabilities?.()||{};
    const parts=[];
    
    if(st.width&&st.height)parts.push(`Atual: ${st.width} × ${st.height}`);
    if(st.frameRate)parts.push(`${Math.round(st.frameRate)} fps`);
    
    if(st.width&&st.height){
      const wanted=current.settings?.mobileRecordOrientation||'portrait';
      const actual=st.height>st.width?'portrait':'landscape';
      parts.push(`Orientação ${actual===wanted?'aplicada':'retornada diferente'} (solicitada: ${wanted==='portrait'?'vertical':'horizontal'}; câmera: ${actual==='portrait'?'vertical':'horizontal'})`);
    }
    
    const r=caps.width, f=caps.frameRate;
    if(r?.max)parts.push(`largura máx. informada: ${r.max}px`);
    if(f?.max)parts.push(`até ${Math.round(f.max)} fps informado`);
    
    el.textContent=parts.length?parts.join(' · '):'O navegador não informou todos os recursos. A gravação usará a configuração mais próxima disponível.';
  }catch(e){
    console.error('updateCameraCapabilityHint error:',e);
  }
}

async function loadMicrophones(){
  try{
    const sel=$('#mic');
    if(!sel)return;
    sel.innerHTML='<option value="">Solicitando microfone...</option>';
    
    await ensurePrepMicAccess();
    const devices=await navigator.mediaDevices.enumerateDevices();
    const mics=devices.filter(d=>d.kind==='audioinput');
    
    if(!sel.isConnected){stopPrepMedia();return}
    
    sel.innerHTML=mics.length?mics.map((d,i)=>`<option value="${esc(d.deviceId)}">${esc(d.label||('Microfone '+(i+1)))}</option>`).join(''):'<option value="">Nenhum microfone encontrado</option>';
    
    const wanted=current.settings?.micDeviceId||'';
    if(wanted&&mics.some(d=>d.deviceId===wanted))sel.value=wanted;
    else sel.value='';
    
    $('#micHint').innerHTML=mics.length?'<span class="permission-ok">✓ Microfone autorizado e mantido ativo.</span>':'Nenhum microfone foi encontrado.';
  }catch(e){
    console.error('loadMicrophones error:',e);
    const sel=$('#mic');
    if(sel)sel.innerHTML='<option value="">Não foi possível acessar o microfone</option>';
    if($('#micHint'))$('#micHint').textContent='Autorize câmera e microfone quando o Chrome solicitar.';
  }
}

async function previewCamera(){
  try{
    const v=$('#cameraPreview');
    if(!v||!navigator.mediaDevices?.getUserMedia)return false;
    const hint=$('#cameraHint');
    
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
    prepCameraStream=await requestSelectedCameraStream();
    v.srcObject=prepCameraStream;
    try{await v.play()}catch(e){}
    if(hint)hint.innerHTML='<span class="permission-ok">✓ Câmera autorizada e funcionando.</span>';
    return true;
  }catch(e){
    console.error('previewCamera error:',e);
    const v=$('#cameraPreview');
    if(v)v.srcObject=null;
    const hint=$('#cameraHint');
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
  try{
    const sel=$('#camera');
    if(!sel)return;
    
    await ensurePrepCameraAccess();
    const devices=await navigator.mediaDevices.enumerateDevices();
    const cams=devices.filter(d=>d.kind==='videoinput');
    
    if(!sel.isConnected){stopPrepMedia();return}
    
    sel.innerHTML=cams.length?'<option value="">Automática (frontal/traseira)</option>'+cams.map((d,i)=>`<option value="${esc(d.deviceId)}">${esc(d.label||('Câmera '+(i+1)))}</option>`).join(''):'<option value="">Nenhuma câmera encontrada</option>';
    
    const wanted=current.settings?.cameraDeviceId||'';
    if(wanted&&cams.some(d=>d.deviceId===wanted))sel.value=wanted;
    else sel.value='';
    
    await previewCamera();
  }catch(e){
    console.error('loadCameras error:',e);
    const sel=$('#camera');
    if(sel)sel.innerHTML='<option value="">Não foi possível acessar a câmera</option>';
    const hint=$('#cameraHint');
    if(hint){
      if(e?.name==='NotAllowedError')hint.textContent='⚠️ O navegador bloqueou a câmera. Permita a câmera nas permissões deste site e toque em "Testar câmera".';
      else hint.textContent='⚠️ Não foi possível acessar a câmera. Toque em "Testar câmera" para tentar novamente.';
    }
  }
}

let cameraStream=null,recordStream=null,mediaRecorder=null,recordChunks=[],recordingActive=false,recordingMime='',recordedBlob=null,recordedUrl=null,recordingHasVideo=false;
let liveMicContext=null,liveMicAnalyser=null,liveMicRaf=null,readingMicStream=null,voiceHoldUntil=0,voiceNoiseFloor=0.004;

function stopLiveMicMeter(){
  try{
    if(liveMicRaf){cancelAnimationFrame(liveMicRaf);liveMicRaf=null}
    if(liveMicContext){liveMicContext.close().catch(()=>{});liveMicContext=null}
    liveMicAnalyser=null;
    voiceHoldUntil=0;
  }catch(e){
    console.error('stopLiveMicMeter error:',e);
  }
}

function resumeLiveMicContext(){
  try{
    if(liveMicContext && liveMicContext.state==='suspended'){
      const p=liveMicContext.resume();
      if(p&&typeof p.catch==='function')p.catch(()=>{});
    }
  }catch(e){
    console.error('resumeLiveMicContext error:',e);
  }
}

function startLiveMicMeter(stream){
  try{
    stopLiveMicMeter();
    if(!stream?.getAudioTracks?.().length)return;
    
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx){setStatus('yellow','Medição de áudio indisponível neste navegador');return;}
    
    liveMicContext=new AudioCtx();
    resumeLiveMicContext();
    liveMicContext.onstatechange=()=>{if(liveMicContext?.state==='suspended')resumeLiveMicContext()};
    
    const source=liveMicContext.createMediaStreamSource(stream);
    liveMicAnalyser=liveMicContext.createAnalyser();
    liveMicAnalyser.fftSize=512;
    source.connect(liveMicAnalyser);
    
    const data=new Uint8Array(liveMicAnalyser.fftSize);
    const tick=()=>{
      try{
        if(!liveMicAnalyser)return;
        liveMicAnalyser.getByteTimeDomainData(data);
        let sum=0;
        for(const v of data){const n=(v-128)/128;sum+=n*n}
        const rms=Math.sqrt(sum/data.length);
        currentMicRms=rms;
        const pct=Math.min(100,Math.max(2,rms*300));
        const bar=$('#liveMicLevel');
        if(bar)bar.style.width=pct+'%';
        const db=20*Math.log10(Math.max(rms,.0001));
        const txt=$('#liveMicDb');
        if(txt)txt.textContent=Math.max(-60,Math.round(db))+' dB';
        
        if(started && !paused && (current.settings?.mode||'audio')!=='noaudio'){
          voiceNoiseFloor=voiceNoiseFloor*0.92+Math.min(rms,0.01)*0.08;
          const threshold=Math.max(0.0055,voiceNoiseFloor*2.2);
          const speaking=rms>threshold;
          if(speaking)voiceHoldUntil=performance.now()+850;
          voiceActive=performance.now()<voiceHoldUntil;
          if($('#statusText'))setStatus(voiceActive?'green':'yellow',voiceActive?'🎙️ Lendo — texto rolando':'Pausa — aguardando sua fala');
        }
        
        liveMicRaf=requestAnimationFrame(tick);
      }catch(e){
        console.error('tick error:',e);
      }
    };
    tick();
  }catch(e){
    console.error('startLiveMicMeter error:',e);
  }
}

function hasLiveTrack(stream,type){
  return !!stream?.getTracks?.().some(t=>t.kind===type && t.readyState==='live');
}

async function ensureReadingMic(){
  try{
    if((current.settings?.mode||'audio')==='noaudio')return null;
    if(!hasLiveTrack(readingMicStream,'audio'))readingMicStream=null;
    if(!hasLiveTrack(prepMicStream,'audio'))prepMicStream=null;
    if(recordStream&&hasLiveTrack(recordStream,'audio')){startLiveMicMeter(recordStream);return recordStream}
    if(readingMicStream&&hasLiveTrack(readingMicStream,'audio')){startLiveMicMeter(readingMicStream);return readingMicStream}
    if(prepMicStream&&hasLiveTrack(prepMicStream,'audio')){startLiveMicMeter(prepMicStream);return prepMicStream}
    
    const deviceId=current.settings?.micDeviceId||current.settings?.mic||'';
    readingMicStream=await navigator.mediaDevices.getUserMedia({audio:deviceId?{deviceId:{exact:deviceId}}:true});
    startLiveMicMeter(readingMicStream);
    return readingMicStream;
  }catch(e){
    console.error('ensureReadingMic error:',e);
    setStatus('red','Não foi possível acessar o microfone para controlar a rolagem');
    return null;
  }
}

function ensureRecordingPreview(stream){
  return !!stream;
}

function chooseMime(withVideo=true){
  try{
    const types=withVideo?['video/mp4','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=h264,aac','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']:['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'];
    return types.find(t=>window.MediaRecorder?.isTypeSupported?.(t))||'';
  }catch(e){
    return '';
  }
}

function recordingExt(mime){
  if(mime.includes('mp4'))return 'mp4';
  if(mime.includes('ogg'))return 'ogg';
  return 'webm';
}

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
        pv.autoplay=true;
        pv.muted=true;
        pv.playsInline=true;
        host.appendChild(pv);
      }
    }
    if(!pv)return false;
    
    if(pv.srcObject!==stream)pv.srcObject=stream;
    pv.autoplay=true;
    pv.muted=true;
    pv.playsInline=true;
    try{await pv.play()}catch(e){}
    return true;
  }catch(e){
    console.error('restoreLiveCameraPreview error:',e);
    return false;
  }
}

async function startCameraAndRecording(){
  try{
    const wantVideo=current.settings?.recordOn===true;
    const wantAudioRecord=current.settings?.recordAudioOn===true;
    const needMic=current.settings?.mode!=='noaudio';
    
    if(!wantVideo&&!wantAudioRecord){
      if(current.settings?.mobileCameraBg){
        try{
          const st=await ensurePrepCameraAccess();
          const bg=$('#mobileCameraBgVideo');
          if(bg){bg.srcObject=st;await bg.play()}
        }catch(e){setStatus('yellow','Câmera indisponível; leitura disponível')}
      }
      return true;
    }
    
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
      alert('Este navegador não oferece gravação de mídia necessária.');
      return false;
    }
    
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
        videoStream=await requestSelectedCameraStream();
        prepCameraStream=videoStream;
      }
    }

    if(videoStream) await applyRecordingOrientation(videoStream);

    const tracks=[];
    const orientation=current.settings?.mobileRecordOrientation||'portrait';
    
    // CORREÇÃO iOS: Canvas que ajusta a orientação para preview e gravação
    if(wantVideo && videoStream && isIOSWebKit()){
      const videoTrack=videoStream.getVideoTracks().find(t=>t.readyState==='live');
      if(videoTrack){
        stopOrientationCanvasStream();
        const res=String(current.settings?.recordResolution||'auto');
        const sizes={
          '720': {portrait:{w:720,h:1280}, landscape:{w:1280,h:720}},
          '1080':{portrait:{w:1080,h:1920}, landscape:{w:1920,h:1080}},
          '2160':{portrait:{w:2160,h:3840}, landscape:{w:3840,h:2160}}
        };
        const size=(sizes[res]||sizes['1080'])[orientation];
        verticalCanvasStream=await getOrientationFixedCanvasStream(videoTrack, orientation, size.w, size.h);
        const canvasVideoTrack=verticalCanvasStream.getVideoTracks()[0];
        if(canvasVideoTrack)tracks.push(canvasVideoTrack);
      }
    }else{
      if(wantVideo&&videoStream)videoStream.getVideoTracks().filter(t=>t.readyState==='live').forEach(t=>tracks.push(t.clone()));
    }
    
    if(wantAudioRecord&&audioStream)audioStream.getAudioTracks().filter(t=>t.readyState==='live').forEach(t=>tracks.push(t.clone()));
    
    if(!tracks.length){
      setStatus('red','Nenhuma faixa de gravação disponível');
      return false;
    }

    recordStream=new MediaStream(tracks);
    cameraStream=recordStream;
    await restoreLiveCameraPreview();
    if(needMic&&audioStream)startLiveMicMeter(audioStream);

    if(wantVideo){
      ensureRecordingPreview(recordStream||videoStream);
      if(current.settings?.mobileCameraBg){
        const bg=$('#mobileCameraBgVideo');
        if(bg){
          if(isIOSWebKit() && verticalCanvasStream){
            bg.srcObject=verticalCanvasStream;
          }else{
            bg.srcObject=videoStream;
          }
          bg.muted=true;
          bg.autoplay=true;
          bg.playsInline=true;
          try{await bg.play()}catch(e){}
        }
      }
    }

    if(!wantVideo&&current.settings.mobileCameraBg){
      try{
        const st=await ensurePrepCameraAccess();
        const bg=$('#mobileCameraBgVideo');
        if(bg){bg.srcObject=st;await bg.play()}
      }catch(e){setStatus('yellow','Câmera de fundo indisponível')}
    }
    
    const mime=chooseMime(wantVideo);
    mediaRecorder=mime?new MediaRecorder(recordStream,{mimeType:mime}):new MediaRecorder(recordStream);
    recordingHasVideo=wantVideo;
    recordingMime=mime||mediaRecorder.mimeType||(wantVideo?'video/webm':'audio/webm');
    recordChunks=[];
    recordingActive=false;
    reviewAfterStop=false;
    
    if(recordedUrl){URL.revokeObjectURL(recordedUrl);recordedUrl=null}
    recordedBlob=null;

    const rec=mediaRecorder, chunks=recordChunks, mimeType=recordingMime;
    
    rec.ondataavailable=e=>{if(e.data&&e.data.size>0)chunks.push(e.data)};
    
    rec.onstart=()=>{
      if(mediaRecorder!==rec)return;
      recordingActive=true;
      document.body.classList.add('recording');
      if($('#recLabel'))$('#recLabel').textContent='GRAVANDO';
    };
    
    rec.onstop=()=>{
      try{
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
        stopOrientationCanvasStream();
        $('#recordPreview')?.remove();
        stopLiveMicMeter();
        stopPrepMedia();
        readingMicStream?.getTracks().forEach(t=>t.stop());
        readingMicStream=null;

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
      }catch(e){
        console.error('onstop error:',e);
      }
    };
    
    rec.onerror=()=>{
      recordingActive=false;
      document.body.classList.remove('recording');
    };
    
    return true;
  }catch(e){
    console.error('startCameraAndRecording error:',e);
    stopCameraStreams();
    stopOrientationCanvasStream();
    alert(e.name==='NotAllowedError'?'O navegador bloqueou o acesso à câmera/microfone. Autorize o site e tente novamente.':'Não foi possível iniciar a gravação: '+e.message);
    return false;
  }
}

function stopRecordingUiOnly(){
  try{
    stopLiveMicMeter();
    stopOrientationCanvasStream();
    try{recordStream?.getTracks?.().forEach(t=>t.stop())}catch(e){}
    recordStream=null;
    cameraStream=null;
    $('#recordPreview')?.remove();
  }catch(e){
    console.error('stopRecordingUiOnly error:',e);
  }
}

function stopCameraStreams(clearRecording=false){
  try{
    stopLiveMicMeter();
    stopOrientationCanvasStream();
    if(recordStream){recordStream.getTracks().forEach(t=>t.stop());recordStream=null}
    cameraStream=null;
    $('#recordPreview')?.remove();
    if(clearRecording){
      recordedBlob=null;
      if(recordedUrl){URL.revokeObjectURL(recordedUrl);recordedUrl=null}
      recordChunks=[];
    }
  }catch(e){
    console.error('stopCameraStreams error:',e);
  }
}

function saveRecordingFile(){
  try{
    if(!recordedBlob)return false;
    const ext=recordingExt(recordedBlob.type||recordingMime);
    const a=document.createElement('a');
    a.href=recordedUrl;
    a.download=(current?.name||'teleprompter')+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+ext;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{a.remove()},500);
    return true;
  }catch(e){
    console.error('saveRecordingFile error:',e);
    return false;
  }
}

function showRecordingPreview(){
  try{
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
      v.playsInline=true;
      v.preload='metadata';
      v.onerror=()=>{
        const sub=$('.record-review-sub');
        if(sub)sub.textContent='O Safari não conseguiu reproduzir a prévia. Tente SALVAR PRODUÇÃO e abrir o arquivo em Fotos/Arquivos.';
      };
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
  }catch(e){
    console.error('showRecordingPreview error:',e);
  }
}

function fmtTime(sec){
  sec=Math.max(0,Number(sec)||0);
  const m=Math.floor(sec/60),s=Math.floor(sec%60);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function stopRecordingForReview(){
  if(mediaRecorder&&mediaRecorder.state!=='inactive'){
    started=false;
    paused=true;
    if(manualRaf)cancelAnimationFrame(manualRaf);
    clearInterval(elapsedTimer);
    mediaRecorder.stop();
    return true;
  }
  return false;
}

function discardCurrentRecording(){
  try{
    reviewAfterStop=false;
    if(mediaRecorder&&mediaRecorder.state!=='inactive'){
      try{
        mediaRecorder.onstop=null;
        mediaRecorder.ondataavailable=null;
        mediaRecorder.onerror=null;
        mediaRecorder.stop();
      }catch(e){}
    }
    mediaRecorder=null;
    recordingActive=false;
    stopCameraStreams(true);
    if(recordedUrl)URL.revokeObjectURL(recordedUrl);
    recordedUrl=null;
    recordedBlob=null;
    recordChunks=[];
    $('#recordReview')?.remove();
  }catch(e){
    console.error('discardCurrentRecording error:',e);
  }
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
    const modal=document.createElement('div');
    modal.className='mic-modal';
    modal.innerHTML='<div class="mic-box"><h3>Teste do microfone</h3><div class="mic-meter"><div id="micLevel" class="mic-level"></div></div><div id="micTestStatus" class="mic-status">Fale normalmente. A barra deve se movimentar.</div><div class="mic-actions"><button id="micClose">Fechar teste</button></div></div>';
    document.body.appendChild(modal);
    $('#micClose').onclick=closeMicTest;
    
    micAudioContext=new (window.AudioContext||window.webkitAudioContext)();
    const source=micAudioContext.createMediaStreamSource(micStream);
    micAnalyser=micAudioContext.createAnalyser();
    micAnalyser.fftSize=512;
    source.connect(micAnalyser);
    
    const data=new Uint8Array(micAnalyser.fftSize);
    const meter=()=>{
      try{
        if(!micAnalyser)return;
        micAnalyser.getByteTimeDomainData(data);
        let sum=0;
        for(const v of data){const n=(v-128)/128;sum+=n*n}
        const rms=Math.sqrt(sum/data.length);
        const pct=Math.min(100,Math.max(2,rms*260));
        const bar=$('#micLevel');
        if(bar)bar.style.width=pct+'%';
        micRaf=requestAnimationFrame(meter);
      }catch(e){
        console.error('meter error:',e);
      }
    };
    meter();
  }catch(e){
    console.error('testMic error:',e);
    stopCameraStreams();
    alert(e.name==='NotAllowedError'?'O navegador bloqueou o acesso ao microfone. Verifique a permissão do site.':'Não foi possível abrir o microfone para teste.');
  }
}

function closeMicTest(){
  try{
    if(micRaf){cancelAnimationFrame(micRaf);micRaf=null}
    micStream=null;
    if(micAudioContext){micAudioContext.close().catch(()=>{});micAudioContext=null}
    micAnalyser=null;
    $('.mic-modal')?.remove();
  }catch(e){
    console.error('closeMicTest error:',e);
  }
}

// Funções de preparação
async function ensurePrepMicAccess(){
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('media-unavailable');
    const id=$('#mic')?.value||current.settings?.micDeviceId||'';
    const track=prepMicStream?.getAudioTracks()[0];
    if(hasLiveTrack(prepMicStream,'audio')&&(!id||track?.getSettings().deviceId===id))return prepMicStream;
    prepMicStream?.getTracks().forEach(t=>t.stop());
    prepMicStream=await navigator.mediaDevices.getUserMedia({audio:id?{deviceId:{exact:id}}:true});
    return prepMicStream;
  }catch(e){
    console.error('ensurePrepMicAccess error:',e);
    throw e;
  }
}

async function ensurePrepCameraAccess(){
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('media-unavailable');
    if(hasLiveTrack(prepCameraStream,'video'))return prepCameraStream;
    prepCameraStream=await requestSelectedCameraStream();
    updateCameraCapabilityHint(prepCameraStream);
    return prepCameraStream;
  }catch(e){
    console.error('ensurePrepCameraAccess error:',e);
    throw e;
  }
}

function stopPrepMedia(){
  try{
    if(prepCameraStream){prepCameraStream.getTracks().forEach(t=>t.stop());prepCameraStream=null}
    if(prepMicStream){prepMicStream.getTracks().forEach(t=>t.stop());prepMicStream=null}
    if(prepCombinedStream){prepCombinedStream.getTracks().forEach(t=>t.stop());prepCombinedStream=null}
  }catch(e){
    console.error('stopPrepMedia error:',e);
  }
}
