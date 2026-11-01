import { MountainMapRenderer } from './MountainMapRenderer.js';
import { InformationProjector } from '../utils/InformationProjector.js';
import { CharacterTokenRenderer } from './CharacterTokenRenderer.js';
const names={rock:'石头',scissors:'剪刀',paper:'布'};
export class BattlePanel {
 constructor(root,game){this.root=root;this.game=game;this.events=new AbortController();this.round=0;
 root.className='main-content battle-main';root.innerHTML=`<header class="guide-heading"><h1>云上对决</h1><div class="match-heading-actions"><button data-battle="exit">退出对局</button></div></header><div class="battle-layout"><aside class="battle-console" aria-label="出牌区"></aside><section class="mountain-viewport battle-map"></section><aside class="battle-history"></aside></div><section class="battle-finale" hidden></section><output data-battle-error role="alert"></output>`;
 this.renderer=new MountainMapRenderer(root.querySelector('.battle-map'));this.renderer.setAutoFollow(game.state.profile?.settings.cameraAutoFollow!==false);
 root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;try{const m=this.m;
 if(b.dataset.skill){const panel=b.closest('[data-skill-panel]'),value=name=>panel.querySelector(`[name="${name}"]`)?.value;let args={};
 if(b.dataset.skill==='Alchemy')args={fromSuit:value('alchemy-from'),toSuit:value('alchemy-to')};
 if(b.dataset.skill==='FreezeCard')args={suit:value('freeze-suit')};
 if(b.dataset.skill==='SpaceOperation')args=value('space-branch')==='move'?{branch:'move',bombId:value('bomb-id'),target:Number(value('skill-target'))}:{branch:'swap'};
 if(b.dataset.skill==='DeathCardBomb')args={cardId:value('skill-card'),target:Number(value('skill-target'))};
 game.activateSkill(m.turn,b.dataset.skill,args,m.token);game.audio?.playSfx('skill',m.characters[m.turn]);}
 if(b.dataset.cancelRewind)game.cancelTimeRewind(b.dataset.cancelRewind,m.token);
 if(b.dataset.rewind){this.animationId=(this.animationId||0)+1;this.round=0;game.activateSkill(b.dataset.rewind,'TimeRewind',{},m.token);game.audio?.playSfx('skill',m.characters[b.dataset.rewind]);}
 if(b.dataset.battle==='reveal')game.revealBattle();
 if(b.dataset.battle==='skills')game.completeSkills(m.turn,m.token);
 if(b.dataset.battle==='lock')game.lockCard(m.turn,root.querySelector('[name="battle-card"]:checked')?.value,m.token);
 if(b.dataset.battle==='next')game.nextRound();
 if(b.dataset.battle==='retry')await game.finalizeMatch();
 if(b.dataset.battle==='again')game.restartMatch(true);
 if(b.dataset.battle==='select')game.restartMatch(false);
 if(b.dataset.battle==='home'&&m.saveStatus==='saved')game.exitSetup();
 if(b.dataset.battle==='exit'&&confirm('退出当前对局？未完成对局不记战绩。')){if(m.phase==='FINAL'&&m.saveStatus!=='saved')throw new Error('请先重试保存战绩');game.exitSetup();}
 if(b.dataset.focus)this.renderer.focusTarget(b.dataset.focus);
 }catch(err){const inline=b.closest('[data-skill-panel]')?.querySelector('[data-skill-error]');if(inline){inline.textContent=err.message;inline.hidden=false;}else root.querySelector('[data-battle-error]').textContent=err.message;}},{signal:this.events.signal});
 root.addEventListener('change',e=>{if(e.target.name!=='space-branch')return;const fields=e.target.closest('[data-skill-panel]').querySelector('[data-space-move]');fields.hidden=e.target.value!=='move';fields.disabled=fields.hidden;const error=e.target.closest('[data-skill-panel]').querySelector('[data-skill-error]');error.hidden=e.target.value!=='swap'||Math.abs(this.m.positions.P1-this.m.positions.P2)<=5;},{signal:this.events.signal});
 }
 selectedCardBeforeUpdate(next){
 const previous=this.m;
 const canChoose=m=>m?.phase==='CARD_LOCK'&&!m.covered&&!m.waiting;
 if(!canChoose(previous)||!canChoose(next))return null;
 // Opponent updates may redraw the console, but a local draft belongs to one
 // match, round, rewind attempt and private seat, independently of revisions.
 const scope=m=>JSON.stringify([m.matchId,m.roundNo,m.attemptNo,m.viewerSeat||m.turn]);
 if(scope(previous)!==scope(next))return null;
 return this.root.querySelector('[name="battle-card"]:checked')?.value||null;
 }
 restoreSelectedCard(cardId){
 if(!cardId)return;
 const input=[...this.root.querySelectorAll('[name="battle-card"]')].find(c=>c.value===cardId&&!c.disabled);
 if(input)input.checked=true;
 }
 update(snapshot){const selectedCard=this.selectedCardBeforeUpdate(snapshot.setup);this.m=snapshot.setup;const m=this.m;this.honor?.dispose();
 const final=m.phase==='FINAL';
 this.root.querySelector('.battle-layout').hidden=final;
 this.renderer.tokenLayer.hidden=final;
 this.root.querySelector('.guide-heading').hidden=final;
 this.root.querySelector('.battle-finale').hidden=!final;
 if(final){this.renderFinal(m);this.apply(m.positions,m.characters);return;}
 const pane=this.root.querySelector('.battle-console');
 const action=(key,label,disabled=false)=>`<button data-battle="${key}" ${disabled?'disabled':''}>${label}</button>`;
 pane.innerHTML=`<small>CELESTIAL DUEL</small><h2>第 ${m.roundNo} 回合</h2><p>${m.phase==='ROUND_SKILLS'?'双方选择技能':m.phase==='CARD_LOCK'?'双方选择出牌':'回合结算'} <span data-step-clock></span></p><p>P1：${m.positions.P1}阶 · ${m.handCounts.P1}张<br>P2：${m.positions.P2}阶 · ${m.handCounts.P2}张</p>`;
 this.root.querySelector('[aria-label="本地私密交接"]')?.remove();
 if(m.mode==='local'&&['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)){this.root.querySelector('[data-battle="exit"]').insertAdjacentHTML('beforebegin','<nav aria-label="本地私密交接"><button data-local-seat="P1">交给 P1</button><button data-local-seat="P2">交给 P2</button></nav>');}
 if(['ROUND_SKILLS','CARD_LOCK'].includes(m.phase)){
 pane.innerHTML+=m.waiting?`<h3>${m.phase==='ROUND_SKILLS'?'技能选择已确认':'出牌已锁定'}</h3><p class="opponent-waiting" role="status" aria-live="polite">等待对手操作</p>`:m.covered?`<h3>请交给 ${m.turn}</h3><p>请另一位玩家移开视线。</p>${action('reveal','我是 '+m.turn)}`:`<h3>${m.turn} 私有操作台</h3><p>己方库存炸弹 ${m.ownBombs}</p>${this.renderSkills(m)}${m.phase==='ROUND_SKILLS'?`${action('skills','完成出牌前操作')}`:`<p>选牌可修改；锁定后不可更改。</p><div class="battle-cards">${Object.entries(names).map(([s,n])=>{const cards=m.ownHand.filter(c=>c.suit===s);return `<label><input type="radio" name="battle-card" value="${cards[0]?.cardId||''}" ${cards.length&&!(m.frozenSuit===s&&m.ownHand.some(c=>c.suit!==s))?'':'disabled'}><img src="/images/cards/${s}.png?v=transparent-1" alt="${n}">${n} ×${cards.length}</label>`;}).join('')}</div>${action('lock','锁定这张牌')}`}`;
 }else{pane.innerHTML+=`<h3>${m.resolution?.winner?m.resolution.winner+' 猜拳获胜':'本轮平局'}</h3><p>${['P1','P2'].map(s=>s+'：'+(names[m.resolution?.cards[s]?.suit]||'无牌自动跳过')).join('<br>')}</p>`;
 if(m.phase==='RESOLVE')pane.innerHTML+='<p role="status" aria-live="polite" data-bomb-feedback>正在逐阶攀爬与结算落脚炸弹…</p>';
 if(m.phase==='ROUND_REVIEW')pane.innerHTML+=m.reviewDeadline>Date.now()?'<p>「时之回溯」窗口（可撤销本轮登顶或耗尽）</p>'+m.rewindSeats.map(s=>'<button data-rewind="'+s+'">'+s+' 「时之回溯」 · 剩余1次</button><button data-cancel-rewind="'+s+'">取消本回合回溯</button>').join(''):m.candidate?'':action('next','下一回合');

 }
 this.restoreSelectedCard(selectedCard);
 this.root.querySelector('.battle-history').innerHTML=`<h3>对局记录</h3><p>无牌方自动跳过，有牌方直接获胜。</p>${(m.suppressionLogs||[]).join('<br>')}${['overview','P1','P2','summit'].map(f=>`<button data-focus="${f}">${f==='overview'?'全局':f==='summit'?'山顶':f}</button>`).join('')}${this.renderRoundHistory(m)}`;
 const resolutionKey=JSON.stringify([m.matchId,m.roundNo,m.attemptNo]);if(this.resolutionScope!==resolutionKey){this.animationId=(this.animationId||0)+1;this.resolutionScope=resolutionKey;this.round=null;}
 if(m.phase==='RESOLVE'&&this.round!==resolutionKey){this.round=resolutionKey;this.animate(m);}
 else if(m.phase!=='RESOLVE')this.apply(m.positions,m.characters);
 }
 renderSkills(m){
 if(m.phase!=='ROUND_SKILLS')return m.frozenSuit?'<p>「冻结」牌型：'+names[m.frozenSuit]+'（仅剩该牌型时可强制出牌）</p>':'';
 if(!m.skills.length)return '<p>当前角色无主动技能。</p>';
 return '<h3>打出牌 · 专属技能</h3>'+m.skills.map(c=>{
 const disabled=c.suppressed||!c.remaining||c.id==='TimeRewind'||(c.id==='LifeReplenish'&&(m.ownHand.length>=10||!m.remaining))||(c.id==='WaterDefeatDraw'&&!m.remaining);
 let controls='';
 if(c.id==='Alchemy')controls='<label>来源牌型<select name="alchemy-from">'+Object.entries(names).map(([s,n])=>'<option value="'+s+'">'+n+'</option>').join('')+'</select></label><label>目标牌型<select name="alchemy-to">'+Object.entries(names).map(([s,n])=>'<option value="'+s+'" '+(s==='paper'?'selected':'')+'>'+n+'</option>').join('')+'</select></label>';
 if(c.id==='FreezeCard')controls='<label>「冻结」牌型<select name="freeze-suit"><option value="rock">石头</option><option value="paper">布</option><option value="scissors">剪刀</option></select></label>';
 if(c.id==='SpaceOperation')controls='<label>空间分支<select name="space-branch"><option value="swap">交换位置</option><option value="move">移动炸弹</option></select></label><fieldset data-space-move hidden disabled><legend>移动炸弹</legend><label>炸弹编号<select name="bomb-id">'+m.skillBombs.map(b=>'<option value="'+b.bombId+'">'+b.bombId+(b.stepIndex==null?'':' · '+b.stepIndex+'阶')+'</option>').join('')+'</select></label><label>移雷目标阶<input name="skill-target" type="number" min="1" max="39" value="1"></label></fieldset>';
 if(c.id==='DeathCardBomb')controls='<label>终焉消耗牌<select name="skill-card">'+m.ownHand.map(card=>'<option value="'+card.cardId+'">'+names[card.suit]+' '+card.cardId+'</option>').join('')+'</select></label><label>部署目标阶<input name="skill-target" type="number" min="1" max="39" value="1"></label>';
 if(c.id==='NatureRecon'&&m.recon)controls='<div class="recon-bubble"><div>「翠绿洞察」 · 对手最多牌型：'+(names[m.recon.suit]||'无牌')+'</div><div>前方有雷台阶：'+(m.recon.steps.length?m.recon.steps.map(step=>'前方'+(step-m.positions[m.turn])+'阶（第'+step+'阶）').join('、'):'无')+'</div></div>';
 return '<fieldset data-skill-panel="'+c.id+'" '+(disabled?'disabled':'')+'><legend>'+'「'+c.name.replace(/[「」]/g,'')+'」'+'</legend>'+controls+'<button data-skill="'+c.id+'" '+(disabled?'disabled':'')+'>'+'「'+c.name.replace(/[「」]/g,'')+'」'+' · 剩余'+c.remaining+'次'+(c.suppressed?' · 被瓦沙嘉压制':c.id==='TimeRewind'?' · 结算区释放':'')+'</button>'+(c.id==='SpaceOperation'?'<p class="skill-inline-error" data-skill-error '+(Math.abs(m.positions.P1-m.positions.P2)>5?'':'hidden')+'>阶差须不大于5</p>':'<p class="skill-inline-error" data-skill-error hidden></p>')+'</fieldset>';
 }).join('');
 }
 renderRoundHistory(m){
 const announcements=(m.logs||[]).filter(e=>e.type==='SKILL_TRIGGERED');
 const results=[...(m.roundResults||[])].reverse();
 const pending=results.some(r=>r.roundNo===m.roundNo)?'':`<li class="round-result"><strong>第 ${m.roundNo} 回合</strong><p>本回合进行中</p>${this.renderRoundAnnouncements(m.roundNo,announcements)}</li>`;
 return '<ol aria-live="polite">'+pending+results.map(r=>this.renderRound(r,announcements)).join('')+'</ol>';
 }
 renderRoundAnnouncements(roundNo,announcements){return announcements.filter(e=>e.roundNo===roundNo).map(e=>'<p class="round-skill-announcement">'+e.message+'</p>').join('');}
 renderRound(r,announcements=[]){
 const cards=['P1','P2'].map(seat=>`${seat} ${names[r.cards[seat]?.suit]||'无牌跳过'}`).join(' 对 ');
 const outcome=r.winner?`${r.winner} ${Object.keys(r.cards).length===1?'单向获胜':'获胜'}，前进 ${r.advance} 阶`:'平局，双方前进 0 阶';
 const details=r.winner?`${r.winner}：${r.from[r.winner]} → ${r.target} 阶${r.events.length?`；踩雷 ${r.events.length} 次，最终 ${r.positions[r.winner]} 阶`:''}；${r.winner==='P1'?'P2':'P1'} 原地不动`:'';
 return `<li class="round-result"><strong>第 ${r.roundNo} 回合</strong><p>${cards}</p><b>${outcome}</b><p>${details}</p>${this.renderRoundAnnouncements(r.roundNo,announcements)}${r.events.map(e=>`<p class="bomb-feedback">${e.seat} ${e.type==='BOMB_BURNED'?'圣火焚毁':e.type==='BOMB_SHIELDED'?'护盾销毁':e.type==='BOMB_WIND'?'风场免退':'踩雷'}：${e.stepIndex}阶 → ${e.to}阶</p>`).join('')}</li>`;
 }
 renderFinal(m){
 const host=this.root.querySelector('.battle-finale'),first=!this.wasFinal;this.wasFinal=true;
 const button=(key,label)=>`<button data-battle="${key}" ${m.saveStatus==='saved'?'':'disabled'}>${label}</button>`;
 host.innerHTML=`<div class="finale-content" role="dialog" aria-modal="true" aria-labelledby="finale-title"><small>✦ CELESTIAL GLORY ✦</small><h1 id="finale-title" tabindex="-1">${m.candidate.reason==='登顶'?'40阶（登顶）':m.candidate.winner?'登山对决 · 胜负已定':'登山对决 · 同阶平局'}</h1><h2>${m.candidate.winner?m.candidate.winner+' 荣耀登临':'双方平局'}</h2><div class="finale-honor-slot"><div class="honor-token"></div></div><p>P1：${m.positions.P1}阶 · P2：${m.positions.P2}阶</p><p>${m.candidate.reason}</p><p role="status">${m.saveStatus==='saved'?'战绩已保存至主账号':m.saveStatus==='error'?'战绩保存失败，请重试':'正在保存战绩…'}</p>${m.saveStatus==='error'?'<button data-battle="retry">重试保存</button>':''}<nav aria-label="结算操作">${button('again','再来一局')}${button('select','重新选角')}${button('home','返回首页')}</nav></div>`;
 if(m.candidate.winner)this.honor=new CharacterTokenRenderer(host.querySelector('.honor-token'),{characterId:m.characters[m.candidate.winner],seat:m.candidate.winner,preview:false,step:m.positions[m.candidate.winner]});
 if(first&&m.candidate.reason==='登顶')this.game.audio?.playSfx('victory');
 if(first)host.querySelector('h1').focus();
 }
 apply(positions,characters){this.renderer.applyAuthorizedView(InformationProjector.mapPreview({p1Step:positions.P1,p2Step:positions.P2,activeSeat:this.m.resolution?.winner||this.m.turn||'P1'}));for(const s of ['P1','P2'])if(!this.charactersApplied||this.renderer.tokens[s].character.id!==characters[s])this.renderer.tokens[s].setCharacter(characters[s],s,false);this.charactersApplied=true;
 this.renderer.scanSteps=this.m.recon?.steps||[];
 for(const seat of ['P1','P2']){const el=this.renderer.tokens[seat].root;el.classList.toggle('skill-shield',(this.m.shieldSeats||[]).includes(seat));el.dataset.skillEffect=this.m.effects?.[seat]||'';}
 }
 async animate(m){const animationId=this.animationId=(this.animationId||0)+1;const r=m.resolution;this.game.audio?.playSfx('reveal');this.apply(r.from,m.characters);await this.pause(650);if(this.disposed||this.animationId!==animationId)return;
 if(r.winner){for(let i=r.from[r.winner]+1;i<=r.target;i++){if(this.disposed||this.animationId!==animationId)return;this.game.audio?.recordReachedStep(i);this.game.audio?.playSfx('jump');this.renderer.previewMotion(r.winner,'Climb',i);await this.pause(920);}if(this.disposed||this.animationId!==animationId)return;await this.renderer.playBombChain(r.events.filter(e=>e.type==='BOMB_EXPLODED'),{onExplosion:e=>{
 this.game.audio?.playSfx('explosion');
 const feedback=this.root.querySelector('[data-bomb-feedback]');
 if(feedback)feedback.textContent=`${e.seat} 踩雷：${e.stepIndex}阶 → ${e.to}阶`;
 }});}
 if(!this.disposed&&this.animationId===animationId){this.apply(m.positions,m.characters);this.game.finishRoundAnimation(m.roundNo);}
 }
 pause(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
 dispose(){this.disposed=true;this.events.abort();this.honor?.dispose();this.renderer.dispose();}
}
