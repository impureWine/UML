import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../../src/controller/Game.js';
import { CardDeck } from '../../src/model/CardDeck.js';
import { RandomSource } from '../../src/utils/RandomSource.js';
import { AccountManager } from '../../src/utils/AccountManager.js';
import { LocalStorageStore } from '../../src/utils/LocalStorageStore.js';
import { environment } from '../fixtures/account-environment.js';
async function setup(first='P1') {
 const profile={accountId:'test',unlockedCharacterIds:Array.from({length:12},(_,i)=>`CH-${String(i+1).padStart(2,'0')}`)};
 const manager={observeChanges:()=>()=>{},getCurrentProfile:()=>structuredClone(profile),login:async()=>profile};
 const game=new Game(manager,{tossFairCoin:()=>first,uniformIndex:()=>0});
 await game.submitAuth({username:'test',password:'pass'});game.navigate('local');game.startSetup();
 game.selectCharacter('P1','CH-03');game.selectCharacter('P2','CH-01');game.confirmCharacters();game.chooseCoinFace('P1','heads');game.tossCoin();game.finishCoin();return game;
}
test('90张实体唯一，花色各30，耗尽取牌不修改牌库',()=>{
 const d=new CardDeck();assert.equal(new Set(d.cards.map(c=>c.cardId)).size,90);
 for(let i=0;i<30;i++)d.takeSuit('rock');assert.throws(()=>d.takeSuit('rock'));assert.equal(d.remaining,60);
});
test('公平位映射两面，非二次幂拒绝高端偏差样本',()=>{
 let values=[0,1,4294967295,7];const r=new RandomSource({getRandomValues:a=>{a[0]=values.shift();return a;}});
 assert.equal(r.tossFairCoin(),'P1');assert.equal(r.tossFairCoin(),'P2');assert.equal(r.uniformIndex(3),1);
});
test('两种先手均严格交替60次，准备只能进入一次，投影不公开敌牌但公开实时库分项',async()=>{
 for(const first of ['P1','P2']){
 const g=await setup(first);assert.equal(g.match.players.P1.bombs,4);assert.equal(g.match.players.P1.bombCapacity,5);
 assert.equal(g.match.players.P2.bombs,3);assert.throws(()=>g.openSwitchAccount());assert.throws(()=>g.logout());
 for(let i=0;i<60;i++){
 const seat=i%2===0?first:first==='P1'?'P2':'P1';assert.equal(g.match.turn,seat);
 assert.equal(g.getSnapshot().setup.ownHand,null);g.revealDraft();const before=g.getSnapshot().setup;
 assert.equal(before.turn,seat);assert.ok(!JSON.stringify(before).includes('players'));assert.ok(!Object.hasOwn(before,'cards'));
 g.pickCard(seat,i<30?'rock':'paper',before.token);
 assert.throws(()=>g.pickCard(seat,'scissors',before.token));
 }
 assert.equal(g.match.phase,'PREPARATION');assert.equal(g.match.deck.remaining,30);
 assert.equal(g.match.players.P1.hand.length,30);assert.equal(g.match.players.P2.hand.length,30);
 assert.equal(g.getSnapshot().setup.ownHand,null);assert.throws(()=>g.quickFill());assert.throws(()=>g.confirmCharacters());
 }
});
test('快速补齐保留手选实体，重复补齐不改变资源，快照副本不能改模型',async()=>{
 const g=await setup();g.revealDraft();g.pickCard('P1','paper',0);const chosen=g.match.players.P1.hand[0].cardId;
 g.quickFill();assert.equal(g.match.players.P1.hand[0].cardId,chosen);
 const all=[...g.match.deck.cards,...g.match.players.P1.hand,...g.match.players.P2.hand];assert.equal(new Set(all.map(c=>c.cardId)).size,90);
 const snapshot=g.getSnapshot();snapshot.setup.characters.P1='CH-13';assert.equal(g.match.characters.P1,'CH-03');
});
test('错席、遮罩、旧步骤与非法花色拒绝且不扣牌',async()=>{
 const g=await setup();assert.throws(()=>g.pickCard('P1','rock',0));g.revealDraft();
 for(const [seat,suit,token] of [['P2','rock',0],['P1','invalid',0],['P1','rock',8]])assert.throws(()=>g.pickCard(seat,suit,token));
 assert.equal(g.match.deck.remaining,90);
});
test('测试解锁仅写当前账号，持久化失败不污染档案或战绩',async()=>{
 const env=environment();const manager=new AccountManager({store:new LocalStorageStore(env)});
 await manager.register('甲甲','pass');await manager.register('乙乙','pass');await manager.login('甲甲','pass');
 await manager.setFusionTestUnlock(true);assert.ok(manager.getCurrentProfile().unlockedCharacterIds.includes('CH-13'));
 await manager.login('乙乙','pass');assert.ok(!manager.getCurrentProfile().unlockedCharacterIds.includes('CH-13'));
 await manager.login('甲甲','pass');env.storage.writeError=true;await assert.rejects(manager.setFusionTestUnlock(false));
 assert.ok(manager.getCurrentProfile().unlockedCharacterIds.includes('CH-13'));env.storage.writeError=false;
 await manager.setFusionTestUnlock(false);assert.equal(manager.getCurrentProfile().stats.total,0);manager.dispose();
});

test('库分项来自剩余实体，取牌后立即更新且快照不可反改',async()=>{
 const g=await setup();assert.deepEqual(g.getSnapshot().setup.remainingCounts,{rock:30,scissors:30,paper:30});
 g.revealDraft();g.pickCard('P1','rock',0);
 const s=g.getSnapshot().setup;assert.deepEqual(s.remainingCounts,{rock:29,scissors:30,paper:30});assert.equal(s.ownHand,null);
 s.remainingCounts.rock=0;assert.equal(g.match.deck.getCounts().rock,29);
 g.quickFill();assert.equal(Object.values(g.match.deck.getCounts()).reduce((a,b)=>a+b,0),30);
});
test('双方可改选不同硬币面，按落面匹配先手且抛出后不可改选',async()=>{
 for(const face of ['heads','tails'])for(const result of ['P1','P2']){
 const g=await setup();g.exitSetup();g.navigate('local');g.startSetup();g.selectCharacter('P1','CH-01');g.selectCharacter('P2','CH-02');g.confirmCharacters();
 assert.throws(()=>g.tossCoin(),/选择/);assert.throws(()=>g.chooseCoinFace('P3','heads'));assert.throws(()=>g.chooseCoinFace('P1','bad'));
 g.chooseCoinFace('P1','heads');g.chooseCoinFace('P2',face);
 assert.equal(g.match.coinChoices.P2,face);assert.notEqual(g.match.coinChoices.P1,face);
 g.random.tossFairCoin=()=>result;g.tossCoin();const landed=result==='P1'?'heads':'tails';
 assert.equal(g.match.coinFace,landed);assert.equal(g.match.first,face===landed?'P2':'P1');
 assert.throws(()=>g.chooseCoinFace('P1','tails'));assert.throws(()=>g.tossCoin());g.finishCoin();assert.equal(g.match.turn,g.match.first);
 }
});
