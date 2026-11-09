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
function rtfToText(raw){let s=raw.replace(/\\par[d]? ?/gi,'\n').replace(/\\tab/g,'\t').replace(/\\'[0-9a-f]{2}/gi,m=>String.fromCharCode(parseInt(m.slice(2),16))).replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'');return s.replace(/\n{3,}/g,'\n\n').trim()}
function xmlEntities(s){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))}
function xmlToPlainText(xml){let s=xml.replace(/<w:tab[^>]*\/>/g,'\t').replace(/<w:br[^>]*\/>/g,'\n').replace(/<w:cr[^>]*\/>/g,'\n').replace(/<w:tr[^>]*>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<\/text:p>/g,'\n');s=s.replace(/<[^>]+>/g,'');return xmlEntities(s).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
async function unzipText(buffer,wanted){
  if(buffer.byteLength>20*1024*1024)throw new Error('Arquivo maior que 20 MB');
  const zip=await JSZip.loadAsync(buffer); const entry=zip.file(wanted);
  if(!entry)throw new Error('Conteúdo principal não encontrado');
  if(entry._data?.uncompressedSize>10*1024*1024)throw new Error('Texto descompactado maior que 10 MB');
  return entry.async('string');
}


