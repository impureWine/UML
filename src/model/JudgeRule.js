import { StepCell } from './StepCell.js';
/** Pure resolution: Game commits removals, position and public events after calculation. */
export class JudgeRule {
  static steps(suit){return {scissors:2,paper:3,rock:5}[suit];}
  static winner(a,b){if(a===b)return null;if(!a)return 'P2';if(!b)return 'P1';return {rock:'scissors',scissors:'paper',paper:'rock'}[a]===b?'P1':'P2';}
  static selectLandingBomb(bombs, seat) {
    return [...bombs].sort((a,b) => Number(a.ownerSeat === seat) - Number(b.ownerSeat === seat) || a.bombId.localeCompare(b.bombId))[0] ?? null;
  }
  static resolveLanding(board, seat, step, options) { return this.resolveBombChain(board, seat, step, options); }
  static resolveBombChain(board, seat, step, {retreat = () => 10, ignore = () => false} = {}) {
    StepCell.validateIndex(step);
    if (!['P1','P2'].includes(seat)) throw new Error('席位无效');
    const events = [], destroyed = [];
    while (step > 0 && step < 40) {
      const bomb = this.selectLandingBomb(board.getStep(step).bombQueue.filter(b => !destroyed.includes(b.bombId)), seat);
      if (!bomb || ignore(bomb)) break;
      const distance = retreat(bomb);
      if (!Number.isInteger(distance) || distance <= 0) throw new Error('回退步数无效');
      const to = Math.max(0, step - distance);
      events.push({type:'BOMB_EXPLODED', seat, ownerSeat:bomb.ownerSeat, stepIndex:step, to});
      destroyed.push(bomb.bombId); step = to;
    }
    return {step, destroyed, events};
  }
}
