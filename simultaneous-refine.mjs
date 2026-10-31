import fs from 'node:fs';const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/controller/Game.js',s=>s.replace('  isConcurrent(){',`  setLocalSeat(seat){const m=this.match;if(m?.mode!=='local'||!['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)||!['P1','P2'].includes(seat)||this.actorDone(seat))throw new Error('该席位已确认或当前不能交接');m.turn=seat;m.covered=true;this.emit();}
  freezeFor(seat){const m=this.match;return m.freezes?.[seat]||(m.freeze?.seat===seat?m.freeze:null);}
  isConcurrent(){`).replace('m.rewindDeclined=[];m.freeze=null;', 'm.rewindDeclined=[];m.freezes={};m.recons={};m.freeze=null;').replace("if(m.freeze?.seat===seat&&card.suit===m.freeze.suit", "if(this.freezeFor(seat)&&card.suit===this.freezeFor(seat).suit").replace("p.hand.some(c=>c.suit!==card.suit)", "p.hand.some(c=>c.suit!==card.suit)").replace("m.freeze={seat:other,suit:args.suit};", "m.freeze={seat:other,suit:args.suit};m.freezes??={};m.freezes[other]=m.freeze;").replace("suit:counts[0][1]?counts[0][0]:null};", "suit:counts[0][1]?counts[0][0]:null};m.recons??={};m.recons[seat]=m.recon;").replace("if(m.freeze?.seat===winner&&suit===m.freeze.suit&&a&&b)", "if(this.freezeFor(winner)&&suit===this.freezeFor(winner).suit&&a&&b)"));
edit('src/utils/InformationProjector.js',s=>s.replace("recon:own&&m.recon?.seat===m.turn?m.recon:null,", "recon:own?(m.recons?.[m.turn]||(m.recon?.seat===m.turn?m.recon:null)):null,").replace("frozenSuit:own&&m.freeze?.seat===m.turn?m.freeze.suit:null,", "frozenSuit:own?(m.freezes?.[m.turn]?.suit||(m.freeze?.seat===m.turn?m.freeze.suit:null)):null,"));
edit('src/utils/NetworkManager.js',s=>s.replace("m.freeze?.seat!==seat||c.suit!==m.freeze.suit", "!this.game.freezeFor(seat)||c.suit!==this.game.freezeFor(seat).suit"));
edit('src/view/OpeningPanel.js',s=>s.replace(" this.run(()=>{if(b.dataset.coinFace)", " this.run(()=>{if(b.dataset.localSeat)return game.setLocalSeat(b.dataset.localSeat);if(b.dataset.coinFace)"));
for(const file of ['src/view/PreparationPanel.js','src/view/BattlePanel.js'])edit(file,s=>{
 const target=file.includes('Preparation')?'    if(m.waiting){':" if(['ROUND_SKILLS','CARD_LOCK'].includes(m.phase)){";
 const ui=`${file.includes('Preparation')?'    ': ' '}if(m.mode==='local'&&['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)){this.root.querySelector('.guide-heading').insertAdjacentHTML('beforeend','<nav aria-label="本地私密交接"><button data-local-seat="P1">交给 P1</button><button data-local-seat="P2">交给 P2</button></nav>');}
`;
 // Battle header survives updates: replace old nav before inserting.
 return s.replace(target, (file.includes('Battle')?" this.root.querySelector('[aria-label=\"本地私密交接\"]')?.remove();\n":'')+ui+target);
});
