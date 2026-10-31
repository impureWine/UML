import fs from 'node:fs';const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/controller/Game.js',s=>{
 s=s.replace('  getSnapshot(raw=false) {',`  isConcurrent(){return ['ai','online'].includes(this.match?.mode)&&['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(this.match?.phase);}
  actionToken(seat){const m=this.match;return this.isConcurrent()? [m.matchId,m.phase,m.roundNo||0,m.attemptNo||0,seat,m.actionVersions?.[seat]||0].join(':'):m.token;}
  bumpAction(seat){const m=this.match;m.token++;if(this.isConcurrent()){m.actionVersions??={};m.actionVersions[seat]=(m.actionVersions[seat]||0)+1;}}
  actorDone(seat){const m=this.match;return m.phase==='PREPARATION'?!!m.locked[seat]:m.phase==='ROUND_SKILLS'?!!m.skillsDone[seat]:!!m.pending[seat]||!m.players[seat].hand.length;}
  getSnapshot(raw=false,viewerSeat='P1') {`);
 s=s.replace('    if (m?.board) Object.assign(snapshot.setup, InformationProjector.preparation(m));',`    if (m?.board) Object.assign(snapshot.setup, InformationProjector.preparation(this.isConcurrent()?{...m,turn:viewerSeat,covered:false}:m));
    if(this.isConcurrent())Object.assign(snapshot.setup,{concurrent:true,viewerSeat,turn:viewerSeat,covered:false,waiting:this.actorDone(viewerSeat),token:this.actionToken(viewerSeat)});`);
 s=s.replace("m?.mode==='ai'&&m.turn==='P2'&&['DRAFT','PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)","m?.mode==='ai'&&m.turn==='P2'&&m.phase==='DRAFT'");
 s=s.replace("m.preparationCompleted || m.covered || seat!==m.turn || m.locked[seat] || token!==m.token", "m.preparationCompleted || (!this.isConcurrent()&&(m.covered||seat!==m.turn)) || m.locked[seat] || token!==this.actionToken(seat)");
 s=s.replace("m?.phase!=='ROUND_SKILLS'||m.covered||seat!==m.turn||token!==m.token", "m?.phase!=='ROUND_SKILLS'||(!this.isConcurrent()&&(m.covered||seat!==m.turn))||token!==this.actionToken(seat)");
 s=s.replace("m?.phase!=='CARD_LOCK'||m.covered||seat!==m.turn||token!==m.token", "m?.phase!=='CARD_LOCK'||(!this.isConcurrent()&&(m.covered||seat!==m.turn))||token!==this.actionToken(seat)");
 s=s.replace("m.phase!=='ROUND_SKILLS'||m.covered||m.turn!==seat||m.token!==token", "m.phase!=='ROUND_SKILLS'||(!this.isConcurrent()&&(m.covered||m.turn!==seat))||this.actionToken(seat)!==token");
 // Independent per-seat versions preserve the other player's in-flight command.
 const a=s.indexOf('  exchangeCards('),b=s.indexOf('  beginRound()');s=s.slice(0,a)+s.slice(a,b).replaceAll('m.token++','this.bumpAction(seat)')+s.slice(b);
 const c=s.indexOf('  completeSkills('),d=s.indexOf('  announceSkill(');s=s.slice(0,c)+s.slice(c,d).replaceAll('m.token++','this.bumpAction(seat)')+s.slice(d);
 s=s.replace("skill.usedUses++;m.effects[seat]=id;m.token++;", "skill.usedUses++;m.effects[seat]=id;this.bumpAction(seat);");
 s=s.replace("    m.phase='ROUND_SKILLS';m.covered=true;", "    m.attemptNo=(m.attemptNo||0)+1;m.actionVersions={};\n    m.phase='ROUND_SKILLS';m.covered=true;");return s;
});
edit('src/controller/AIController.js',s=>s.replace("   if(m.turn!=='P2')return;", "   if(this.game.isConcurrent()){if(this.game.actorDone('P2'))return;}else if(m.turn!=='P2')return;").replace('   if(m.covered){','   if(m.covered&&!this.game.isConcurrent()){').replace("token:m.token,remaining", "token:this.game.actionToken('P2'),remaining"));
edit('src/utils/NetworkManager.js',s=>{s=s.replace("const snap=this.game.getSnapshot(true);", "const snap=this.game.getSnapshot(true,'P2');").replace("project(setup,seat){const s=structuredClone(setup);", "project(setup,seat){const s=structuredClone(setup);if(s.concurrent){s.deadline=this.deadlines?.[seat]??this.deadline;return s;}").replace("if(msg.data.token!==this.game.match?.token)return;", "if(msg.data.token!==(this.game.actionToken?.('P2')??this.game.match?.token))return;").replace("if(['revealDraft','revealPreparation','revealBattle','quickFill'].includes(name)&&m.turn!==seat)", "if(['revealDraft','revealPreparation','revealBattle','quickFill'].includes(name)&&!this.game.isConcurrent()&&m.turn!==seat)");
 // Both parallel seats receive the same phase deadline; locking one does not reset it.
 s=s.replace("const key=m.phase+':'+m.turn+':'+", "const key=m.phase+':'+(this.game.isConcurrent?.()?'both':m.turn)+':'+");
 s=s.replace("this.deadline=Date.now()+(m.phase==='DRAFT'?15000:45000);", "this.deadline=Date.now()+(m.phase==='DRAFT'?15000:45000);this.deadlines={P1:this.deadline,P2:this.deadline};");
 s=s.replace(' if(Date.now()<this.deadline)return;',` if(Date.now()<this.deadline)return;
 if(this.game.isConcurrent?.()){
 const phase=m.phase;
 for(const seat of ['P1','P2']){if(m.phase!==phase||this.game.actorDone(seat))continue;const token=this.game.actionToken(seat);
 if(phase==='PREPARATION')this.original.lockPreparation(seat,token);
 else if(phase==='ROUND_SKILLS')this.original.completeSkills(seat,token);
 else {const p=m.players[seat];let cards=p.hand.filter(c=>m.freeze?.seat!==seat||c.suit!==m.freeze.suit);if(!cards.length)cards=p.hand;const counts=s=>cards.filter(c=>c.suit===s).length;const suit=['rock','paper','scissors'].sort((a,b)=>counts(b)-counts(a))[0];this.original.lockCard(seat,cards.find(c=>c.suit===suit).cardId,token);}
 }return;
 }`);return s;});

