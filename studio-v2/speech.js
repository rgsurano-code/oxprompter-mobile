import {normalize} from './store.js';
export class StartCommand {
 stop(){clearTimeout(this.timeout);if(this.rec){this.rec.onend=null;this.rec.onresult=null;this.rec.onerror=null;try{this.rec.abort()}catch(_){}this.rec=null;}}
 listen(phrases,onMatch,onStatus){
  this.stop();const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){onStatus('Comando de voz indisponível. Use Iniciar por toque.');return false;}
  const commands=phrases.map(normalize).filter(Boolean);if(!commands.length){onStatus('Adicione uma frase ou use Iniciar por toque.');return false;}
  const rec=new Speech();this.rec=rec;rec.lang='pt-BR';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=3;
  rec.onresult=event=>{if(this.rec!==rec)return;const candidates=[];for(let alt=0;alt<3;alt++){const pieces=[];for(let i=0;i<event.results.length;i++){const result=event.results[i];pieces.push(result[Math.min(alt,result.length-1)]?.transcript||'');}candidates.push(normalize(pieces.join(' ')));}if(commands.some(command=>candidates.some(value=>(' '+value+' ').includes(' '+command+' ')))){this.stop();onMatch();}};
  rec.onerror=event=>{if(this.rec!==rec)return;this.stop();onStatus('Não foi possível reconhecer o comando ('+event.error+'). Use Iniciar por toque.');};
  rec.onend=()=>{if(this.rec!==rec)return;this.stop();onStatus('A escuta terminou. Use Iniciar por toque.');};
  try{rec.start();this.timeout=setTimeout(()=>{this.stop();onStatus('Tempo de escuta encerrado. Use Iniciar por toque.');},30000);onStatus('Aguardando: “'+phrases.filter(Boolean).join('” ou “')+'”. Você também pode iniciar por toque.');return true;}catch(_){this.stop();onStatus('Comando indisponível. Use Iniciar por toque.');return false;}
 }
}
export class VoiceMeter {
 constructor(onLevel){this.onLevel=onLevel;this.hold=0;this.noise=.002;}
 async resume(){if(this.context?.state==='suspended'){const result=this.context.resume();await Promise.race([result,new Promise(resolve=>setTimeout(resolve,700))]);if(this.context.state!=='running')throw Error('Toque em Iniciar por toque para ativar o áudio.');}}
 unlock(){if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Medição indisponível. Use o modo automático.');this.context=new Audio();}this.context.resume().catch(()=>{});}
 async attach(track){
  if(this.track===track&&this.context){await this.resume();return;}
  cancelAnimationFrame(this.frame);this.source?.disconnect();this.unlock();this.track=track;await this.resume();this.analyser=this.context.createAnalyser();this.analyser.fftSize=1024;this.source=this.context.createMediaStreamSource(new MediaStream([track]));this.source.connect(this.analyser);const samples=new Float32Array(this.analyser.fftSize);
  const sample=()=>{if(!this.analyser)return;this.analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length);this.noise=this.noise*.98+Math.min(rms,.008)*.02;if(rms>Math.max(.006,this.noise*2.5))this.hold=performance.now()+650;this.onLevel(Math.min(100,rms*350),performance.now()<this.hold);this.frame=requestAnimationFrame(sample);};sample();
 }
 close(){cancelAnimationFrame(this.frame);this.source?.disconnect();if(this.context)this.context.close().catch(()=>{});this.context=null;this.analyser=null;this.source=null;this.track=null;this.hold=0;this.noise=.002;this.onLevel(0,false);}
}
