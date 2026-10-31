import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../src/controller/Game.js';
import {Bomb} from '../../src/model/Bomb.js';
import {JudgeRule} from '../../src/model/JudgeRule.js';
async function setup(a=['rock'],b=['scissors']){
 const profile={accountId:'fixture',unlockedCharacterIds:['CH-04']};let saves=0;
 const g=new Game({observeChanges:()=>()=>{},getCurrentProfile:()=>profile,login:async()=>profile,commitCompletedMatch:async()=>{saves++;return profile;}},{tossFairCoin:()=> 'P1',uniformIndex:()=>0});
 await g.submitAuth({username:'fixture',password:'test'});g.navigate('local');g.startSetup();for(const s of ['P1','P2'])g.selectCharacter(s,'CH-04');g.confirmCharacters();g.chooseCoinFace('P1','heads');g.tossCoin();g.finishCoin();g.quickFill();
 const m=g.match;
 for(const seat of ['P1','P2']){for(const c of m.players[seat].hand){m.ledger.transfer(c,seat,'deck');m.deck.cards.push(c);}m.players[seat].hand=[];}
 for(const [seat,suits] of [['P1',a],['P2',b]])for(const suit of suits){const c=m.deck.takeSuit(suit);m.ledger.transfer(c,'deck',seat);m.players[seat].hand.push(c);}

 for(let i=0;i<2;i++){g.revealPreparation();g.lockPreparation(m.turn,m.token);}
 return {g,m,saves:()=>saves};
}
function skills(g){for(let i=0;i<2;i++){g.revealBattle();g.completeSkills(g.match.turn,g.match.token);}}
function lock(g){g.revealBattle();g.lockCard(g.match.turn,g.match.players[g.match.turn].hand[0].cardId,g.match.token);}
test('2/3/5与猜拳全部组合',()=>{for(const [a,b,n] of [['rock','scissors',5],['scissors','paper',2],['paper','rock',3]]){assert.equal(JudgeRule.winner(a,b),'P1');assert.equal(JudgeRule.winner(b,a),'P2');assert.equal(JudgeRule.steps(a),n);assert.equal(JudgeRule.winner(a,a),null);}});
test('末牌锁定保密、旧命令拒绝，齐锁公开及实体守恒',async()=>{const {g,m}=await setup();skills(g);const token=m.token;lock(g);assert.equal(g.getSnapshot().setup.history.length,0);assert.equal(g.getSnapshot().setup.ownHand,null);assert.throws(()=>g.lockCard('P1','bad',token));lock(g);assert.equal(m.history.length,2);assert.equal(m.players.P1.step,5);assert.equal(g.getSnapshot().setup.roundResults[0].advance,5);assert.equal(g.getSnapshot().setup.roundResults[0].winner,'P1');assert.equal(m.candidate.winner,'P1');assert.equal(m.ledger.assertConservation(m.deck,m.players),true);});
test('平局原地不检查脚下雷，双空同阶平局',async()=>{const {g,m}=await setup(['rock'],['rock']);m.players.P1.step=5;m.players.P2.step=5;m.board.placeBomb(new Bomb('x','P2',5));skills(g);lock(g);lock(g);assert.equal(m.resolution.events.length,0);assert.equal(m.board.getOwnedBombs('P2').length,1);assert.equal(m.candidate.winner,null);});
test('单方无牌自动跳过，连爆完成才比高；动画完成才保存且不重复',async()=>{const {g,m,saves}=await setup(['rock'],[]);m.players.P1.step=20;m.players.P2.step=16;m.board.placeBomb(new Bomb('x','P2',25));m.board.placeBomb(new Bomb('y','P1',15));skills(g);assert.deepEqual(m.requiredActors,['P1']);lock(g);assert.equal(m.players.P1.step,5);assert.equal(m.candidate.winner,'P2');assert.equal(saves(),0);g.finishRoundAnimation(1);await new Promise(r=>setTimeout(r,0));assert.equal(m.saveStatus,'saved');await g.finalizeMatch();assert.equal(saves(),1);});
test('越界钳制40与新局资源清空',async()=>{const {g,m}=await setup(['rock'],[]);m.players.P1.step=38;skills(g);lock(g);assert.equal(m.players.P1.step,40);g.finishRoundAnimation(1);await new Promise(r=>setTimeout(r,0));g.restartMatch(true);assert.equal(g.match.phase,'COIN');assert.equal(g.match.players.P1.step,0);assert.equal(g.match.players.P1.hand.length,0);assert.notEqual(g.match.matchId,m.matchId);});

test('保存失败保留最终结果，重试只保存一次',async()=>{const {g,m}=await setup(['rock'],[]);let count=0;g.accountManager.commitCompletedMatch=async()=>{if(++count===1)throw new Error('写入失败');return g.state.profile;};skills(g);lock(g);g.finishRoundAnimation(1);await new Promise(r=>setTimeout(r,0));assert.equal(m.saveStatus,'error');assert.throws(()=>g.restartMatch());await g.finalizeMatch();assert.equal(m.saveStatus,'saved');await g.finalizeMatch();assert.equal(count,2);});
