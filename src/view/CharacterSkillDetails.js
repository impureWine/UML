export function characterSkillDetails(character) {
  return `<section class="skill-description"><h3>被动/特殊能力</h3><p>${character.passiveDescription}</p></section><section class="skill-description"><h3>主动能力与每局次数</h3><p>${character.activeDescription}</p></section>`;
}

/** Static public character information only; never reads private match resources. */
export class CharacterSkillDialog {
  constructor() {
    this.element = document.createElement('dialog');
    this.element.className = 'character-skill-dialog';
    this.element.setAttribute('aria-labelledby', 'character-skill-title');
    document.body.append(this.element);
    this.events = new AbortController();
    const options = { signal: this.events.signal };
    this.element.addEventListener('click', event => {
      if (event.target.closest('[data-close-skills]') || event.target === this.element) this.element.close();
    }, options);
  }
  open(character, seat) {
    this.element.style.setProperty('--element', character.color);
    this.element.innerHTML = `<article><header><span>${seat} · ${character.id}</span><button type="button" data-close-skills aria-label="关闭技能说明" autofocus>关闭 ×</button></header><h2 id="character-skill-title">${character.name}</h2><p>${character.title}</p>${characterSkillDetails(character)}</article>`;
    if (!this.element.open) this.element.showModal();
  }
  dispose() {
    this.element.close();
    this.events.abort();
    this.element.remove();
  }
}
