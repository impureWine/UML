import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../../src/controller/Game.js';

function fixture() {
  const profiles = new Map(['Alice', 'Bob'].map((name) => [name, { accountId: name, username: name, settings: { cameraAutoFollow: true } }]));
  const manager = {
    current: null,
    observeChanges() { return () => {}; },
    async login(name) { this.current = profiles.get(name); return structuredClone(this.current); },
    async switchAccount(name) { return this.login(name); },
    async saveSettings(patch) { Object.assign(this.current.settings, patch); return structuredClone(this.current); },
    logout() { this.current = null; },
  };
  return { manager, game: new Game(manager) };
}

test('跟随偏好要求登录且仅修改当前账号，切号后分别恢复', async () => {
  const { game } = fixture();
  await assert.rejects(() => game.setCameraAutoFollow(false), /登录/);
  await game.submitAuth({ username: 'Alice', password: 'pass' });
  await game.setCameraAutoFollow(false);
  assert.equal(game.getSnapshot().profile.settings.cameraAutoFollow, false);
  game.openSwitchAccount();
  await game.submitAuth({ username: 'Bob', password: 'pass' });
  assert.equal(game.getSnapshot().profile.settings.cameraAutoFollow, true);
  game.openSwitchAccount();
  await game.submitAuth({ username: 'Alice', password: 'pass' });
  assert.equal(game.getSnapshot().profile.settings.cameraAutoFollow, false);
  await assert.rejects(() => game.setCameraAutoFollow('false'), /开关/);
});

test('保存失败保留原值；旧账号的异步返回不能覆盖切换后的账号', async () => {
  const { game, manager } = fixture();
  await game.submitAuth({ username: 'Alice', password: 'pass' });
  manager.saveSettings = async () => { throw new Error('存储失败'); };
  await assert.rejects(() => game.setCameraAutoFollow(false), /存储失败/);
  assert.equal(game.getSnapshot().profile.settings.cameraAutoFollow, true);
  let finish;
  manager.saveSettings = () => new Promise((resolve) => { finish = resolve; });
  const pending = game.setCameraAutoFollow(false);
  game.openSwitchAccount();
  await game.submitAuth({ username: 'Bob', password: 'pass' });
  finish({ accountId: 'Alice', settings: { cameraAutoFollow: false } });
  await pending;
  assert.equal(game.getSnapshot().profile.accountId, 'Bob');
  assert.equal(game.getSnapshot().profile.settings.cameraAutoFollow, true);
});
