import fs from 'node:fs';const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/controller/Game.js',s=>{
 const a=s.indexOf('  async setFusionTestUnlock('),b=s.indexOf('  confirmCharacters()',a);s=s.slice(0,a)+s.slice(b);
 s=s.replace("||this.actorDone(seat))throw", ")throw");
 s=s.replace("if(this.network?.seat==='P2'&&this.network.remote)","if(this.state.page==='online'&&this.network?.code&&this.network.seat==='P2'&&this.network.remote)");
 s=s.replace("if(!raw&&this.network?.seat==='P1'&&snapshot.setup)","if(!raw&&m?.mode==='online'&&this.network?.code&&this.network.seat==='P1'&&snapshot.setup)");
 s=s.replace('    if(m?.roundNo) Object.assign',`    if(m?.mode==='local'&&['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)){
      snapshot.setup.waiting=this.actorDone(m.turn);
      if(snapshot.setup.waiting)Object.assign(snapshot.setup,{ownHand:null,ownBombs:null,ownPlaced:[],skills:[],skillBombs:[],recon:null,frozenSuit:null});
    }
    if(m?.roundNo) Object.assign`);
 return s;
});
edit('src/utils/AccountManager.js',s=>{
 const a=s.indexOf('  async setFusionTestUnlock('),b=s.indexOf('  async commitCompletedMatch(',a);s=s.slice(0,a)+s.slice(b);
 s=s.replace('p.matchHistory.push(structuredClone(record));',`const own=record.ownerSeat==='P1'?record.p1CharacterId:record.p2CharacterId;
        const opponent=record.ownerSeat==='P1'?record.p2CharacterId:record.p1CharacterId;
        if(record.result==='win'&&own==='CH-12'&&opponent==='CH-11'&&!p.unlockedCharacterIds.includes('CH-13'))p.unlockedCharacterIds.push('CH-13');
        p.matchHistory.push(structuredClone(record));`);return s;
});
edit('src/view/OpeningPanel.js',s=>s.replace('unlock:()=>game.setFusionTestUnlock(true),reset:()=>game.setFusionTestUnlock(false),','').replace(/<button data-opening="unlock">.*?<\/button><button data-opening="reset">.*?<\/button><small>.*?<\/small>/,'').replace('class="unlock-tools"','class="unlock-status"'));
edit('src/view/GameView.js',s=>s.replace("this.clock=setInterval(()=>{const s=this.snapshot?.setup;for(const out of this.root.querySelectorAll('[data-step-clock]')){out.textContent=s?.deadline?'· 本步剩余 '+Math.max(0,Math.ceil((s.deadline-Date.now())/1000))+' 秒':'';}},250);","this.clock=setInterval(()=>this.updateStepClock(),250);").replace("closest('[data-room],[data-debug-unlock]')", "closest('[data-room]')").replace("        if (button.dataset.debugUnlock) await game.setFusionTestUnlock(button.dataset.debugUnlock === 'yes');\n        else await this.handleRoomAction(button.dataset.room);", "        await this.handleRoomAction(button.dataset.room);").replace('<button data-debug-unlock="yes">调试：一键解锁</button><button data-debug-unlock="no">调试：重置锁定</button>','').replace('  renderSettings(profile){',`  updateStepClock(){
 const s=this.snapshot?.setup;
 const text=s?.mode==='online'&&Number.isFinite(s.deadline)&&s.deadline>0?'· 本步剩余 '+Math.max(0,Math.ceil((s.deadline-Date.now())/1000))+' 秒':'';
 for(const out of this.root.querySelectorAll('[data-step-clock]'))out.textContent=text;
 }
  renderSettings(profile){`));
edit('src/utils/NetworkManager.js',s=>s.replace("project(setup,seat){const s=structuredClone(setup);", "project(setup,seat){const s=structuredClone(setup);if(s.mode&&s.mode!=='online'){delete s.deadline;return s;}").replace("if(this.seat!=='P1')return;const m=this.game.match;if(!m)return;", "if(this.seat!=='P1')return;const m=this.game.match;if(!m||m.mode&&m.mode!=='online')return;"));
// Replace the obsolete debug API test with the production unlock transaction.
edit('tests/unit/opening-flow.test.js',s=>{const a=s.indexOf("test('测试解锁"),b=s.indexOf("test('库分项",a);return s.slice(0,a)+`test('正式胜利才解锁当前账号融合，失败写入不污染档案',async()=>{
 const env=environment();const manager=new AccountManager({store:new LocalStorageStore(env)});
 await manager.register('甲甲','pass');await manager.register('乙乙','pass');await manager.login('甲甲','pass');
 const record={matchId:'unlock-normal',mode:'local',ownerSeat:'P1',result:'win',p1CharacterId:'CH-12',p2CharacterId:'CH-11',p1FinalStep:40,p2FinalStep:12,endedAt:new Date().toISOString(),endReason:'登顶'};
 env.storage.writeError=true;await assert.rejects(manager.commitCompletedMatch(manager.currentAccountId,record));assert.ok(!manager.getCurrentProfile().unlockedCharacterIds.includes('CH-13'));
 env.storage.writeError=false;await manager.commitCompletedMatch(manager.currentAccountId,record);assert.ok(manager.getCurrentProfile().unlockedCharacterIds.includes('CH-13'));
 await manager.commitCompletedMatch(manager.currentAccountId,record);assert.equal(manager.getCurrentProfile().stats.total,1);
 await manager.login('乙乙','pass');assert.ok(!manager.getCurrentProfile().unlockedCharacterIds.includes('CH-13'));manager.dispose();
});

`+s.slice(b);});
