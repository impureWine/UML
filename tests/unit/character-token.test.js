import {CHARACTERS,CORE_RULES} from '../../src/resources/characters.js';
import {CharacterAnimations} from '../../src/view/CharacterAnimations.js';
import test from 'node:test';import assert from 'node:assert/strict';
test('角色目录13名、融合双徽记与四技能来源说明',()=>{assert.equal(CHARACTERS.length,13);assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,13);assert.equal(CHARACTERS[12].paths.length,2);assert.equal(CHARACTERS[12].skills.length,4);assert.ok(CHARACTERS.every(c=>c.name&&c.title&&c.skills.length));assert.equal(CORE_RULES.length,6);});
test('四态有限动画结束回待机，中断后旧动画不复活',()=>{const a=new CharacterAnimations();a.play('Climb',0);assert.equal(a.sample(450).lift,48);a.play('Hit',450);assert.equal(a.sample(500).state,'Hit');assert.equal(a.sample(1200).state,'Idle');a.play('Skill',1200);assert.equal(a.sample(2601).state,'Idle');assert.throws(()=>a.play('Invalid'));});
