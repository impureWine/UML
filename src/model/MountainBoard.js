import { StepCell } from './StepCell.js';

/** Fixed 41-step board definition; the renderer owns spatial coordinates. */
export class MountainBoard {
  constructor() {
    this.steps = Object.freeze(Array.from({ length: 41 }, (_, index) => new StepCell(index)));
    Object.freeze(this);
  }

  getOwnedBombs(seat) { return this.steps.flatMap(c => c.bombQueue).filter(b => b.ownerSeat === seat); }
  placeBomb(bomb) {
    const cell = this.getStep(bomb.stepIndex);
    if (!cell.canPlaceBomb) throw new Error('只能在1～39阶布雷');
    cell.bombQueue.push(bomb);
  }
  removeBomb(id) {
    for (const cell of this.steps) {
      const i = cell.bombQueue.findIndex(b => b.bombId === id);
      if (i >= 0) return cell.bombQueue.splice(i, 1)[0];
    }
    throw new Error('炸弹不存在');
  }
  moveBomb(id, target) {
    if (!this.getStep(target).canPlaceBomb) throw new Error('只能在1～39阶布雷');
    const bomb = this.removeBomb(id); bomb.stepIndex = target; this.placeBomb(bomb);
  }
  getStep(index) {
    StepCell.validateIndex(index);
    return this.steps[index];
  }
}
