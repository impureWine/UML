import fs from 'node:fs';
let p='src/controller/Game.js',s=fs.readFileSync(p,'utf8');s=s.replace('  resolveRound(){',fs.readFileSync('skill-methods.txt','utf8')+'\n  resolveRound(){');fs.writeFileSync(p,s);
p='src/utils/InformationProjector.js';s=fs.readFileSync(p,'utf8').replace('ownHand: own ?',`skills: own ? own.character.getActiveSkills().map(c=>({id:c.skillId,name:c.name,remaining:c.remaining,suppressed:c.isSuppressed})) : [],
      suppressionLogs:m.suppressionLogs||[],effects:m.effects||{},reviewDeadline:m.reviewDeadline,
      rewindSeats:m.phase==='ROUND_REVIEW'?Object.values(m.players).filter(p=>p.character.get('TimeRewind')?.remaining>0).map(p=>p.seat):[],
      recon:own&&m.recon?.seat===m.turn?m.recon:null,
      frozenSuit:own&&m.freeze?.seat===m.turn?m.freeze.suit:null,
      shieldSeats:Object.values(m.players).filter(p=>p.shieldUntil>=m.roundNo).map(p=>p.seat),
      ownHand: own ?`);fs.writeFileSync(p,s);
