/** Pure presentation state; never moves a player or changes game rules. */
export function backgroundZone(step) {
  if (!Number.isInteger(step) || step < 0 || step > 40) throw new RangeError('背景阶数须为0～40');
  return step <= 15 ? 0 : step <= 30 ? 1 : 2;
}

export class BackgroundTransition {
  constructor(duration = 900) {
    this.duration = duration;
    this.zone = 0;
    this.weights = [1, 0, 0];
    this.from = [...this.weights];
    this.elapsed = duration;
  }
  setStep(step) {
    const zone = backgroundZone(step);
    if (zone === this.zone) return;
    this.zone = zone;
    this.from = [...this.weights];
    this.elapsed = 0;
  }
  advance(delta, reducedMotion = false) {
    this.elapsed = reducedMotion ? this.duration : Math.min(this.duration, this.elapsed + Math.max(0, delta));
    const progress = this.elapsed / this.duration;
    const ease = progress * progress * (3 - 2 * progress);
    this.weights = this.from.map((weight, i) => weight * (1 - ease) + (i === this.zone ? ease : 0));
    return this.weights;
  }
}
