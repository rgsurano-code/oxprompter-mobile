function showSplash(){
  stopAll();
  document.body.className='';
  const cols=[];
  for(let i=0;i<32;i++){
    const chars=Array.from({length:18+Math.floor(Math.random()*18)},()=>Math.random()>.5?'0':'1').join('\n');
    cols.push(`<div class="splash-col" style="left:${i*3.25}%;animation-duration:${3+Math.random()*5}s;animation-delay:${-Math.random()*6}s">${chars}</div>`);
  }
  document.body.innerHTML=`<div id="splash" class="splash-screen"><div class="splash-matrix">${cols.join('')}</div><div class="splash-center"><h1 class="splash-title">OXPROMPTER</h1><button id="splashStart" class="splash-start">INICIAR</button></div><div class="splash-dev">OXPROMPTER MOBILE • VERSÃO REVISADA</div></div>`;
  $('#splashStart').onclick=()=>{const el=$('#splash');el.classList.add('leaving');setTimeout(()=>render(),500)};
}


function exportScripts(){
  const blob=new Blob([JSON.stringify({version:1,scripts:db.scripts},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='oxprompter-roteiros.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function resizePrompter(){
  const el=$('#promptText');if(!el)return;
  const progress=Math.max(0,Math.min(1,(scrollStartY-manualY)/Math.max(1,scrollStartY-scrollEndY)));
  el.style.maxWidth=Math.round(innerWidth*(Number(current.settings.textWidthPct)||.84))+'px';
  positionPromptAtReadingLine();
  if(started){manualY=scrollStartY-progress*(scrollStartY-scrollEndY);el.style.transform=(current.settings.mirror?'scaleX(-1) ':'')+`translateY(${manualY}px)`}
}
// Labels apply to dynamically rendered screens as well as initial markup.
new MutationObserver(()=>{
  document.querySelectorAll('.field').forEach(field=>{const label=field.querySelector('label'),input=field.querySelector('input,select,textarea');if(label&&input?.id&&!label.htmlFor)label.htmlFor=input.id});
  document.querySelectorAll('button[title]').forEach(b=>{if(!b.hasAttribute('aria-label'))b.setAttribute('aria-label',b.title)});
}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused)togglePause()});
window.addEventListener('pagehide',()=>{stopAll();stopPrepMedia()});
showSplash();
if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(console.warn);

function setupReadingControls(){
  const controls=$('.controls');if(!controls)return;
  const group=document.createElement('div');group.className='finalAdjust';
  group.innerHTML='<button id="fontLess" title="Diminuir fonte">A−</button><span id="fontValue" class="fontValue"></span><button id="fontMore" title="Aumentar fonte">A+</button>';
  controls.prepend(group);$('#fontValue').textContent=Math.round(current.settings.font||54);
  $('#fontLess').onclick=()=>adjustFinalFont(-2);$('#fontMore').onclick=()=>adjustFinalFont(2);
  const speed=document.createElement('div');speed.className='row';speed.innerHTML='<button id="slower" title="Reduzir velocidade">−</button><span id="speedLevel" class="speed-level"></span><button id="faster" title="Aumentar velocidade">+</button><button id="widthToggle" title="Alternar largura do texto">↔</button>';
  controls.append(speed);
  const adjust=delta=>{scrollSpeed=Math.max(.2,Math.min(3,Math.round((scrollSpeed+delta)*10)/10));current.settings.speed=scrollSpeed;save();updateSpeedUI()};
  $('#slower').onclick=()=>adjust(-.1);$('#faster').onclick=()=>adjust(.1);$('#widthToggle').onclick=toggleTextWidth;
}
