import { PlayingCard } from './PlayingCard.js';
export const SUITS = Object.freeze(['rock', 'scissors', 'paper']);
export class CardDeck {
  constructor() { this.cards = SUITS.flatMap(suit => Array.from({length:30}, (_, i) => new PlayingCard(`${suit}-${i}`, suit))); }
  get remaining() { return this.cards.length; }
  getCounts() {
    const counts = Object.fromEntries(SUITS.map(suit => [suit, 0]));
    for (const card of this.cards) counts[card.suit]++;
    return counts;
  }
  takeSuit(suit) {
    if (!SUITS.includes(suit)) throw new Error('花色无效');
    const index = this.cards.findIndex(c => c.suit === suit);
    if (index < 0) throw new Error('此花色已取尽，请选择其他花色');
    return this.cards.splice(index, 1)[0];
  }
  drawRandom(random) { if (!this.remaining) throw new Error('公共牌库已空'); return this.cards.splice(random.uniformIndex(this.remaining), 1)[0]; }
}
