import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CHARACTERS} from '../../src/resources/characters.js';

test('七元素SVG包含与原始画幅一致的缩放视口，供24px/48px图标完整显示',async()=>{
  for(const c of CHARACTERS.slice(0,7)){
    const svg=await readFile(new URL('../../public'+c.iconUrl,import.meta.url),'utf8');
    const root=svg.match(/<svg\b[^>]*>/)[0];
    const width=root.match(/\bwidth="([\d.]+)"/)[1];
    const height=root.match(/\bheight="([\d.]+)"/)[1];
    assert.ok(root.includes(`viewBox="0 0 ${width} ${height}"`),c.name);
    assert.ok(root.includes('preserveAspectRatio="xMidYMid meet"'),c.name);
  }
});
