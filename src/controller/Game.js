import { NetworkManager } from '../utils/NetworkManager.js';
import { AIPlayer } from '../model/AIPlayer.js';
import { AIController } from './AIController.js';
import { RoundSnapshot } from '../model/RoundSnapshot.js';
import { MountainBoard } from '../model/MountainBoard.js';
import { Bomb } from '../model/Bomb.js';
import { CardLedger } from '../model/CardLedger.js';
import { BattleLog } from '../model/BattleLog.js';
import { JudgeRule } from '../model/JudgeRule.js';
import { InformationProjector } from '../utils/InformationProjector.js';
import { RandomSource } from '../utils/RandomSource.js';
import { CardDeck } from '../model/CardDeck.js';
import { Player } from '../model/Player.js';
const PAGES = new Set(['home', 'local', 'ai', 'online', 'guide', 'settings']);

/** Authentication, navigation and account-scoped map preferences; no battle rules. */
export class Game {
  constructor(accountManager, random = new RandomSource()) {
    this.random = random; this.match = null;
    this.accountManager = accountManager;
    this.listeners = new Set();
    this.state = {
      phase: 'AUTH', page: 'home', profile: null, storageError: '',
      auth: { open: true, mode: 'login', busy: false, error: '', notice: '' },
    };
    this.aiController = new AIController(this);
    this.unsubscribeStorage = accountManager.observeChanges(({ profile, error }) => {
      if (error) {
        this.state.storageError = error.message;
      } else {
        this.state.storageError = '';
        // A different window may refresh values, never our login identity.
        if (profile && profile.accountId === this.state.profile?.accountId) {
          this.state.profile = profile;
          if(this.match?.phase==='CHARACTER_SELECT') for(const seat of ['P1','P2']) {
            if(!profile.unlockedCharacterIds.includes(this.match.characters[seat])) this.match.characters[seat]=null;
          }
        }
      }
      this.emit();
    });
  }

  setLocalSeat(seat){const m=this.match;if(m?.mode!=='local'||!['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)||!['P1','P2'].includes(seat))throw new Error('当前不能交接该席位');m.turn=seat;m.covered=true;m.token++;this.emit();}
  freezeFor(seat){const m=this.match;return m.freezes?.[seat]||(m.freeze?.seat===seat?m.freeze:null);}
  isConcurrent(){return ['ai','online'].includes(this.match?.mode)&&['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(this.match?.phase);}
  actionToken(seat){const m=this.match;return this.isConcurrent()? [m.matchId,m.phase,m.roundNo||0,m.attemptNo||0,seat,m.actionVersions?.[seat]||0].join(':'):m.token;}
  bumpAction(seat){const m=this.match;m.token++;if(this.isConcurrent()){m.actionVersions??={};m.actionVersions[seat]=(m.actionVersions[seat]||0)+1;}}
  actorDone(seat){const m=this.match;return m.phase==='PREPARATION'?!!m.locked[seat]:m.phase==='ROUND_SKILLS'?!!m.skillsDone[seat]:!!m.pending[seat]||!m.players[seat].hand.length;}
  getSnapshot(raw=false,viewerSeat='P1') {
    const snapshot = structuredClone(this.state);
    if(this.state.page==='online'&&this.network?.code&&(this.network.seat==='P2'||this.network.transport?.server)&&this.network.remote){snapshot.setup=structuredClone(this.network.remote);return snapshot;}
    const m = this.match;
    if (m) {
      snapshot.setup = { matchId:m.matchId, phase:m.phase, mode:m.mode, characters:{...m.characters}, difficulty:m.difficulty,
        coinChoices:{...m.coinChoices}, coinFace:m.coinFace,
        remainingCounts:m.phase==='DRAFT' ? m.deck.getCounts() : null,
        first:m.first, turn:m.turn, covered:m.covered, token:m.token, remaining:m.deck?.remaining,
        ownHand:m.phase==='DRAFT' && !m.covered ? structuredClone(m.players[m.turn].hand) : null };
    }
    if (m?.board) Object.assign(snapshot.setup, InformationProjector.preparation(this.isConcurrent()?{...m,turn:viewerSeat,covered:false}:m));
    if(this.isConcurrent())Object.assign(snapshot.setup,{concurrent:true,viewerSeat,turn:viewerSeat,covered:false,waiting:this.actorDone(viewerSeat),token:this.actionToken(viewerSeat)});
    if(m?.mode==='local'&&['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)){
      snapshot.setup.waiting=this.actorDone(m.turn);
      if(snapshot.setup.waiting)Object.assign(snapshot.setup,{ownHand:null,ownBombs:null,ownPlaced:[],skills:[],skillBombs:[],recon:null,frozenSuit:null});
    }
    if(m?.roundNo) Object.assign(snapshot.setup,{roundNo:m.roundNo,attemptNo:m.attemptNo,skillsDone:{...m.skillsDone},cardLocked:Object.fromEntries(['P1','P2'].map(s=>[s,!!m.pending?.[s]])),history:structuredClone(m.history||[]),roundResults:structuredClone(m.roundResults||[]),resolution:structuredClone(m.resolution||null),candidate:structuredClone(m.candidate||null),saveStatus:m.saveStatus,saveError:m.saveError});
    if(m?.phase==='FINAL')Object.assign(snapshot.setup,{candidate:structuredClone(m.candidate),saveStatus:m.saveStatus});
    if(!raw&&m?.mode==='online'&&this.network?.code&&this.network.seat==='P1'&&snapshot.setup)snapshot.setup=this.network.project(snapshot.setup,'P1');
    if(!raw&&m?.mode==='ai'&&m.turn==='P2'&&m.phase==='DRAFT'&&snapshot.setup){for(const k of ['ownHand','ownBombs','recon','frozenSuit'])snapshot.setup[k]=null;for(const k of ['ownPlaced','skills','skillBombs'])snapshot.setup[k]=[];snapshot.setup.covered=true;snapshot.setup.waiting=true;}
    return snapshot;
  }

  startSetup() {
    this.requireHome();
    if (this.match || !['local','ai','online'].includes(this.state.page)) throw new Error('当前不能开始选角');
    this.match={phase:'CHARACTER_SELECT',mode:this.state.page,characters:{P1:null,P2:null},difficulty:'simple',token:0,matchId:crypto.randomUUID(),ownerId:this.state.profile.accountId};
    this.emit();
  }
  selectCharacter(seat, id) {
    const m=this.match;
    if(m?.phase!=='CHARACTER_SELECT' || !['P1','P2'].includes(seat)) throw new Error('当前不能选角');
    if(!this.accountManager.getCurrentProfile().unlockedCharacterIds.includes(id)) throw new Error('角色未解锁');
    m.characters[seat]=id; this.emit();
  }
  setDifficulty(value) {
    if(this.match?.phase!=='CHARACTER_SELECT' || !['simple','hard'].includes(value)) throw new Error('难度无效');
    this.match.difficulty=value; this.emit();
  }
  confirmCharacters() {
    const m=this.match;
    if(m?.phase!=='CHARACTER_SELECT') throw new Error('当前不能确认');
    const ids=[...this.accountManager.getCurrentProfile().unlockedCharacterIds,...(this.network?.room()?.guestPool||[])];
    if(!['P1','P2'].every(seat=>ids.includes(m.characters[seat]))) throw new Error('请双方选择已解锁角色');
    m.players=Object.fromEntries(['P1','P2'].map(seat=>[seat,new (m.mode==='ai'&&seat==='P2'?AIPlayer:Player)(seat,m.characters[seat])]));
    m.suppressionLogs=[]; for(const seat of ['P1','P2']) { const other=seat==='P1'?'P2':'P1'; if(m.players[other].character.get('DivineSuppression')) for(const c of m.players[seat].character.skillComponents) if(c.sourceOrigin==='NABERIUS'){c.isSuppressed=true;m.suppressionLogs.push(seat+' '+c.skillId+' 被瓦沙嘉压制');} }
    m.deck=new CardDeck(); m.ledger=new CardLedger(m.deck.cards); m.coinChoices={P1:null,P2:null}; m.phase='COIN'; this.emit();
  }
  chooseCoinFace(seat, face) {
    const m=this.match;
    if(m?.phase!=='COIN' || !['P1','P2'].includes(seat) || !['heads','tails'].includes(face)) throw new Error('当前不能选择硬币面');
    m.coinChoices[seat]=face;
    m.coinChoices[seat==='P1'?'P2':'P1']=face==='heads'?'tails':'heads';
    this.emit();
  }
  tossCoin() {
    const m=this.match;
    if(m?.phase!=='COIN') throw new Error('不能重复抛币');
    if(!m.coinChoices.P1 || !m.coinChoices.P2 || m.coinChoices.P1===m.coinChoices.P2) throw new Error('请先选择双方的硬币面');
    m.coinFace=this.random.tossFairCoin()==='P1'?'heads':'tails';
    m.first=m.coinChoices.P1===m.coinFace?'P1':'P2'; m.phase='COIN_ANIMATION'; this.emit();
  }
  finishCoin() {
    const m=this.match;
    if(m?.phase!=='COIN_ANIMATION') return;
    m.phase='DRAFT'; m.turn=m.first; m.covered=true; this.emit();
  }
  revealDraft() {
    if(this.match?.phase!=='DRAFT') return;
    this.match.covered=false; this.emit();
  }
  pickCard(seat,suit,token) {
    const m=this.match;
    if(m?.phase!=='DRAFT' || m.covered || seat!==m.turn || token!==m.token || m.players[seat].hand.length>=30) throw new Error('选牌步骤已失效');
    const card=m.deck.takeSuit(suit); this.commitDraftCard(card); this.emit();
  }
  commitDraftCard(card) {
    const m=this.match;
    m.ledger.transfer(card, 'deck', m.turn);
    m.players[m.turn].hand.push(card); m.token++; m.turn=m.turn==='P1'?'P2':'P1'; m.covered=true;
    if(Object.values(m.players).every(p=>p.hand.length===30)) { m.phase='PREPARATION'; m.preparationCompleted=false; m.turn=m.first; m.board=new MountainBoard(); m.log=new BattleLog(); m.locked={P1:false,P2:false}; m.nextBomb=1; }
  }
  quickFill() {
    const m=this.match;
    if(m?.phase!=='DRAFT') throw new Error('当前不能补齐');
    while(m.phase==='DRAFT') this.commitDraftCard(m.deck.drawRandom(this.random));
    this.emit();
  }
  requirePreparation(seat, token) {
    const m=this.match;
    if(m?.phase!=='PREPARATION' || m.preparationCompleted || (!this.isConcurrent()&&(m.covered||seat!==m.turn)) || m.locked[seat] || token!==this.actionToken(seat)) throw new Error('准备操作已失效或已锁定');
    return m;
  }
  revealPreparation() {
    const m=this.match;
    if(!m?.board || !m.covered || !['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)) return;
    m.covered=false; this.emit();
  }
  exchangeCards(seat, ids, token) {
    const m=this.requirePreparation(seat,token), p=m.players[seat];
    if(!Array.isArray(ids) || ids.length!==2 || new Set(ids).size!==2 || ids.some(id=>!p.hand.some(c=>c.cardId===id))) throw new Error('请自主选择两张不同实体手牌');
    if(p.bombs+m.board.getOwnedBombs(seat).length>=p.bombCapacity) throw new Error('库存与场上炸弹总数已达上限');
    const cards=p.hand.filter(c=>ids.includes(c.cardId));
    cards.forEach(c=>m.ledger.destroySecretly(c,seat)); p.hand=p.hand.filter(c=>!ids.includes(c.cardId)); p.bombs++; this.bumpAction(seat); this.emit();
  }
  exchangeBomb(seat, token) {
    const m=this.requirePreparation(seat,token), p=m.players[seat];
    if(p.bombs<1 || m.deck.remaining<2) throw new Error('需要1个库存炸弹且公共牌库至少2张');
    const cards=Array.from({length:Math.min(m.deck.remaining,p.character.get('LifeExchangeBonus')?3:2)},()=>m.deck.drawRandom(this.random));
    for(const c of cards){m.ledger.transfer(c,'deck',seat);p.hand.push(c);if(p.character.get('LifeExchangeBonus'))this.announceSkill(seat,'生命兑换','获得一张手牌');} p.bombs--; this.bumpAction(seat); this.emit();
  }
  adjustBomb(seat, id, target, token) {
    const m=this.requirePreparation(seat,token), p=m.players[seat];
    if(id){
      if(!m.board.getOwnedBombs(seat).some(b=>b.bombId===id)) throw new Error('只能调整己方炸弹');
      if(target===null){m.board.removeBomb(id);p.bombs++;}else m.board.moveBomb(id,target);
    }else{
      if(p.bombs<1) throw new Error('库存炸弹不足');
      m.board.placeBomb(new Bomb(`bomb-${String(m.nextBomb).padStart(4,'0')}`,seat,target)); m.nextBomb++;p.bombs--;
    }
    this.bumpAction(seat);this.emit();
  }
  lockPreparation(seat, token) {
    const m=this.requirePreparation(seat,token); m.locked[seat]=true; m.covered=true; this.bumpAction(seat);
    m.turn=seat==='P1'?'P2':'P1';
    if(m.locked.P1&&m.locked.P2){m.preparationCompleted=true;m.phase='CARD_LOCK';m.roundNo=1;m.turn=m.first;this.beginRound();}
    this.emit();
  }
  beginRound() {
    const m=this.match;
    m.attemptNo=(m.attemptNo||0)+1;m.actionVersions={};
    m.phase='ROUND_SKILLS';m.covered=true;m.turn=m.first;m.skillsDone={P1:false,P2:false};m.pending={};m.resolution=null;
    m.rewindDeclined=[];m.freezes={};m.recons={};m.freeze=null;m.water=[];m.recon=null;m.effects={};m.candidate=null;m.reviewDeadline=null;m.roundSnapshot=new RoundSnapshot(m);
    m.token++;
  }
  revealBattle(){const m=this.match;if(!m || !['ROUND_SKILLS','CARD_LOCK'].includes(m.phase))return;m.covered=false;this.emit();}
  completeSkills(seat,token){
    const m=this.match;if(m?.phase!=='ROUND_SKILLS'||(!this.isConcurrent()&&(m.covered||seat!==m.turn))||token!==this.actionToken(seat)||m.skillsDone[seat])throw new Error('操作窗口已失效');
    m.skillsDone[seat]=true;this.bumpAction(seat);m.covered=true;m.turn=seat==='P1'?'P2':'P1';
    if(m.skillsDone.P1&&m.skillsDone.P2){m.requiredActors=[m.first,m.first==='P1'?'P2':'P1'].filter(s=>m.players[s].hand.length);m.phase='CARD_LOCK';m.turn=m.requiredActors[0];if(!m.turn)this.resolveRound();}
    this.emit();
  }
  lockCard(seat,id,token){
    const m=this.match;if(m?.phase!=='CARD_LOCK'||(!this.isConcurrent()&&(m.covered||seat!==m.turn))||token!==this.actionToken(seat)||m.pending[seat])throw new Error('锁牌操作已失效');
    const p=m.players[seat],card=p.hand.find(c=>c.cardId===id);if(!card)throw new Error('请选择一张本人手牌');
    if(this.freezeFor(seat)&&card.suit===this.freezeFor(seat).suit&&p.hand.some(c=>c.suit!==card.suit))throw new Error('该牌型已被冻结');
    m.ledger.transfer(card,seat,'pending');p.hand=p.hand.filter(c=>c!==card);m.pending[seat]=card;this.bumpAction(seat);m.covered=true;
    m.turn=m.requiredActors.find(s=>!m.pending[s]);
    if(!m.turn)this.resolveRound();this.emit();
  }
  announceSkill(seat,name,action){this.match.log.appendSkillEvent(seat,name,action,this.match.roundNo||0);}
  drawCards(seat,n,reason){const m=this.match,p=m.players[seat];for(let i=0;i<n&&m.deck.remaining;i++){const c=m.deck.drawRandom(this.random);m.ledger.transfer(c,'deck',seat);p.hand.push(c);if(reason)this.announceSkill(seat,reason,'获得一张手牌');}}
  skillLanding(seat,step){
    const m=this.match,p=m.players[seat],other=m.players[seat==='P1'?'P2':'P1'],events=[];
    while(step>0&&step<40){const bomb=JudgeRule.selectLandingBomb(m.board.getStep(step).bombQueue,seat);if(!bomb)break;
      m.board.removeBomb(bomb.bombId);
      if(p.character.get('FlameWinStreak')&&p.streak>=2){m.effects[seat]='flame';this.announceSkill(seat,'烈焰连胜','焚毁落脚点的一枚炸弹，免于爆炸');events.push({type:'BOMB_BURNED',seat,stepIndex:step,to:step});break;}
      if(p.shieldUntil>=m.roundNo){m.effects[seat]='shield';this.announceSkill(seat,'玉璋护盾','销毁落脚点的一枚炸弹，免于后退及雷爆弃牌');events.push({type:'BOMB_SHIELDED',seat,stepIndex:step,to:step});break;}
      const wind=p.character.get('WindFirstBombGrace')&&!p.windUsed;
      if(wind){p.windUsed=true;m.effects[seat]='wind';this.announceSkill(seat,'初雷庇护','免除本次炸弹后退');}
      if(m.players[bomb.ownerSeat].character.get('ThunderBombDiscard')&&p.hand.length){const c=p.hand.splice(this.random.uniformIndex(p.hand.length),1)[0];m.ledger.destroySecretly(c,seat);this.announceSkill(seat,'雷爆弃牌','销毁一张手牌');}
      if(!wind&&other.character.get('DeathRetreat'))this.announceSkill(seat,'死亡退行','受到13格炸弹后退效果');
      const to=wind?step:Math.max(0,step-(other.character.get('DeathRetreat')?13:10));events.push({type:wind?'BOMB_WIND':'BOMB_EXPLODED',seat,ownerSeat:bomb.ownerSeat,stepIndex:step,to});if(wind)break;step=to;
    }p.step=step;return {step,events};
  }
  activateSkill(seat,id,args={},token){
    const m=this.match,p=m?.players[seat],skill=p?.character.get(id);
    if(!skill||!skill.remaining)throw new Error('技能被压制或次数不足');
    if(id==='TimeRewind'){
      if(token!==m.token||m.rewindDeclined?.includes(seat)||m.phase!=='ROUND_REVIEW'||!(m.reviewDeadline>Date.now()))throw new Error('回溯窗口已关闭');
      const spent=Object.fromEntries(Object.entries(m.players).map(([s,p])=>[s,p.character.get('TimeRewind')?.usedUses||0]));spent[seat]++;
      m.roundSnapshot.restore(m);for(const [s,p] of Object.entries(m.players)){const c=p.character.get('TimeRewind');if(c)c.usedUses=spent[s];}
      this.beginRound();this.announceSkill(seat,'时之回溯','将双方状态恢复至本回合技能操作前');m.effects[seat]='time';this.emit();return;
    }
    if(m.phase!=='ROUND_SKILLS'||(!this.isConcurrent()&&(m.covered||m.turn!==seat))||this.actionToken(seat)!==token||m.skillsDone[seat])throw new Error('技能操作窗口已失效');
    const other=seat==='P1'?'P2':'P1',q=m.players[other];
    if(id==='JadeShield')p.shieldUntil=m.roundNo+1;
    else if(id==='NatureRecon'){
      const counts=['rock','paper','scissors'].map(s=>[s,q.hand.filter(c=>c.suit===s).length]);counts.sort((a,b)=>b[1]-a[1]);
      m.recon={seat,steps:m.board.steps.filter(c=>c.index>p.step&&c.index<=p.step+10&&c.bombQueue.length).map(c=>c.index),suit:counts[0][1]?counts[0][0]:null};m.recons??={};m.recons[seat]=m.recon;
    }else if(id==='WaterDefeatDraw'){if(!m.deck.remaining||m.water.includes(seat))throw new Error('空库或本轮已激活');m.water.push(seat);}
    else if(id==='FreezeCard'){if(!['rock','paper','scissors'].includes(args.suit))throw new Error('请选择冻结牌型');m.freeze={seat:other,suit:args.suit};m.freezes??={};m.freezes[other]=m.freeze;}
    else if(id==='SpaceOperation'){
      if(args.branch==='swap'){if(Math.abs(p.step-q.step)>5)throw new Error('阶差须不大于5');[p.step,q.step]=[q.step,p.step];}
      else{const bomb=m.board.steps.flatMap(c=>c.bombQueue).find(b=>b.bombId===args.bombId);if(!bomb||!Number.isInteger(args.target)||args.target<1||args.target>39||args.target===bomb.stepIndex||m.board.getStep(args.target).bombQueue.length)throw new Error('请选择已存在炸弹及另一无雷的1～39阶');m.board.moveBomb(bomb.bombId,args.target);}
    }else if(id==='DeathCardBomb'){
      const c=p.hand.find(c=>c.cardId===args.cardId);if(!c||p.hand.length<2||p.bombs+m.board.getOwnedBombs(seat).length>=p.bombCapacity||!Number.isInteger(args.target)||args.target<1||args.target>39)throw new Error('需要至少2张手牌、总雷额度及合法目标');
      m.ledger.destroySecretly(c,seat);this.announceSkill(seat,'终焉宣告','销毁一张手牌，兑换一枚炸弹并立即部署');p.hand=p.hand.filter(x=>x!==c);m.board.placeBomb(new Bomb('skill-'+m.nextBomb++,seat,args.target));
    }else if(id==='LifeReplenish'){if(p.hand.length>=10||!m.deck.remaining)throw new Error('手牌须少于10且公共库非空');this.drawCards(seat,3,'生机赐福');}
    const actions={JadeShield:'开启持续含当轮共两回合的护盾',NatureRecon:'查看对手最多的牌型并扫描前方雷区',WaterDefeatDraw:'激活本回合失利补牌效果',FreezeCard:'冻结对手一种牌型',SpaceOperation:args.branch==='swap'?'交换双方所在阶数':'移动一枚炸弹'};
    if(actions[id])this.announceSkill(seat,skill.name,actions[id]);
    skill.usedUses++;m.effects[seat]=id;this.bumpAction(seat);this.emit();
  }

  resolveRound(){
    const m=this.match;m.phase='RESOLVE';m.covered=true;m.turn=m.first;
    const cards=structuredClone(m.pending),a=cards.P1?.suit,b=cards.P2?.suit;
    const winner=JudgeRule.winner(a,b);const from=Object.fromEntries(['P1','P2'].map(s=>[s,m.players[s].step]));
    m.history??=[];
    for(const [seat,card] of Object.entries(m.pending)){m.ledger.reveal(card);m.history.push({roundNo:m.roundNo,seat,suit:card.suit});}
    let target=null,events=[];
    for(const seat of ['P1','P2'])m.players[seat].streak=winner===seat?m.players[seat].streak+1:0;
    if(winner){const p=m.players[winner],suit=cards[winner].suit;let n=JudgeRule.steps(suit);
      if(p.character.get('WindScissorsBonus')&&suit==='scissors'){n+=2;this.announceSkill(winner,'风行加步','额外前进2阶');}
      if(p.character.get('RockVictoryBonus')&&suit==='rock'){n++;this.announceSkill(winner,'岩胜加步','额外前进1阶');}
      if(p.character.get('WaterVictoryBonus')&&suit==='paper'){n+=2;this.announceSkill(winner,'水胜加步','额外前进2阶');}
      if(p.character.get('FlameWinStreak')&&p.streak>=2){n+=2;m.effects[winner]='flame';this.announceSkill(winner,'烈焰连胜','额外前进2阶');}
      if(this.freezeFor(winner)&&suit===this.freezeFor(winner).suit&&a&&b){n=Math.ceil(n/2);this.announceSkill(winner,'极寒敕令','将本次获胜总步数减半向上取整');}
      target=Math.min(40,from[winner]+n);const landing=this.skillLanding(winner,target);events=landing.events;
    }else for(const seat of ['P1','P2'])if(m.players[seat].shieldUntil>=m.roundNo){this.announceSkill(seat,'玉璋护盾','在平局时前进1阶');const r=this.skillLanding(seat,Math.min(40,from[seat]+1));events.push(...r.events);}
    if(winner)for(const seat of m.water||[])if(seat!==winner&&m.deck.remaining)this.drawCards(seat,1,'万众狂欢');
    events.forEach(e=>m.log.appendPublicEvent(e));
    m.resolution={roundNo:m.roundNo,cards,winner,from,target,events};
    m.roundResults??=[];
    m.roundResults.push({...structuredClone(m.resolution),positions:Object.fromEntries(['P1','P2'].map(s=>[s,m.players[s].step])),advance:winner?target-from[winner]:0});
    const top=['P1','P2'].filter(s=>m.players[s].step===40),empty=Object.values(m.players).every(p=>!p.hand.length);
    m.candidate=top.length||empty?{winner:top.length===2?null:top[0]||(m.players.P1.step===m.players.P2.step?null:m.players.P1.step>m.players.P2.step?'P1':'P2'),reason:top.length?'登顶':'双方手牌耗尽'}:null;
  }
  finishRoundAnimation(roundNo){const m=this.match;if(m?.phase!=='RESOLVE'||m.roundNo!==roundNo)return;m.phase='ROUND_REVIEW';const can=Object.values(m.players).some(p=>p.character.get('TimeRewind')?.remaining>0);if(can){m.reviewDeadline=Date.now()+(m.mode==='online'?45000:5000);const token=m.token;setTimeout(()=>{if(this.match===m&&m.token===token&&m.phase==='ROUND_REVIEW'){m.reviewDeadline=null;this.emit();if(m.candidate)this.finalizeMatch();}},m.mode==='online'?45000:5000);}this.emit();if(m.candidate&&!can)this.finalizeMatch();}
  cancelTimeRewind(seat,token){
    const m=this.match;
    if(!m||token!==m.token||m.phase!=='ROUND_REVIEW'||!(m.reviewDeadline>Date.now())||!m.players[seat]?.character.get('TimeRewind')?.remaining||m.rewindDeclined.includes(seat))throw new Error('回溯窗口已关闭');
    m.rewindDeclined.push(seat);this.announceSkill(seat,'时之回溯','取消本回合回溯，保留技能次数');
    if(!Object.entries(m.players).some(([s,p])=>p.character.get('TimeRewind')?.remaining>0&&!m.rewindDeclined.includes(s))){m.reviewDeadline=null;}
    this.emit();if(m.candidate&&!m.reviewDeadline)this.finalizeMatch();
  }
  nextRound(){const m=this.match;if(m?.phase!=='ROUND_REVIEW'||m.candidate||m.reviewDeadline>Date.now())throw new Error('当前不能开始下一轮');m.roundNo++;this.beginRound();this.emit();}
  async finalizeMatch(){
    const m=this.match;if(m?.reviewDeadline>Date.now())return;
    if(!m?.candidate||!['ROUND_REVIEW','FINAL'].includes(m.phase)||m.saveStatus==='saving'||m.saveStatus==='saved')return;
    m.phase='FINAL';m.saveStatus='saving';m.endedAt??=new Date().toISOString();this.emit();
    try{if(m.mode==='online'){const r=await this.network.result(m.candidate,m);m.candidate={winner:r.winner,reason:r.endReason};}
    const profile=await this.accountManager.commitCompletedMatch(m.ownerId,{matchId:m.matchId,mode:m.mode,ownerSeat:'P1',result:m.candidate.winner===null?'draw':m.candidate.winner==='P1'?'win':'loss',p1CharacterId:m.characters.P1,p2CharacterId:m.characters.P2,p1FinalStep:m.players.P1.step,p2FinalStep:m.players.P2.step,endedAt:m.endedAt,endReason:m.candidate.reason});if(this.match!==m)return;this.state.profile=profile;m.saveStatus='saved';m.saveError='';}
    catch(e){m.saveStatus='error';m.saveError=e.message;}this.emit();
  }
  restartMatch(same=false){const m=this.match;if(!m || m.phase!=='FINAL'||m.saveStatus!=='saved')throw new Error('请先成功保存战绩');const {mode,characters}=m;this.match=null;this.state.page=mode;this.startSetup();if(same){this.match.characters={...characters};this.confirmCharacters();}}
  commitLanding(seat, target) {
    if(!this.match?.preparationCompleted) throw new Error('请先完成准备');
    const m=this.match, result=JudgeRule.resolveLanding(m.board,seat,target);
    result.destroyed.forEach(id=>m.board.removeBomb(id)); m.players[seat].step=result.step;
    result.events.forEach(e=>m.log.appendPublicEvent(e)); this.emit(); return result;
  }
  exitSetup() { if(this.network?.code){this.network.send('leave',{});if(this.network.seat==='P1'){const r=this.network.room();r.closed=true;this.network.write(r);}this.network.transport?.close();this.network.transport=null;this.network.remote=null;this.network.code=null;}this.match=null; this.state.page='home'; this.emit(); }


  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this.getSnapshot());
  }

  requireHome() {
    if (this.state.phase !== 'HOME' || !this.state.profile) {
      throw new Error('请先登录账号，再进入首页。');
    }
    if (this.state.auth.busy) throw new Error('正在处理账号请求，请稍候。');
  }

  navigate(page) {
    this.requireHome();
    if (this.state.auth.open) throw new Error('请先完成或取消账号切换。');
    if (!PAGES.has(page)) throw new Error('该页面尚未开放。');
    if (this.match||this.network?.code) throw new Error('请先退出当前对局或房间再导航。');
    this.state.page = page;
    this.emit();
  }

  returnHome() { this.navigate('home'); }

  changeAuthMode(mode) {
    if (this.state.auth.busy || !['login', 'register'].includes(mode)) return;
    this.state.auth = {
      open: true, mode: mode === 'login' && this.state.profile ? 'switch' : mode,
      busy: false, error: '', notice: '',
    };
    this.emit();
  }

  openSwitchAccount() {
    if (this.match) throw new Error('选角开始后不能切换账号。');
    this.requireHome();
    this.state.page = 'home';
    this.state.auth = { open: true, mode: 'switch', busy: false, error: '', notice: '' };
    this.emit();
  }

  closeAuth() {
    if (!this.state.profile || this.state.auth.busy) return;
    this.state.auth = { open: false, mode: 'login', busy: false, error: '', notice: '' };
    this.emit();
  }

  async submitAuth({ username, password }) {
    if (this.state.auth.busy || !this.state.auth.open) return;
    const mode = this.state.auth.mode;
    this.state.auth.busy = true;
    this.state.auth.error = '';
    this.state.auth.notice = '';
    this.emit();
    try {
      if (mode === 'register') {
        await this.accountManager.register(username, password);
        this.state.auth.mode = this.state.profile ? 'switch' : 'login';
        this.state.auth.notice = '注册成功，请输入密码并登录新账号。';
      } else {
        const profile = mode === 'switch'
          ? await this.accountManager.switchAccount(username, password)
          : await this.accountManager.login(username, password);
        this.state.profile = profile;
        this.state.phase = 'HOME';
        this.state.page = 'home';
        this.state.storageError = '';
        this.state.auth.open = false;
      }
    } catch (error) {
      this.state.auth.error = error.message || '账号操作失败，请重试。';
    } finally {
      this.state.auth.busy = false;
      this.emit();
    }
  }

  logout() {
    if (this.match) throw new Error('对局中不能退出账号。');
    this.requireHome();
    this.accountManager.logout();
    this.state = {
      phase: 'AUTH', page: 'home', profile: null, storageError: '',
      auth: { open: true, mode: 'login', busy: false, error: '', notice: '' },
    };
    this.emit();
  }

  retryStorage() {
    try {
      const profile = this.accountManager.getCurrentProfile();
      if (profile?.accountId === this.state.profile?.accountId) this.state.profile = profile;
      this.state.storageError = '';
    } catch (error) {
      this.state.storageError = error.message;
    }
    this.emit();
  }

  ensureNetwork(){this.network??=new NetworkManager(this);return this.network;}
  async saveSettings(patch){this.requireHome();this.state.profile=await this.accountManager.saveSettings(patch);this.emit();}
  async setCameraAutoFollow(value) {
    this.requireHome();
    if (typeof value !== 'boolean') throw new TypeError('镜头跟随必须是开关值。');
    if (this.state.auth.open) throw new Error('请先完成账号切换。');
    const ownerId = this.state.profile.accountId;
    const profile = await this.accountManager.saveSettings({ cameraAutoFollow: value });
    if (this.state.profile?.accountId === ownerId) {
      this.state.profile = profile;
      this.emit();
    }
  }

  dispose() {
    this.aiController?.dispose();this.network?.dispose();
    this.unsubscribeStorage?.();
    this.listeners.clear();
  }
}
