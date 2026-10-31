import test from 'node:test';
import assert from 'node:assert/strict';
import {BattlePanel} from '../../src/view/BattlePanel.js';
test('对局记录逐次显示踩雷阶数变化，地雷归属不影响提示',()=>{
 const r={roundNo:1,cards:{P1:{suit:'rock'},P2:{suit:'scissors'}},winner:'P1',advance:5,from:{P1:20,P2:10},target:25,positions:{P1:5,P2:10},events:[{seat:'P1',stepIndex:25,to:15,ownerSeat:'P1'},{seat:'P1',stepIndex:15,to:5,ownerSeat:'P2'}]};
 const render=()=>BattlePanel.prototype.renderRound(r),before=render();
 assert.match(before,/P1 踩雷：25阶 → 15阶/);assert.match(before,/P1 踩雷：15阶 → 5阶/);assert.match(before,/前进 5 阶/);
 for(const e of r.events)e.ownerSeat=e.ownerSeat==='P1'?'P2':'P1';assert.equal(render(),before);assert.doesNotMatch(before,/归属|的炸弹|ownerSeat/);
});

test('技能播报归入对应回合，当前未结算回合即时显示且不重复',()=>{
 const panel=Object.create(BattlePanel.prototype);
 const result={roundNo:1,cards:{P1:{suit:'rock'}},winner:'P1',advance:5,from:{P1:0,P2:0},target:5,positions:{P1:5,P2:0},events:[]};
 const m={roundNo:2,roundResults:[result],logs:[{type:'SKILL_TRIGGERED',roundNo:1,message:'第一回合技能'},{type:'SKILL_TRIGGERED',roundNo:2,message:'第二回合技能'}]};
 let html=panel.renderRoundHistory(m);const items=[...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(x=>x[1]);
 assert.equal(items.length,2);assert.match(items[0],/第 2 回合.*第二回合技能/);assert.doesNotMatch(items[0],/第一回合技能/);assert.match(items[1],/第 1 回合.*第一回合技能/);assert.doesNotMatch(items[1],/第二回合技能/);
 m.roundResults.push({...result,roundNo:2});html=panel.renderRoundHistory(m);assert.equal(html.split('第二回合技能').length-1,1);assert.doesNotMatch(html,/本回合进行中/);
});
