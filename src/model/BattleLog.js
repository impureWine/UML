export class BattleLog {
  constructor() { this.entries = []; }
  appendPublicEvent({type, seat, ownerSeat, stepIndex, to}) { this.entries.push({type, seat, ownerSeat, stepIndex, to}); }
  getPublicEntries() { return structuredClone(this.entries); }
}
