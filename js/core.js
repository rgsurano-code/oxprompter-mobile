const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='tp_data_v1';
function loadDatabase(){
  const empty={passwordHash:'',scripts:[],settings:{theme:'dark',mirror:false,font:54}};
  try {
    const raw=localStorage.getItem(KEY); if(!raw)return empty;
    const data=JSON.parse(raw);
    if(!data || !Array.isArray(data.scripts)||data.scripts.some(s=>!s||typeof s.id!=='string'||typeof s.name!=='string'||typeof s.text!=='string'))throw new Error('Dados inválidos');
    data.scripts=data.scripts.filter(s=>s && typeof s.id==='string' && typeof s.name==='string' && typeof s.text==='string');
    data.settings=data.settings && typeof data.settings==='object'&&!Array.isArray(data.settings)?data.settings:{};data.passwordHash=typeof data.passwordHash==='string'?data.passwordHash:'';
    for(const script of data.scripts){
      script.settings=script.settings&&typeof script.settings==='object'&&!Array.isArray(script.settings)?script.settings:{};
      script.settings.startCmds=Array.isArray(script.settings.startCmds)?script.settings.startCmds.filter(c=>c&&typeof c.phrase==='string'):[];
    }
    return {...empty,...data};
  }catch(error){
    // Preserve the original for recovery; never overwrite unreadable data silently.
    window.storageRecovery=true; return empty;
  }
}
let db=loadDatabase();
let current=null, recognition=null, commandRecognition=null, listening=false, started=false, preparingPrompter=false, currentWord=0, words=[], lastMatch=0, startTime=0, elapsedTimer=null, targetSeconds=0, prepMode='audio', countdownTimer=null, sessionId=0, reviewAfterStop=false;
function save(){
  try{if(window.storageRecovery)throw new Error('Dados antigos precisam de recuperação');localStorage.setItem(KEY,JSON.stringify(db));return true}
  catch(e){if(!window.storageWarningShown){window.storageWarningShown=true;alert('Não foi possível salvar neste navegador. Exporte seus roteiros pela biblioteca antes de fechar. Dados antigos, se houver, foram preservados.')}return false}
}
async function hash(s){if(!crypto.subtle){alert('Abra o aplicativo por HTTPS ou localhost para usar a senha e os recursos de mídia.');throw new Error('HTTPS necessário')}const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&bsol;','"':'&quot;'}[m]))}
function render(){document.body.className=''; if(!db.passwordHash){showSetup();return} showLogin()}
function matrixColumns(count=32){const cols=[];for(let i=0;i<count;i++){const chars=Array.from({length:18+Math.floor(Math.random()*18)},()=>Math.random()>.5?'0':'1').join('\n');const reverse=Math.random()>.5;cols.push(`<div class="password-col ${reverse?'reverse':''}" style="left:${i*(100/count)}%;animation-duration:${3+Math.random()*5}s;animation-delay:${-Math.random()*6}s">${chars}</div>`)}return cols.join('')}
function showSetup(){stopAll();document.body.className='';document.body.innerHTML=`<div class="password-screen"><div class="password-matrix">${matrixColumns()}</div><div class="password card"><div class="cyber-badge">ACESSO SEGURO</div><h1>OXPROMPTER</h1><div class="password-version"></div><p class="muted">A senha é um bloqueio local da interface. Os roteiros não são criptografados.</p><input id="p1" type="password" placeholder="Nova senha" style="width:100%;padding:12px;margin:8px 0"><input id="p2" type="password" placeholder="Confirmar senha" style="width:100%;padding:12px;margin:8px 0"><button class="primary" id="create">Criar senha</button><div id="msg" class="muted" style="margin-top:10px"></div></div></div>`;$('#create').onclick=async()=>{let a=$('#p1').value,b=$('#p2').value;if(!a||a!==b){$('#msg').textContent='As senhas não coincidem.';return}db.passwordHash=await hash(a);save();showLogin()}}
function showLogin(){stopAll();document.body.className='';document.body.innerHTML=`<div class="password-screen"><div class="password-matrix">${matrixColumns()}</div><div class="password card"><div class="cyber-badge">ACESSO SEGURO</div><h1>OXPROMPTER</h1><div class="password-version"></div><p class="muted">Acesso protegido.</p><input id="login" type="password" placeholder="Senha" style="width:100%;padding:12px;margin:8px 0"><button class="primary" id="enter">Entrar</button><div id="msg" class="muted" style="margin-top:10px"></div></div></div>`;$('#enter').onclick=async()=>{if(await hash($('#login').value)===db.passwordHash)showBiblioteca();else $('#msg').textContent='Senha incorreta.'};$('#login').onkeydown=e=>{if(e.key==='Enter')$('#enter').click()}}
