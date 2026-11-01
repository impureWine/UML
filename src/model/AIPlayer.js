import { Player } from './Player.js';
const suits=['rock','paper','scissors'], beats={rock:'scissors',paper:'rock',scissors:'paper'};
export class AIPlayer extends Player {
 static decide(v, difficulty='simple', random=Math.random) {
  const pick=a=>a[Math.floor(random()*a.length)];
  if(v.phase==='DRAFT')return ['pickCard',[v.seat,pick(suits.filter(s=>v.remainingCounts[s]>0)),v.token]];
  if(v.phase==='PREPARATION'){
   if(v.ownBombs>0)return ['adjustBomb',[v.seat,null,1+Math.floor(random()*39),v.token]];
   if(difficulty==='hard'&&v.ownPlaced.length<v.bombCapacity&&v.ownHand.length>25)return ['exchangeCards',[v.seat,v.ownHand.slice(0,v.exchangeCardCost||2).map(c=>c.cardId),v.token]];
   return ['lockPreparation',[v.seat,v.token]];
  }
  const counts=Object.fromEntries(suits.map(s=>[s,v.ownHand.filter(c=>c.suit===s).length]));
  const history=(v.history||[]).filter(x=>x.seat!==v.seat).slice(-8);
  const prediction=v.recon?.suit||suits.toSorted((a,b)=>history.filter(x=>x.suit===b).length-history.filter(x=>x.suit===a).length)[0];
  if(v.phase==='ROUND_SKILLS'){
   for(const s of v.skills.filter(s=>s.remaining&&!s.suppressed&&!v.used.includes(s.id))){
    let args={};
    if(s.id==='TimeRewind')continue;
    if(s.id==='LifeReplenish'&&(v.ownHand.length>=10||!v.remaining))continue;
    if(s.id==='WaterDefeatDraw'&&!v.remaining)continue;
    if(s.id==='Alchemy'){const from=suits.find(suit=>counts[suit]>0);if(!from)continue;args={fromSuit:from,toSuit:suits.find(suit=>suit!==from&&beats[suit]===prediction)||suits.find(suit=>suit!==from)};}
    if(s.id==='FreezeCard')args={suit:prediction};
    if(s.id==='SpaceOperation'){if(Math.abs(v.positions.P1-v.positions.P2)>5||v.positions[v.seat]>=v.positions[v.seat==='P1'?'P2':'P1'])continue;args={branch:'swap'};}
    if(s.id==='DeathCardBomb'){if(v.ownHand.length<3||v.ownBombs+v.ownPlaced.length>=v.bombCapacity)continue;args={cardId:v.ownHand[0].cardId,target:Math.min(39,Math.max(1,v.positions[v.seat==='P1'?'P2':'P1']+3))};}
    return ['activateSkill',[v.seat,s.id,args,v.token]];
   }
   return ['completeSkills',[v.seat,v.token]];
  }
  if(v.phase==='CARD_LOCK'){
   let cards=v.ownHand.filter(c=>c.suit!==v.frozenSuit);if(!cards.length)cards=v.ownHand;
   const card=difficulty==='simple'?pick(cards):cards.toSorted((a,b)=>((beats[b.suit]===prediction?5:0)+counts[b.suit]/10)-((beats[a.suit]===prediction?5:0)+counts[a.suit]/10))[0];
   return ['lockCard',[v.seat,card.cardId,v.token]];
  }
  return null;
 }
}
