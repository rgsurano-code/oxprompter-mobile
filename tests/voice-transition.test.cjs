const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const load=(c,file)=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),c);
function speech(){
  const c=vm.createContext({setTimeout:fn=>{c.timeout=fn;return 1},clearTimeout(){},current:{settings:{startCmds:[{phrase:'começar agora'}]}},sessionId:1,started:false,commandRecognition:null,normalize:s=>s.toLowerCase(),setStatus(){},hits:0,failures:0,resumes:0,resumeLiveMicContext(){c.resumes++}});
  c.window={SpeechRecognition:class{constructor(){c.rec=this}start(){}stop(){this.stopped=true}abort(){this.aborted=true}}};load(c,'speech.js');vm.runInContext('startStartCommandListener(()=>hits++,()=>failures++)',c);return c;
}
const result={results:[[{transcript:'começar agora'}]]};
test('command waits for end before handing the microphone to reading',()=>{const c=speech();c.rec.onresult(result);assert.equal(c.hits,0);assert.equal(c.rec.stopped,true);c.rec.onend();assert.equal(c.hits,1);assert.equal(c.resumes,1);assert.equal(c.commandRecognition,null)});
test('repeated command results launch reading only once',()=>{const c=speech();c.rec.onresult(result);c.rec.onresult(result);c.rec.onend();c.rec.onend();assert.equal(c.hits,1)});
test('a cancelled session cannot start after a late recognition end',()=>{const c=speech();c.rec.onresult(result);c.sessionId++;c.rec.onend();assert.equal(c.hits,0)});
test('missing recognition end reports failure and does not acquire reading microphone',()=>{const c=speech();c.rec.onresult(result);c.timeout();assert.equal(c.hits,0);assert.equal(c.failures,1);assert.equal(c.rec.aborted,true);assert.equal(c.commandRecognition,null)});
function meter(){
  const c=vm.createContext({window:{},currentMicRms:0,performance:{now:()=>0},current:{settings:{mode:'audio'}},started:false,paused:false,$:()=>null,setStatus(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});c.created=0;c.closed=0;
  class Node{constructor(){this.gain={value:1};this.fftSize=512}connect(n){this.output=n}disconnect(){this.disconnected=true}start(){}getByteTimeDomainData(data){data.fill(128)}}
  c.window.AudioContext=class{constructor(){c.created++;this.state='suspended';this.sampleRate=48000;this.destination=new Node()}resume(){this.state='running';return Promise.resolve()}close(){c.closed++;this.state='closed';return Promise.resolve()}createBuffer(){return {}}createBufferSource(){return new Node()}createMediaStreamSource(){return new Node()}createAnalyser(){return new Node()}createGain(){return new Node()}};
  load(c,'media.js');c.track={kind:'audio',readyState:'live',muted:false};c.stream={getTracks:()=>[c.track],getAudioTracks:()=>[c.track]};return c;
}
test('meter reuses the context unlocked at start and keeps a silent output path',()=>{const c=meter();vm.runInContext('primeLiveMicContext();globalThis.unlocked=liveMicContext;startLiveMicMeter(stream);startLiveMicMeter(stream)',c);assert.equal(c.created,1);assert.equal(c.closed,0);assert.equal(vm.runInContext('liveMicContext===unlocked&&liveMicSink.gain.value===0&&liveMicAnalyser.output===liveMicSink&&liveMicSink.output===liveMicContext.destination',c),true)});
test('suspended or interrupted audio is diagnosed and can be resumed',()=>{const c=meter();vm.runInContext('startLiveMicMeter(stream);liveMicContext.state="interrupted"',c);assert.match(vm.runInContext('readingMicIssue()',c),/Toque/);vm.runInContext('resumeLiveMicContext()',c);assert.equal(vm.runInContext('readingMicIssue()',c),'')});
test('meter teardown does not stop the recording audio track',()=>{const c=meter();vm.runInContext('startLiveMicMeter(stream);stopLiveMicMeter(false);startLiveMicMeter(stream);stopLiveMicMeter()',c);assert.equal(c.created,1);assert.equal(c.closed,1);assert.equal(c.track.readyState,'live')});
