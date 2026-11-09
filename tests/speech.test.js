import {test} from 'node:test';import assert from 'node:assert/strict';import {StartCommand} from '../studio-v2/speech.js';
class Fake{constructor(){Fake.current=this;}start(){}abort(){} }
globalThis.window={SpeechRecognition:Fake};
const result=(...alternatives)=>alternatives.map(transcript=>({transcript}));
test('o comando exige frase completa e aceita acentuação',()=>{const command=new StartCommand();let hits=0;command.listen(['começar agora'],()=>hits++,()=>{});Fake.current.onresult({results:[result('começar')]});assert.equal(hits,0);Fake.current.onresult({results:[result('COMEÇAR agora!')]});assert.equal(hits,1);assert.equal(command.rec,null);});
test('resultados parciais sucessivos podem completar a frase',()=>{const command=new StartCommand();let hits=0;command.listen(['começar agora'],()=>hits++,()=>{});Fake.current.onresult({results:[result('começar'),result('agora')]});assert.equal(hits,1);});
test('alternativas incompatíveis não são concatenadas em um comando inventado',()=>{const command=new StartCommand();let hits=0;command.listen(['começar agora'],()=>hits++,()=>{});Fake.current.onresult({results:[result('começar','agora')]});assert.equal(hits,0);command.stop();});
test('erro encerra o reconhecimento e oferece início por toque',()=>{const command=new StartCommand();let message='';command.listen(['começar'],()=>{},value=>message=value);Fake.current.onerror({error:'not-allowed'});assert.equal(command.rec,null);assert.match(message,/Iniciar por toque/);});
