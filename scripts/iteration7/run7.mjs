import fs from 'node:fs';
let s=fs.readFileSync('implement7.py','utf8').replace('from pathlib import Path','');
s=s.replace(/p=Path\(([^)]+)\)/g,'p=$1').replace(/s=p.read_text\(\)/g,"s=fs.readFileSync(p,'utf8')").replace(/p.write_text\(s\)/g,"fs.writeFileSync(p,s)").replace(/s\.replace\(/g,'s.replaceAll(').replace(/assert old in s;/g,'');
s=s.replace(/"""([\s\S]*?)"""/g,(_,x)=>JSON.stringify(x));
s=s.replace(/^(p=|old=|new=|s=)/gm,'$1');
// Python statements already use JS-compatible strings and semicolons.
s=s.replace(/\n(s=s\.replaceAll[^\n]*)/g,'\n$1;');
let p,old;let out='let s;';
// variable named new is reserved
s=s.replace(/\bnew=/g,'replacement=').replace(/\(old,new\)/g,'(old,replacement)');
let replacement;eval(s);
