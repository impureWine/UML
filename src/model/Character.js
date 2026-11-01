import {definitions,ActiveSkillComponent,PassiveSkillComponent} from './SkillComponent.js';
export class Character {
 constructor(characterId,seat){this.characterId=characterId;const index=Number(characterId.slice(3))-1;const sources=index===12?[definitions[11],definitions[10]]:[definitions[index]||['',[],[]]];this.skillComponents=sources.flatMap(([origin,passive,active])=>[...passive.map(id=>new PassiveSkillComponent(id,seat,origin)),...active.map(([id,n,name])=>new ActiveSkillComponent(id,seat,origin,n,name))]);}
 get(id){return this.skillComponents.find(s=>s.skillId===id&&!s.isSuppressed);}
 getActiveSkills(){return this.skillComponents.filter(s=>s instanceof ActiveSkillComponent);}
}
