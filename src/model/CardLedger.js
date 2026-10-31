/** Every physical card has exactly one zone. Secret discards never enter public logs. */
export class CardLedger {
  constructor(cards) { this.cardZoneById = new Map(cards.map(c => [c.cardId, 'deck'])); this.secretDestroyed = []; this.played=[]; }
  transfer(card, from, to) {
    if (this.cardZoneById.get(card.cardId) !== from) throw new Error('牌账本归属不一致');
    this.cardZoneById.set(card.cardId, to);
  }
  destroySecretly(card, seat) { this.transfer(card, seat, 'secretDestroyed'); this.secretDestroyed.push({...card}); }
  reveal(card){this.transfer(card,'pending','played');this.played.push({...card});}
  assertConservation(deck, players) {
    const zones = [...deck.cards.map(c => [c, 'deck']), ...Object.values(players).flatMap(p => p.hand.map(c => [c, p.seat])), ...this.played.map(c=>[c,'played']), ...this.secretDestroyed.map(c => [c, 'secretDestroyed'])];
    if (zones.length !== 90 || new Set(zones.map(([c]) => c.cardId)).size !== 90 || zones.some(([c,z]) => this.cardZoneById.get(c.cardId) !== z)) throw new Error('90张实体牌不守恒');
    return true;
  }
}
