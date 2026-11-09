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
  const video={...base,aspectRatio:{ideal:o==='landscape'?16/9:9/16}};
  // Só aplica resolução fixa quando o usuário escolher uma de verdade.
  // No modo "auto" deixamos o iOS/Android decidir a melhor combinação.
  if(res!=='auto'){
    let w=res==='720'?1280:res==='1080'?1920:3840;
    let h=res==='720'?720:res==='1080'?1080:2160;
    if(o==='portrait'){const t=w;w=h;h=t}
    video.width={ideal:w};
    video.height={ideal:h};
  }
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
function stopLiveMicMeter(){if(liveMicRaf){cancelAnimationFrame(liveMicRaf);liveMicRaf=null}if(liveMicContext){liveMicContext.close().catch(()=>{});liveMicContext=null}liveMicAnalyser=null;voiceHoldUntil=0}
function resumeLiveMicContext(){
  // Safari no iPhone pode suspender o AudioContext quando a tela muda ou a gravação começa.
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
      // O microfone controla a rolagem: fala = rola, silêncio = pausa.
      // Usa um limiar baixo e uma pequena sustentação para não cortar a rolagem
      // entre palavras e para funcionar também com microfones mais baixos.
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
  // A silent video recording still owns live video tracks; retain its stream.
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


function recordingExt(mime){if(mime.includes('mp4'))return 'mp4';if(mime.includes('ogg'))return 'ogg';return 'webm'}

async function restoreLiveCameraPreview(){
  try{
    const stream=prepCameraStream;
    const track=stream?.getVideoTracks?.().find(t=>t.readyState==='live');
    if(!track)return false;
    let pv=$('#cameraPreview');
    if(!pv){
      // Recreate the preview only when the current screen has a camera slot.
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

    // Clone tracks so stopping a recording NEVER stops the preparation streams.
    const tracks=[];
    if(wantVideo&&videoStream)videoStream.getVideoTracks().filter(t=>t.readyState==='live').forEach(t=>tracks.push(t.clone()));
    if(wantAudioRecord&&audioStream)audioStream.getAudioTracks().filter(t=>t.readyState==='live').forEach(t=>tracks.push(t.clone()));
    if(!tracks.length){setStatus('red','Nenhuma faixa de gravação disponível');return false}

    recordStream=new MediaStream(tracks);
    cameraStream=recordStream;
    await restoreLiveCameraPreview();
    if(needMic&&audioStream)startLiveMicMeter(audioStream);

    if(wantVideo){
      // Usa o mesmo stream que será gravado. Não abre a câmera novamente.
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

      if(mediaRecorder===rec)mediaRecorder=null;
      recordingActive=false;
      document.body.classList.remove('recording');

      try{rec.stream?.getTracks?.().forEach(t=>t.stop())}catch(e){}
      try{recordStream?.getTracks?.().forEach(t=>t.stop())}catch(e){}
      recordStream=null;
      cameraStream=null;
      
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

function stopRecordingUiOnly(){stopLiveMicMeter();try{recordStream?.getTracks?.().forEach(t=>t.stop())}catch(e){}recordStream=null;cameraStream=null;}
function stopCameraStreams(clearRecording=false){stopLiveMicMeter();if(recordStream){recordStream.getTracks().forEach(t=>t.stop());recordStream=null}cameraStream=null;if(clearRecording){recordedBlob=null;if(recordedUrl){URL.revokeObjectURL(recordedUrl);recordedUrl=null}recordChunks=[]}}
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

