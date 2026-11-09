function startStartCommandListener(onCommand,onFailure){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    setStatus('red','Comando de voz indisponível neste navegador');
    onFailure?.();
    return;
  }
  const cmds=(current.settings?.startCmds||[]).map(c=>normalize(c.phrase)).filter(Boolean);
  if(!cmds.length){onCommand?.();return}

  const mySession=sessionId;
  const rec=new SR();
  commandRecognition=rec;
  rec.lang='pt-BR';
  rec.continuous=true;
  rec.interimResults=true;
  rec.maxAlternatives=3;

  rec.onstart=()=>{if(mySession===sessionId&&commandRecognition===rec)setStatus('green','🎙️ Ouvindo comando: '+(current.settings.startCmds||[]).map(c=>c.phrase).filter(Boolean).join(' / '))};
  rec.onspeechstart=()=>{if(mySession===sessionId&&commandRecognition===rec)setStatus('green','🎙️ Voz detectada — reconhecendo…')};
  rec.onresult=e=>{
    if(mySession!==sessionId||commandRecognition!==rec)return;
    let txt='';
    for(let i=e.resultIndex;i<e.results.length;i++)txt+=(e.results[i][0]?.transcript||'')+' ';
    const n=normalize(txt);
    if(!n)return;
    const hit=cmds.find(c=>(' '+n+' ').includes(' '+c+' '));
    if(hit){
      try{rec.onend=null;rec.stop()}catch(e){}
      commandRecognition=null;
      setStatus('green','✓ Comando reconhecido: '+hit);
      onCommand?.();
    }else{
      setStatus('yellow','Ouvi: “'+txt.trim()+'” — aguardando comando');
    }
  };
  rec.onerror=e=>{
    if(mySession!==sessionId||commandRecognition!==rec)return;
    const msg={'not-allowed':'Permissão do microfone/reconhecimento negada','service-not-allowed':'Serviço de reconhecimento não permitido','audio-capture':'Microfone não disponível para reconhecimento','no-speech':'Nenhuma fala detectada'}[e.error]||('Erro '+e.error);
    setStatus(e.error==='no-speech'?'yellow':'red','Comando de voz: '+msg);
    if(e.error!=='no-speech'&&e.error!=='aborted'){rec.onend=null;try{rec.abort()}catch(_){}commandRecognition=null;onFailure?.();}
  };
  rec.onend=()=>{if(mySession===sessionId&&commandRecognition===rec&&!started)setTimeout(()=>{if(mySession!==sessionId||commandRecognition!==rec||started)return;try{rec.start()}catch(e){setStatus('red','Não foi possível reabrir o reconhecimento de voz')}} ,250)};
  try{rec.start()}catch(e){setStatus('red','Não foi possível iniciar o reconhecimento de voz')}
}

