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
  if(!/^\s*\{\\rtf\d/i.test(raw))throw new Error('Documento RTF inválido');
  const stack=[];let state={skip:false,uc:1},fallback=0,result='',encoding='windows-1252';
  const append=text=>{if(state.skip)return;if(fallback){fallback--;return}result+=text};
  for(let i=0;i<raw.length;){
    const c=raw[i++];
    if(c==='{'){stack.push({...state});continue}
    if(c==='}'){state=stack.pop()||{skip:false,uc:1};continue}
    if(c==='\r'||c==='\n')continue;
    if(c!=='\\'){append(c);continue}
    const next=raw[i];
    if(next==='\\'||next==='{'||next==='}'){i++;append(next);continue}
    if(next==="'"){
      const bytes=[];i--;
      while(/^\\'[0-9a-f]{2}/i.test(raw.slice(i,i+4))){bytes.push(parseInt(raw.slice(i+2,i+4),16));i+=4}
      if(!bytes.length){i+=2;continue}
      let decoded;try{decoded=new TextDecoder(encoding).decode(new Uint8Array(bytes))}catch(error){decoded=new TextDecoder('windows-1252').decode(new Uint8Array(bytes))}
      for(const char of decoded)append(char);continue;
    }
    if(next==='*'){state.skip=true;i++;continue}
    if(!/[a-z]/i.test(next||'')){i++;if(next==='~')append(' ');else if(next==='_')append('‑');continue}
    const match=/^([a-z]+)(-?\d+)? ?/i.exec(raw.slice(i));i+=match[0].length;
    const word=match[1].toLowerCase(),number=Number(match[2]);
    if(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer','fldinst','listtable','listoverridetable'].includes(word)){state.skip=true;continue}
    if(word==='bin'){i+=Math.max(0,number||0);continue}
    if(word==='ansicpg'){encoding=number===65001?'utf-8':'windows-'+number;continue}
    if(word==='uc'){state.uc=Math.max(0,number||0);continue}
    if(state.skip)continue;
    if(word==='u'){result+=String.fromCharCode((number+65536)%65536);fallback=state.uc}
    else if(word==='par'||word==='line')result+='\n';
    else if(word==='tab')result+='\t';
    else if(word==='emdash')append('—');else if(word==='endash')append('–');
    else if(word==='lquote'||word==='rquote')append("'");else if(word==='ldblquote'||word==='rdblquote')append('"');
  }
  return result.replace(/\n{3,}/g,'\n\n').trim();
}
function xmlEntities(s){
  const named={lt:'<',gt:'>',quot:'"',apos:"'",amp:'&'};
  return s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|amp);/gi,(entity,value)=>{
    if(value[0]!=='#')return named[value.toLowerCase()];
    const n=value[1].toLowerCase()==='x'?parseInt(value.slice(2),16):Number(value.slice(1));
    return n>=0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):entity;
  });
}
function xmlToPlainText(xml){let s=xml.replace(/<w:tab[^>]*\/>/g,'\t').replace(/<w:br[^>]*\/>/g,'\n').replace(/<w:cr[^>]*\/>/g,'\n').replace(/<w:tr[^>]*>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<\/text:p>/g,'\n');s=s.replace(/<[^>]+>/g,'');return xmlEntities(s).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
async function unzipText(buffer,wanted){
  if(buffer.byteLength>20*1024*1024)throw new Error('Arquivo maior que 20 MB');
  const zip=await JSZip.loadAsync(buffer); const entry=zip.file(wanted);
  if(!entry)throw new Error('Conteúdo principal não encontrado');
  if(entry._data?.uncompressedSize>10*1024*1024)throw new Error('Texto descompactado maior que 10 MB');
  return entry.async('string');
}
