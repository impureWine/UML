from pathlib import Path
p=Path('src/model/Player.js');s=p.read_text();s="import { Character } from './Character.js';\n"+s;s=s.replace('this.seat=seat;', 'this.character=new Character(characterId,seat); this.streak=0; this.shieldUntil=0; this.windUsed=false; this.seat=seat;');p.write_text(s)
p=Path('src/controller/Game.js');s=p.read_text();s="import { RoundSnapshot } from '../model/RoundSnapshot.js';\n"+s
s=s.replace("m.deck=new CardDeck();", "m.suppressionLogs=[]; for(const seat of ['P1','P2']) { const other=seat==='P1'?'P2':'P1'; if(m.players[other].character.get('DivineSuppression')) for(const c of m.players[seat].character.skillComponents) if(c.sourceOrigin==='NABERIUS'){c.isSuppressed=true;m.suppressionLogs.push(seat+' '+c.skillId+' 被瓦沙嘉压制');} }\n    m.deck=new CardDeck();")
s=s.replace('const cards=[m.deck.drawRandom(this.random),m.deck.drawRandom(this.random)];','const cards=Array.from({length:Math.min(m.deck.remaining,p.character.get(\'LifeExchangeBonus\')?3:2)},()=>m.deck.drawRandom(this.random));')
s=s.replace("m.roundSnapshot={players:structuredClone(m.players),bombs:structuredClone(m.board.steps.map(s=>s.bombQueue))};", "m.freeze=null;m.water=null;m.recon=null;m.effects={};m.candidate=null;m.reviewDeadline=null;m.roundSnapshot=new RoundSnapshot(m);")
s=s.replace("m.ledger.transfer(card,seat,'pending');", "if(m.freeze?.seat===seat&&card.suit===m.freeze.suit&&p.hand.some(c=>c.suit!==card.suit))throw new Error('该牌型已被冻结');\n    m.ledger.transfer(card,seat,'pending');")
old="if(winner){target=Math.min(40,from[winner]+JudgeRule.steps(cards[winner].suit));const landing=JudgeRule.resolveLanding(m.board,winner,target);landing.destroyed.forEach(id=>m.board.removeBomb(id));m.players[winner].step=landing.step;events=landing.events;events.forEach(e=>m.log.appendPublicEvent(e));}"
new="""for(const seat of ['P1','P2'])m.players[seat].streak=winner===seat?m.players[seat].streak+1:0;
    if(winner){const p=m.players[winner],suit=cards[winner].suit;let n=JudgeRule.steps(suit);
      if(p.character.get('WindScissorsBonus')&&suit==='scissors')n+=2;
      if(p.character.get('RockVictoryBonus')&&suit==='rock')n++;
      if(p.character.get('WaterVictoryBonus')&&suit==='paper')n+=2;
      if(p.character.get('FlameWinStreak')&&p.streak>=2)n+=2;
      if(m.freeze?.seat===winner&&suit===m.freeze.suit&&a&&b)n=Math.ceil(n/2);
      target=Math.min(40,from[winner]+n);const landing=this.skillLanding(winner,target);events=landing.events;
    }else for(const seat of ['P1','P2'])if(m.players[seat].shieldUntil>=m.roundNo){const r=this.skillLanding(seat,Math.min(40,from[seat]+1));events.push(...r.events);}
    if(winner&&m.water&&m.water!==winner&&m.deck.remaining)this.drawCards(m.water,1);
    events.forEach(e=>m.log.appendPublicEvent(e));"""
assert old in s;s=s.replace(old,new)
s=s.replace("m.phase='ROUND_REVIEW';this.emit();if(m.candidate)this.finalizeMatch();", "m.phase='ROUND_REVIEW';const can=Object.values(m.players).some(p=>p.character.get('TimeRewind')?.remaining>0);if(can){m.reviewDeadline=Date.now()+5000;const token=m.token;setTimeout(()=>{if(this.match===m&&m.token===token&&m.phase==='ROUND_REVIEW'){m.reviewDeadline=null;this.emit();if(m.candidate)this.finalizeMatch();}},5000);}this.emit();if(m.candidate&&!can)this.finalizeMatch();")
s=s.replace("m?.phase!=='ROUND_REVIEW'||m.candidate", "m?.phase!=='ROUND_REVIEW'||m.candidate||m.reviewDeadline>Date.now()")
s=s.replace("if(!m?.candidate||", "if(m?.reviewDeadline>Date.now())return;\n    if(!m?.candidate||")
p.write_text(s)
