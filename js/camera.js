/* One camera source, one oriented output for preview, reading and recording. */
function cameraAbort(){return new DOMException('Solicitação de câmera cancelada','AbortError')}
function stopMediaTracks(stream){stream?.getTracks().forEach(track=>track.stop())}
function cameraConfiguration(settings={}){
  return {
    deviceId:String(settings.cameraDeviceId||''),
    facing:settings.mobileCameraFacing==='environment'?'environment':'user',
    orientation:settings.mobileRecordOrientation==='landscape'?'landscape':'portrait',
    resolution:['720','1080','2160'].includes(String(settings.recordResolution))?String(settings.recordResolution):'auto',
    fps:String(settings.recordFps)==='60'?60:30
  };
}
function cameraSourceConstraints(config,portraitPrimary=false){
  const long=config.resolution==='2160'?3840:config.resolution==='720'?1280:1920;
  // Capture constraints use the sensor's primary coordinates, not the output orientation.
  const video={width:{ideal:portraitPrimary?long*9/16:long},height:{ideal:portraitPrimary?long:long*9/16},
    aspectRatio:{exact:portraitPrimary?9/16:16/9},resizeMode:{ideal:'crop-and-scale'},frameRate:{ideal:config.fps}};
  if(config.deviceId)video.deviceId={exact:config.deviceId};
  else video.facingMode={ideal:config.facing};
  return video;
}
function cameraFrameAlignment(width,height,config){
  const standard=width>0&&height>0&&Math.abs(Math.max(width,height)/Math.min(width,height)-16/9)<.025;
  const orientation=config.orientation==='portrait'?height>width:width>height;
  return {standard,aligned:standard&&orientation};
}
function cameraOrientationMessage(config){return config.orientation==='portrait'?'Vire o celular para a vertical e mantenha-o nessa posição durante a tomada.':'Vire o celular para a horizontal e mantenha-o nessa posição durante a tomada.'}
function cameraFrameGeometry(sourceWidth,sourceHeight,config,output){
  if(!(sourceWidth>0&&sourceHeight>0))throw new Error('A câmera ainda não entregou uma imagem');
  const ratio=config.orientation==='landscape'?16/9:9/16;
  const requestedLong=config.resolution==='2160'?3840:config.resolution==='1080'?1920:config.resolution==='720'?1280:0;
  const limit=Math.min(requestedLong||1920,Math.max(sourceWidth,sourceHeight));
  const long=[3840,1920,1280].find(value=>value<=limit)||Math.max(16,Math.floor(limit/16)*16);
  const width=output?.width||Math.max(2,Math.floor((ratio>1?long:long*ratio)/2)*2);
  const height=output?.height||Math.max(2,Math.floor((ratio>1?long/ratio:long)/2)*2);
  const scale=Math.min(width/sourceWidth,height/sourceHeight);
  const dw=sourceWidth*scale,dh=sourceHeight*scale;
  return {width,height,sx:0,sy:0,sw:sourceWidth,sh:sourceHeight,
    dx:(width-dw)/2,dy:(height-dh)/2,dw,dh,upscaled:scale>1.01};
}
class CameraController{
  constructor(){
    this.version=0;this.pending=null;this.key='';this.source=null;this.output=null;
    this.host=null;this.video=null;this.canvas=null;this.frameHandle=null;
    this.frameKind='';this.lastFrame=-Infinity;this.info=null;this.onInterrupt=null;
    this.cancelReady=null;this.state='idle';this.locked=false;this.onGeometryChange=null;this.alignmentInterrupted=false;
  }
  async open(settings){
    const config=cameraConfiguration(settings),key=JSON.stringify(config);
    if(this.locked&&key!==this.key)throw new Error('Finalize a tomada antes de mudar a câmera ou o formato');
    if(this.key===key&&this.output?.getVideoTracks().some(t=>t.readyState==='live'))return this.output;
    if(this.key===key&&this.pending)return this.pending;
    const previous=this.pending;
    this.stop();this.key=key;this.state='opening';
    const version=this.version;
    const request=this.openSource(config,version,previous);
    this.pending=request;
    try{return await request}
    finally{if(this.pending===request)this.pending=null}
  }
  valid(version){if(this.version!==version)throw cameraAbort()}
  lock(){if(this.output)this.locked=true}
  async openSource(config,version,previous){
    try{
      // Serialize permission requests; canceled results are closed before a new source opens.
      if(previous)await previous.catch(()=>{});
      this.valid(version);
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Abra por HTTPS ou localhost para acessar a câmera');
      let source;
      try{source=await navigator.mediaDevices.getUserMedia({video:cameraSourceConstraints(config),audio:false})}
      catch(error){
        this.valid(version);
        if(error.name!=='OverconstrainedError'||error.constraint==='deviceId')throw error;
        source=await navigator.mediaDevices.getUserMedia({video:cameraSourceConstraints(config,true),audio:false});
      }
      if(this.version!==version){stopMediaTracks(source);throw cameraAbort()}
      this.source=source;
      const host=document.createElement('div');host.className='camera-engine';host.setAttribute('aria-hidden','true');
      const video=document.createElement('video');video.muted=true;video.autoplay=true;video.playsInline=true;
      video.setAttribute('playsinline','');video.setAttribute('muted','');
      const canvas=document.createElement('canvas');host.append(video,canvas);
      // The source must survive body.innerHTML screen transitions, including on iOS.
      document.documentElement.appendChild(host);
      this.host=host;this.video=video;this.canvas=canvas;video.srcObject=source;
      await this.waitForImage(video,version);
      this.valid(version);
      if(!cameraFrameAlignment(video.videoWidth,video.videoHeight,config).standard){
        const error=new Error('A câmera não entregou um quadro 9:16 ou 16:9. Escolha HD ou Automática e teste novamente.');error.name='CameraFormatError';throw error;
      }
      const geometry=cameraFrameGeometry(video.videoWidth,video.videoHeight,config);
      canvas.width=geometry.width;canvas.height=geometry.height;
      const context=canvas.getContext('2d',{alpha:false});
      if(!context||typeof canvas.captureStream!=='function')throw new Error('Este navegador não oferece a saída de câmera orientada. Use uma versão atual do Safari ou Chrome');
      const input=source.getVideoTracks()[0],actual=input.getSettings?.()||{};
      const fps=Math.min(config.fps,actual.frameRate>0?actual.frameRate:config.fps);
      this.info={...geometry,fps,sourceWidth:video.videoWidth,sourceHeight:video.videoHeight,config,renderedFrames:0};
      this.drawFrame(context);
      const output=canvas.captureStream(fps);
      if(!output.getVideoTracks().some(t=>t.readyState==='live')){stopMediaTracks(output);throw new Error('Não foi possível criar a saída de vídeo')}
      this.output=output;this.state='ready';
      input.addEventListener('ended',()=>{if(this.version===version)this.interrupted('A câmera foi desconectada ou sua permissão foi removida')});
      input.addEventListener('mute',()=>{if(this.version===version)this.onInterrupt?.('A câmera foi temporariamente interrompida',false)});
      const tick=now=>{
        if(this.version!==version)return;
        if(now-this.lastFrame>=1000/fps-2&&video.readyState>=2){
          try{this.drawFrame(context);if(this.version!==version)return;this.lastFrame=now}catch(error){this.interrupted('Falha ao processar a imagem da câmera');return}
        }
        this.scheduleFrame(tick);
      };
      this.scheduleFrame(tick);
      return output;
    }catch(error){if(this.version===version)this.stop();throw error}
  }
  waitForImage(video,version){
    return new Promise((resolve,reject)=>{
      let timer;
      const cleanup=()=>{clearTimeout(timer);for(const event of ['loadeddata','resize','playing'])video.removeEventListener(event,check);video.removeEventListener('error',failed);if(this.cancelReady===cancel)this.cancelReady=null};
      const cancel=()=>{cleanup();reject(cameraAbort())};
      const check=()=>{if(this.version!==version){cancel();return}if(video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0){cleanup();resolve()}};
      const failed=()=>{cleanup();reject(new Error('Não foi possível reproduzir a imagem da câmera'))};
      this.cancelReady=cancel;
      for(const event of ['loadeddata','resize','playing'])video.addEventListener(event,check);
      video.addEventListener('error',failed);
      timer=setTimeout(()=>{cleanup();reject(new Error('A câmera não entregou imagem em 15 segundos. Teste novamente'))},15000);
      Promise.resolve(video.play()).then(check,error=>{cleanup();reject(error)});
      check();
    });
  }
  drawFrame(context){
    const width=this.video.videoWidth,height=this.video.videoHeight;
    const aligned=cameraFrameAlignment(width,height,this.info.config).aligned;
    const changed=aligned!==this.info.orientationAligned||width!==this.info.sourceWidth||height!==this.info.sourceHeight;
    this.info.sourceWidth=width;this.info.sourceHeight=height;this.info.orientationAligned=aligned;
    if(changed)this.onGeometryChange?.(this.info);
    if(!aligned&&this.locked){
      if(!this.alignmentInterrupted){this.alignmentInterrupted=true;this.onInterrupt?.(cameraOrientationMessage(this.info.config),false)}
      return;
    }
    if(aligned)this.alignmentInterrupted=false;
    const g=cameraFrameGeometry(this.video.videoWidth,this.video.videoHeight,this.info.config,this.canvas);
    // Output dimensions stay fixed for the take, even if the phone rotates.
    context.fillStyle='#000';context.fillRect(0,0,this.canvas.width,this.canvas.height);
    context.drawImage(this.video,g.sx,g.sy,g.sw,g.sh,g.dx,g.dy,g.dw,g.dh);
    this.info.sourceWidth=this.video.videoWidth;this.info.sourceHeight=this.video.videoHeight;
    this.info.upscaled=g.upscaled;
    this.info.renderedFrames++;
  }
  scheduleFrame(callback){
    if(typeof this.video.requestVideoFrameCallback==='function'){
      this.frameKind='video';this.frameHandle=this.video.requestVideoFrameCallback(callback);
    }else{this.frameKind='raf';this.frameHandle=requestAnimationFrame(callback)}
  }
  async attach(element){
    if(!element||!this.output)return false;
    const version=this.version;
    element.muted=true;element.autoplay=true;element.playsInline=true;
    element.setAttribute('playsinline','');element.srcObject=this.output;
    await element.play();this.valid(version);
    return true;
  }
  interrupted(message){this.state='interrupted';this.onInterrupt?.(message,true)}
  stop(){
    this.locked=false;
    this.version++;
    this.cancelReady?.();this.cancelReady=null;
    if(this.frameHandle!==null){
      if(this.frameKind==='video')this.video?.cancelVideoFrameCallback?.(this.frameHandle);
      else cancelAnimationFrame(this.frameHandle);
    }
    this.frameHandle=null;
    stopMediaTracks(this.output);stopMediaTracks(this.source);
    if(this.video){this.video.pause();this.video.srcObject=null}
    this.host?.remove();this.host=null;this.video=null;this.canvas=null;
    this.source=null;this.output=null;this.info=null;this.key='';this.state='idle';this.alignmentInterrupted=false;
  }
}
const cameraController=new CameraController();
