export class BattleLog {
  constructor() { this.entries = []; }
  appendPublicEvent({type, seat, ownerSeat, stepIndex, to}) { this.entries.push({type, seat, ownerSeat, stepIndex, to}); }
  appendSkillEvent(seat, skillName, action, roundNo) { this.entries.push({type:'SKILL_TRIGGERED',seat,skillName,roundNo,message:'玩家'+seat+'因'+skillName+action}); }
  getPublicEntries() { return structuredClone(this.entries); }
}
