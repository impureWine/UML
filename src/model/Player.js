import { Character } from './Character.js';
export class Player {
 constructor(seat, characterId) {
   this.character=new Character(characterId,seat); this.streak=0; this.shieldUntil=0; this.windUsed=false; this.seat=seat; this.characterId=characterId; this.hand=[]; this.step=0;
   this.bombs=this.character.get('ThunderBombCapacity')?4:3; this.bombCapacity=this.character.get('ThunderBombCapacity')?5:4;
 }
}
