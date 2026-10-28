import { StepCell } from './StepCell.js';

/** Fixed 41-step board definition; the renderer owns spatial coordinates. */
export class MountainBoard {
  constructor() {
    this.steps = Object.freeze(Array.from({ length: 41 }, (_, index) => new StepCell(index)));
    Object.freeze(this);
  }

  getStep(index) {
    StepCell.validateIndex(index);
    return this.steps[index];
  }
}
