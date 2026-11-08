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
  prepCameraStream=await requestSelectedCameraStream();
  updateCameraCapabilityHint(prepCameraStream);
  return prepCameraStream;
}

let micStream=null,micAudioContext=null,micAnalyser=null,micRaf=null;
let prepCameraStream=null;
let prepMicStream=null;
let prepCombinedStream=null;
let prepAccessPromise=null;
let verticalCanvasStream=null;
let verticalCanvasElement=null;
let verticalCanvasAnimId=null;
function selectedMicConstraints(){const id=$('#mic')?.value||current.settings?.micDeviceId||'';return id?{deviceId:{exact:id}}:true}
function isIOSWebKit(){const ua=navigator.userAgent||'';return /iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function recordingOrientationConstraints(base,reverseOrientation=false){
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
}
function selectedCameraConstraints(reverseOrientation=false){
  const id=$('#camera')?.value||current.settings?.cameraDeviceId||'';
  return recordingOrientationConstraints(id?{deviceId:{exact:id}}:{facingMode:{ideal:current.settings?.mobileCameraFacing||'user'}},reverseOrientation);
}
async function waitForFirstCameraFrame(stream){
  const track=stream?.getVideoTracks?.()[0];if(!track)return null;
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.autoplay=true;video.width=1;video.height=1;
  video.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(video);video.srcObject=stream;
  let timer=null,finish;
  const firstFrame=new Promise(resolve=>{let done=false;finish=()=>{if(done)return;done=true;if(timer)clearTimeout(timer);resolve()};timer=setTimeout(finish,1500);if(video.readyState>=2&&video.videoWidth)finish();else if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(()=>finish());else video.addEventListener('loadeddata',finish,{once:true})});
  try{const play=video.play();if(play?.catch)play.catch(()=>{})}catch(e){}
  await firstFrame;
  const settings=track.getSettings?.()||{};const result={width:video.videoWidth||settings.width||0,height:video.videoHeight||settings.height||0};
  try{video.pause();video.srcObject=null;video.remove()}catch(e){}
  return result;
}
async function requestSelectedCameraStream(){
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
}

async function getOrientationFixedCanvasStream(videoTrack, orientation, targetWidth, targetHeight){
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
  };
  draw();

  const fps=Number(current.settings?.recordFps)||30;
  return canvas.captureStream(fps);
}

function stopOrientationCanvasStream(){
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
}

async function applyRecordingOrientation(stream){
  const track=stream?.getVideoTracks?.()[0];
  if(track&&isIOSWebKit())await waitForFirstCameraFrame(stream);
  else try{await track?.applyConstraints(recordingOrientationConstraints({},false));}catch(e){}
  updateCameraCapabilityHint(stream);
}

function updateCameraCapabilityHint(stream){
  const el=$('#cameraCapabilityHint'); if(!el)return;
  const track=stream?.getVideoTracks?.()[0]; const st=track?.getSettings?.()||{}; const caps=track?.getCapabilities?.()||{};
  const parts=[]; if(st.width&&st.height)parts.push(`Atual: ${st.width} × ${st.height}`); if(st.frameRate)parts.push(`${Math.round(st.frameRate)} fps`);
  if(st.width&&st.height){const wanted=current.settings?.mobileRecordOrientation||'portrait',actual=st.height>st.width?'portrait':'landscape';parts.push(`Orientação ${actual===wanted?'aplicada':'retornada diferente'} (solicitada: ${wanted==='portrait'?'vertical':'horizontal'}; câmera: ${actual==='portrait'?'vertical':'horizontal'})`)}
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
