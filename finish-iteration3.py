from pathlib import Path
import re,json
p=Path('src/resources/characters.js');s=p.read_text(encoding='utf-8');s=re.sub(r'、?(?:activatedRound|activateShield|isActiveInRound|modifyTieMovement|activeAttempt|consecutiveWins|targetSeat|frozenSuit)[、；]?','',s);s=s.replace('额度','每局次数');p.write_text(s,encoding='utf-8')
p=Path('src/view/MountainMapRenderer.js');s=p.read_text(encoding='utf-8');s=s.replace('  selectStep(i, notify = true) {', '''  previewMotion(seat, state, target) {
    if (!this.tokens[seat] || !Number.isInteger(target) || target<0 || target>40) return;
    this.motion ??= {};
    this.motion[seat]={from:this.publicView.positions[seat],to:target,started:performance.now(),state};
    this.tokens[seat].play(state);
    this.applyAuthorizedView({...this.publicView,positions:{...this.publicView.positions,[seat]:target},activeSeat:seat});
  }
  visualStep(seat,time) {
    const m=this.motion?.[seat]; if(!m)return this.publicView?.positions[seat]??0;
    const duration=m.state==='Hit'?700:900; const p=this.reducedMotion?1:Math.min(1,(time-m.started)/duration);
    if(p>=1){delete this.motion[seat];return m.to;}
    return m.from+(m.to-m.from)*p;
  }
  selectStep(i, notify = true) {''');s=s.replace('this.publicView?.positions[seat] ?? 0, .7','this.visualStep(seat,time), .7');p.write_text(s,encoding='utf-8')
p=Path('src/view/MountainMapPanel.js');s=p.read_text(encoding='utf-8');s=s.replace('<output data-mount-status role="status"></output>', '<div> P1 动画演示 <button type="button" data-map-motion="Climb">攀爬1阶</button><button type="button" data-map-motion="Hit">受击退10阶</button><button type="button" data-map-motion="Skill">元素光效</button></div><output data-mount-status role="status"></output>');s=s.replace("      if (button.hasAttribute('data-mount-tokens')",'''      if (button.dataset.mapMotion && this.renderer) {
        const state=button.dataset.mapMotion;
        const target=Math.max(0,Math.min(40,this.view.positions.P1+(state==='Climb'?1:state==='Hit'?-10:0)));
        this.renderer.previewMotion('P1',state,target);
        this.view=this.renderer.publicView;this.selectStep(target);
        this.root.querySelector('[data-token-step="P1"]').value=target;
      }
      if (button.hasAttribute('data-mount-tokens')''');p.write_text(s,encoding='utf-8')
