function showBiblioteca(){
 stopAll(); stopPrepMedia();
 document.body.className="";
 document.body.innerHTML=`<div class="cyber-home"><section class="cyber-panel">
 <h1 class="cyber-title">OXPROMPTER</h1>
 <div class="cyber-sub">PESSOAL • ROLAGEM POR VOZ • GRAVAÇÃO</div><div id="storageNotice" class="note hidden" role="status"></div>
 <div class="cyber-grid">
  <div class="cyber-card">
   <h2>▣ NOVO ROTEIRO</h2>
   <div class="field"><label>Nome do roteiro</label><input id="quickName" placeholder="Ex.: Apresentação de hoje"></div>
   <div class="field" style="margin-top:10px"><label>Texto que será usado no teleprompter</label><textarea id="quickText" placeholder="Cole ou escreva seu texto aqui..."></textarea></div>
   <div class="cyber-actions">
    <button type="button" class="cyber-btn cyber-primary" id="quickCreate">+ Adicionar texto</button>
    <button type="button" class="cyber-btn" id="importFile">▣ Importar arquivo</button>
    <input id="fileInput" type="file" accept=".txt,.md,.srt,.text,.doc,.docx,.rtf,.odt,.html,.htm,.xml,.json" class="hidden">
   </div>
   <div id="fileHint" class="cyber-hint">Aceita backup JSON, TXT, MD, SRT, DOCX, ODT, RTF, HTML e outros formatos de texto. DOC legado pode exigir conversão para DOCX.</div>
  </div>
  <div class="cyber-card">
   <div class="row between"><h2 style="margin-bottom:0">▤ MEUS ROTEIROS</h2><span class="cyber-badge">SALVO NESTE NAVEGADOR</span></div>
   <div class="cyber-hint">Roteiros salvos neste navegador. Exporte uma cópia para ter um backup.</div>
   <div id="list" class="cyber-list" style="margin-top:14px"></div>
  </div>
 </div>
 <div class="row between" style="margin-top:18px"><span class="cyber-hint">Antes de gravar, você poderá revisar todos os ajustes, comandos, áudio e tempo.</span><button type="button" class="cyber-btn" id="exportScripts">Exportar roteiros</button><button type="button" class="cyber-btn" id="security">🔐 Segurança</button></div>
 </section></div>`;
 $('#quickCreate').onclick=saveHomeScript;
 $('#importFile').onclick=()=>$('#fileInput').click();
 $('#fileInput').onchange=async e=>{
  const input=e.target,f=input.files?.[0];if(!f)return;
  $('#quickName').value=f.name.replace(/\.[^.]+$/,'');$('#fileHint').textContent='Lendo '+f.name+'…';
  try{
    if(f.name.toLowerCase().endsWith('.json')){
      if(f.size>20*1024*1024)throw new Error('Backup maior que 20 MB');
      const backup=JSON.parse(await f.text());if(!input.isConnected)return;
      if(!backup||typeof backup!=='object'||!Array.isArray(backup.scripts))throw new Error('Backup inválido');
      if(backup.version!==undefined&&backup.version!==1)throw new Error('Versão de backup não suportada');
      const valid=backup.scripts.filter(x=>x&&typeof x.name==='string'&&typeof x.text==='string');if(!valid.length)throw new Error('Backup sem roteiros válidos');
      const added=valid.map(x=>({id:crypto.randomUUID(),name:x.name,text:x.text,notes:typeof x.notes==='string'?x.notes:'',updated:Date.now(),settings:importedScriptSettings(x.settings)}));
      const previous=db.scripts,wasDirty=window.storageDirty;db.scripts=[...previous,...added];
      if(!save()){db.scripts=previous;window.storageDirty=wasDirty;updateStorageNotice();$('#fileHint').textContent='Não foi possível salvar o backup. A importação não foi aplicada; seu arquivo original foi preservado.';return}
      listScripts();$('#fileHint').textContent=added.length+' roteiro(s) restaurado(s), com suas configurações.';return;
    }
    const text=await readDocumentFile(f);if(!input.isConnected)return;$('#quickText').value=text;$('#fileHint').textContent='Arquivo carregado: '+f.name+' — confira o texto e clique em “Adicionar texto”.';
  }catch(err){if(input.isConnected)$('#fileHint').textContent='Não foi possível importar: '+err.message+'. Para DOC legado, converta para DOCX.'}
  finally{input.value=''}
 };
 $('#security').onclick=security; $('#exportScripts').onclick=exportScripts; listScripts();updateStorageNotice();window.scrollTo(0,0);
}
function loadScriptIntoHome(id){
 const found=db.scripts.find(x=>x.id===id); if(!found)return;
 current=found;
 const name=$('#quickName'), text=$('#quickText');
 if(name)name.value=found.name||'';
 if(text)text.value=found.text||'';
 const btn=$('#quickCreate'); if(btn){btn.textContent='✓ Preparar este roteiro';btn.dataset.loadedId=found.id;}
 const hint=$('#fileHint'); if(hint)hint.textContent='Roteiro carregado. Revise o texto acima e clique em “Preparar este roteiro”.';
 document.querySelector('.cyber-card textarea#quickText')?.focus();
}
function listScripts(){let q=($('#search')?.value||'').toLowerCase();let arr=db.scripts.filter(x=>x.name.toLowerCase().includes(q));$('#list').innerHTML=arr.length?arr.map(x=>`<div class="item saved-script" data-load-script="${esc(x.id)}" tabindex="0"><div><strong>${esc(x.name)}</strong><span class="muted">${new Date(x.updated).toLocaleString('pt-BR')}</span></div><div class="row"><button type="button" data-open="${esc(x.id)}">Abrir aqui</button><button type="button" class="danger" data-del="${esc(x.id)}">Excluir</button></div></div>`).join(''):'<div class="muted">Nenhum roteiro ainda.</div>';
 $$('[data-open]').forEach(b=>b.onclick=e=>{e.stopPropagation();loadScriptIntoHome(b.dataset.open)});
 $$('[data-load-script]').forEach(b=>{b.onclick=()=>loadScriptIntoHome(b.dataset.loadScript);b.onkeydown=e=>{if(e.key==='Enter')loadScriptIntoHome(b.dataset.loadScript)}});
 $$('[data-del]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(confirm('Excluir este roteiro?')){const previous=db.scripts,wasDirty=window.storageDirty;db.scripts=db.scripts.filter(x=>x.id!==b.dataset.del);if(!save()){db.scripts=previous;window.storageDirty=wasDirty;updateStorageNotice();return}listScripts()}})
}
function editScript(id, initial){stopAll();stopPrepMedia();document.body.className="";current=id?db.scripts.find(x=>x.id===id):{id:crypto.randomUUID(),name:(initial&&initial.name)||'Novo roteiro',text:(initial&&initial.text)||'',notes:'',updated:Date.now(),settings:{}};document.body.innerHTML='<div class="top"><div class="brand">📝 Editar roteiro</div><div class="row"><button id="back">← Biblioteca</button><button class="primary" id="next">Salvar e preparar →</button></div></div><main class="shell editor-wrap"><div class="card"><div class="grid"><div class="field"><label>Nome do roteiro</label><input id="name"></div><div class="field"><label>Observações (não são faladas)</label><input id="notes" placeholder="Ex.: vídeo institucional"></div></div></div><div class="card"><div class="section-title">Texto</div><textarea id="text" placeholder="Cole ou escreva o roteiro aqui..."></textarea><div class="muted" style="margin-top:8px">Você pode usar anotações entre colchetes, como [OLHAR PARA CÂMERA]. Elas não interferem na sincronização da fala.</div></div></main>';$('#name').value=current.name;$('#notes').value=current.notes||'';$('#text').value=current.text;$('#back').onclick=showBiblioteca;$('#next').onclick=()=>{current.name=$('#name').value.trim()||'Sem título';current.notes=$('#notes').value;current.text=$('#text').value;current.updated=Date.now();if(!db.scripts.some(x=>x.id===current.id))db.scripts.push(current);if(save())prepare()}}
function security(){stopAll();stopPrepMedia();document.body.className="";document.body.innerHTML='<div class="top"><div class="brand">🔐 Segurança</div><button id="back">← Voltar</button></div><main class="shell"><div class="card"><div class="section-title">Alterar senha</div><div class="field"><label>Senha atual</label><input id="old" type="password"></div><div class="field" style="margin-top:10px"><label>Nova senha</label><input id="newp" type="password"></div><button id="change" class="primary" style="margin-top:12px">Alterar</button><div id="msg" class="muted" style="margin-top:8px"></div></div></main>';$('#back').onclick=showBiblioteca;$('#change').onclick=async()=>{if(await hash($('#old').value)!==db.passwordHash){$('#msg').textContent='Senha atual incorreta.';return}if(!$('#newp').value){$('#msg').textContent='Digite a nova senha.';return}const previous=db.passwordHash,wasDirty=window.storageDirty;db.passwordHash=await hash($('#newp').value);if(!save()){db.passwordHash=previous;window.storageDirty=wasDirty;updateStorageNotice();$('#msg').textContent='Não foi possível salvar a senha. A senha anterior foi mantida.';return}$('#msg').textContent='Senha alterada.'}}

function saveHomeScript(){
  const name=$('#quickName').value.trim()||'Novo roteiro',text=$('#quickText').value;if(!text.trim()){alert('Adicione algum texto antes de continuar.');return}
  const button=$('#quickCreate');let item=db.scripts.find(x=>x.id===button.dataset.loadedId);
  if(!item){item={id:crypto.randomUUID(),notes:'',settings:{startPercent:50}};db.scripts.push(item);button.dataset.loadedId=item.id}
  Object.assign(item,{name,text,updated:Date.now()});current=item;
  if(!save()){$('#fileHint').textContent='Roteiro ainda não salvo. O texto permanece nesta tela; exporte uma cópia ou tente novamente.';listScripts();return}
  prepare();
}
