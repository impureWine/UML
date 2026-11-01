export class SkillComponent {
 constructor(skillId,ownerSeat,sourceOrigin){Object.assign(this,{skillId,ownerSeat,sourceOrigin,isSuppressed:false});}
 get effective(){return !this.isSuppressed;}
}
export class PassiveSkillComponent extends SkillComponent {}
export class ActiveSkillComponent extends SkillComponent {
 constructor(id,seat,origin,maxUses,name){super(id,seat,origin);Object.assign(this,{maxUses,usedUses:0,name});}
 get remaining(){return this.maxUses-this.usedUses;}
}
export const definitions=[
 ['BARBATOS',['WindScissorsBonus','WindFirstBombGrace'],[]],
 ['MORAX',['RockVictoryBonus'],[['JadeShield',1,'玉璋护盾']]],
 ['BEELZEBUL',['ThunderBombCapacity','ThunderBombDiscard'],[]],
 ['BUER',[],[['NatureRecon',2,'所闻遍计']]],
 ['FOCALORS',['WaterVictoryBonus'],[['WaterDefeatDraw',2,'万众狂欢']]],
 ['HEBRIMU',['FlameWinStreak'],[]],
 ['VASHAKA',['DivineSuppression'],[['FreezeCard',1,'极寒敕令']]],
 ['ISTAROTH',[],[['TimeRewind',1,'时之回溯']]],
 ['ASMODAY',[],[['SpaceOperation',2,'空间置换']]],
 ['RONOVA',['DeathRetreat'],[['DeathCardBomb',1,'终焉宣告']]],
 ['NABERIUS',['LifeExchangeBonus'],[['LifeReplenish',1,'生机赐福']]],
 ['GOLD',['GoldFirstExchange'],[['Alchemy',2,'炼金转化']]]
];
