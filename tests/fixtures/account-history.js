// Hand-written persisted records, independent of future match-writing code.
export const accountHistoryFixture = {
  stats: { total: 3, wins: 1, losses: 1, draws: 1 },
  matchHistory: [
    {
      matchId: 'match-local-001', mode: 'local', ownerSeat: 'P1', result: 'win',
      p1CharacterId: 'CH-12', p2CharacterId: 'CH-11',
      p1FinalStep: 40, p2FinalStep: 35,
      endedAt: '2026-10-26T10:00:00.000Z', endReason: 'summit',
    },
    {
      matchId: 'match-online-003', mode: 'online', ownerSeat: 'P2', result: 'loss',
      p1CharacterId: 'CH-08', p2CharacterId: 'CH-02',
      p1FinalStep: 39, p2FinalStep: 31,
      endedAt: '2026-10-28T10:00:00.000Z', endReason: 'cards-exhausted',
    },
    {
      matchId: 'match-ai-002', mode: 'ai', ownerSeat: 'P1', result: 'draw',
      p1CharacterId: 'CH-01', p2CharacterId: 'CH-03',
      p1FinalStep: 28, p2FinalStep: 28,
      endedAt: '2026-10-27T10:00:00.000Z', endReason: 'cards-exhausted',
    },
  ],
};
