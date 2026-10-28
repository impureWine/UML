import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../../src/controller/Game.js';

function makeManager() {
  const profiles = ['Alice', 'Bob'].map((username, index) => ({
    accountId: String(index), username,
    stats: { total: 0, wins: 0, losses: 0, draws: 0 },
    unlockedCharacterIds: ['CH-01'], settings: {}, matchHistory: [],
  }));
  return {
    current: null, observer: null, registerCount: 0,
    getCurrentProfile() { return structuredClone(this.current); },
    async register() { this.registerCount++; },
    async login(name, password) {
      const profile = profiles.find((item) => item.username === name);
      if (!profile || password !== 'pass') throw new Error('用户名或密码错误。');
      this.current = structuredClone(profile);
      return this.getCurrentProfile();
    },
    async switchAccount(name, password) { return this.login(name, password); },
    logout() { this.current = null; },
    observeChanges(callback) { this.observer = callback; return () => { this.observer = null; }; },
  };
}

test('未登录不能导航，登录后五个占位页与返回首页生效', async () => {
  const game = new Game(makeManager());
  assert.equal(game.getSnapshot().phase, 'AUTH');
  assert.throws(() => game.navigate('local'), /登录/);
  await game.submitAuth({ username: 'Alice', password: 'pass' });
  for (const page of ['local', 'ai', 'online', 'guide', 'settings']) {
    game.navigate(page);
    assert.equal(game.getSnapshot().page, page);
    assert.equal(game.getSnapshot().phase, 'HOME');
    game.returnHome();
    assert.equal(game.getSnapshot().page, 'home');
  }
  assert.throws(() => game.navigate('future'), /页面/);
});

test('注册后仍需显式登录，错误反馈不进入首页', async () => {
  const manager = makeManager();
  const game = new Game(manager);
  game.changeAuthMode('register');
  await game.submitAuth({ username: 'Alice', password: 'pass' });
  assert.equal(manager.registerCount, 1);
  assert.equal(game.getSnapshot().phase, 'AUTH');
  assert.equal(game.getSnapshot().auth.mode, 'login');
  assert.match(game.getSnapshot().auth.notice, /注册成功/);
  await game.submitAuth({ username: 'Alice', password: 'wrong' });
  assert.equal(game.getSnapshot().profile, null);
  assert.match(game.getSnapshot().auth.error, /密码/);
});

test('切号失败保留原账号，可取消；成功完整替换，退出后再次锁住导航', async () => {
  const game = new Game(makeManager());
  await game.submitAuth({ username: 'Alice', password: 'pass' });
  game.navigate('settings');
  game.openSwitchAccount();
  assert.equal(game.getSnapshot().page, 'home');
  assert.equal(game.getSnapshot().auth.mode, 'switch');
  await game.submitAuth({ username: 'Bob', password: 'wrong' });
  assert.equal(game.getSnapshot().profile.username, 'Alice');
  game.closeAuth();
  assert.equal(game.getSnapshot().auth.open, false);
  game.openSwitchAccount();
  await game.submitAuth({ username: 'Bob', password: 'pass' });
  assert.equal(game.getSnapshot().profile.username, 'Bob');
  game.logout();
  assert.equal(game.getSnapshot().phase, 'AUTH');
  assert.equal(game.getSnapshot().profile, null);
  assert.throws(() => game.navigate('guide'), /登录/);
});

test('异步登录立即给出busy反馈，重复提交只有一次，快照不能反改状态', async () => {
  const manager = makeManager();
  let finish;
  let calls = 0;
  manager.login = async () => {
    calls++;
    await new Promise((resolve) => { finish = resolve; });
    manager.current = { accountId: '0', username: 'Alice', stats: {}, settings: {}, matchHistory: [], unlockedCharacterIds: [] };
    return manager.getCurrentProfile();
  };
  const game = new Game(manager);
  const pending = game.submitAuth({ username: 'Alice', password: 'pass' });
  assert.equal(game.getSnapshot().auth.busy, true);
  await game.submitAuth({ username: 'Alice', password: 'pass' });
  assert.equal(calls, 1);
  finish();
  await pending;
  const snapshot = game.getSnapshot();
  snapshot.profile.username = 'changed';
  assert.equal(game.getSnapshot().profile.username, 'Alice');
});

test('存储通知只更新本窗口档案；损坏显示错误且可重试，不隐式登录其他账号', async () => {
  const manager = makeManager();
  const game = new Game(manager);
  await game.submitAuth({ username: 'Alice', password: 'pass' });
  manager.observer({ profile: { accountId: '1', username: 'Bob' }, error: null });
  assert.equal(game.getSnapshot().profile.username, 'Alice');
  manager.current.stats.wins = 1;
  manager.observer({ profile: manager.getCurrentProfile(), error: null });
  assert.equal(game.getSnapshot().profile.stats.wins, 1);
  manager.observer({ profile: null, error: new Error('存储读取失败') });
  assert.match(game.getSnapshot().storageError, /存储/);
  assert.equal(game.getSnapshot().profile.username, 'Alice');
  game.retryStorage();
  assert.equal(game.getSnapshot().storageError, '');
  game.dispose();
  assert.equal(manager.observer, null);
});
