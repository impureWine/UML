import fs from 'node:fs';
const p='src/view/BattlePanel.js';let s=fs.readFileSync(p,'utf8');
s=s.replace(' update(snapshot){this.m=snapshot.setup;',` selectedCardBeforeUpdate(next){
 const previous=this.m;
 const canChoose=m=>m?.phase==='CARD_LOCK'&&!m.covered&&!m.waiting;
 if(!canChoose(previous)||!canChoose(next))return null;
 // Opponent updates may redraw the console, but a local draft belongs to one
 // match, round, rewind attempt and private seat, independently of revisions.
 const scope=m=>JSON.stringify([m.matchId,m.roundNo,m.attemptNo,m.viewerSeat||m.turn]);
 if(scope(previous)!==scope(next))return null;
 return this.root.querySelector('[name="battle-card"]:checked')?.value||null;
 }
 restoreSelectedCard(cardId){
 if(!cardId)return;
 const input=[...this.root.querySelectorAll('[name="battle-card"]')].find(c=>c.value===cardId&&!c.disabled);
 if(input)input.checked=true;
 }
 update(snapshot){const selectedCard=this.selectedCardBeforeUpdate(snapshot.setup);this.m=snapshot.setup;`);
s=s.replace(" this.root.querySelector('.battle-history').innerHTML=", " this.restoreSelectedCard(selectedCard);\n this.root.querySelector('.battle-history').innerHTML=");
fs.writeFileSync(p,s);
const g='src/controller/Game.js';s=fs.readFileSync(g,'utf8');s=s.replace('roundNo:m.roundNo,skillsDone:', 'roundNo:m.roundNo,attemptNo:m.attemptNo,skillsDone:');fs.writeFileSync(g,s);
