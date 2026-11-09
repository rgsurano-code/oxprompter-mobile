const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function track(kind='video',settings={}){
  const listeners={};
  return {kind,readyState:'live',getSettings:()=>({...settings}),getCapabilities:()=>({}),
    stop(){this.readyState='ended'},clone(){return track(kind,settings)},
    addEventListener(name,fn){(listeners[name]??=[]).push(fn)},
    emit(name){if(name==='ended')this.readyState='ended';for(const fn of listeners[name]||[])fn()},
    applyConstraints:async()=>{}};
}
function stream(tracks){return {getTracks:()=>tracks,getVideoTracks:()=>tracks.filter(t=>t.kind==='video'),getAudioTracks:()=>tracks.filter(t=>t.kind==='audio')}}
function environment(options={}){
  const nodes=new Map(),store=new Map(),alerts=[],requests=[],draws=[];let uuid=0,raf=0;
  function element(tag='div'){
    const listeners={};const classes=new Set();
    const el={tagName:tag.toUpperCase(),dataset:{},style:{},value:'',checked:false,isConnected:true,children:[],
      classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(){}},
      setAttribute(name,value){this[name]=value},getAttribute(name){return this[name]},
      append(...items){for(const item of items)this.appendChild(item)},appendChild(child){this.children.push(child);child.parentElement=this;if(child.id)nodes.set('#'+child.id,child);return child},
      add(child){this.appendChild(child)},focus(){},click(){return this.onclick?.({target:this})},
      remove(){this.isConnected=false;if(this.id)nodes.delete('#'+this.id)},
      addEventListener(name,fn){(listeners[name]??=[]).push(fn)},removeEventListener(name,fn){listeners[name]=(listeners[name]||[]).filter(f=>f!==fn)},
      dispatch(name){this['on'+name]?.({target:this});for(const fn of listeners[name]||[])fn({target:this})},
      querySelector:selector=>nodes.get(selector),querySelectorAll:()=>[],
      readyState:2,videoWidth:options.sourceWidth||720,videoHeight:options.sourceHeight||1280,
      play:async()=>{},pause(){},load(){},
      getContext:()=>({drawImage(...args){draws.push(args)},fillRect(){},fillStyle:''}),
      captureStream(){if(options.noCanvas)throw new Error('captureStream indisponível');return stream([track('video',{width:this.width,height:this.height,frameRate:30})])}
    };
    Object.defineProperty(el,'innerHTML',{configurable:true,set(html){
      if(el===body){for(const node of nodes.values())node.isConnected=false;nodes.clear()}
      for(const match of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/gi)){
        const child=element(match[1]);child.id=match[2];
        const value=/\bvalue="([^"]*)"/.exec(match[0]);if(value)child.value=value[1];child.checked=/\bchecked\b/.test(match[0]);
        nodes.set('#'+child.id,child);
      }
    }});return el;
  }
  const body=element('body'),root=element('html');
  const document={body,documentElement:root,createElement:element,addEventListener(){},
    querySelector(selector){return nodes.get(selector)||nodes.get(selector.match(/#[\w-]+$/)?.[0])},querySelectorAll:()=>[]};
  const cameraSources=[];
  const mediaDevices={async getUserMedia(constraints){
    requests.push(constraints);
    if(options.getUserMedia)return options.getUserMedia(constraints);
    const source=stream([track(constraints.video?'video':'audio',{deviceId:constraints.video?.deviceId?.exact||'default',frameRate:30})]);cameraSources.push(source);return source;
  },enumerateDevices:async()=>[]};
  const sandbox={document,window:{scrollTo(){}},navigator:{mediaDevices},Option:function(text,value){const el=element('option');el.textContent=text;el.value=value;return el},
    alert:message=>alerts.push(message),confirm:()=>false,console,TextDecoder,TextEncoder,DOMException,Blob,Uint8Array,
    URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},crypto:{randomUUID:()=> 'new-'+(++uuid)},
    localStorage:{getItem:key=>store.get(key)||null,setItem(key,value){if(options.quota)throw new Error('quota');store.set(key,value)}},
    requestAnimationFrame:()=>++raf,cancelAnimationFrame(){},setTimeout,clearTimeout,setInterval,clearInterval,
    performance:{now:()=>100},MediaStream:function(tracks){return stream(tracks)}};
  vm.createContext(sandbox);
  for(const file of ['core','documents','library','preparation','camera','media','reader','speech'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),sandbox,{filename:file+'.js'});
  const run=code=>vm.runInContext(code,sandbox);
  run('exportScripts=()=>{};resizePrompter=()=>{}');
  return {run,sandbox,nodes,store,alerts,requests,draws,cameraSources,element,body};
}

test('importar após abrir um roteiro cria outro roteiro e preserva o original',async()=>{
  const e=environment();e.run("db.scripts=[{id:'original',name:'Original',text:'Texto original',settings:{}}];showBiblioteca();loadScriptIntoHome('original');prepare=()=>{}");
  const input=e.nodes.get('#fileInput');await input.onchange({target:{files:[{name:'novo.txt',size:10,text:async()=> 'Texto importado'}],value:'novo.txt'}});
  e.nodes.get('#quickCreate').onclick();
  assert.equal(e.run('db.scripts.length'),2);assert.equal(e.run('db.scripts[0].text'),'Texto original');assert.equal(e.run('db.scripts[1].text'),'Texto importado');
});
test('troca de senha não confirma sucesso quando o armazenamento falha',async()=>{
  const e=environment({quota:true});e.run("db.passwordHash='antiga';hash=async value=>value;security()");
  e.nodes.get('#old').value='antiga';e.nodes.get('#newp').value='nova';await e.nodes.get('#change').onclick();
  assert.equal(e.run('db.passwordHash'),'antiga');assert.match(e.nodes.get('#msg').textContent,/Não foi possível/);assert.equal(e.run('window.unsavedChanges'),true);
});
test('falha ao salvar um roteiro conserva o texto em memória sem avançar',()=>{
  const e=environment({quota:true});e.run('showBiblioteca();prepare=()=>{window.prepared=true}');
  e.nodes.get('#quickText').value='Texto que deve ser preservado';e.nodes.get('#quickCreate').onclick();e.nodes.get('#quickCreate').onclick();
  assert.equal(e.run('db.scripts.length'),1);assert.equal(e.run('window.prepared'),undefined);assert.ok(e.nodes.get('#storageNotice'));
});
test('configurações são persistidas ao mudar, antes de iniciar a leitura',()=>{
  const e=environment();e.run("current={id:'1',name:'Teste',text:'Texto',settings:{}};db.scripts=[current];prepare()");
  for(const [id,value] of [['mode','noaudio'],['mirror','yes'],['count','10']]){const node=e.nodes.get('#'+id);node.value=value;node.dispatch('change')}
  const record=e.nodes.get('#recordOn');record.checked=false;record.dispatch('change');
  const saved=JSON.parse(e.store.get('tp_data_v1')).scripts[0].settings;
  assert.equal(saved.mode,'noaudio');assert.equal(saved.mirror,true);assert.equal(saved.count,10);assert.equal(saved.recordOn,false);
});
test('RTF remove comandos, fontes e interpreta Unicode e acentos',()=>{
  const e=environment();e.sandbox.rtf=String.raw`{\rtf1\ansi\ansicpg1252{\fonttbl{\f0 Arial;}}\fs24 Ol\'e1\par \uc1\u231?\u227?o}`;
  assert.equal(e.run('rtfToText(rtf)'),'Olá\nção');
});
test('entidades XML são decodificadas uma vez e preservam Unicode completo',()=>{
  const e=environment();assert.equal(e.run("xmlEntities('&#128512; &#x1F600; &amp;lt; &#99999999;')"),'😀 😀 &lt; &#99999999;');
});
test('durações inválidas são rejeitadas',()=>{
  const e=environment();for(const value of ['00:99','00:01:60','1::2','1.5:20','-1:30']){e.sandbox.duration=value;assert.equal(e.run('parseTime(duration)'),0)}
  assert.equal(e.run("parseTime('01:02:03')"),3723);
});
test('texto do teleprompter preserva parágrafos e não interpreta HTML',()=>{
  const e=environment();e.nodes.set('#promptText',e.element());e.nodes.set('#guide',e.element());
  let html='';Object.defineProperty(e.nodes.get('#promptText'),'innerHTML',{configurable:true,set:value=>html=value});
  e.sandbox.fixtureText='Primeiro\n\nSegundo <fim> [NOTA]';e.run('current={text:fixtureText};renderPrompt()');
  assert.match(html,/\n\n/);assert.match(html,/&lt;fim&gt;/);assert.doesNotMatch(html,/NOTA/);
});
test('configuração explícita de câmera tem prioridade sobre frontal/traseira',()=>{
  const e=environment();const c=JSON.parse(e.run("JSON.stringify(cameraSourceConstraints(cameraConfiguration({cameraDeviceId:'externa',mobileCameraFacing:'environment',mobileRecordOrientation:'portrait',recordResolution:'720'})))"));
  assert.deepEqual(c.deviceId,{exact:'externa'});assert.equal(c.facingMode,undefined);assert.equal(c.width.ideal,1280);assert.equal(c.height.ideal,720);assert.equal(c.aspectRatio.exact,16/9);
});
test('vertical e horizontal produzem as dimensões pedidas sem deformação',()=>{
  const e=environment();for(const [mode,w,h] of [['portrait',720,1280],['landscape',1280,720]]){
    const g=JSON.parse(e.run(`JSON.stringify(cameraFrameGeometry(${w},${h},cameraConfiguration({mobileRecordOrientation:'${mode}',recordResolution:'720'})))`));
    assert.equal(g.width,w);assert.equal(g.height,h);assert.equal(g.dx,0);assert.equal(g.dy,0);assert.equal(g.sw,w);assert.equal(g.sh,h);
  }
});
test('pedido de 4K não amplia artificialmente uma fonte Full HD',()=>{
  const e=environment();const g=JSON.parse(e.run("JSON.stringify(cameraFrameGeometry(1080,1920,cameraConfiguration({recordResolution:'2160'})))"));
  assert.equal(g.width,1080);assert.equal(g.height,1920);assert.equal(g.upscaled,false);
});
test('fonte quase quadrada do vídeo recebido não é gravada dentro de um quadro vertical',async()=>{
  const e=environment({sourceWidth:2448,sourceHeight:2160});await assert.rejects(e.run('cameraController.open({})'),{name:'CameraFormatError'});
  assert.equal(e.run('cameraController.output'),null);assert.equal(e.cameraSources[0].getTracks()[0].readyState,'ended');
});
test('orientação primária alternativa é tentada somente após restrição não suportada',async()=>{
  let calls=0;const source=stream([track()]);
  const e=environment({getUserMedia:async()=>{if(++calls===1){const error=new Error('Aspecto não suportado');error.name='OverconstrainedError';error.constraint='aspectRatio';throw error}return source}});
  await e.run('cameraController.open({})');assert.equal(calls,2);
  assert.equal(e.requests[0].video.aspectRatio.exact,16/9);assert.equal(e.requests[1].video.aspectRatio.exact,9/16);e.run('cameraController.stop()');
});
test('formato horizontal recebido para uma tomada vertical impede o início',async()=>{
  const e=environment({sourceWidth:1280,sourceHeight:720});let constructed=false;
  class Recorder{static isTypeSupported(){return true}constructor(){constructed=true}}
  e.sandbox.MediaRecorder=Recorder;e.sandbox.window.MediaRecorder=Recorder;e.run("current={settings:{recordOn:true,recordAudioOn:false,mode:'noaudio',mobileRecordOrientation:'portrait'}}");
  assert.equal(await e.run('startCameraAndRecording()'),false);assert.equal(constructed,false);assert.ok(e.alerts.some(message=>message.includes('vertical')));
});
test('girar a câmera durante uma tomada não desenha quadros na orientação errada',async()=>{
  const e=environment();await e.run('cameraController.open({})');e.run('cameraController.lock()');
  let interruptions=0;e.sandbox.interrupt=()=>interruptions++;e.run('cameraController.onInterrupt=interrupt;cameraController.video.videoWidth=1280;cameraController.video.videoHeight=720');
  const before=e.draws.length;e.sandbox.context={fillRect(){},drawImage(){throw Error('Não deve desenhar o quadro incorreto')}};
  e.run('cameraController.drawFrame(context);cameraController.drawFrame(context)');assert.equal(interruptions,1);assert.equal(e.draws.length,before);assert.equal(e.run('cameraController.info.orientationAligned'),false);e.run('cameraController.stop()');
});
test('duas solicitações simultâneas usam uma única câmera',async()=>{
  const e=environment();const [a,b]=await Promise.all([e.run('cameraController.open({})'),e.run('cameraController.open({})')]);
  assert.equal(e.requests.length,1);assert.equal(a,b);e.run('cameraController.stop()');assert.equal(e.cameraSources[0].getTracks()[0].readyState,'ended');
});
test('câmera e formato não podem ser trocados durante a tomada',async()=>{
  const e=environment();await e.run("cameraController.open({mobileRecordOrientation:'portrait'})");e.run('cameraController.lock()');
  await assert.rejects(e.run("cameraController.open({mobileRecordOrientation:'landscape'})"),/Finalize a tomada/);
  assert.equal(e.requests.length,1);assert.equal(e.cameraSources[0].getTracks()[0].readyState,'live');e.run('cameraController.stop()');
});
test('permissão de câmera concedida depois de sair é encerrada',async()=>{
  let resolve;const source=stream([track()]);const e=environment({getUserMedia:()=>new Promise(r=>resolve=r)});
  const pending=e.run('cameraController.open({})');e.run('cameraController.stop()');resolve(source);
  await assert.rejects(pending,{name:'AbortError'});assert.equal(source.getTracks()[0].readyState,'ended');assert.equal(e.run('cameraController.output'),null);
});
test('troca de câmera cancela a abertura anterior e fecha sua fonte',async()=>{
  let resolve;let calls=0;const old=stream([track()]),next=stream([track()]);
  const e=environment({getUserMedia:()=>++calls===1?new Promise(r=>resolve=r):Promise.resolve(next)});
  const first=e.run("cameraController.open({cameraDeviceId:'primeira'})");const firstRejected=assert.rejects(first,{name:'AbortError'});
  const second=e.run("cameraController.open({cameraDeviceId:'segunda'})");assert.equal(calls,1);resolve(old);
  await firstRejected;await second;assert.equal(calls,2);assert.equal(old.getTracks()[0].readyState,'ended');e.run('cameraController.stop()');
});
test('erro ao criar saída de câmera libera a câmera física',async()=>{
  const e=environment({noCanvas:true});await assert.rejects(e.run('cameraController.open({})'),/captureStream/);
  assert.equal(e.cameraSources[0].getTracks()[0].readyState,'ended');assert.equal(e.run('cameraController.output'),null);
});
test('saída é reutilizada da prévia para a leitura sem abrir outra câmera',async()=>{
  const e=environment();e.run("current={settings:{mobileRecordOrientation:'portrait',recordResolution:'720'}}");
  const first=await e.run('ensurePrepCameraAccess()');const preview=e.element('video'),reading=e.element('video');
  e.sandbox.preview=preview;e.sandbox.reading=reading;await e.run('cameraController.attach(preview)');await e.run('cameraController.attach(reading)');
  const second=await e.run('ensurePrepCameraAccess()');assert.equal(first,second);assert.equal(preview.srcObject,reading.srcObject);assert.equal(e.requests.length,1);e.run('stopPrepMedia()');
});
test('aguardar comando de voz preserva a câmera conferida na preparação',async()=>{
  const e=environment();e.run("current={settings:{mode:'audio',mobileRecordOrientation:'portrait',startCmds:[{phrase:'começar'}]}};startStartCommandListener=()=>{window.waitingForCommand=true}");
  const camera=await e.run('ensurePrepCameraAccess()');await e.run('prepareReadingSession()');
  assert.equal(e.run('window.waitingForCommand'),true);assert.equal(camera.getVideoTracks()[0].readyState,'live');assert.equal(e.run('cameraController.output'),camera);assert.equal(e.requests.length,1);e.run('stopPrepMedia()');
});
test('permissão tardia de microfone também é encerrada',async()=>{
  let resolve;const source=stream([track('audio')]);const e=environment({getUserMedia:()=>new Promise(r=>resolve=r)});
  e.run('current={settings:{}}');const pending=e.run('ensurePrepMicAccess()');e.run('stopPrepMic()');resolve(source);
  await assert.rejects(pending,{name:'AbortError'});assert.equal(source.getTracks()[0].readyState,'ended');
});
test('falha do gravador libera câmera e microfone',async()=>{
  const e=environment();class BrokenRecorder{static isTypeSupported(){return true}constructor(){throw new DOMException('Sem suporte','NotSupportedError')}}
  e.sandbox.MediaRecorder=BrokenRecorder;e.sandbox.window.MediaRecorder=BrokenRecorder;
  e.run("current={settings:{recordOn:true,recordAudioOn:true,mobileCameraBg:false,mode:'noaudio'}}");
  assert.equal(await e.run('startCameraAndRecording()'),false);
  assert.ok(e.cameraSources.length>=2);assert.ok(e.cameraSources.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
});
test('finalização antiga não encerra a gravação de uma nova sessão',()=>{
  const e=environment();const oldTrack=track(),newTrack=track();e.sandbox.oldRec={stream:stream([oldTrack])};e.sandbox.newRec={stream:stream([newTrack])};
  e.run('mediaRecorder=newRec;recordStream=newRec.stream;finishRecording(oldRec,[])');
  assert.equal(oldTrack.readyState,'ended');assert.equal(newTrack.readyState,'live');assert.equal(e.run('mediaRecorder===newRec'),true);
});
test('desconexão da câmera durante a contagem cancela a tomada preparada',async()=>{
  const e=environment();class Recorder{static isTypeSupported(){return true}constructor(s){this.stream=s;this.state='inactive';this.mimeType='video/webm'}}
  e.sandbox.MediaRecorder=Recorder;e.sandbox.window.MediaRecorder=Recorder;
  e.run("current={settings:{recordOn:true,recordAudioOn:false,mobileCameraBg:false,mode:'noaudio'}};offerStartRetry=()=>{window.retryOffered=true};document.body.classList.add('prompter')");
  assert.equal(await e.run('startCameraAndRecording()'),true);e.run('countdownTimer=setInterval(()=>{},10000)');
  e.cameraSources[0].getVideoTracks()[0].emit('ended');
  assert.equal(e.run('mediaRecorder'),null);assert.equal(e.run('countdownTimer'),null);assert.equal(e.run('cameraController.source'),null);assert.equal(e.run('window.retryOffered'),true);
});
test('falha ao iniciar o gravador também libera câmera e faixas preparadas',async()=>{
  const e=environment(),intervals=[];e.sandbox.setInterval=fn=>{intervals.push(fn);return intervals.length};e.sandbox.clearInterval=()=>{};
  e.run("current={settings:{recordOn:true,recordAudioOn:false,mode:'noaudio',count:1}};offerStartRetry=()=>{window.retryOffered=true}");
  const output=await e.run('ensurePrepCameraAccess()');const recordedTrack=output.getVideoTracks()[0].clone();
  e.sandbox.brokenRecorder={state:'inactive',stream:stream([recordedTrack]),start(){throw new Error('Não foi possível iniciar')}};
  e.run('mediaRecorder=brokenRecorder;recordStream=brokenRecorder.stream');await e.run('beginCountdownNow()');await intervals[0]();
  assert.equal(e.run('mediaRecorder'),null);assert.equal(e.run('cameraController.source'),null);assert.equal(recordedTrack.readyState,'ended');assert.equal(e.run('window.retryOffered'),true);
});
test('erro do gravador mantém os blocos e oferece revisão do arquivo parcial',async()=>{
  const e=environment();class Recorder{static isTypeSupported(){return true}constructor(s){this.stream=s;this.state='inactive';this.mimeType='audio/webm'}stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.())}}
  e.sandbox.MediaRecorder=Recorder;e.sandbox.window.MediaRecorder=Recorder;
  e.run("current={settings:{recordOn:false,recordAudioOn:true,mobileCameraBg:false,mode:'noaudio'}};showRecordingPreview=()=>{window.reviewShown=true}");
  assert.equal(await e.run('startCameraAndRecording()'),true);
  e.run("mediaRecorder.state='recording';mediaRecorder.ondataavailable({data:new Blob(['audio'],{type:'audio/webm'})});mediaRecorder.onerror()");
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(e.run('recordedBlob.size'),5);assert.equal(e.run('window.reviewShown'),true);assert.match(e.run('recordingFailure'),/interrompida/);
});
