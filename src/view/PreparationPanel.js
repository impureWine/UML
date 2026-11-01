import { MountainMapRenderer } from './MountainMapRenderer.js';
import { InformationProjector } from '../utils/InformationProjector.js';
const names={rock:'石头',scissors:'剪刀',paper:'布'};
export class PreparationPanel {
  constructor(root, game) {
    this.root=root;this.game=game;this.events=new AbortController();
    root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      this.run(()=>{
        const m=this.m, seat=m.turn, token=m.token;
        if(b.dataset.prep==='reveal')game.revealPreparation();
        if(b.dataset.prep==='lock')game.lockPreparation(seat,token);
        if(b.dataset.prep==='cards')game.exchangeCards(seat,[...root.querySelectorAll('[data-card]:checked')].map(c=>c.dataset.card),token);
        if(b.dataset.prep==='bomb'){
          const before=new Set(m.ownHand.map(c=>c.cardId));
          game.exchangeBomb(seat,token);game.audio?.playSfx('draft');
          const drawn=this.m.ownHand.filter(c=>!before.has(c.cardId));
          this.root.querySelector('[data-exchange-result]').textContent=`兑换成功！获得：${drawn.map(c=>names[c.suit]).join('、')}（共${drawn.length}张）。`;
        }
        if(b.dataset.prep==='cancel-placement')this.closePlacement();
        if(b.dataset.prep==='confirm-placement'){
          const pending=this.pendingPlacement;this.closePlacement();
          if(pending){game.adjustBomb(pending.seat,pending.id,pending.index,pending.token);game.audio?.playSfx('bomb');}
        }
        if(b.dataset.prep==='exit'&&confirm('退出本次对局？不记战绩。'))game.exitSetup();
        if(b.dataset.focus)this.renderer?.focusTarget(b.dataset.focus);
        if(b.dataset.zoom)this.renderer?.zoomBy(Number(b.dataset.zoom));
        if(b.dataset.recall)game.adjustBomb(seat,b.dataset.recall,null,token);
      });
    },{signal:this.events.signal});
    root.addEventListener('pointerdown',e=>{if(e.target.closest('[data-hold]')){this.showBombs();e.target.setPointerCapture?.(e.pointerId);}},{signal:this.events.signal});
    root.addEventListener('keydown',e=>{if(e.target.closest('[data-hold]')&&[' ','Enter'].includes(e.key)){e.preventDefault();this.showBombs();}},{signal:this.events.signal});
    for(const type of ['pointerup','pointercancel','keyup','focusout'])root.addEventListener(type,()=>this.hideBombs(),{signal:this.events.signal});
    window.addEventListener('blur',()=>this.hideBombs(),{signal:this.events.signal});
    document.addEventListener('visibilitychange',()=>this.hideBombs(),{signal:this.events.signal});
  }
  closePlacement(){this.pendingPlacement=null;this.root.querySelector('[data-placement-dialog]')?.close();}
  requestPlacement(index){
    const m=this.m, cell=InformationProjector.mapPreview().steps[index];
    const id=this.root.querySelector('[data-bomb-source]').value||null;
    const dialog=this.root.querySelector('[data-placement-dialog]');
    this.pendingPlacement={seat:m.turn,id,index,token:m.token};
    dialog.querySelector('[data-placement-title]').textContent=`第${index}阶 · ${cell.name}`;
    const ownCount=m.ownPlaced.filter(b=>b.stepIndex===index).length;
    dialog.querySelector('[data-placement-detail]').textContent=`区域：${{forest:'蒙德山林',snow:'龙脊雪山',sky:'星穹天梯'}[cell.zone]}。${cell.canPlaceBomb?`可布雷；己方已有${ownCount}枚炸弹。${id?'将所选己方炸弹移动至此阶。':'将消耗1个己方库存炸弹放置于此阶。'}`:'此阶为起点或终点，禁止布雷。'}`;
    dialog.querySelector('[data-prep="confirm-placement"]').disabled=!cell.canPlaceBomb;
    this.hideBombs();dialog.showModal();
  }
  run(fn){try{fn();}catch(e){this.root.querySelector('[data-prep-error]').textContent=e.message;}}
  showBombs(){if(this.renderer)this.renderer.ownBombMarkers=this.m.ownPlaced;}
  hideBombs(){if(this.renderer)this.renderer.ownBombMarkers=[];}
  stockText(m){return `公共牌库剩余 ${m.remaining} 张 ${m.handCounts?`· 石头 ${m.remainingCounts.rock} / 剪刀 ${m.remainingCounts.scissors} / 布 ${m.remainingCounts.paper} · P1手牌 ${m.handCounts.P1} / P2手牌 ${m.handCounts.P2}`:''}`;}
  update(snapshot){
    const next=snapshot.setup;
    const key=JSON.stringify([next.matchId,next.phase,next.viewerSeat||next.turn,next.turn,next.token,next.covered,next.waiting,next.ownHand,next.ownBombs,next.ownPlaced,next.bombCapacity,next.exchangeCardCost,next.exchangeDrawCount,snapshot.profile?.settings?.cameraAutoFollow]);
    if(next.mode==='online'&&this.viewKey===key){this.m=next;const stock=this.root.querySelector('[data-prep-stock]');if(stock)stock.textContent=this.stockText(next);return;}
    this.viewKey=key;
    const camera=this.renderer && {center:this.renderer.center,desiredCenter:this.renderer.desiredCenter,zoom:this.renderer.zoom,desiredZoom:this.renderer.desiredZoom,focusMode:this.renderer.focusMode};
    const previousLogs=this.m?.logs.length ?? 0;
    this.closePlacement();
    this.renderer?.dispose();this.renderer=null;this.m=snapshot.setup;const m=this.m, preparing=m.phase==='PREPARATION';
    this.root.className='main-content opening-main';
    this.root.innerHTML=`<header class="guide-heading"><h1>${preparing?'唯一开局准备':'第1回合 · 准备已结束'} <span data-step-clock></span></h1><div class="match-heading-actions"><button data-prep="exit">退出对局</button></div></header><output data-prep-error role="alert"></output><p data-prep-stock>${this.stockText(m)}</p>`;
    if(m.mode==='local'&&['PREPARATION','ROUND_SKILLS','CARD_LOCK'].includes(m.phase)){this.root.querySelector('[data-prep="exit"]').insertAdjacentHTML('beforebegin','<nav aria-label="本地私密交接"><button data-local-seat="P1">交给 P1</button><button data-local-seat="P2">交给 P2</button></nav>');}
    if(m.waiting){this.root.insertAdjacentHTML('beforeend','<section class="battle-console" aria-label="出牌区"><h2>准备已确认</h2><p class="opponent-waiting" role="status" aria-live="polite">等待对手操作</p></section>');return;}
    if(m.covered){this.root.insertAdjacentHTML('beforeend',`<section class="privacy-cover"><h2>请交给 ${m.turn}</h2><p>私有手牌与己方布雷已清屏，请另一位玩家移开视线。</p><button data-prep="reveal">我是 ${m.turn}，查看本人信息</button></section>`);return;}
    this.root.insertAdjacentHTML('beforeend',`<h2>${m.turn} 私有操作台</h2><p>己方未布置库存 ${m.ownBombs} · 已布置 ${m.ownPlaced.length} · 总上限 ${m.bombCapacity}</p>${preparing?`<p>次数不限：勾选任意${m.exchangeCardCost||2}张手牌换1雷，或用1个库存雷随机抽${m.exchangeDrawCount}张。已布置炸弹仍计入总上限。</p><div class="preparation-hand">${Object.entries(names).map(([suit,name])=>`<section class="preparation-suit-row" aria-label="${name}手牌"><h3>${name} <small>×${m.ownHand.filter(c=>c.suit===suit).length}</small></h3><div class="preparation-suit-cards">${m.ownHand.filter(c=>c.suit===suit).map(c=>`<label><input type="checkbox" data-card="${c.cardId}"><img src="/images/cards/${c.suit}.png?v=transparent-1" alt="${names[c.suit]}"><span>${names[c.suit]}</span></label>`).join('')||'<p>暂无此类手牌</p>'}</div></section>`).join('')}</div><button data-prep="cards">所选${m.exchangeCardCost||2}牌兑换1雷</button><button data-prep="bomb">1库存雷兑换随机${m.exchangeDrawCount}牌</button><output class="exchange-result" data-exchange-result role="status" aria-live="polite"></output><p>点击台阶查看详情并确认布雷；选择己方源雷后再点击台阶确认移动。可在同一阶重复放雷。</p><label>操作 <select data-bomb-source><option value="">布置库存炸弹</option>${m.ownPlaced.map(b=>`<option value="${b.bombId}">移动己雷 ${b.bombId}（${b.stepIndex}阶）</option>`).join('')}</select></label>${m.ownPlaced.map(b=>`<button data-recall="${b.bombId}">撤回 ${b.stepIndex}阶 ${b.bombId}</button>`).join('')}`:'<p>普通兑换与布雷入口已关闭。正式出牌循环将在迭代6接入。</p>'}<div class="preparation-map-tools"><button data-hold>按住查看己方布雷位置</button>${['base','summit','P1','P2','overview'].map((f,i)=>`<button data-focus="${f}">${['山脚','山顶','P1','P2','全局'][i]}</button>`).join('')}<button data-zoom="1.25">＋</button><button data-zoom="0.8">−</button></div><div class="mountain-viewport preparation-viewport"></div>${preparing?'<button class="opening-primary" data-prep="lock">确认锁定准备（不可撤销）</button>':''}<dialog class="placement-dialog" data-placement-dialog aria-labelledby="placement-title"><h2 id="placement-title" data-placement-title></h2><p data-placement-detail></p><p>确认后才会修改己方布雷。</p><div><button data-prep="cancel-placement">取消</button><button class="opening-primary" data-prep="confirm-placement">确认布置</button></div></dialog><div aria-label="战斗日志">${m.logs.map(e=>`<p>${e.message||`${e.seat} 踩雷：${e.stepIndex}阶 → ${e.to}阶。`}</p>`).join('')}</div>`);
    this.root.querySelector('[data-placement-dialog]').addEventListener('cancel',()=>{this.pendingPlacement=null;},{signal:this.events.signal});
    this.renderer=new MountainMapRenderer(this.root.querySelector('.mountain-viewport'),{onSelect:index=>{
      if(!preparing)return;
      this.run(()=>this.requestPlacement(index));
    }});
    this.renderer.applyAuthorizedView(InformationProjector.mapPreview({p1Step:m.positions.P1,p2Step:m.positions.P2,activeSeat:m.turn}));
    if(camera)Object.assign(this.renderer,camera);
    this.renderer.setAutoFollow(snapshot.profile.settings?.cameraAutoFollow ?? true);
    for(const seat of ['P1','P2'])this.renderer.tokens[seat].setCharacter(m.characters[seat],seat,false);
    if(m.logs.length>previousLogs)this.renderer.playBombChain(m.logs.slice(previousLogs));
  }
  dispose(){this.closePlacement();this.events.abort();this.renderer?.dispose();}
}
