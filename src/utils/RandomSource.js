export class RandomSource {
  constructor(provider = globalThis.crypto) { this.provider = provider; }
  uniformIndex(size) {
    if (!Number.isSafeInteger(size) || size < 1 || size > 2 ** 32) throw new Error('随机范围无效');
    const limit = Math.floor(2 ** 32 / size) * size;
    let value;
    do { value = this.provider.getRandomValues(new Uint32Array(1))[0]; } while (value >= limit);
    return value % size;
  }
  tossFairCoin() { return this.uniformIndex(2) === 0 ? 'P1' : 'P2'; }
}
