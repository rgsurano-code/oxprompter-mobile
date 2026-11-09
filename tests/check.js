import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const file of (await fs.readdir(path.join(root,'studio-v2'))).filter(f=>f.endsWith('.js')).map(f=>'studio-v2/'+f).concat(['sw.js','server.mjs'])){const result=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});assert.equal(result.status,0,file+' '+result.stderr);}
const index=await fs.readFile(path.join(root,'index.html'),'utf8');const ids=[...index.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'IDs repetidos');assert(index.includes('playsinline'));assert(index.includes('./studio-v2/app.js'));
const sw=await fs.readFile(path.join(root,'sw.js'),'utf8');for(const [,asset] of sw.matchAll(/'(\.\/[^']*)'/g)){const stat=await fs.stat(path.join(root,asset));assert(stat.isFile()||asset==='./',asset);}
for(const file of await fs.readdir(path.join(root,'studio-v2'))){const source=await fs.readFile(path.join(root,'studio-v2',file),'utf8');for(const [,relative] of source.matchAll(/from '([^']+)'/g))await fs.access(path.join(root,'studio-v2',relative));}
console.log('APROVADO: sintaxe, IDs únicos, grafo de módulos, ativos do cache e caminhos relativos.');
