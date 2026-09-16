import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!['dist','.git'].includes(e.name)?files(path.join(dir,e.name)):e.isFile()?[path.join(dir,e.name)]:[]);}
const all=files(root);let references=0;
for(const file of all){
 if(/\.(js|mjs)$/.test(file)){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);
 }
 if(!/\.(html|css)$/.test(file))continue;
 const text=fs.readFileSync(file,'utf8');
 const re=file.endsWith('.html')?/(?:href|src)="([^"]+)"/g:/url\(['"]?([^'"\)]+)['"]?\)/g;
 for(const match of text.matchAll(re)){
  const value=match[1];if(value.startsWith('#')||/^(https?:|data:|mailto:)/.test(value))continue;
  const target=path.resolve(path.dirname(file),value.split('#')[0]);
  if(!fs.existsSync(target))throw new Error(`Missing asset: ${file}: ${value}`);references++;
 }
}
for(const file of all.filter(file=>file.endsWith('.html'))){
 const html=fs.readFileSync(file,'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)throw new Error(`Duplicate HTML IDs: ${file}`);
 for(const m of html.matchAll(/(?:for|aria-labelledby)="([^"]+)"/g))for(const id of m[1].split(' '))if(!ids.includes(id))throw new Error(`Missing label target ${file}: ${id}`);
}
const html=fs.readFileSync(root+'app.html','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const app=fs.readFileSync(root+'js/app.js','utf8');
for(const m of app.matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(m[1]))throw new Error('Missing DOM target '+m[1]);
console.log(`PASS: JavaScript syntax, ${references} local links/assets, input labels and script targets`);
