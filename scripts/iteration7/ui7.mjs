import fs from 'node:fs';
const p='src/view/BattlePanel.js';let s=fs.readFileSync(p,'utf8');s=s.replace("if(b.dataset.battle==='reveal')",`if(b.dataset.skill){const args={suit:root.querySelector('[name="freeze-suit"]')?.value,branch:root.querySelector('[name="space-branch"]')?.value,bombId:root.querySelector('[name="bomb-id"]')?.value,target:Number(root.querySelector('[name="skill-target"]')?.value),cardId:root.querySelector('[name="skill-card"]')?.value};game.activateSkill(m.turn,b.dataset.skill,args,m.token);}
 if(b.dataset.rewind){this.animationId=(this.animationId||0)+1;this.round=0;game.activateSkill(b.dataset.rewind,'TimeRewind',{},m.token);}
 if(b.dataset.battle==='reveal')`);
s=s.replace('<div class="skill-placeholder">✧ 主动技能槽位 · 后续开放</div>','${this.renderSkills(m)}').replace('<p>本轮尚无可释放技能。双方完成出牌前操作后才开放选牌。</p>','<p>选择技能后完成操作，双方完成后开放选牌。</p>');
s=s.replace("if(m.phase==='ROUND_REVIEW')pane.innerHTML+=action('next','下一回合');",`if(m.phase==='ROUND_REVIEW')pane.innerHTML+=m.reviewDeadline>Date.now()?'<p>5秒时之回溯窗口（可撤销本轮登顶或耗尽）</p>'+m.rewindSeats.map(s=>'<button data-rewind="'+s+'">'+s+' 时之回溯 · 剩余1次</button>').join(''):m.candidate?'':action('next','下一回合');`);
s=s.replace("<p>无牌方自动跳过，有牌方直接获胜。</p>","<p>无牌方自动跳过，有牌方直接获胜。</p>${(m.suppressionLogs||[]).join('<br>')}");
s=s.replace("this.charactersApplied=true;}",`this.charactersApplied=true;
 this.renderer.scanSteps=this.m.recon?.steps||[];
 for(const seat of ['P1','P2']){const el=this.renderer.tokens[seat].root;el.classList.toggle('skill-shield',(this.m.shieldSeats||[]).includes(seat));el.dataset.skillEffect=this.m.effects?.[seat]||'';}
 }`);
s=s.replace("async animate(m){const r=m.resolution;", "async animate(m){const animationId=this.animationId=(this.animationId||0)+1;const r=m.resolution;");s=s.replaceAll('if(this.disposed)return','if(this.disposed||this.animationId!==animationId)return').replace('playBombChain(r.events,','playBombChain(r.events.filter(e=>e.type===\'BOMB_EXPLODED\'),').replace('if(!this.disposed)this.game.finishRoundAnimation','if(!this.disposed&&this.animationId===animationId){this.apply(m.positions,m.characters);this.game.finishRoundAnimation').replace('finishRoundAnimation(m.roundNo);','finishRoundAnimation(m.roundNo);}');
s=s.replace(' renderRound(r){',` renderSkills(m){
 if(m.phase!=='ROUND_SKILLS')return m.frozenSuit?'<p>冻结牌型：'+names[m.frozenSuit]+'（仅剩该牌型时可强制出牌）</p>':'';
 return '<h3>打出牌 · 主动技能</h3>'+m.skills.map(c=>'<button data-skill="'+c.id+'" '+(c.suppressed||!c.remaining||c.id==='TimeRewind'||(c.id==='LifeReplenish'&&(m.ownHand.length>=10||!m.remaining))||(c.id==='WaterDefeatDraw'&&!m.remaining)?'disabled':'')+'>'+c.name+' · 剩余'+c.remaining+'次'+(c.suppressed?' · 被瓦沙嘉压制':c.id==='TimeRewind'?' · 结算区释放':'')+'</button>').join('')+
 '<label>冻结牌型<select name="freeze-suit"><option value="rock">石头</option><option value="paper">布</option><option value="scissors">剪刀</option></select></label><label>空间分支<select name="space-branch"><option value="swap">交换位置</option><option value="move">移动炸弹</option></select></label><label>炸弹编号<input name="bomb-id" placeholder="例如 bomb-0001"></label><label>部署/移雷目标阶<input name="skill-target" type="number" min="1" max="39" value="1"></label><label>终焉消耗牌<select name="skill-card">'+m.ownHand.map(c=>'<option value="'+c.cardId+'">'+names[c.suit]+' '+c.cardId+'</option>').join('')+'</select></label>'+(m.recon?'<p class="recon-bubble">翠绿洞察：对手最多牌型 '+(names[m.recon.suit]||'无牌')+'；前方有雷阶 '+(m.recon.steps.join('、')||'无')+'</p>':'');
 }
 renderRound(r){`);
fs.writeFileSync(p,s);
let r='src/view/MountainMapRenderer.js',v=fs.readFileSync(r,'utf8');v=v.replace("if (gold || this.selected === i)","if (gold || this.selected === i || this.scanSteps?.includes(i))");fs.writeFileSync(r,v);
