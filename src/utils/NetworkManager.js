const COMMANDS=['selectCharacter','confirmCharacters','chooseCoinFace','tossCoin','finishCoin','revealDraft','pickCard','quickFill','revealPreparation','exchangeCards','exchangeBomb','adjustBomb','lockPreparation','revealBattle','completeSkills','activateSkill','lockCard','finishRoundAnimation','cancelTimeRewind','nextRound','finalizeMatch'];
const PRIVATE=['ownHand','ownBombs','ownPlaced','skills','skillBombs','recon','frozenSuit'];
export class NetworkManager {
 constructor(game){this.game=game;this.id=crypto.randomUUID();this.seen=new Set();this.original={};
 for(const name of COMMANDS){this.original[name]=game[name].bind(game);game[name]=(...args)=>this.command(name,args);}
 this.channel=new BroadcastChannel('climb40-rooms-v1');this.channel.onmessage=e=>this.receive(e.data);
 this.storage=e=>{if(e.key==='climb40-wire'&&e.newValue)this.receive(JSON.parse(e.newValue));};addEventListener('storage',this.storage);
 this.leave=()=>{this.send('leave',{});if(this.seat==='P1'&&this.code){const r=this.room();if(r){r.closed=true;this.write(r);}}};addEventListener('pagehide',this.leave);
 this.unsub=game.subscribe(()=>{if(this.seat==='P1'&&!this.publishing)this.publish();});
 this.tick=setInterval(()=>this.pulse(),250);
 }
 send(type,data,to){if(!this.code)return;const message={code:this.code,from:this.id,to,type,data,id:crypto.randomUUID()};this.channel.postMessage(message);localStorage.setItem('climb40-wire',JSON.stringify(message));}
 holdLife(){navigator.locks.request('climb40-life-'+this.id,()=>new Promise(resolve=>{this.releaseLife=resolve;}));}
 async lock(fn){if(!navigator.locks)throw Error('联机需要支持 Web Locks 的浏览器');return navigator.locks.request('climb40-room-'+this.code,fn);}
 async create(){this.code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);this.seat='P1';this.holdLife();await this.lock(()=>{localStorage.setItem('climb40-room-'+this.code,JSON.stringify({host:this.id,at:Date.now(),ready:{},guests:[]}));});this.game.emit();}
 async join(code){if(!/^\d{4,6}$/.test(code))throw Error('请输入4～6位房间码');this.code=code;await this.lock(()=>{const r=this.room();if(!r||r.closed||Date.now()-r.at>600000||r.guests.length)throw Error('房间不存在、已满或过期');r.guests=[this.id];r.guestPool=this.game.state.profile.unlockedCharacterIds;this.write(r);});this.seat='P2';this.holdLife();this.send('joined',{});this.game.emit();}
 room(){return JSON.parse(localStorage.getItem('climb40-room-'+this.code)||'null');}
 write(r){localStorage.setItem('climb40-room-'+this.code,JSON.stringify(r));}
 async ready(){await this.lock(()=>{const r=this.room();r.ready[this.seat]=true;r.at=Date.now();this.write(r);});this.send('ready',{});this.start();this.game.emit();}
 start(){const r=this.room();if(this.seat==='P1'&&r?.ready.P1&&r.ready.P2&&!this.game.match){this.game.startSetup();}}
 command(name,args){if(!this.code)return this.original[name](...args);
 if(!COMMANDS.includes(name))throw Error('无效命令');
 if(this.seat==='P2'){this.send('command',{name,args,token:this.remote?.token});return;}
 return this.execute('P1',name,args);
 }
 execute(seat,name,args){const m=this.game.match;if(!m)return;
 if(!COMMANDS.includes(name))throw Error('无效命令');
 if(['selectCharacter','chooseCoinFace','exchangeCards','exchangeBomb','adjustBomb','lockPreparation','completeSkills','activateSkill','lockCard','pickCard','cancelTimeRewind'].includes(name)&&args[0]!==seat)throw Error('只能操作本人席位');
 if(['revealDraft','revealPreparation','revealBattle','quickFill'].includes(name)&&!this.game.isConcurrent()&&m.turn!==seat)throw Error('等待对方操作');
 if(['confirmCharacters','tossCoin','finishCoin','finishRoundAnimation','finalizeMatch'].includes(name)&&seat!=='P1')return;
 if(name==='selectCharacter'&&seat==='P2'){if(!this.room().guestPool.includes(args[1]))throw Error('角色未解锁');m.characters.P2=args[1];this.game.emit();return;}
 if(name==='confirmCharacters'){if(!m.characters.P1||!m.characters.P2)return;}
 if(name==='quickFill'){m.covered=false;this.game.commitDraftCard(m.deck.drawRandom(this.game.random));this.game.emit();return;}
 if(['restartMatch'].includes(name))throw Error('请重新创建房间');
 return this.original[name](...args);
 }
 publish(){if(!this.code)return;const m=this.game.match;if(!m)return;
 this.publishing=true;
 try{const snap=this.game.getSnapshot(true,'P2');this.send('view',this.project(snap.setup,'P2'),this.room()?.guests[0]);}finally{this.publishing=false;}
 }
 project(setup,seat){const s=structuredClone(setup);if(s.mode&&s.mode!=='online'){delete s.deadline;return s;}if(s.concurrent){s.deadline=this.deadlines?.[seat]??this.deadline;return s;}if(s.turn!==seat){for(const k of PRIVATE)s[k]=k==='ownPlaced'||k==='skills'||k==='skillBombs'?[]:null;s.covered=true;}s.waiting=s.turn!==seat&&!['CHARACTER_SELECT','COIN','COIN_ANIMATION','RESOLVE','ROUND_REVIEW','FINAL'].includes(s.phase);s.viewerSeat=seat;s.deadline=this.deadline;return s;}
 async receive(msg){if(msg.code!==this.code||msg.from===this.id||(msg.to&&msg.to!==this.id)||this.seen.has(msg.id))return;this.seen.add(msg.id);
 const r=this.room();if(!r||![r.host,...r.guests].includes(msg.from))return;
 try{
 if(msg.type==='joined'||msg.type==='ready'){this.start();this.game.emit();}
 if(msg.type==='command'&&this.seat==='P1'&&msg.from===r.guests[0]){if(msg.data.token!==(this.game.actionToken?.('P2')??this.game.match?.token))return;await this.execute('P2',msg.data.name,msg.data.args);}
 if(msg.type==='view'&&this.seat==='P2'&&msg.from===r.host){this.remote=msg.data;this.game.emit();if(this.remote.phase==='FINAL')await this.recordRemote();}
 if(msg.type==='leave'){await this.disconnected();}
 }catch(e){this.game.state.storageError=e.message;this.game.emit();}
 }
 async recordRemote(){const m=this.remote;if(!m?.candidate)return;const record=await this.result(m.candidate,m);const {winner,...data}=record;await this.game.accountManager.commitCompletedMatch(this.game.state.profile.accountId,{...data,ownerSeat:'P2',result:winner===null?'draw':winner==='P2'?'win':'loss'});this.remote.saveStatus='saved';this.game.retryStorage();}
 async result(candidate,m){return this.lock(()=>{const key='climb40-result-'+m.matchId;let r=JSON.parse(localStorage.getItem(key)||'null');if(!r){r={matchId:m.matchId,mode:'online',ownerSeat:'P1',result:candidate.winner===null?'draw':candidate.winner==='P1'?'win':'loss',p1CharacterId:m.characters.P1||'未选择',p2CharacterId:m.characters.P2||'未选择',p1FinalStep:m.players?.P1.step??m.positions?.P1??0,p2FinalStep:m.players?.P2.step??m.positions?.P2??0,endedAt:new Date().toISOString(),endReason:candidate.reason,winner:candidate.winner};localStorage.setItem(key,JSON.stringify(r));}return r;});}
 async disconnected(){const m=this.seat==='P1'?this.game.match:this.remote;if(m&&m.phase!=='FINAL'){const record=await this.result({winner:this.seat,reason:'opponent_left'},m);const {winner,...data}=record;await this.game.accountManager.commitCompletedMatch(this.game.state.profile.accountId,{...data,ownerSeat:this.seat,result:winner===this.seat?'win':'loss'});this.game.retryStorage();}if(this.seat==='P1'){const r=this.room();r.closed=true;this.write(r);}this.remote=null;this.game.match=null;this.code=null;this.game.state.page='home';this.game.emit();}
 pulse(){if(!this.code)return;
 if(!this.checking){this.checking=true;navigator.locks.query().then(q=>{const r=this.room(),other=this.seat==='P1'?r?.guests[0]:r?.host;this.observedLife??=new Set();if(other&&q.held.some(l=>l.name==='climb40-life-'+other))this.observedLife.add(other);if(other&&this.observedLife.has(other)&&q.held.every(l=>l.name!=='climb40-life-'+other))this.disconnected().catch(e=>{this.game.state.storageError=e.message;});}).finally(()=>this.checking=false);}
const r=this.room();if(r?.closed&&(this.remote||this.game.match)){this.disconnected().catch(e=>{this.game.state.storageError=e.message;});return;}if(!r||r.closed||Date.now()-r.at>600000){this.game.state.storageError='房间已解散';this.remote=null;this.game.match=null;this.code=null;this.game.emit();return;}
 if(this.seat!=='P1')return;const m=this.game.match;if(!m||m.mode&&m.mode!=='online')return;
 if(this.roundSnapshot!==m.roundSnapshot){this.roundSnapshot=m.roundSnapshot;this.epoch=(this.epoch||0)+1;}
 const key=m.phase+':'+(this.game.isConcurrent?.()?'both':m.turn)+':'+(m.phase==='DRAFT'?m.token:m.roundNo||0)+':'+this.epoch;
 if(key!==this.step){this.step=key;this.deadline=Date.now()+(m.phase==='DRAFT'?15000:45000);this.deadlines={P1:this.deadline,P2:this.deadline};r.at=Date.now();this.write(r);this.publish();}
 if(Date.now()<this.deadline)return;
 if(this.game.isConcurrent?.()){
 const phase=m.phase;
 for(const seat of ['P1','P2']){if(m.phase!==phase||this.game.actorDone(seat))continue;const token=this.game.actionToken(seat);
 if(phase==='PREPARATION')this.original.lockPreparation(seat,token);
 else if(phase==='ROUND_SKILLS')this.original.completeSkills(seat,token);
 else {const p=m.players[seat];let cards=p.hand.filter(c=>!this.game.freezeFor(seat)||c.suit!==this.game.freezeFor(seat).suit);if(!cards.length)cards=p.hand;const counts=s=>cards.filter(c=>c.suit===s).length;const suit=['rock','paper','scissors'].sort((a,b)=>counts(b)-counts(a))[0];this.original.lockCard(seat,cards.find(c=>c.suit===suit).cardId,token);}
 }return;
 }
 try{if(m.phase==='CHARACTER_SELECT'){for(const seat of ['P1','P2'])if(!m.characters[seat])m.characters[seat]=(seat==='P1'?this.game.state.profile.unlockedCharacterIds:r.guestPool)[0];this.original.confirmCharacters();}
 else if(m.phase==='COIN'){this.original.chooseCoinFace('P1','heads');this.original.tossCoin();}
 else if(m.phase==='DRAFT'){m.covered=false;this.game.commitDraftCard(m.deck.drawRandom(this.game.random));this.game.emit();}
 else if(m.phase==='PREPARATION'){m.covered=false;this.original.lockPreparation(m.turn,m.token);}
 else if(m.phase==='ROUND_SKILLS'){m.covered=false;this.original.completeSkills(m.turn,m.token);}
 else if(m.phase==='CARD_LOCK'){m.covered=false;const p=m.players[m.turn];let cards=p.hand.filter(c=>c.suit!==m.freeze?.suit||m.freeze?.seat!==m.turn);if(!cards.length)cards=p.hand;const counts=s=>cards.filter(c=>c.suit===s).length;const suit=['rock','paper','scissors'].sort((a,b)=>counts(b)-counts(a))[0];this.original.lockCard(m.turn,cards.find(c=>c.suit===suit).cardId,m.token);}
 }catch(e){this.game.state.storageError=e.message;}
 }
 dispose(){this.releaseLife?.();clearInterval(this.tick);this.unsub();this.channel.close();removeEventListener('storage',this.storage);removeEventListener('pagehide',this.leave);}
}
