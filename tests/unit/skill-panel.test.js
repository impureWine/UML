import test from 'node:test';
import assert from 'node:assert/strict';
import {BattlePanel} from '../../src/view/BattlePanel.js';
import {InformationProjector} from '../../src/utils/InformationProjector.js';
import {Player} from '../../src/model/Player.js';
import {MountainBoard} from '../../src/model/MountainBoard.js';
import {CardDeck} from '../../src/model/CardDeck.js';
import {Bomb} from '../../src/model/Bomb.js';
import {BattleLog} from '../../src/model/BattleLog.js';
function view(id,covered=false){const m={players:{P1:new Player('P1',id),P2:new Player('P2','CH-10')},turn:'P1',covered,board:new MountainBoard(),deck:new CardDeck(),log:new BattleLog(),phase:'ROUND_SKILLS'};return {...InformationProjector.preparation(m),phase:m.phase,turn:m.turn,remaining:m.deck.remaining};}
const render=m=>BattlePanel.prototype.renderSkills(m);
test('全部11角色的操作面板仅包含本人组件，其他角色的目标字段不进入HTML',()=>{
 for(let i=1;i<=11;i++){
  const id='CH-'+String(i).padStart(2,'0'),m=view(id),html=render(m);
  const rendered=[...html.matchAll(/data-skill="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(rendered,m.skills.map(c=>c.id),id);
  for(const [field,owner] of [['freeze-suit','CH-07'],['space-branch','CH-09'],['bomb-id','CH-09'],['skill-card','CH-10']])assert.equal(html.includes('name="'+field+'"'),id===owner,id+' '+field);
  assert.equal(html.includes('name="skill-target"'),['CH-09','CH-10'].includes(id),id);
  assert.equal(html.includes('data-space-move hidden disabled'),id==='CH-09',id);
 }
});
test('交接遮罩不投影任何角色技能；侦察结果只在草角色技能内显示',()=>{
 const covered=view('CH-09',true);assert.deepEqual(covered.skills,[]);assert.deepEqual(covered.skillBombs,[]);
 for(const id of ['CH-02','CH-04','CH-11']){const m=view(id);m.recon={suit:'rock',steps:[5]};assert.equal(render(m).includes('翠绿洞察'),id==='CH-04');}
});

test('空间投影仅公开己雷阶数，敌雷仅有编号且面板不泄漏坐标',()=>{
 const m={players:{P1:new Player('P1','CH-09'),P2:new Player('P2','CH-02')},turn:'P1',covered:false,board:new MountainBoard(),deck:new CardDeck(),log:new BattleLog()};
 m.board.placeBomb(new Bomb('own','P1',12));m.board.placeBomb(new Bomb('enemy','P2',37));
 const v=InformationProjector.preparation(m);assert.deepEqual(v.skillBombs,[{bombId:'enemy'},{bombId:'own',stepIndex:12}]);
 const html=render({...v,phase:'ROUND_SKILLS',remaining:30});assert.ok(html.includes('own · 12阶'));assert.ok(html.includes('>enemy</option>'));assert.ok(!html.includes('37阶'));
});
test('草侦察两行分别显示牌型和相对雷阶；空间阶差错误显示在技能框内',()=>{
 const m=view('CH-04');m.positions.P1=7;m.recon={suit:'paper',steps:[10,15]};const html=render(m);
 assert.ok(html.includes('布</div><div>前方有雷台阶：'));assert.ok(html.includes('前方3阶（第10阶）'));assert.ok(!html.includes('NaN'));
 const space=view('CH-09');space.positions.P2=6;assert.ok(render(space).includes('data-skill-error >阶差须不大于5</p>'));
 space.positions.P2=5;assert.ok(render(space).includes('data-skill-error hidden>阶差须不大于5</p>'));
});

test('空间炸弹候选按编号自然排序，与台阶位置无关',()=>{
 const m={players:{P1:new Player('P1','CH-09'),P2:new Player('P2','CH-02')},turn:'P1',covered:false,board:new MountainBoard(),deck:new CardDeck(),log:new BattleLog()};
 for(const [id,step] of [['bomb-10',1],['bomb-2',39],['bomb-1',20]])m.board.placeBomb(new Bomb(id,'P1',step));
 assert.deepEqual(InformationProjector.preparation(m).skillBombs.map(b=>b.bombId),['bomb-1','bomb-2','bomb-10']);
});
