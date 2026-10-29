export class Player {
 constructor(seat, characterId) {
   this.seat=seat; this.characterId=characterId; this.hand=[]; this.step=0;
   this.bombs=characterId==='CH-03'?4:3; this.bombCapacity=characterId==='CH-03'?5:4;
 }
}
