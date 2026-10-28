/** Static terrain metadata only. No bombs, occupants, or battle state live here. */
export class StepCell {
  constructor(index) {
    StepCell.validateIndex(index);
    this.index = index;
    this.zone = index <= 15 ? 'forest' : index <= 30 ? 'snow' : 'sky';
    this.name = index === 0 ? '山脚营地'
      : index === 40 ? '天空岛神座'
        : this.zone === 'forest' ? '蒙德苍翠山林'
          : this.zone === 'snow' ? '龙脊雪山云海' : '星穹天梯';
    this.canPlaceBomb = index > 0 && index < 40;
    this.milestone = index % 10 === 0;
    Object.freeze(this);
  }

  static validateIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index > 40) {
      throw new RangeError('阶号必须是0～40之间的整数。');
    }
  }
}
