import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../src/controller/Game.js';
import {Character} from '../../src/model/Character.js';
import {Player} from '../../src/model/Player.js';
import {MountainBoard} from '../../src/model/MountainBoard.js';
import {CardDeck} from '../../src/model/CardDeck.js';
import {CardLedger} from '../../src/model/CardLedger.js';
import {BattleLog} from '../../src/model/BattleLog.js';
import {Bomb} from '../../src/model/Bomb.js';
function fixture(a,b){const g=new Game({observeChanges:()=>()=>{}},{uniformIndex:()=>0});const deck=new CardDeck();g.match={players:{P1:new Player('P1',a),P2:new Player('P2',b)},characters:{P1:a,P2:b},board:new MountainBoard(),deck,ledger:new CardLedger(deck.cards),log:new BattleLog(),roundNo:1,first:'P1',token:0,nextBomb:1,history:[],roundResults:[]};g.beginRound();g.match.covered=false;return g;}
function hand(g,seat,suits){for(const suit of suits){const c=g.match.deck.takeSuit(suit);g.match.ledger.transfer(c,'deck',seat);g.match.players[seat].hand.push(c);}}
function play(g,a,b){const m=g.match;m.pending={};for(const [seat,suit] of [['P1',a],['P2',b]])if(suit){const p=m.players[seat],c=p.hand.find(c=>c.suit===suit);p.hand=p.hand.filter(x=>x!==c);m.ledger.transfer(c,seat,'pending');m.pending[seat]=c;}g.resolveRound();}
test('组件独立且保留本源；生命压制后不提供组件',()=>{const a=new Character('CH-11','P1'),b=new Character('CH-11','P2');a.skillComponents.forEach(c=>c.isSuppressed=true);assert.equal(a.get('LifeExchangeBonus'),undefined);assert.equal(b.get('LifeReplenish').sourceOrigin,'NABERIUS');});
test('风岩水单方胜加步与火第二胜加步',()=>{for(const [id,suit,n] of [['CH-01','scissors',4],['CH-02','rock',6],['CH-05','paper',5],['CH-06','rock',7]]){const g=fixture(id,'CH-04');hand(g,'P1',[suit]);if(id==='CH-06')g.match.players.P1.streak=1;play(g,suit);assert.equal(g.match.players.P1.step,n);}});
test('风免退仍雷弃牌；盾和圣火阻止雷弃牌；死亡改13格',()=>{for(const mode of ['wind','shield','fire','death']){const g=fixture(mode==='wind'?'CH-01':mode==='fire'?'CH-06':'CH-02','CH-03'),m=g.match,p=m.players.P1;hand(g,'P1',['rock']);if(mode==='shield')p.shieldUntil=1;if(mode==='fire')p.streak=2;if(mode==='death')m.players.P2.character=new Character('CH-10','P2');m.board.placeBomb(new Bomb('x','P2',20));const r=g.skillLanding('P1',20);assert.equal(r.step,mode==='death'?7:20);assert.equal(p.hand.length,mode==='wind'?0:1);assert.equal(m.board.getOwnedBombs('P2').length,0);}});
test('双盾39阶平局同登40判平局',()=>{const g=fixture('CH-02','CH-02'),m=g.match;for(const seat of ['P1','P2']){hand(g,seat,['rock']);m.players[seat].step=39;m.players[seat].shieldUntil=1;}play(g,'rock','rock');assert.equal(m.candidate.winner,null);assert.equal(m.players.P2.step,40);});
test('冻结强制出牌总步数减半向上取整，单方不减半',()=>{for(const opponent of [true,false]){const g=fixture('CH-02','CH-07');hand(g,'P1',['rock']);if(opponent)hand(g,'P2',['scissors']);g.match.freeze={seat:'P1',suit:'rock'};play(g,'rock',opponent?'scissors':undefined);assert.equal(g.match.players.P1.step,opponent?3:6);}});
test('生命抽尽余牌、空库拒绝不扣次数，空间换位不引爆',()=>{const g=fixture('CH-11','CH-09');g.match.deck.cards.length=2;g.activateSkill('P1','LifeReplenish',{},g.match.token);assert.equal(g.match.players.P1.hand.length,2);assert.equal(g.match.deck.remaining,0);g.match.turn='P2';g.match.players.P1.step=3;g.match.board.placeBomb(new Bomb('x','P1',3));g.activateSkill('P2','SpaceOperation',{branch:'swap'},g.match.token);assert.equal(g.match.players.P2.step,3);assert.equal(g.match.board.getOwnedBombs('P1').length,1);});
test('回溯恢复候选终局、牌账本、牌库、技能次数与状态；时间次数不恢复',()=>{const g=fixture('CH-08','CH-02'),m=g.match;hand(g,'P1',['rock']);hand(g,'P2',['scissors']);m.players.P1.step=39;g.beginRound();m.covered=false;m.turn='P2';g.activateSkill('P2','JadeShield',{},m.token);play(g,'rock','scissors');assert.equal(m.candidate.winner,'P1');m.phase='ROUND_REVIEW';m.reviewDeadline=Date.now()+5000;g.activateSkill('P1','TimeRewind',{},m.token);assert.equal(m.players.P1.step,39);assert.equal(m.players.P1.hand.length,1);assert.equal(m.players.P2.shieldUntil,0);assert.equal(m.players.P2.character.get('JadeShield').remaining,1);assert.equal(m.players.P1.character.get('TimeRewind').remaining,0);assert.equal(m.candidate,null);assert.equal(m.ledger.assertConservation(m.deck,m.players),true);});
test('开局自动压制生命两组件并输出日志；兑换退化为2牌',()=>{const profile={unlockedCharacterIds:['CH-07','CH-11']},g=new Game({observeChanges:()=>()=>{},getCurrentProfile:()=>profile},{uniformIndex:()=>0});g.match={phase:'CHARACTER_SELECT',characters:{P1:'CH-11',P2:'CH-07'}};g.confirmCharacters();const m=g.match;assert.equal(m.suppressionLogs.length,2);assert.ok(m.players.P1.character.skillComponents.every(c=>c.isSuppressed));Object.assign(m,{phase:'PREPARATION',preparationCompleted:false,covered:false,turn:'P1',locked:{},token:0,board:new MountainBoard()});g.exchangeBomb('P1',0);assert.equal(m.players.P1.hand.length,2);});
test('生命准备兑换3/2张与0/1拒绝原子性',()=>{for(const n of [0,1,2,3]){const g=fixture('CH-11','CH-04'),m=g.match;Object.assign(m,{phase:'PREPARATION',preparationCompleted:false,covered:false,turn:'P1',locked:{}});m.deck.cards.length=n;if(n<2){assert.throws(()=>g.exchangeBomb('P1',m.token));assert.equal(m.players.P1.bombs,3);}else{g.exchangeBomb('P1',m.token);assert.equal(m.players.P1.hand.length,n);assert.equal(m.players.P1.bombs,2);}}});
test('草侦察只报去重阶数与最多牌型，平手按石头优先',()=>{const g=fixture('CH-04','CH-02'),m=g.match;hand(g,'P2',['paper','rock','scissors']);m.board.placeBomb(new Bomb('a','P2',5));m.board.placeBomb(new Bomb('b','P1',5));m.board.placeBomb(new Bomb('c','P1',11));g.activateSkill('P1','NatureRecon',{},m.token);assert.deepEqual(m.recon,{seat:'P1',steps:[5],suit:'rock'});});
test('水真实失败抽牌且空库不耗次；死亡无效目标不耗牌和次数',()=>{const g=fixture('CH-05','CH-04'),m=g.match;hand(g,'P1',['paper']);hand(g,'P2',['scissors']);g.activateSkill('P1','WaterDefeatDraw',{},m.token);play(g,'paper','scissors');assert.equal(m.players.P1.hand.length,1);assert.equal(m.players.P1.character.get('WaterDefeatDraw').remaining,1);const h=fixture('CH-10','CH-04');hand(h,'P1',['rock','paper']);assert.throws(()=>h.activateSkill('P1','DeathCardBomb',{cardId:h.match.players.P1.hand[0].cardId,target:40},h.match.token));assert.equal(h.match.players.P1.hand.length,2);assert.equal(h.match.players.P1.character.get('DeathCardBomb').remaining,1);});

test('技能获得与秘密销毁逐张播报原因且不泄漏花色',()=>{
 const g=fixture('CH-11','CH-03'),m=g.match;g.activateSkill('P1','LifeReplenish',{},m.token);
 assert.equal(m.log.entries.filter(e=>e.message==='玩家P1因「生机赐福」获得一张手牌').length,3);
 m.board.placeBomb(new Bomb('t','P2',8));g.skillLanding('P1',8);
 assert.equal(m.log.entries.at(-1).message,'玩家P1因「雷爆弃牌」销毁一张手牌');assert.ok(m.log.entries.every(e=>!e.message?.includes('rock')));
});
test('取消时间回溯不耗次数，双方时间角色分别保留选择权',()=>{
 const g=fixture('CH-08','CH-08'),m=g.match;m.phase='ROUND_REVIEW';m.reviewDeadline=Date.now()+5000;
 g.cancelTimeRewind('P1',m.token);assert.equal(m.players.P1.character.get('TimeRewind').remaining,1);assert.ok(m.reviewDeadline>Date.now());
 assert.throws(()=>g.activateSkill('P1','TimeRewind',{},m.token));assert.throws(()=>g.cancelTimeRewind('P1',m.token));
 g.cancelTimeRewind('P2',m.token);assert.equal(m.reviewDeadline,null);assert.equal(m.players.P2.character.get('TimeRewind').remaining,1);
 g.nextRound();assert.deepEqual(m.rewindDeclined,[]);
});
