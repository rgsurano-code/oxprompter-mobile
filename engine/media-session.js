function mediaMessage(error) {
 const messages={NotAllowedError:'Acesso negado. Autorize a câmera e o microfone nas permissões deste site e tente novamente.',NotFoundError:'O aparelho não encontrou o dispositivo solicitado.',NotReadableError:'O dispositivo está ocupado ou indisponível. Feche outros aplicativos de câmera e tente novamente.',OverconstrainedError:'A configuração não está disponível. Escolha câmera automática ou resolução menor.',AbortError:'A operação foi cancelada.',SecurityError:'Abra o aplicativo por HTTPS para acessar câmera e microfone.'};
 return messages[error?.name]||error?.message||'Não foi possível acessar a mídia.';
}
function cameraConstraints(s) {
 const res={auto:[1280,720],720:[1280,720],1080:[1920,1080],2160:[3840,2160]}[s.resolution]||[1280,720];
 const [w,h]=s.orientation==='portrait'?[res[1],res[0]]:res;
 const c={width:{ideal:w},height:{ideal:h},aspectRatio:{ideal:w/h}};
 if(s.cameraId)c.deviceId={exact:s.cameraId};else c.facingMode={ideal:s.facing||'user'};
 if(['30','60'].includes(String(s.fps)))c.frameRate={ideal:Number(s.fps)};
 return c;
}
function mimeCandidates(video) {return video?['video/mp4','video/webm;codecs=vp8,opus','video/webm']:['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];}
class MediaSession extends EventTarget {
 constructor({getUserMedia=c=>navigator.mediaDevices.getUserMedia(c),Stream=globalThis.MediaStream,Recorder=globalThis.MediaRecorder}={}) {
  super();this.acquire=getUserMedia;this.Stream=Stream;this.Recorder=Recorder;this.tracks=[];this.epoch=0;this.queue=Promise.resolve();this.videoKey='';this.audioKey='';this.preview=null;this.previewStream=null;this.take=null;
 }
 live(kind){return this.tracks.find(t=>t.kind===kind&&t.readyState==='live');}
 emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
 ensure({video=false,audio=false,videoConstraints=true,audioConstraints=true,videoKey='',audioKey=''}={}) {
  const epoch=this.epoch;
  const request=async()=>{
   if(epoch!==this.epoch)throw new DOMException('Operação cancelada','AbortError');
   if(this.take&&this.take.recorder.state!=='inactive')throw Error('Finalize a gravação antes de mudar os dispositivos.');
   for(const [kind,wanted,key] of [['video',video,videoKey],['audio',audio,audioKey]]){
    if(wanted&&this.live(kind)&&this[kind+'Key']!==key){for(const track of this.tracks.filter(t=>t.kind===kind))track.stop();this.tracks=this.tracks.filter(t=>t.kind!==kind);}
   }
   const needVideo=video&&!this.live('video'),needAudio=audio&&!this.live('audio');
   if(needVideo||needAudio){
    const stream=await this.acquire({video:needVideo?videoConstraints:false,audio:needAudio?audioConstraints:false});
    if(epoch!==this.epoch){stream.getTracks().forEach(t=>t.stop());throw new DOMException('Operação cancelada','AbortError');}
    const wanted=(needVideo?['video']:[]).concat(needAudio?['audio']:[]);
    if(wanted.some(kind=>!stream.getTracks().some(t=>t.kind===kind&&t.readyState==='live'))){stream.getTracks().forEach(t=>t.stop());throw Error('O dispositivo não forneceu todas as faixas solicitadas.');}
    for(const track of stream.getTracks()){
     this.tracks.push(track);
     track.addEventListener?.('ended',()=>this.emit('interrupted',{kind:track.kind}));
     track.addEventListener?.('mute',()=>this.emit('muted',{kind:track.kind}));
     track.addEventListener?.('unmute',()=>this.emit('unmuted',{kind:track.kind}));
    }
    if(needVideo)this.videoKey=videoKey;if(needAudio)this.audioKey=audioKey;
   }
   this.tracks=this.tracks.filter(t=>t.readyState==='live');
   return new this.Stream(this.tracks);
  };
  const result=this.queue.then(request);this.queue=result.catch(()=>{});return result;
 }
 async attach(videoElement){
  this.preview=videoElement;const track=this.live('video');
  if(!track){videoElement.srcObject=null;throw Error('Teste a câmera para ativar a prévia.');}
  videoElement.muted=true;videoElement.defaultMuted=true;videoElement.autoplay=true;videoElement.playsInline=true;
  videoElement.setAttribute('playsinline','');videoElement.setAttribute('webkit-playsinline','');
  if(this.previewStream?.getVideoTracks()[0]!==track)this.previewStream=new this.Stream([track]);
  if(videoElement.srcObject!==this.previewStream)videoElement.srcObject=this.previewStream;
  await videoElement.play();return track.getSettings?.()||{};
 }
 startRecording({video,audio,start=true,videoTrack=null}) {
  if(!this.Recorder)throw Error('Este navegador não oferece gravação. A leitura continua disponível.');
  if(this.take&&!this.take.settled)throw Error('Finalize o processamento da gravação anterior.');
  if(videoTrack&&videoTrack.readyState!=='live')throw Error('Enquadramento sem imagem ativa.');
  const tracks=[video?(videoTrack||this.live('video')):null,audio?this.live('audio'):null].filter(Boolean);
  if((video&&!this.live('video'))||(audio&&!this.live('audio'))||!tracks.length)throw Error('Teste os dispositivos antes de gravar.');
  const mime=mimeCandidates(video).find(type=>this.Recorder.isTypeSupported?.(type));
  const stream=new this.Stream(tracks),recorder=mime?new this.Recorder(stream,{mimeType:mime}):new this.Recorder(stream);
  const take={recorder,chunks:[],bytes:0,video,mime:recorder.mimeType||mime||'',error:null};this.take=take;
  take.finished=new Promise((resolve,reject)=>{take.resolve=resolve;take.reject=reject;});take.finished.catch(()=>{});
  recorder.addEventListener('dataavailable',e=>{if(!take.cancelled&&e.data?.size){take.chunks.push(e.data);take.bytes+=e.data.size;if(take.bytes>300*1024*1024&&recorder.state!=='inactive'){this.emit('limit',{});recorder.stop();}}});
  recorder.addEventListener('error',e=>{take.error=e.error||Error('Falha na gravação.');this.emit('recorderror',take.error);if(recorder.state!=='inactive'){try{recorder.stop()}catch(_){take.reject(take.error)}}});
  recorder.addEventListener('stop',()=>{
   if(take.cancelled){take.settled=true;take.reject(new DOMException('Gravação descartada','AbortError'));return;}
   const type=recorder.mimeType||take.mime||take.chunks[0]?.type||'';
   const blob=new Blob(take.chunks,{type});
   if(!blob.size){take.settled=true;take.reject(take.error||Error('A gravação não gerou arquivo.'));return;}
   take.settled=true;take.blob=blob;take.resolve({blob,video:take.video,partial:!!take.error});this.emit('recorded',{blob,video:take.video,partial:!!take.error});
  },{once:true});
  try{if(start)recorder.start(1000)}catch(error){this.take=null;take.reject(error);throw error;}
  return recorder;
 }
 pause(){const r=this.take?.recorder;if(r?.state==='recording'){if(typeof r.pause!=='function')throw Error('Este navegador não permite pausar a gravação.');r.pause();}}
 resume(){const r=this.take?.recorder;if(r?.state==='paused')r.resume();}
 async finish(){const take=this.take;if(!take)throw Error('Nenhuma gravação ativa.');if(take.recorder.state!=='inactive')take.recorder.stop();return take.finished;}
 cancelRecording(){const take=this.take;if(!take)return;take.cancelled=true;take.settled=true;take.reject(new DOMException('Gravação descartada','AbortError'));if(take.recorder.state!=='inactive'){try{take.recorder.stop()}catch(_){}}this.take=null;}
 discard(){if(this.take&&this.take.recorder.state!=='inactive')throw Error('Finalize a gravação antes de excluir.');this.take=null;}
 releaseAudio(){for(const t of this.tracks.filter(t=>t.kind==='audio'))t.stop();this.tracks=this.tracks.filter(t=>t.kind!=='audio');}
 close(){this.epoch++;for(const track of this.tracks)track.stop();this.tracks=[];if(this.preview)this.preview.srcObject=null;this.previewStream=null;}
}
