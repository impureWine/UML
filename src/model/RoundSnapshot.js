import {Character} from './Character.js';
export class RoundSnapshot {
 constructor(m){this.state=structuredClone({players:m.players,deck:m.deck.cards,ledger:{...m.ledger},bombs:m.board.steps.map(s=>s.bombQueue),history:m.history||[],roundResults:m.roundResults||[],logs:m.log.entries,nextBomb:m.nextBomb});}
 restore(m){const s=structuredClone(this.state);m.players=s.players;for(const p of Object.values(m.players)){const c=new Character(p.characterId,p.seat);c.skillComponents.forEach((x,i)=>Object.assign(x,p.character.skillComponents[i]));p.character=c;}m.deck.cards=s.deck;Object.assign(m.ledger,s.ledger);m.board.steps.forEach((cell,i)=>{cell.bombQueue.splice(0,cell.bombQueue.length,...s.bombs[i]);});m.history=s.history;m.roundResults=s.roundResults;m.log.entries=s.logs;m.nextBomb=s.nextBomb;}
}
