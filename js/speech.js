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
  let handingOff=false;
  const rec=new SR();
  commandRecognition=rec;
  rec.lang='pt-BR';
  rec.continuous=true;
  rec.interimResults=true;
  rec.maxAlternatives=3;

  rec.onstart=()=>{if(mySession===sessionId&&commandRecognition===rec)setStatus('green','🎙️ Ouvindo comando: '+(current.settings.startCmds||[]).map(c=>c.phrase).filter(Boolean).join(' / '))};
  rec.onspeechstart=()=>{if(mySession===sessionId&&commandRecognition===rec)setStatus('green','🎙️ Voz detectada — reconhecendo…')};
  rec.onresult=e=>{
    if(mySession!==sessionId||commandRecognition!==rec||handingOff)return;
    let txt='';
    // Safari/iOS pode entregar a frase em resultados parciais separados.
    // Examina todas as alternativas disponíveis, sem depender apenas da primeira.
    const candidates=[];
    for(let i=0;i<e.results.length;i++){
      const result=e.results[i];
      for(let j=0;j<Math.min(result.length||1,3);j++){
        const phrase=result[j]?.transcript||'';
        if(phrase){candidates.push(phrase);txt+=phrase+' ';}
      }
    }
    const n=normalize(candidates.join(' '));
    if(!n)return;
    const hit=cmds.find(c=>(' '+n+' ').includes(' '+c+' '));
    if(hit){
      handingOff=true;
      setStatus('yellow','✓ Comando reconhecido — ativando microfone da leitura');
      let finished=false;
      const fail=()=>{if(finished)return;finished=true;clearTimeout(timeout);rec.onend=null;try{rec.abort()}catch(e){}if(mySession===sessionId&&commandRecognition===rec){commandRecognition=null;setStatus('red','O reconhecimento não liberou o microfone. Toque para tentar novamente.');onFailure?.()}};
      const timeout=setTimeout(fail,4000);
      rec.onerror=fail;
      rec.onend=()=>{if(finished)return;finished=true;clearTimeout(timeout);if(mySession!==sessionId||commandRecognition!==rec)return;commandRecognition=null;resumeLiveMicContext();onCommand?.()};
      try{rec.stop()}catch(e){fail()}
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

