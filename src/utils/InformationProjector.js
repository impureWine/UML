import { MountainBoard } from '../model/MountainBoard.js';
import { StepCell } from '../model/StepCell.js';

const BOARD = new MountainBoard();

/** Preview contract: whitelist public positions; never accept a complete Game object. */
export class InformationProjector {
  static mapPreview(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
      throw new TypeError('地图展示参数必须是普通对象。');
    }
    const { p1Step = 0, p2Step = 0, activeSeat = 'P1' } = input;
    StepCell.validateIndex(p1Step);
    StepCell.validateIndex(p2Step);
    if (activeSeat !== 'P1' && activeSeat !== 'P2') {
      throw new TypeError('操作席位必须是P1或P2。');
    }
    return Object.freeze({
      steps: BOARD.steps,
      positions: Object.freeze({ P1: p1Step, P2: p2Step }),
      activeSeat,
    });
  }
}
