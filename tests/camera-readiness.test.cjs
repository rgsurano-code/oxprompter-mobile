const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function cameraContext(){const c=vm.createContext({setTimeout,clearTimeout});vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/media.js'),'utf8'),c);return c}
test('camera playback rejection prevents recording preparation',async()=>{
  const c=cameraContext();await assert.rejects(vm.runInContext("waitForCameraFrame({play:async()=>{throw new Error('play bloqueado')}})",c),/play bloqueado/);
});
test('camera readiness waits for a decoded image and removes listeners',async()=>{
  const c=cameraContext();vm.runInContext(`globalThis.listeners={};globalThis.video={readyState:0,videoWidth:0,videoHeight:0,play:async()=>{},addEventListener(n,f){listeners[n]=f},removeEventListener(n){delete listeners[n]}}`,c);
  const ready=vm.runInContext('waitForCameraFrame(video,1000)',c);await new Promise(r=>setTimeout(r,0));
  vm.runInContext('video.readyState=2;video.videoWidth=640;video.videoHeight=480;listeners.loadeddata()',c);await ready;
  assert.equal(vm.runInContext('Object.keys(listeners).length',c),0);
});
test('camera with no decoded image times out instead of recording black frames',async()=>{
  const c=cameraContext();await assert.rejects(vm.runInContext('waitForCameraFrame({readyState:0,play:async()=>{},addEventListener(){},removeEventListener(){}},15)',c),/imagem válida/);
});
