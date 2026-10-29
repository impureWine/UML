import test from 'node:test';
import assert from 'node:assert/strict';
import { backgroundZone, BackgroundTransition } from '../../src/view/BackgroundTransition.js';

test('图片映射边界与40阶延续高空背景', () => {
  for (const [step, zone] of [[0,0],[15,0],[16,1],[30,1],[31,2],[39,2],[40,2]]) assert.equal(backgroundZone(step), zone);
  for (const step of [-1,41,1.5,NaN]) assert.throws(() => backgroundZone(step));
});
test('升降阶均切换，同区域不重启过渡', () => {
  const b = new BackgroundTransition(); b.setStep(16); b.advance(450);
  assert.deepEqual(b.weights, [.5,.5,0]); b.setStep(30); b.advance(450);
  assert.deepEqual(b.weights, [0,1,0]); b.setStep(15); b.advance(900);
  assert.deepEqual(b.weights, [1,0,0]);
});
test('连续跨区从当前混合状态过渡，保持亮度连续且最终收敛', () => {
  const b = new BackgroundTransition(); b.setStep(16); b.advance(300);
  const current = [...b.weights]; b.setStep(31); assert.deepEqual(b.advance(0), current);
  b.advance(300); assert.ok(Math.abs(b.weights.reduce((a,v)=>a+v,0)-1)<1e-10);
  b.setStep(0); b.advance(900); assert.deepEqual(b.weights,[1,0,0]);
  b.setStep(39); b.advance(0,true); assert.deepEqual(b.weights,[0,0,1]);
});
