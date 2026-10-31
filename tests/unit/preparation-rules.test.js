import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../src/controller/Game.js';
import {MountainBoard} from '../../src/model/MountainBoard.js';
import {Bomb} from '../../src/model/Bomb.js';
import {JudgeRule} from '../../src/model/JudgeRule.js';
async function setup(first='P1') {
 const profile={accountId:'fixture',unlockedCharacterIds:['CH-01','CH-03']};
 const g=new Game({observeChanges:()=>()=>{},getCurrentProfile:()=>profile,login:async()=>profile},{tossFairCoin:()=>first,uniformIndex:()=>0});
 await g.submitAuth({username:'fixture',password:'test'});g.navigate('local');g.startSetup();
 g.selectCharacter('P1','CH-03');g.selectCharacter('P2','CH-01');g.confirmCharacters();g.chooseCoinFace('P1','heads');g.tossCoin();g.finishCoin();g.quickFill();g.revealPreparation();return g;
}
const cards=g=>g.match.players[g.match.turn].hand.slice(0,2).map(c=>c.cardId);
const command=(g,name,...args)=>g[name](g.match.turn,...args,g.match.token);
test('先布雷不释放总额度，普通4/雷5，重复兑换不限次并保持90实体守恒',async()=>{
 for(const first of ['P1','P2']){
 const g=await setup(first),p=g.match.players[first];
 command(g,'adjustBomb',null,39);command(g,'exchangeCards',cards(g));
 assert.equal(p.bombs+g.match.board.getOwnedBombs(first).length,p.bombCapacity);
 assert.throws(()=>command(g,'exchangeCards',cards(g)),/上限/);
 for(let i=0;i<8;i++){command(g,'exchangeBomb');command(g,'exchangeCards',cards(g));}
 assert.equal(g.match.ledger.secretDestroyed.length,18);assert.equal(g.match.log.entries.length,0);
 assert.equal(g.match.ledger.assertConservation(g.match.deck,g.match.players),true);
 }
});
test('重复牌ID、异席、旧token和端点拒绝；移动撤回不改变总量',async()=>{
 const g=await setup(),id=cards(g)[0],before=g.match.players.P1.hand.length;
 assert.throws(()=>command(g,'exchangeCards',[id,id]));assert.equal(g.match.players.P1.hand.length,before);
 for(const target of [0,40,-1,1.5])assert.throws(()=>command(g,'adjustBomb',null,target));
 const token=g.match.token;command(g,'adjustBomb',null,1);
 const b=g.match.board.getOwnedBombs('P1')[0];
 assert.throws(()=>g.adjustBomb('P2',b.bombId,3,g.match.token));assert.throws(()=>g.exchangeBomb('P1',token));
 command(g,'adjustBomb',b.bombId,39);assert.equal(b.stepIndex,39);
 command(g,'adjustBomb',b.bombId,null);assert.equal(g.match.players.P1.bombs,4);
});
test('牌库0/1整笔拒绝，恰好2张不放回抽尽，无库存拒绝',async()=>{
 for(const n of [0,1,2]){
 const g=await setup(),m=g.match,p=m.players.P1;
 while(m.deck.remaining>n){const c=m.deck.cards.pop();m.ledger.transfer(c,'deck','P2');m.players.P2.hand.push(c);}
 const before=p.bombs;
 if(n<2){assert.throws(()=>command(g,'exchangeBomb'));assert.equal(p.bombs,before);assert.equal(m.deck.remaining,n);}
 else {command(g,'exchangeBomb');assert.equal(m.deck.remaining,0);assert.equal(p.bombs,before-1);m.ledger.assertConservation(m.deck,m.players);}
 }
 const g=await setup();for(let i=0;i<4;i++)command(g,'adjustBomb',null,12);
 assert.throws(()=>command(g,'exchangeBomb'));assert.equal(g.match.deck.remaining,30);
});
test('先手锁定后交接彻底清屏，后手同阶布雷不泄漏，齐锁一次公开且不可重进',async()=>{
 for(const first of ['P1','P2']){
 const g=await setup(first);command(g,'adjustBomb',null,23);command(g,'exchangeCards',cards(g));
 const hiddenBomb=g.match.board.getOwnedBombs(first)[0].bombId;command(g,'lockPreparation');
 let s=g.getSnapshot().setup;assert.equal(s.covered,true);assert.equal(s.ownHand,null);assert.equal(s.ownBombs,null);assert.deepEqual(s.ownPlaced,[]);assert.equal(s.handCounts,null);assert.equal(s.remainingCounts,null);
 assert.throws(()=>g.exchangeBomb(first,g.match.token));g.revealPreparation();s=g.getSnapshot().setup;
 assert.ok(!JSON.stringify(s).includes(hiddenBomb));command(g,'adjustBomb',null,23);assert.equal(g.match.board.getStep(23).bombQueue.length,2);
 command(g,'lockPreparation');s=g.getSnapshot().setup;
 assert.equal(s.phase,'ROUND_SKILLS');assert.ok(s.handCounts);assert.ok(s.remainingCounts);assert.equal(g.match.preparationCompleted,true);
 assert.throws(()=>command(g,'lockPreparation'));assert.throws(()=>command(g,'exchangeBomb'));assert.throws(()=>g.quickFill());
 }
});
test('结算只查落点、敌雷优先且单次一雷，连续退10至0，纯计算不修改棋盘',()=>{
 const b=new MountainBoard();for(const [id,owner,step] of [['a','P1',35],['b','P2',35],['c','P1',25],['d','P2',15],['e','P1',5],['f','P2',34]])b.placeBomb(new Bomb(id,owner,step));
 const r=JudgeRule.resolveLanding(b,'P1',35);assert.deepEqual(r.destroyed,['b','c','d','e']);assert.equal(r.step,0);assert.deepEqual(r.events.map(e=>e.ownerSeat),['P2','P1','P2','P1']);assert.equal(b.getStep(35).bombQueue.length,2);
 assert.equal(JudgeRule.resolveLanding(b,'P1',40).events.length,0);assert.equal(JudgeRule.resolveLanding(b,'P1',0).events.length,0);assert.equal(JudgeRule.resolveLanding(b,'P1',36).step,36);
});
test('Game提交引爆归属公开、炸弹退出总量，不泄漏同阶剩余暗雷',async()=>{
 const g=await setup();command(g,'adjustBomb',null,21);command(g,'lockPreparation');g.revealPreparation();command(g,'adjustBomb',null,21);command(g,'lockPreparation');g.revealPreparation();
 const r=g.commitLanding('P1',21);assert.equal(r.step,11);assert.equal(r.events.length,1);assert.equal(r.events[0].ownerSeat,'P2');
 assert.equal(g.match.board.getStep(21).bombQueue.length,1);assert.equal(g.match.players.P1.step,11);
 const s=g.getSnapshot().setup;assert.equal(s.logs[0].ownerSeat,'P2');assert.ok(!JSON.stringify(s.logs).includes('bomb-'));assert.equal(s.ownPlaced.length,1);
 s.ownPlaced[0].stepIndex=2;assert.equal(g.match.board.getStep(21).bombQueue[0].stepIndex,21);
});
