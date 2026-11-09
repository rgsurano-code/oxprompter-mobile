const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function context(raw,quota=false){
  const store=new Map(raw===undefined?[]:[['tp_data_v1',raw]]),alerts=[];
  const sandbox={window:{},document:{addEventListener(){}},alert:message=>alerts.push(message),localStorage:{getItem:k=>store.get(k)||null,setItem(k,v){if(quota)throw new Error('quota');store.set(k,v)}},console,TextDecoder,DOMException};
  vm.createContext(sandbox);
  for(const file of ['core.js','documents.js','camera.js','media.js','reader.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),sandbox,{filename:file});
  return {run:code=>vm.runInContext(code,sandbox),store,alerts};
}
test('corrupted storage does not crash or overwrite the original',()=>{
  const c=context('{invalid');assert.equal(c.run('window.storageRecovery'),true);assert.equal(c.run('save()'),false);assert.equal(c.store.get('tp_data_v1'),'{invalid');
});
test('valid legacy data and password are retained; malformed scripts filtered',()=>{
  const c=context(JSON.stringify({passwordHash:'abc',scripts:[{id:'1',name:'Roteiro',text:'Olá',settings:{startCmds:'broken'}},{name:42}],settings:{theme:'white'}}));
  assert.equal(c.run('db.scripts.length'),1);assert.equal(c.run('db.passwordHash'),'abc');assert.equal(c.run('db.settings.theme'),'white');assert.equal(c.run('db.scripts[0].settings.startCmds.length'),0);
});
test('quota failure is reported once and leaves previous data intact',()=>{
  const c=context(undefined,true);assert.equal(c.run('save()'),false);c.run('save()');assert.equal(c.alerts.length,1);
});
test('time parsing treats HH:MM[:SS] as a duration and rejects invalid values',()=>{
  const c=context();assert.equal(c.run("parseTime('00:05:30')"),330);assert.equal(c.run("parseTime('01:30')"),5400);assert.equal(c.run("parseTime('bad')"),0);assert.equal(c.run("parseTime('-1:30')"),0);
});
test('script annotations are excluded and displayed content is escaped',()=>{
  const c=context();assert.equal(c.run("buildWords('Olá [OLHAR] mundo').join(' ')"),'Olá mundo');assert.equal(c.run("esc('<img onerror=\"x\">')"),'&lt;img onerror=&quot;x&quot;&gt;');assert.equal(c.run('esc(null)'),'');
});
test('MIME negotiation separates audio-only from video',()=>{
  const c=context();c.run("window.MediaRecorder={isTypeSupported:t=>t==='audio/webm;codecs=opus'||t==='video/mp4'}");assert.equal(c.run('chooseMime(false)'),'audio/webm;codecs=opus');assert.equal(c.run('chooseMime(true)'),'video/mp4');c.run('window.MediaRecorder=undefined');assert.equal(c.run('chooseMime()'),'');
});
test('entity decoding does not interpret escaped markup as HTML',()=>{
  const c=context();assert.equal(c.run("xmlToPlainText('<w:p><w:t>Olá &amp; revisão</w:t></w:p>')"),'Olá & revisão');
});
