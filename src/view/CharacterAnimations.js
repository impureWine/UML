export const DURATIONS = Object.freeze({Idle:0,Climb:900,Hit:700,Skill:1400});
export class CharacterAnimations {
 constructor(){this.state='Idle';this.started=0;}
 play(state,now=performance.now()){if(!(state in DURATIONS))throw new TypeError('未知状态');this.state=state;this.started=now;}
 sample(now){const d=DURATIONS[this.state];if(d&&now-this.started>=d)this.state='Idle';const p=d?Math.max(0,Math.min(1,(now-this.started)/d)):0;return {state:this.state,p,lift:this.state==='Climb'?192*p*(1-p):this.state==='Idle'?Math.sin(now/650)*3:0,shake:this.state==='Hit'?Math.sin(p*60)*(1-p)*9:0};}
}
