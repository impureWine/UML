import test from 'node:test';
import assert from 'node:assert/strict';
import { InformationProjector } from '../../src/utils/InformationProjector.js';

test('默认预览为41阶、双席同在山脚，未创建真实对局', () => {
  const view = InformationProjector.mapPreview();
  assert.equal(view.steps.length, 41);
  assert.deepEqual(view.positions, { P1: 0, P2: 0 });
  assert.equal(view.activeSeat, 'P1');
  assert.deepEqual(Object.keys(view).sort(), ['activeSeat', 'positions', 'steps']);
});

test('只投影显式公开阶位和操作席位，不读取或透传暗雷与私有状态', () => {
  const input = { p1Step: 15, p2Step: 40, activeSeat: 'P2' };
  Object.defineProperty(input, 'enemyBombs', { enumerable: true, get() { throw new Error('禁止读取暗雷'); } });
  Object.defineProperty(input, 'privateHand', { enumerable: true, get() { throw new Error('禁止读取手牌'); } });
  const view = InformationProjector.mapPreview(input);
  assert.deepEqual(view.positions, { P1: 15, P2: 40 });
  assert.equal(view.activeSeat, 'P2');
  assert.equal('enemyBombs' in view, false);
  assert.equal('privateHand' in view, false);
  assert.equal('markers' in view, false);
});

test('投影输入和输出互不反改，所有嵌套展示数据只读', () => {
  const input = { p1Step: 6, p2Step: 6, activeSeat: 'P1' };
  const view = InformationProjector.mapPreview(input);
  input.p1Step = 20;
  assert.equal(view.positions.P1, 6);
  assert.throws(() => { view.positions.P1 = 39; }, TypeError);
  assert.throws(() => { view.activeSeat = 'P2'; }, TypeError);
  assert.throws(() => { view.steps[0].name = 'changed'; }, TypeError);
  assert.throws(() => view.steps.push({ index: 41 }), TypeError);
  assert.equal(InformationProjector.mapPreview().steps[0].index, 0);
});

test('非法公开位置或席位拒绝，不裁剪到合法范围', () => {
  for (const value of [-1, 41, 0.1, NaN, Infinity, '2', null]) {
    assert.throws(() => InformationProjector.mapPreview({ p1Step: value }), /0.*40/);
    assert.throws(() => InformationProjector.mapPreview({ p2Step: value }), /0.*40/);
  }
  for (const value of ['P3', 'p1', 1, null]) {
    assert.throws(() => InformationProjector.mapPreview({ activeSeat: value }), /席位/);
  }
  for (const value of [null, [], 'preview', 1]) {
    assert.throws(() => InformationProjector.mapPreview(value), /展示.*对象/);
  }
});
