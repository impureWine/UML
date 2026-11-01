import { AIPlayer } from '../model/AIPlayer.js';
import { InformationProjector } from '../utils/InformationProjector.js';
export class AIController {
 constructor(game){this.game=game;this.used=new Set();this.unsubscribe=game.subscribe(()=>this.schedule());}
 schedule(){clearTimeout(this.timer);const m=this.game.match;if(m?.mode!=='ai'||m.phase==='FINAL')return;
  const key=m.roundNo+':'+m.attemptNo+':'+(m.roundSnapshot?.state?.nextBomb||0);if(this.key!==key){this.key=key;this.used.clear();}
  const task=()=>{if(this.game.match!==m)return;
   if(m.phase==='ROUND_REVIEW'){if(m.reviewDeadline>Date.now()&&m.difficulty==='hard'&&m.resolution?.winner==='P1'&&m.players.P2.character.get('TimeRewind')?.remaining&&!m.rewindDeclined.includes('P2')){this.game.activateSkill('P2','TimeRewind',{},m.token);return;}if(!m.reviewDeadline&&!m.candidate)this.game.nextRound();return;}
   if(this.game.isConcurrent()){if(this.game.actorDone('P2'))return;}else if(m.turn!=='P2')return;
   if(m.covered&&!this.game.isConcurrent()){if(m.phase==='DRAFT')this.game.revealDraft();else this.game.revealPreparation();return;}
   const v={...InformationProjector.preparationSafe(m,'P2'),phase:m.phase,seat:'P2',token:this.game.actionToken('P2'),remaining:m.deck.remaining,history:structuredClone(m.history||[]),used:[...this.used]};
   const action=AIPlayer.decide(v,m.difficulty);if(!action)return;
   try{if(action[0]==='activateSkill')this.used.add(action[1][1]);this.game[action[0]](...action[1]);}catch{this.schedule();}
  };this.timer=setTimeout(task,500+Math.random()*700);this.timer.unref?.();
 }
 dispose(){clearTimeout(this.timer);this.unsubscribe();}
}
