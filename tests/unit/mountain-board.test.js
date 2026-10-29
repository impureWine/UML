import test from 'node:test';
import assert from 'node:assert/strict';
import { MountainBoard } from '../../src/model/MountainBoard.js';
import { StepCell } from '../../src/model/StepCell.js';

test('地图包含连续的0～40阶，共41阶且逐阶查询一致', () => {
  const board = new MountainBoard();
  assert.equal(board.steps.length, 41);
  assert.deepEqual(board.steps.map((step) => step.index), Array.from({ length: 41 }, (_, i) => i));
  for (let index = 0; index <= 40; index++) assert.equal(board.getStep(index), board.steps[index]);
});

test('山林、雪山与天梯在15/16、30/31准确分区，端点有独立名称', () => {
  const board = new MountainBoard();
  for (const index of [0, 1, 15]) assert.equal(board.getStep(index).zone, 'forest');
  for (const index of [16, 20, 30]) assert.equal(board.getStep(index).zone, 'snow');
  for (const index of [31, 39, 40]) assert.equal(board.getStep(index).zone, 'sky');
  assert.match(board.getStep(0).name, /山脚.*营地/);
  assert.match(board.getStep(40).name, /天空岛.*神座/);
  assert.match(board.getStep(1).name, /蒙德/);
  assert.match(board.getStep(16).name, /龙脊雪山/);
  assert.match(board.getStep(31).name, /星穹天梯/);
});

test('仅端点禁布雷，31～39仍可布雷；五个关键阶高亮', () => {
  const board = new MountainBoard();
  assert.deepEqual(board.steps.filter((step) => !step.canPlaceBomb).map((step) => step.index), [0, 40]);
  assert.deepEqual(board.steps.filter((step) => step.milestone).map((step) => step.index), [0, 10, 20, 30, 40]);
  assert.equal(board.getStep(31).canPlaceBomb, true);
  assert.equal(board.getStep(39).canPlaceBomb, true);
});

test('越界、小数、非数值阶号拒绝且不隐式转型', () => {
  const board = new MountainBoard();
  for (const index of [-1, 41, 1.5, NaN, Infinity, '1', null, undefined, true]) {
    assert.throws(() => board.getStep(index), /0.*40/);
    assert.throws(() => new StepCell(index), /0.*40/);
  }
});

test('地图结构和地形不可修改，领域阶位持有独立炸弹队列', () => {
  const board = new MountainBoard();
  assert.throws(() => { board.steps = []; }, TypeError);
  assert.throws(() => board.steps.pop(), TypeError);
  assert.throws(() => { board.getStep(10).canPlaceBomb = false; }, TypeError);
  assert.deepEqual(Object.keys(board.getStep(10)).sort(), ['bombQueue', 'canPlaceBomb', 'index', 'milestone', 'name', 'zone']);
  assert.equal(board.getStep(10).canPlaceBomb, true);
  assert.equal(board.steps.length, 41);
});
