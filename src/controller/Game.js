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

  getSnapshot() {
    const snapshot = structuredClone(this.state);
    const m = this.match;
    if (m) {
      snapshot.setup = { phase:m.phase, mode:m.mode, characters:{...m.characters}, difficulty:m.difficulty,
        coinChoices:{...m.coinChoices}, coinFace:m.coinFace,
        remainingCounts:m.phase==='DRAFT' ? m.deck.getCounts() : null,
        first:m.first, turn:m.turn, covered:m.covered, token:m.token, remaining:m.deck?.remaining,
        ownHand:m.phase==='DRAFT' && !m.covered ? structuredClone(m.players[m.turn].hand) : null };
    }
    if (m?.board) Object.assign(snapshot.setup, InformationProjector.preparation(m));
    return snapshot;
  }

  startSetup() {
    this.requireHome();
    if (this.match || !['local','ai'].includes(this.state.page)) throw new Error('当前不能开始选角');
    this.match={phase:'CHARACTER_SELECT',mode:this.state.page,characters:{P1:null,P2:null},difficulty:'simple',token:0};
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
  async setFusionTestUnlock(value) {
    if(this.match && this.match.phase!=='CHARACTER_SELECT') throw new Error('已确定角色，对局中不能改变解锁状态');
    const profile=await this.accountManager.setFusionTestUnlock(value);
    this.state.profile=profile;
    if(!value && this.match) for(const seat of ['P1','P2']) if(this.match.characters[seat]==='CH-13') this.match.characters[seat]=null;
    this.emit();
  }
  confirmCharacters() {
    const m=this.match;
    if(m?.phase!=='CHARACTER_SELECT') throw new Error('当前不能确认');
    const ids=this.accountManager.getCurrentProfile().unlockedCharacterIds;
    if(!['P1','P2'].every(seat=>ids.includes(m.characters[seat]))) throw new Error('请双方选择已解锁角色');
    m.players=Object.fromEntries(['P1','P2'].map(seat=>[seat,new Player(seat,m.characters[seat])]));
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
    if(m?.phase!=='PREPARATION' || m.preparationCompleted || m.covered || seat!==m.turn || m.locked[seat] || token!==m.token) throw new Error('准备操作已失效或已锁定');
    return m;
  }
  revealPreparation() {
    const m=this.match;
    if(!m?.board || !m.covered || !['PREPARATION','CARD_LOCK'].includes(m.phase)) return;
    m.covered=false; this.emit();
  }
  exchangeCards(seat, ids, token) {
    const m=this.requirePreparation(seat,token), p=m.players[seat];
    if(!Array.isArray(ids) || ids.length!==2 || new Set(ids).size!==2 || ids.some(id=>!p.hand.some(c=>c.cardId===id))) throw new Error('请自主选择两张不同实体手牌');
    if(p.bombs+m.board.getOwnedBombs(seat).length>=p.bombCapacity) throw new Error('库存与场上炸弹总数已达上限');
    const cards=p.hand.filter(c=>ids.includes(c.cardId));
    cards.forEach(c=>m.ledger.destroySecretly(c,seat)); p.hand=p.hand.filter(c=>!ids.includes(c.cardId)); p.bombs++; m.token++; this.emit();
  }
  exchangeBomb(seat, token) {
    const m=this.requirePreparation(seat,token), p=m.players[seat];
    if(p.bombs<1 || m.deck.remaining<2) throw new Error('需要1个库存炸弹且公共牌库至少2张');
    const cards=[m.deck.drawRandom(this.random),m.deck.drawRandom(this.random)];
    for(const c of cards){m.ledger.transfer(c,'deck',seat);p.hand.push(c);} p.bombs--; m.token++; this.emit();
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
    m.token++;this.emit();
  }
  lockPreparation(seat, token) {
    const m=this.requirePreparation(seat,token); m.locked[seat]=true; m.covered=true; m.token++;
    m.turn=seat==='P1'?'P2':'P1';
    if(m.locked.P1&&m.locked.P2){m.preparationCompleted=true;m.phase='CARD_LOCK';m.roundNo=1;m.turn=m.first;}
    this.emit();
  }
  commitLanding(seat, target) {
    if(!this.match?.preparationCompleted) throw new Error('请先完成准备');
    const m=this.match, result=JudgeRule.resolveLanding(m.board,seat,target);
    result.destroyed.forEach(id=>m.board.removeBomb(id)); m.players[seat].step=result.step;
    result.events.forEach(e=>m.log.appendPublicEvent(e)); this.emit(); return result;
  }
  exitSetup() { this.match=null; this.state.page='home'; this.emit(); }


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
    if (this.match) throw new Error('请先退出当前对局再导航。');
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
    this.unsubscribeStorage?.();
    this.listeners.clear();
  }
}
