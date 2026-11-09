/* Audio access, recording lifecycle and review. Camera rendering: camera.js. */
let micStream=null,micAudioContext=null,micAnalyser=null,micRaf=null;
let prepCameraStream=null,prepMicStream=null;
let micAccessVersion=0,micAccessKey='',micAccessPending=null;
let cameraStream=null,recordStream=null,mediaRecorder=null,recordChunks=[];
let recordingActive=false,recordingMime='',recordedBlob=null,recordedUrl=null,recordingHasVideo=false;
let recordingFailure='',recordingDownloadRequested=false,recordSetupVersion=0;
let liveMicContext=null,liveMicAnalyser=null,liveMicRaf=null,readingMicStream=null;
let voiceHoldUntil=0,voiceNoiseFloor=0.004;

function hasLiveTrack(stream,type){return !!stream?.getTracks().some(t=>t.kind===type&&t.readyState==='live')}
function selectedMicConstraints(){const id=$('#mic')?.value??current.settings?.micDeviceId??'';return id?{deviceId:{exact:id}}:true}
function stopPrepMic(){
  micAccessVersion++;micAccessPending=null;micAccessKey='';
  stopMediaTracks(prepMicStream);prepMicStream=null;closeMicTest();
}
async function ensurePrepMicAccess(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Abra por HTTPS ou localhost para acessar o microfone');
  const constraints=selectedMicConstraints(),key=JSON.stringify(constraints);
  if(key===micAccessKey&&hasLiveTrack(prepMicStream,'audio'))return prepMicStream;
  if(key===micAccessKey&&micAccessPending)return micAccessPending;
  const previous=micAccessPending;stopPrepMic();micAccessKey=key;
  const version=micAccessVersion;
  const request=(async()=>{
    if(previous)await previous.catch(()=>{});
    if(version!==micAccessVersion)throw cameraAbort();
    const stream=await navigator.mediaDevices.getUserMedia({audio:constraints,video:false});
    if(version!==micAccessVersion){stopMediaTracks(stream);throw cameraAbort()}
    prepMicStream=stream;
    stream.getAudioTracks()[0]?.addEventListener('ended',()=>{if(prepMicStream===stream)handleMediaInterruption('O microfone foi desconectado',true,'audio')});
    return stream;
  })();
  micAccessPending=request;
  try{return await request}finally{if(version===micAccessVersion)micAccessPending=null}
}
function stopPrepCamera(){cameraController.stop();prepCameraStream=null}
async function ensurePrepCameraAccess(){
  const stream=await cameraController.open(current.settings);
  prepCameraStream=stream;updateCameraCapabilityHint();return stream;
}
function mediaErrorMessage(error,kind='câmera'){
  if(error?.name==='NotAllowedError')return `Permissão de ${kind} bloqueada. Autorize este site no navegador e teste novamente.`;
  if(error?.name==='NotFoundError'||error?.name==='OverconstrainedError')return `Dispositivo de ${kind} indisponível. Atualize a lista ou selecione o dispositivo padrão.`;
  if(error?.name==='NotReadableError')return `Não foi possível acessar ${kind}. Feche outros aplicativos que estejam usando o dispositivo e teste novamente.`;
  return error?.message||`Não foi possível acessar ${kind}.`;
}
function updateCameraCapabilityHint(){
  const el=$('#cameraCapabilityHint'),info=cameraController.info;if(!el)return;
  if(!info){el.textContent='Teste a câmera para conferir a saída vertical ou horizontal.';return}
  const orientation=info.config.orientation==='portrait'?'Vertical':'Horizontal';
  el.textContent=`${orientation} · saída ${info.width} × ${info.height} · até ${Math.round(info.fps)} fps · fonte ${info.sourceWidth} × ${info.sourceHeight}`+
    (info.upscaled?' · imagem ampliada: a fonte tem menos detalhes que a resolução solicitada.':'');
}
async function previewCamera(){
  const video=$('#cameraPreview'),hint=$('#cameraHint');if(!video)return false;
  let version;
  if(hint)hint.textContent='Abrindo a câmera…';
  try{
    await ensurePrepCameraAccess();version=cameraController.version;if(!video.isConnected)return false;
    await cameraController.attach(video);
    if(hint?.isConnected)hint.textContent='✓ Mesmo enquadramento na prévia, na leitura e na gravação, sem recorte automático.';
    updateCameraCapabilityHint();return true;
  }catch(error){
    if(error.name==='AbortError')return false;
    if(video.isConnected&&version===cameraController.version)stopPrepCamera();
    if(video.isConnected)video.srcObject=null;
    if(hint?.isConnected)hint.textContent=mediaErrorMessage(error);return false;
  }
}
async function refreshCameraConfiguration(){
  const active=cameraController.state==='ready'||cameraController.state==='opening';
  stopPrepCamera();if(active)await previewCamera();else updateCameraCapabilityHint();
}
async function loadCameras(){
  const select=$('#camera');if(!select)return;
  try{
    // Enumerating first also lets the user replace a saved, disconnected camera.
    const devices=await navigator.mediaDevices.enumerateDevices();if(!select.isConnected)return;
    const wanted=current.settings?.cameraDeviceId||'',cameras=devices.filter(d=>d.kind==='videoinput');
    select.innerHTML='<option value="">Automática (frontal/traseira)</option>'+cameras.map((d,i)=>`<option value="${esc(d.deviceId)}">${esc(d.label||'Câmera '+(i+1))}</option>`).join('');
    if(wanted&&!cameras.some(d=>d.deviceId===wanted))select.add(new Option('Dispositivo salvo indisponível',wanted));
    select.value=wanted;
    await previewCamera();
  }catch(error){if(error.name!=='AbortError'&&$('#cameraHint'))$('#cameraHint').textContent=mediaErrorMessage(error)}
}
async function loadMicrophones(){
  const select=$('#mic');if(!select)return;
  try{
    const devices=await navigator.mediaDevices.enumerateDevices();if(!select.isConnected)return;
    const wanted=current.settings?.micDeviceId||'',mics=devices.filter(d=>d.kind==='audioinput');
    select.innerHTML='<option value="">Padrão do aparelho</option>'+mics.map((d,i)=>`<option value="${esc(d.deviceId)}">${esc(d.label||'Microfone '+(i+1))}</option>`).join('');
    if(wanted&&!mics.some(d=>d.deviceId===wanted))select.add(new Option('Dispositivo salvo indisponível',wanted));
    select.value=wanted;await ensurePrepMicAccess();
    if($('#micHint'))$('#micHint').textContent='✓ Microfone autorizado. Confira o som pelo botão Testar.';
  }catch(error){if(error.name!=='AbortError'&&$('#micHint'))$('#micHint').textContent=mediaErrorMessage(error,'microfone')}
}
function stopLiveMicMeter(){
  if(liveMicRaf!==null)cancelAnimationFrame(liveMicRaf);liveMicRaf=null;
  if(liveMicContext){liveMicContext.onstatechange=null;liveMicContext.close().catch(()=>{});liveMicContext=null}
  liveMicAnalyser=null;voiceHoldUntil=0;currentMicRms=0;
}
function resumeLiveMicContext(){if(liveMicContext?.state==='suspended')liveMicContext.resume().catch(()=>{})}
function startLiveMicMeter(stream){
  stopLiveMicMeter();if(!hasLiveTrack(stream,'audio'))return;
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx){setStatus('yellow','Medição de áudio indisponível neste navegador');return}
    liveMicContext=new AudioCtx();resumeLiveMicContext();
    const source=liveMicContext.createMediaStreamSource(stream);
    liveMicAnalyser=liveMicContext.createAnalyser();liveMicAnalyser.fftSize=512;source.connect(liveMicAnalyser);
    const data=new Uint8Array(liveMicAnalyser.fftSize);
    const tick=()=>{
      if(!liveMicAnalyser)return;
      liveMicAnalyser.getByteTimeDomainData(data);let sum=0;
      for(const value of data){const n=(value-128)/128;sum+=n*n}
      currentMicRms=Math.sqrt(sum/data.length);voiceNoiseFloor=voiceNoiseFloor*.92+Math.min(currentMicRms,.01)*.08;
      if($('#liveMicLevel'))$('#liveMicLevel').style.width=Math.min(100,Math.max(2,currentMicRms*300))+'%';
      if($('#liveMicDb'))$('#liveMicDb').textContent=Math.max(-60,Math.round(20*Math.log10(Math.max(currentMicRms,.0001))))+' dB';
      liveMicRaf=requestAnimationFrame(tick);
    };tick();
  }catch(error){setStatus('red','Não foi possível medir o microfone')}
}
async function ensureReadingMic(){
  if((current.settings?.mode||'audio')==='noaudio')return null;
  try{const stream=await ensurePrepMicAccess();startLiveMicMeter(stream);return stream}
  catch(error){if(error.name!=='AbortError')setStatus('red',mediaErrorMessage(error,'microfone'));return null}
}
function chooseMime(withVideo=true){
  const types=withVideo?['video/mp4','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']:['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'];
  return types.find(type=>window.MediaRecorder?.isTypeSupported?.(type))||'';
}
function recordingExt(mime){return mime.includes('mp4')?'mp4':mime.includes('ogg')?'ogg':'webm'}
function createMediaRecorder(stream,withVideo){
  const preferred=chooseMime(withVideo);
  if(preferred){try{return new MediaRecorder(stream,{mimeType:preferred})}catch(error){if(error.name!=='NotSupportedError')throw error}}
  return new MediaRecorder(stream);
}
function ensureRecordingPreview(){return !!cameraController.output}
async function startCameraAndRecording(){
  if(mediaRecorder&&mediaRecorder.state!=='inactive'){setStatus('red','Finalize a gravação atual antes de iniciar outra');return false}
  if(mediaRecorder){mediaRecorder.onstop=null;mediaRecorder.ondataavailable=null;mediaRecorder.onerror=null;stopMediaTracks(mediaRecorder.stream);mediaRecorder=null;recordStream=null;cameraStream=null}
  const settings=current.settings||{},wantVideo=settings.recordOn===true,wantAudio=settings.recordAudioOn===true;
  const needMic=wantAudio||settings.mode!=='noaudio',needCamera=wantVideo||settings.mobileCameraBg===true;
  const token=sessionId,setup=++recordSetupVersion;
  const check=()=>{if(token!==sessionId||setup!==recordSetupVersion)throw cameraAbort()};
  try{
    if((wantVideo||wantAudio)&&!window.MediaRecorder)throw new Error('Este navegador não oferece gravação de mídia');
    const audio=needMic?await ensurePrepMicAccess():null;check();if(!needMic)stopPrepMic();
    let video=null;
    if(needCamera){
      try{video=await ensurePrepCameraAccess();check()}
      catch(error){if(wantVideo||error.name==='AbortError')throw error;setStatus('yellow',mediaErrorMessage(error))}
    }else stopPrepCamera();
    check();
    if(video&&settings.mobileCameraBg){await cameraController.attach($('#mobileCameraBgVideo'));check()}
    if(needMic&&audio)startLiveMicMeter(audio);
    if(!wantVideo&&!wantAudio)return true;
    const tracks=[];
    if(wantVideo)video.getVideoTracks().forEach(track=>tracks.push(track.clone()));
    if(wantAudio)audio.getAudioTracks().forEach(track=>tracks.push(track.clone()));
    recordStream=new MediaStream(tracks);cameraStream=recordStream;
    const rec=createMediaRecorder(recordStream,wantVideo);mediaRecorder=rec;
    recordingHasVideo=wantVideo;recordingMime=rec.mimeType||chooseMime(wantVideo);
    recordChunks=[];recordingFailure='';recordingActive=false;reviewAfterStop=false;recordingDownloadRequested=false;clearRecordedFile();
    const chunks=recordChunks;
    rec.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)};
    rec.onstart=()=>{if(mediaRecorder===rec){recordingActive=true;document.body.classList.add('recording')}};
    rec.onerror=()=>{
      if(mediaRecorder!==rec)return;
      recordingFailure='A gravação foi interrompida pelo navegador. Confira o arquivo parcial antes de utilizá-lo.';
      reviewAfterStop=true;haltReading();setStatus('red',recordingFailure);
      if(rec.state!=='inactive'){try{rec.stop()}catch(error){finishRecording(rec,chunks)}}
    };
    rec.onstop=()=>finishRecording(rec,chunks);cameraController.lock();return true;
  }catch(error){
    if(setup===recordSetupVersion){mediaRecorder=null;stopCameraStreams();stopPrepMedia()}
    if(error.name!=='AbortError'){const message=mediaErrorMessage(error);setStatus('red',message);alert(message)}
    return false;
  }
}
function haltReading(){
  started=false;paused=true;voiceActive=false;
  if(manualRaf!==null)cancelAnimationFrame(manualRaf);manualRaf=null;
  if(elapsedTimer!==null)clearInterval(elapsedTimer);elapsedTimer=null;
  if(countdownTimer!==null)clearInterval(countdownTimer);countdownTimer=null;
}
function finishRecording(rec,chunks){
  if(mediaRecorder!==rec){stopMediaTracks(rec.stream);return}
  reviewAfterStop=false;mediaRecorder=null;recordingActive=false;haltReading();document.body.classList.remove('recording');
  if(chunks.length){
    const blob=new Blob(chunks,{type:rec.mimeType||recordingMime});
    if(blob.size){clearRecordedFile();recordedBlob=blob;recordedUrl=URL.createObjectURL(blob);recordingMime=blob.type}
  }
  stopMediaTracks(rec.stream);stopCameraStreams();stopPrepMedia();stopMediaTracks(readingMicStream);readingMicStream=null;
  if(recordedBlob?.size){setStatus(recordingFailure?'red':'green',recordingFailure||'Gravação finalizada — confira a prévia');showRecordingPreview()}
  else{setStatus('red','A gravação não gerou arquivo');alert('A gravação terminou sem gerar arquivo. Teste a câmera e o microfone antes de tentar novamente.')}
}
function handleMediaInterruption(message,ended,kind='video'){
  if(ended&&mediaRecorder&&mediaRecorder.state!=='inactive'){
    recordingFailure=message+'. Confira o arquivo parcial.';reviewAfterStop=true;stopRecordingForReview();
  }else if(mediaRecorder?.state==='inactive'&&countdownTimer!==null){
    haltReading();discardCurrentRecording();
    if(document.body.classList.contains('prompter'))offerStartRetry();
  }else if(ended&&!mediaRecorder){
    haltReading();if(kind==='video')stopPrepCamera();else stopPrepMic();
    if(document.body.classList.contains('prompter'))offerStartRetry();
  }else if(started&&!paused)togglePause();
  setStatus('red',message);if($('#cameraHint'))$('#cameraHint').textContent=message;
}
cameraController.onInterrupt=handleMediaInterruption;
function stopCameraStreams(clearRecording=false){
  stopLiveMicMeter();stopMediaTracks(recordStream);recordStream=null;cameraStream=null;
  if(clearRecording){clearRecordedFile();recordChunks=[]}
}
function clearRecordedFile(){if(recordedUrl)URL.revokeObjectURL(recordedUrl);recordedUrl=null;recordedBlob=null}
function stopRecordingForReview(){if(!mediaRecorder||mediaRecorder.state==='inactive')return false;haltReading();mediaRecorder.stop();return true}
function discardCurrentRecording(){
  recordSetupVersion++;reviewAfterStop=false;const rec=mediaRecorder;mediaRecorder=null;
  if(rec){rec.onstop=null;rec.ondataavailable=null;rec.onerror=null;rec.onstart=null;if(rec.state!=='inactive'){try{rec.stop()}catch(error){}}stopMediaTracks(rec.stream)}
  recordingActive=false;document.body.classList.remove('recording');stopCameraStreams(true);stopPrepMedia();
  recordingFailure='';recordingDownloadRequested=false;$('#recordReview')?.remove();
}
function hasRecordingToProtect(){return !!recordedBlob?.size||!!recordChunks.length||!!mediaRecorder&&mediaRecorder.state!=='inactive'}
function confirmRecordingDiscard(){
  if(!hasRecordingToProtect())return Promise.resolve(true);if($('#recordExit'))return Promise.resolve(false);
  if(started&&!paused)togglePause();
  return new Promise(resolve=>{
    const dialog=document.createElement('div');dialog.id='recordExit';dialog.className='record-review';
    dialog.innerHTML='<div class="record-review-card" role="dialog" aria-modal="true" aria-labelledby="recordExitTitle"><h2 id="recordExitTitle">Preservar esta gravação?</h2><p>A gravação será perdida se você a descartar. Confira qualquer download solicitado nos seus arquivos.</p><div class="record-review-actions"><button id="exitReview">Finalizar e revisar</button><button id="exitDiscard" class="danger">Descartar e continuar</button><button id="exitCancel">Cancelar</button></div></div>';
    document.body.appendChild(dialog);const close=value=>{dialog.remove();resolve(value)};
    $('#exitCancel').onclick=()=>close(false);$('#exitDiscard').onclick=()=>close(true);
    $('#exitReview').onclick=()=>{close(false);if(mediaRecorder&&mediaRecorder.state!=='inactive'){reviewAfterStop=true;stopRecordingForReview()}else showRecordingPreview()};
    $('#exitCancel').focus();
  });
}
function saveRecordingFile(){
  if(!recordedBlob||!recordedUrl)return false;
  const link=document.createElement('a');link.href=recordedUrl;
  link.download=(current?.name||'teleprompter')+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+recordingExt(recordedBlob.type||recordingMime);
  document.body.appendChild(link);link.click();setTimeout(()=>link.remove(),500);recordingDownloadRequested=true;return true;
}
function showRecordingPreview(){
  if(!recordedBlob||!recordedUrl||$('#recordReview'))return;
  const modal=document.createElement('div');modal.id='recordReview';modal.className='record-review';
  modal.innerHTML=`<div class="record-review-card" role="dialog" aria-modal="true" aria-labelledby="recordReviewTitle"><h2 id="recordReviewTitle">Gravação finalizada</h2><p class="record-review-sub"></p><div class="record-review-media">${recordingHasVideo?'<video id="recordedReviewVideo" controls playsinline preload="metadata"></video>':'<audio id="recordedReviewAudio" controls preload="metadata"></audio>'}</div><p id="recordedDimensions"></p><div class="record-review-actions"><button id="deleteRecording" class="danger">EXCLUIR</button><button id="saveRecording" class="primary">SALVAR PRODUÇÃO</button><button id="closeRecording">Fechar prévia</button></div></div>`;
  document.body.appendChild(modal);$('.record-review-sub').textContent=recordingFailure||'Confira enquadramento, áudio e orientação antes de salvar.';
  const player=$('#recordedReviewVideo')||$('#recordedReviewAudio');player.src=recordedUrl;
  player.onloadedmetadata=()=>{if(recordingHasVideo&&$('#recordedDimensions'))$('#recordedDimensions').textContent=`Arquivo: ${player.videoWidth} × ${player.videoHeight}`};
  player.onerror=()=>{if($('.record-review-sub'))$('.record-review-sub').textContent='A prévia não pôde ser reproduzida. Baixe o arquivo e confira-o em um reprodutor compatível.'};player.load();
  $('#deleteRecording').onclick=()=>{if(confirm('Excluir definitivamente esta gravação?')){clearRecordedFile();recordChunks=[];modal.remove();setStatus('yellow','Gravação excluída')}};
  $('#saveRecording').onclick=()=>{if(saveRecordingFile())setStatus('green','Download solicitado — confira seus arquivos');else alert('Não foi possível solicitar o download')};
  $('#closeRecording').onclick=()=>modal.remove();$('#saveRecording').focus();
}
async function testMic(){
  if($('.mic-modal'))return;
  try{
    micStream=await ensurePrepMicAccess();if(!$('#testMic'))return;
    const modal=document.createElement('div');modal.className='mic-modal';
    modal.innerHTML='<div class="mic-box"><h3>Teste do microfone</h3><div class="mic-meter"><div id="micLevel" class="mic-level"></div></div><p>Fale normalmente. A barra deve se movimentar.</p><button id="micClose">Fechar teste</button></div>';
    document.body.appendChild(modal);$('#micClose').onclick=closeMicTest;
    micAudioContext=new (window.AudioContext||window.webkitAudioContext)();await micAudioContext.resume();if(!modal.isConnected)return;
    const source=micAudioContext.createMediaStreamSource(micStream);micAnalyser=micAudioContext.createAnalyser();micAnalyser.fftSize=512;source.connect(micAnalyser);
    const data=new Uint8Array(micAnalyser.fftSize);
    const tick=()=>{if(!micAnalyser)return;micAnalyser.getByteTimeDomainData(data);let sum=0;for(const v of data)sum+=((v-128)/128)**2;if($('#micLevel'))$('#micLevel').style.width=Math.min(100,Math.max(2,Math.sqrt(sum/data.length)*260))+'%';micRaf=requestAnimationFrame(tick)};tick();
  }catch(error){closeMicTest();if(error.name!=='AbortError')alert(mediaErrorMessage(error,'microfone'))}
}
function closeMicTest(){
  if(micRaf!==null)cancelAnimationFrame(micRaf);micRaf=null;micStream=null;micAnalyser=null;
  if(micAudioContext){micAudioContext.close().catch(()=>{});micAudioContext=null}$('.mic-modal')?.remove();
}
