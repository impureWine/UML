import { MountainBoard } from '../model/MountainBoard.js';
import { StepCell } from '../model/StepCell.js';

const BOARD = new MountainBoard();

/** Preview contract: whitelist public positions; never accept a complete Game object. */
export class InformationProjector {
  static preparationSafe(m,seat) {
 const v=m.board?this.preparation({...m,turn:seat,covered:false}):{ownHand:structuredClone(m.players[seat].hand)};delete v.skillBombs;
 if(m.phase==='DRAFT')v.remainingCounts=m.deck.getCounts();return structuredClone(v);
 }
  static preparation(m) {
    const own = !m.covered ? m.players[m.turn] : null;
    return {
      exchangeCardCost:own?.character.get('GoldFirstExchange')&&!own.goldExchangeUsed?1:2,
      exchangeDrawCount:own?.character.get('LifeExchangeBonus')?Math.min(3,m.deck.remaining):2,
      skillBombs:own?.character.get('SpaceOperation')?m.board.steps.flatMap(c=>c.bombQueue).sort((a,b)=>a.bombId.localeCompare(b.bombId,'en',{numeric:true})).map(b=>({bombId:b.bombId,...(b.ownerSeat===m.turn?{stepIndex:b.stepIndex}:{})})):[],
      skills: own ? own.character.getActiveSkills().map(c=>({id:c.skillId,name:c.name,remaining:c.remaining,suppressed:c.isSuppressed})) : [],
      suppressionLogs:m.suppressionLogs||[],effects:m.effects||{},reviewDeadline:m.reviewDeadline,
      rewindSeats:m.phase==='ROUND_REVIEW'?Object.values(m.players).filter(p=>p.character.get('TimeRewind')?.remaining>0&&!m.rewindDeclined?.includes(p.seat)).map(p=>p.seat):[],
      recon:own?(m.recons?.[m.turn]||(m.recon?.seat===m.turn?m.recon:null)):null,
      frozenSuit:own?(m.freezes?.[m.turn]?.suit||(m.freeze?.seat===m.turn?m.freeze.suit:null)):null,
      shieldSeats:Object.values(m.players).filter(p=>p.shieldUntil>=m.roundNo).map(p=>p.seat),
      ownHand: own ? structuredClone(own.hand) : null,
      ownBombs: own ? own.bombs : null,
      bombCapacity: own ? own.bombCapacity : null,
      ownPlaced: own ? m.board.getOwnedBombs(m.turn).map(b => ({...b})) : [],
      handCounts: m.preparationCompleted ? Object.fromEntries(Object.values(m.players).map(p => [p.seat, p.hand.length])) : null,
      remainingCounts: m.preparationCompleted ? m.deck.getCounts() : null,
      positions: Object.fromEntries(Object.values(m.players).map(p => [p.seat,p.step])),
      logs: m.log?.getPublicEntries()||[],
    };
  }
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
      steps: Object.freeze(BOARD.steps.map(({bombQueue, ...terrain}) => Object.freeze(terrain))),
      positions: Object.freeze({ P1: p1Step, P2: p2Step }),
      activeSeat,
    });
  }
}
