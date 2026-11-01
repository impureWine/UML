import test from 'node:test';
import assert from 'node:assert/strict';
import { BattlePanel } from '../../src/view/BattlePanel.js';

// Simulate the browser behavior relevant to this bug: replacing innerHTML
// creates fresh radio inputs with no selection unless checked is restored.
function fixture(seat='P1'){
 let html='',inputs=[];
 const pane={get innerHTML(){return html;},set innerHTML(value){html=value;inputs=[...value.matchAll(/<input type="radio" name="battle-card" value="([^"]*)" ([^>]*)>/g)].map(m=>({value:m[1],checked:m[2].includes('checked'),disabled:m[2].includes('disabled')}));}};
 const nodes={'.battle-console':pane,'.battle-layout':{},'.guide-heading':{},'.battle-finale':{},'.battle-history':{}};
 const root={querySelector:selector=>selector==='[name="battle-card"]:checked'?inputs.find(i=>i.checked):nodes[selector]||null,querySelectorAll:()=>inputs};
 const panel=Object.assign(Object.create(BattlePanel.prototype),{root,renderer:{tokenLayer:{}},apply(){},renderRoundHistory(){return '';}});
 const setup={matchId:'match-one',mode:'online',phase:'CARD_LOCK',roundNo:1,attemptNo:1,turn:seat,viewerSeat:seat,covered:false,waiting:false,positions:{P1:0,P2:0},handCounts:{P1:3,P2:3},ownBombs:0,ownHand:[{cardId:'r',suit:'rock'},{cardId:'p',suit:'paper'},{cardId:'s',suit:'scissors'}],frozenSuit:null,skills:[],suppressionLogs:[],cardLocked:{P1:false,P2:false}};
 const update=patch=>{Object.assign(setup,patch);panel.update({setup:structuredClone(setup)});};
 const choose=id=>{for(const i of inputs)i.checked=i.value===id;};
 const selected=()=>inputs.find(i=>i.checked)?.value;
 update({});return {panel,setup,update,choose,selected};
}
for(const seat of ['P1','P2'])test(`${seat}选牌后，对手锁牌与重复同步均不清除本人选中状态`,()=>{
 const f=fixture(seat);f.choose('p');const other=seat==='P1'?'P2':'P1';
 f.update({cardLocked:{[seat]:false,[other]:true},handCounts:{[seat]:3,[other]:2},token:'new-token',deadline:Date.now()+1000});assert.equal(f.selected(),'p');
 f.update({});assert.equal(f.selected(),'p');
 f.choose('s');f.update({});assert.equal(f.selected(),'s');
});
test('未选择时同步不会替玩家自动选择',()=>{const f=fixture();f.update({});assert.equal(f.selected(),undefined);});
for(const patch of [{roundNo:2},{attemptNo:2},{matchId:'another-match'},{turn:'P2',viewerSeat:'P2'},{covered:true},{waiting:true},{phase:'ROUND_SKILLS'}])test(`选牌草稿不跨上下文恢复：${JSON.stringify(patch)}`,()=>{const f=fixture();f.choose('p');f.update(patch);assert.equal(f.selected(),undefined);});
test('牌已移除或被冻结时，不恢复非法选中状态',()=>{
 const f=fixture();f.choose('p');f.update({ownHand:f.setup.ownHand.filter(c=>c.cardId!=='p')});assert.equal(f.selected(),undefined);
 const g=fixture();g.choose('r');g.update({frozenSuit:'rock'});assert.equal(g.selected(),undefined);
});

test('AI尚在操作时，己方可选技能/出牌不显示等待；己方确认后才显示',()=>{
 const f=fixture();
 for(const phase of ['ROUND_SKILLS','CARD_LOCK']){
  f.update({mode:'ai',phase,opponentBusy:true,waiting:false});
  let html=f.panel.root.querySelector('.battle-console').innerHTML;
  assert.doesNotMatch(html,/等待对手操作/);assert.match(html,/P1 私有操作台/);
  f.update({waiting:true});html=f.panel.root.querySelector('.battle-console').innerHTML;
  assert.match(html,/等待对手操作/);assert.doesNotMatch(html,/P1 私有操作台/);
 }
});
