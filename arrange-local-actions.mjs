import fs from 'node:fs';
for(const [file,kind] of [['src/view/BattlePanel.js','battle'],['src/view/PreparationPanel.js','prep']]){
 let s=fs.readFileSync(file,'utf8');
 s=s.replace(`<button data-${kind}="exit">退出对局</button></header>`,`<div class="match-heading-actions"><button data-${kind}="exit">退出对局</button></div></header>`);
 s=s.replace("this.root.querySelector('.guide-heading').insertAdjacentHTML('beforeend','<nav aria-label=\"本地私密交接\">",`this.root.querySelector('[data-${kind}="exit"]').insertAdjacentHTML('beforebegin','<nav aria-label="本地私密交接">`);
 fs.writeFileSync(file,s);
}
fs.appendFileSync('src/styles/opening.css','\n.match-heading-actions{display:flex;align-items:center;gap:12px;margin-left:auto}\n.match-heading-actions nav{display:flex;align-items:center;gap:8px}\n');
