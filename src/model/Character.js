import {definitions,ActiveSkillComponent,PassiveSkillComponent} from './SkillComponent.js';
export class Character {
 constructor(characterId,seat){this.characterId=characterId;const [origin,passive,active]=definitions[Number(characterId.slice(3))-1]||['',[],[]];this.skillComponents=[...passive.map(id=>new PassiveSkillComponent(id,seat,origin)),...active.map(([id,n,name])=>new ActiveSkillComponent(id,seat,origin,n,name))];}
 get(id){return this.skillComponents.find(s=>s.skillId===id&&!s.isSuppressed);}
 getActiveSkills(){return this.skillComponents.filter(s=>s instanceof ActiveSkillComponent);}
}
