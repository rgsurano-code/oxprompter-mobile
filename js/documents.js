async function readDocumentFile(file){
 if(file.size>20*1024*1024)throw new Error('Limite de importação: 20 MB');
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 if(['txt','text','md','srt','rtf','html','htm','xml'].includes(ext)){
   const raw=await file.text();
   if(ext==='rtf') return rtfToText(raw);
   if(ext==='html'||ext==='htm') return htmlToText(raw);
   return raw;
 }
 if(ext==='docx'||ext==='odt'){
   const buf=await file.arrayBuffer();
   const wanted=ext==='docx'?'word/document.xml':'content.xml';
   const xml=await unzipText(buf,wanted);
   return xmlToPlainText(xml);
 }
 if(ext==='doc') throw new Error('DOC legado não é um formato ZIP/XML e não pode ser extraído com segurança no navegador.');
 throw new Error('Formato não suportado');
}
function htmlToText(raw){const d=new DOMParser().parseFromString(raw,'text/html').body;d.querySelectorAll('script,style,noscript').forEach(x=>x.remove());return (d.innerText||d.textContent||'').replace(/\n{3,}/g,'\n\n').trim()}
function rtfToText(raw){
  const slash=String.fromCharCode(92),stack=[];let state={skip:false,uc:1},out='',i=0;
  const destinations=new Set(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer','filetbl','listtable','listoverridetable','fldinst']);
  const symbols={emdash:'—',endash:'–',bullet:'•',lquote:'‘',rquote:'’',ldblquote:'“',rdblquote:'”'};
  let decoder;try{if(typeof TextDecoder!=='undefined')decoder=new TextDecoder('windows-1252')}catch(e){}
  const emit=text=>{if(!state.skip)out+=text};
  while(i<raw.length){
    const c=raw[i];
    if(c==='{'){stack.push({...state});i++;continue}
    if(c==='}'){state=stack.pop()||{skip:false,uc:1};i++;continue}
    if(c!==slash){if(c!=='\r'&&c!=='\n')emit(c);i++;continue}
    const next=raw[i+1];
    if(next===slash||next==='{'||next==='}'){emit(next);i+=2;continue}
    if(next==='*'){state.skip=true;i+=2;continue}
    if(next==="'"){
      const hex=raw.slice(i+2,i+4);if(/^[0-9a-f]{2}$/i.test(hex)){const byte=parseInt(hex,16);emit(decoder?decoder.decode(Uint8Array.of(byte)):String.fromCharCode(byte));i+=4;continue}
    }
    if(next==='~'||next==='_'||next==='-'){emit(next==='~'?' ':next==='_'?'‑':'');i+=2;continue}
    const match=raw.slice(i+1).match(/^([a-z]+)(-?\d+)? ?/i);
    if(!match){i+=Math.min(2,raw.length-i);continue}
    i+=1+match[0].length;const word=match[1].toLowerCase(),n=Number(match[2]);
    if(destinations.has(word)){state.skip=true;continue}
    if(word==='uc'&&Number.isFinite(n)){state.uc=Math.max(0,Math.min(10,n));continue}
    if(word==='bin'&&Number.isFinite(n)){i+=Math.max(0,Math.min(n,raw.length-i));continue}
    if(word==='u'&&Number.isFinite(n)){
      emit(String.fromCharCode(n&65535));
      for(let skipped=0;skipped<state.uc&&i<raw.length;skipped++){
        if(raw[i]==='{'||raw[i]==='}')break;
        if(raw[i]===slash&&raw[i+1]==="'"){i+=4;continue}
        if(raw[i]===slash&&[slash,'{','}'].includes(raw[i+1])){i+=2;continue}
        if(raw[i]===slash)break;i++;
      }
      continue;
    }
    if(word==='par'||word==='line')emit('\n');else if(word==='tab')emit('\t');else if(symbols[word])emit(symbols[word]);
  }
  return out.replace(/\n{3,}/g,'\n\n').trim();
}
function xmlCodePoint(n){return Number.isInteger(n)&&n>=0&&n<=0x10ffff&&(n<0xd800||n>0xdfff)?String.fromCodePoint(n):'\uFFFD'}
function xmlEntities(s){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>xmlCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>xmlCodePoint(parseInt(n,16)))}
function xmlToPlainText(xml){let s=xml.replace(/<w:tab[^>]*\/>/g,'\t').replace(/<w:br[^>]*\/>/g,'\n').replace(/<w:cr[^>]*\/>/g,'\n').replace(/<w:tr[^>]*>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<\/text:p>/g,'\n');s=s.replace(/<[^>]+>/g,'');return xmlEntities(s).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
async function unzipText(buffer,wanted){
  if(buffer.byteLength>20*1024*1024)throw new Error('Arquivo maior que 20 MB');
  const zip=await JSZip.loadAsync(buffer); const entry=zip.file(wanted);
  if(!entry)throw new Error('Conteúdo principal não encontrado');
  if(entry._data?.uncompressedSize>10*1024*1024)throw new Error('Texto descompactado maior que 10 MB');
  return entry.async('string');
}
