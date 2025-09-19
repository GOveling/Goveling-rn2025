
// tools/find-hardcoded.js
// Busca literales de texto sospechosos en .tsx para migrar a i18n
const fs = require('fs'); const path = require('path');
const root = process.argv[2] || 'app';
function walk(dir, out=[]){
  for (const f of fs.readdirSync(dir)){
    const p = path.join(dir,f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, out); else if (/\.(tsx|ts|jsx|js)$/.test(f)) out.push(p);
  } return out;
}
const files = walk(root);
const rx = />\s*([A-Za-zÀ-ÿ0-9][^<>{}]{2,})\s*<\/Text>/g;
for (const f of files){
  const txt = fs.readFileSync(f,'utf8');
  let m, hits=[];
  while ((m = rx.exec(txt))) hits.push({ text:m[1].trim(), idx:m.index });
  if (hits.length) {
    console.log('File:', f);
    for (const h of hits.slice(0,10)) console.log('  ', h.text);
  }
}
