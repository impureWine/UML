import {characterById} from '../resources/characters.js';
import {CharacterAnimations} from './CharacterAnimations.js';
export function emblem(c){if(c.iconUrl) return `<img class="element-icon" src="${c.iconUrl}" alt="" aria-hidden="true">`;return c.paths.map(d=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="${d}"/></svg>`).join('');}
export class CharacterTokenRenderer {
 constructor(root,{characterId='CH-01',seat='P1',preview=true,step=0}={}){this.step=step;this.root=root;this.animation=new CharacterAnimations();this.setCharacter(characterId,seat,preview);}
 setCharacter(id,seat='P1',preview=true){if(!['P1','P2'].includes(seat))throw new TypeError('无效席位');const c=this.character=characterById(id);this.root.classList.add('character-token');this.root.classList.toggle('fusion-token',id==='CH-13');this.root.style.setProperty('--element',c.color);this.root.innerHTML=`<div class="token-motion"><div class="token-aura">${emblem(c)}</div><div class="token-plaque"><span class="token-step">第 <b data-token-grade>${this.step}</b> 阶</span><span class="token-seat">${seat}${preview?' · 预览':''}</span><span class="token-emblem">${emblem(c)}</span><strong>${c.name}</strong><small>${c.title}</small><span class="token-filigree">✧ ─── ◇ ─── ✧</span></div><div class="token-shadow"></div></div>`;this.root.setAttribute('aria-label',`${seat}${preview?'预览':''} ${c.name} ${c.title}`);}
 setStep(step){if(!Number.isInteger(step)||step<0||step>40)throw new TypeError('阶位必须为0～40整数');this.step=step;this.root.querySelector('[data-token-grade]').textContent=step===40?'40（登顶）':String(step);this.root.classList.toggle('is-summit',step===40);}
 play(state){this.animation.play(state);}
 update(now){const s=this.animation.sample(now);this.root.dataset.state=s.state;this.root.querySelector('.token-motion').style.transform=`translate(${s.shake}px,${-s.lift}px)`;}
 dispose(){this.root.replaceChildren();}
}
