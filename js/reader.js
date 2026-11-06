async function beginCountdownNow(){document.body.classList.remove('adjusting');document.querySelector('.start-command-banner')?.remove();markReferenceWord(false);syncStartReference();
  document.querySelector('.countdown-overlay')?.remove();
  const n=Math.max(1,Number(current.settings.count)||5);const mySession=sessionId;
  const overlay=document.createElement('div');overlay.className='countdown-overlay';overlay.innerHTML='<div class="countdown-label">PREPARE-SE</div><div id="countValue">'+n+'</div>';document.body.appendChild(overlay);
  let i=n;countdownTimer=setInterval(async()=>{if(mySession!==sessionId){clearInterval(countdownTimer);countdownTimer=null;return}i--;if(i<=0){
  clearInterval(countdownTimer);countdownTimer=null;
  if(overlay.isConnected)overlay.remove();

  if((current.settings?.recordOn||current.settings?.recordAudioOn)&&!mediaRecorder){
    const ready=await startCameraAndRecording();
    if(mySession!==sessionId)return;
    if(!ready){setStatus('red','Não foi possível preparar a gravação');offerStartRetry();return}
  }
  started=true;
  preparingPrompter=false;
  startTime=Date.now();pausedAt=0;pausedTotal=0;
  elapsedTimer=setInterval(updateTimer,250);

  if(mediaRecorder && mediaRecorder.state==='inactive'){
    try{
      const liveTracks=recordStream?.getTracks?.().filter(t=>t.readyState==='live')||[];
      if(!liveTracks.length)throw new Error('As faixas de gravação não estão ativas');
      mediaRecorder.start(1000);
      if(current.settings?.recordOn)ensureRecordingPreview(recordStream);
      const vtrack=recordStream?.getVideoTracks?.()[0];const vst=vtrack?.getSettings?.()||{};const actual=vst.width&&vst.height?` (${vst.width}×${vst.height}${vst.frameRate?' · '+Math.round(vst.frameRate)+' fps':''})`:'';setStatus('green','🔴 Gravando'+actual);
    }catch(e){
      started=false;clearInterval(elapsedTimer);elapsedTimer=null;offerStartRetry();
      setStatus('red','Não foi possível iniciar a gravação');
      alert('O navegador não conseguiu iniciar a gravação: '+(e?.message||'erro desconhecido'));
      return;
    }
  }

  if(current.settings.mode==='noaudio')voiceActive=true;
  await startManual();
}else{const cv=$('#countValue');if(cv)cv.textContent=i}},1000)
}
async function startCountdown(){
  savePrep();stopAll();showPrompter(true);
  // Desbloqueia o AudioContext no próprio gesto do botão, depois da limpeza da sessão anterior
  // e antes de qualquer await (exigência importante do Safari no iOS).
  if((current.settings?.mode||'audio')!=='noaudio')unlockLiveMicFromGesture();
  await prepareReadingSession();
}
function offerStartRetry(){
  if($('#manualStart'))return;
  const button=document.createElement('button');button.id='manualStart';button.textContent='Iniciar por toque';button.className='manual-start';
  button.onclick=async()=>{button.disabled=true;sessionId++;await prepareReadingSession(true);button.disabled=false};document.body.appendChild(button);
}
async function prepareReadingSession(skipCommand=false){
  const token=sessionId;
  scrollSpeed=Math.max(.2,Math.min(3,Number(current.settings.speed)||1));
  let launching=false;
  const launch=async()=>{
    if(token!==sessionId||launching)return;launching=true;$('#manualStart')?.remove();
    const ok=await startCameraAndRecording();
    if(token!==sessionId){stopCameraStreams();stopPrepMedia();return}
    if(!ok){offerStartRetry();return}
    if(current.settings.mode!=='noaudio'&&!await ensureReadingMic()){offerStartRetry();return}
    if(token!==sessionId)return;
    $('#manualStart')?.remove();beginCountdownNow();
  };
  const cmds=(current.settings.startCmds||[]).map(c=>normalize(c.phrase)).filter(Boolean);
  if(!skipCommand&&current.settings.mode==='audio'&&cmds.length){
    stopPrepMedia();offerStartRetry();
    setStatus('yellow','Aguardando comando de voz ou toque em Iniciar');
    startStartCommandListener(launch,()=>{offerStartRetry()});
  }else{
    if(commandRecognition){commandRecognition.onend=null;commandRecognition.abort();commandRecognition=null}
    await launch();
  }
}

function normalize(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9áàâãéêíóôõúçñ\s]/gi,' ').replace(/\s+/g,' ').trim()}
function buildWords(text){return text.replace(/\[[^\]]*\]/g,' ').split(/\s+/).filter(Boolean)}
function updateSpeedUI(){const el=$('#speedLevel');if(!el)return;const lvl=Math.max(1,Math.min(10,Math.round(scrollSpeed*3.33)));const bars='▮'.repeat(Math.ceil(lvl/2))+'▯'.repeat(5-Math.ceil(lvl/2));el.textContent=bars+'  '+scrollSpeed.toFixed(1)+'x';el.title='Velocidade '+scrollSpeed.toFixed(1)+'x';}
function adjustFinalFont(delta){
  const el=$('#promptText');if(!el)return;
  const currentSize=parseFloat(getComputedStyle(el).fontSize)||54;
  const next=Math.max(28,Math.min(90,currentSize+delta));
  el.style.fontSize=next+'px';
  if(current.settings){current.settings.font=next;save()}
  if($('#fontValue'))$('#fontValue').textContent=Math.round(next);
  resizePrompter();
}

function toggleTextWidth(){
  const el=$('#promptText'); if(!el)return;
  const currentW=Number(current.settings?.textWidth)||600;
  const presets=[0.72,0.84,0.94];
  const vw=Math.max(320,window.innerWidth||360);
  const currentPct=current.settings?.textWidthPct||0.84;
  let idx=presets.findIndex(x=>Math.abs(x-currentPct)<.01);
  if(idx<0)idx=1;
  idx=(idx+1)%presets.length;
  const pct=presets[idx];
  current.settings.textWidthPct=pct;
  current.settings.textWidth=Math.round(vw*pct);
  el.style.maxWidth=Math.round(vw*pct)+'px';
  save();
  resizePrompter();
}

function enablePromptTouchDrag(){
  const el=$('#promptText'); if(!el||el.dataset.touchDrag==='1')return;
  el.dataset.touchDrag='1';
  let dragging=false,lastY=0,wasRunning=false;
  el.addEventListener('pointerdown',e=>{
    if(preparingPrompter)return;
    dragging=true; lastY=e.clientY; wasRunning=!paused;
    if(wasRunning)togglePause();
    el.classList.add('dragging');
    try{el.setPointerCapture(e.pointerId)}catch(err){}
  });
  el.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const dy=e.clientY-lastY; lastY=e.clientY; manualY+=dy;
    const stage=el.parentElement;
    manualY=Math.max(scrollEndY,Math.min(scrollStartY,manualY));
    el.style.transform=(current.settings?.mirror?'scaleX(-1) ':'')+`translateY(${manualY}px)`;
  });
  const stop=()=>{
    if(!dragging)return; dragging=false; el.classList.remove('dragging');
    if(wasRunning){setTimeout(()=>{if(started&&!preparingPrompter&&paused)togglePause()},40);}
    wasRunning=false;
  };
  el.addEventListener('pointerup',stop); el.addEventListener('pointercancel',stop);
}

function showPrompter(preparing=false){if(!preparing)stopAll();current.settings=current.settings||{};if(!Number.isFinite(Number(current.settings.startPercent)))current.settings.startPercent=50;if(!Number.isFinite(Number(current.settings.textWidth)))current.settings.textWidth=600;if(!Number.isFinite(Number(current.settings.textWidthPct)))current.settings.textWidthPct=.84;let s=current.settings||{};s.theme=(s.theme==='light'||s.theme==='white')?'white':'dark';current.settings.theme=s.theme;started=!preparing;sessionId++;currentWord=0;lastMatch=0;words=buildWords(current.text);startTime=preparing?0:Date.now();targetSeconds=parseTime(s.target);preparingPrompter=!!preparing;document.body.className='prompter '+((s.theme==='light'||s.theme==='white')?'light':'')+(s.mode==='noaudio'?' no-audio':'')+(s.mobileCameraBg?' mobile-camera':'')+(preparing?' adjusting':'');document.body.innerHTML=`<div class="promptHud"><div class="hudBox"><div id="timer" class="promptTimer">00:00</div><div class="hudAlert"><span id="runner" class="runner" aria-label="Aviso de tempo">🏃</span><span id="statusDot" class="dot ${s.mode==='noaudio'?'green':''}"></span></div><div id="statusText" class="hudStatusText">${s.mode==='noaudio'?'Rolagem automática':(s.mode==='semi'?'Semi-automático · aguardando voz':'Aguardando fala')}</div>${s.mode==='noaudio'?'':`<div class="hudMic">🎙️ <span class="hudMicTrack"><span id="liveMicLevel" class="hudMicLevel"></span></span></div><div id="liveMicDb" class="hudDb">-60 dB</div>`}</div></div>${preparing&&s.mode!=='noaudio'&&((s.startCmds||[]).map(c=>c.phrase).filter(Boolean).length)?`<div class="start-command-banner"><span class="label">COMANDO PARA INICIAR</span><span class="phrase">“${esc((s.startCmds||[]).map(c=>c.phrase).filter(Boolean).join('”  ou  “'))}”</span></div>`:''}<div class="promptStage">${s.mobileCameraBg?'<video id="mobileCameraBgVideo" class="mobileCameraBg" autoplay muted playsinline></video><div class="mobileCameraShade"></div><div class="mobile-camera-badge">CÂMERA + TELEPROMPTER</div>':''}<div id="startReference" class="startReference"><span class="startReferenceLabel">INÍCIO · 50%</span></div><div id="promptText" class="promptText"></div><div id="guide" class="guide"></div></div><div class="controls"><button id="pause" class="iconBtn" title="Pausar/continuar">⏸</button><button id="restartTele" class="iconBtn" title="Recomeçar">↻</button><button id="finishTele" class="iconBtn stop-rec" title="Finalizar gravação">⏹</button><button id="backTele" class="iconBtn" title="Voltar à preparação">←</button><button id="hideControls" class="iconBtn" title="Ocultar controles">●</button></div><button id="showControls" class="controlsReveal hidden" title="Mostrar controles">●</button>`;if(s.timerOn===false)$('#timer').style.visibility='hidden';if(s.mirror)$('#promptText').style.transform='scaleX(-1)';$('#promptText').style.fontSize=s.font+'px';$('#promptText').style.maxWidth=Math.round((window.innerWidth||720)*(Number(s.textWidthPct)||.84))+'px';$('#promptText').style.opacity=Math.max(.35,Math.min(1,Number(s.mobileTextOpacity||90)/100));renderPrompt();positionPromptAtReadingLine();markReferenceWord(preparing);syncStartReference();if(preparing)enableStartPositionDrag();$('#pause').onclick=()=>{resumeLiveMicContext();togglePause()};$('#finishTele').onclick=()=>{if(mediaRecorder&&mediaRecorder.state!=='inactive'){reviewAfterStop=true;setStatus('yellow','Preparando prévia da gravação...');stopRecordingForReview()}else{if(confirm('Finalizar a leitura e voltar à preparação?')){discardCurrentRecording();prepare()}}};document.onkeydown=e=>{if(e.code==='Space'&&document.body.classList.contains('prompter')){const tag=(e.target&&e.target.tagName)||'';if(tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT'){e.preventDefault();togglePause()}}};$('#restartTele').onclick=async()=>{
  discardCurrentRecording();stopAll();showPrompter(true);await prepareReadingSession();
};
$('#backTele').onclick=()=>{discardCurrentRecording();document.body.classList.remove('fullscreen-active','controls-hidden');prepare()};const hideBtn=$('#hideControls'),showBtn=$('#showControls'),controls=$('.controls');hideBtn.onclick=()=>{controls.classList.add('controls-hidden');showBtn.classList.remove('hidden')};showBtn.onclick=()=>{controls.classList.remove('controls-hidden');showBtn.classList.add('hidden')};document.onfullscreenchange=null;window.onresize=resizePrompter;enablePromptTouchDrag();setupReadingControls();updateSpeedUI();if(!preparing){elapsedTimer=setInterval(updateTimer,250);startManual();}}

let scrollSpeed=1,paused=false,manualTimer=null,manualRaf=null,manualY=0,lastManualTs=0,scrollStartY=0,scrollEndY=0,voiceActive=false,currentMicRms=0;
function markReferenceWord(show){
  const el=$('#promptText'); if(!el)return;
  el.querySelectorAll('.referenceWord').forEach(x=>x.classList.remove('referenceWord'));
  if(!show)return;
  const first=el.querySelector('[data-i=\"0\"]');
  if(first)first.classList.add('referenceWord');
}
function syncStartReference(){
  const ref=$('#startReference'); if(!ref)return;
  let pct=Number(current.settings?.startPercent); if(!Number.isFinite(pct))pct=50;
  pct=Math.max(2,Math.min(98,pct));
  ref.style.top=pct+'vh';
  const label=ref.querySelector('.startReferenceLabel'); if(label)label.textContent='INÍCIO · '+Math.round(pct)+'%';
}
function positionPromptAtReadingLine(){
  const el=$('#promptText'); if(!el)return;
  const stage=el.parentElement; if(!stage)return;
  const first=el.querySelector('[data-i="0"]'); if(!first)return;
  let pct=Number(current.settings?.startPercent); if(!Number.isFinite(pct))pct=50;
  pct=Math.max(2,Math.min(98,pct));
  const targetY=stage.clientHeight*(pct/100);
  const firstOffset=first.offsetTop;
  manualY=targetY-firstOffset;
  scrollStartY=manualY;
  scrollEndY=Math.min(scrollStartY,targetY-el.scrollHeight+(parseFloat(getComputedStyle(el).lineHeight)||72));
  el.style.transform=(current.settings.mirror?'scaleX(-1) ':'')+`translateY(${manualY}px)`;
  syncStartReference();
}
function enableStartPositionDrag(){
  const ref=$('#startReference'); if(!ref)return;
  let dragging=false;
  const move=(clientY)=>{
    const pct=Math.max(2,Math.min(98,(clientY/window.innerHeight)*100));
    current.settings.startPercent=Number(pct.toFixed(1));
    positionPromptAtReadingLine();
    markReferenceWord(true);
  };
  ref.onpointerdown=(e)=>{dragging=true;ref.setPointerCapture?.(e.pointerId);move(e.clientY);e.preventDefault()};
  ref.onpointermove=(e)=>{if(dragging)move(e.clientY)};
  ref.onpointerup=(e)=>{dragging=false;save();try{ref.releasePointerCapture?.(e.pointerId)}catch(_){} };
  ref.onpointercancel=()=>{dragging=false;save()};
}
function renderPrompt(){
  let el=$('#promptText');if(!el)return;
  let around=words.map((w,i)=>`<span class="w" data-i="${i}">${esc(w)}</span>`).join(' ');
  el.innerHTML=around;
  $('#guide').style.display='none';
}
function setManualStart(){positionPromptAtReadingLine()}
async function startManual(){
  paused=false;
  currentMicRms=0;
  voiceNoiseFloor=0.004;
  voiceHoldUntil=0;
  voiceHoldUntil=0;
  voiceActive=false;
  renderPrompt();
  positionPromptAtReadingLine();
  const textEl=$('#promptText'), stage=textEl?.parentElement;
  if(!textEl||!stage)return;
  const mode=current.settings?.mode||'audio';
  const applyTransform=()=>{ textEl.style.transform=(current.settings.mirror?'scaleX(-1) ':'')+`translateY(${manualY}px)`; };
  applyTransform();
  if(mode!=='noaudio'){
    const ready=await ensureReadingMic();
    if(!ready){setStatus('red','Microfone não disponível para controlar a rolagem');return;}
    setStatus('yellow',mode==='semi'?'🎙️ Semi-automático: fale para avançar o texto':'🎙️ Fale para rolar o texto');
  }else{
    voiceActive=true;
    setStatus('green','Rolagem automática');
  }
  lastManualTs=performance.now();
  if(manualRaf)cancelAnimationFrame(manualRaf);
  const tick=(ts)=>{
    const live=document.getElementById('promptText');
    if(!live)return;
    const dt=Math.min(0.05,Math.max(0,(ts-lastManualTs)/1000));
    let canScroll=false;
    if(started && !paused){
      if(mode==='noaudio'){
        canScroll=true;
      }else{
        const threshold=Math.max(0.004,voiceNoiseFloor*1.8);
        if(currentMicRms>threshold)voiceHoldUntil=ts+900;
        canScroll=ts<voiceHoldUntil;
        voiceActive=canScroll;
        setStatus(canScroll?'green':'yellow',canScroll?'🎙️ Lendo — texto rolando':'Pausa — aguardando sua fala');
      }
    }
    if(canScroll && manualY>scrollEndY){
      manualY=Math.max(scrollEndY,manualY-30*scrollSpeed*dt);
      applyTransform();
    }
    lastManualTs=ts;
    manualRaf=requestAnimationFrame(tick);
  };
  manualRaf=requestAnimationFrame(tick);
}
let pausedAt=0,pausedTotal=0;
function togglePause(){
  if(!started)return;
  paused=!paused;
  if(paused){pausedAt=Date.now();voiceActive=false;setStatus('yellow','Pausado')}
  else{pausedTotal+=Date.now()-pausedAt;pausedAt=0;setStatus('green','Leitura retomada')}
  try{if(paused&&mediaRecorder?.state==='recording')mediaRecorder.pause();else if(!paused&&mediaRecorder?.state==='paused')mediaRecorder.resume()}catch(e){setStatus('red','Não foi possível pausar a gravação')}
  if($('#pause'))$('#pause').textContent=paused?'▶':'⏸';
}
function parseTime(v){
  const p=String(v||'').split(':').map(Number);
  if(p.length<2||p.length>3||p.some(n=>!Number.isFinite(n)||n<0))return 0;
  return p[0]*3600+p[1]*60+(p[2]||0);
}
function updateTimer(){
  if(!$('#timer')||!startTime)return;let sec=Math.max(0,Math.floor(((pausedAt||Date.now())-startTime-pausedTotal)/1000));
  $('#timer').textContent=new Date(sec*1000).toISOString().slice(11,19);
  if(targetSeconds&&current.settings.runnerOn){
    const total=Math.max(1,scrollStartY-scrollEndY);
    const done=Math.max(0,Math.min(1,(scrollStartY-manualY)/total));
    const expected=Math.min(1,sec/targetSeconds);
    const behind=expected-done>0.05 && done<1;
    $('#runner').classList.toggle('show',behind);
  }else if($('#runner'))$('#runner').classList.remove('show');
}
function setStatus(c,t){const dot=$('#statusDot'),text=$('#statusText');if(dot&&dot.className!=='dot '+c)dot.className='dot '+c;if(text&&text.textContent!==t)text.textContent=t}
function stopAll(){
  document.onkeydown=null;
  sessionId++;
  started=false;
  listening=false;
  paused=false;
  voiceActive=false;
  if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null}
  if(recognition){try{recognition.onend=null;recognition.onresult=null;recognition.onerror=null;recognition.stop()}catch(e){}recognition=null}
  if(commandRecognition){try{commandRecognition.onend=null;commandRecognition.onresult=null;commandRecognition.onerror=null;commandRecognition.stop()}catch(e){}commandRecognition=null}
  if(manualTimer){clearInterval(manualTimer);manualTimer=null}
  if(manualRaf){cancelAnimationFrame(manualRaf);manualRaf=null}
  if(elapsedTimer){clearInterval(elapsedTimer);elapsedTimer=null}
  readingMicStream?.getTracks().forEach(t=>t.stop());readingMicStream=null;
  document.querySelector('.countdown-overlay')?.remove();$('#manualStart')?.remove();closeMicTest();
  stopLiveMicMeter();
  if(mediaRecorder&&mediaRecorder.state!=='inactive'){
    try{reviewAfterStop=false;mediaRecorder.onstop=null;mediaRecorder.ondataavailable=null;mediaRecorder.onerror=null;mediaRecorder.stop()}catch(e){}
  }
  mediaRecorder=null;
  recordingActive=false;stopCameraStreams();pausedAt=0;pausedTotal=0;
} 
function stopRecognition(){stopAll()}
document.addEventListener('touchstart',()=>{if(document.body.classList.contains('prompter'))resumeLiveMicContext()},{passive:true});
document.addEventListener('pointerdown',()=>{if(document.body.classList.contains('prompter'))resumeLiveMicContext()},{passive:true});
