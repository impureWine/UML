import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { AccountManager } from '../../src/utils/AccountManager.js';
import { LocalStorageStore } from '../../src/utils/LocalStorageStore.js';
import { ACCOUNT_KEY, environment, storedEnvelope } from '../fixtures/account-environment.js';

function setup(env = environment(), cryptoProvider = webcrypto) {
  const store = new LocalStorageStore(env);
  return { ...env, store, manager: new AccountManager({ store, cryptoProvider }) };
}

const chineseError = (error) => error instanceof Error && /[\u3400-\u9fff]/u.test(error.message);

test('注册保存稳定档案和默认锁态，但不自动登录或返回凭据', async () => {
  const { manager, storage } = setup();
  const summary = await manager.register('登山者A', '口令1234');
  assert.equal(manager.currentAccountId, null);
  assert.equal(manager.getCurrentProfile(), null);
  assert.equal(summary.username, '登山者A');
  assert.equal('credential' in summary, false);
  const envelope = storedEnvelope(storage);
  assert.deepEqual(Object.keys(envelope).sort(), ['accounts', 'revision', 'schemaVersion']);
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.revision, 1);
  assert.equal(Object.keys(envelope.accounts).length, 1);
  const profile = envelope.accounts[summary.accountId];
  assert.equal(profile.accountId, summary.accountId);
  assert.deepEqual(profile.stats, { total: 0, wins: 0, losses: 0, draws: 0 });
  assert.deepEqual(profile.matchHistory, []);
  assert.deepEqual(profile.unlockedCharacterIds, ['CH-01', 'CH-02', 'CH-03', 'CH-04', 'CH-05', 'CH-06', 'CH-07', 'CH-08', 'CH-09', 'CH-10', 'CH-11', 'CH-12']);
  assert.equal(profile.unlockedCharacterIds.includes('CH-13'), false);
  assert.equal(profile.revision, 1);
  const loggedIn = await manager.login('登山者A', '口令1234');
  assert.equal(manager.currentAccountId, summary.accountId);
  assert.equal(loggedIn.accountId, summary.accountId);
  assert.equal('credential' in loggedIn, false);
});

test('用户名严格检查空值、长度和字符，不裁剪或忽略大小写', async () => {
  const { manager, storage } = setup();
  for (const username of ['', 'A', 'A'.repeat(17), ' 玩家', '玩家 ', '玩_家', '玩-家', '<玩家>', '🙂🙂', null, 12]) {
    await assert.rejects(manager.register(username, '1234'), chineseError, String(username));
  }
  assert.equal(storage.getItem(ACCOUNT_KEY), null);
  for (const username of ['AA', 'aa', '中文', 'Z'.repeat(16)]) {
    await manager.register(username, '1234');
  }
  const before = storage.getItem(ACCOUNT_KEY);
  await assert.rejects(manager.register('AA', 'other'), chineseError);
  assert.equal(storage.getItem(ACCOUNT_KEY), before);
  assert.equal(Object.keys(storedEnvelope(storage).accounts).length, 4);
  assert.equal((await manager.login('aa', '1234')).username, 'aa');
});

test('密码最少4字符，保留前后空格，独立salt并用真实PBKDF2校验', async () => {
  const { manager, storage } = setup();
  for (const password of ['', '123', null, 1234]) {
    await assert.rejects(manager.register('边界用户', password), chineseError);
  }
  await manager.register('空格密码', ' 12 ');
  await manager.register('另一个人', ' 12 ');
  const [a, b] = Object.values(storedEnvelope(storage).accounts);
  assert.notEqual(a.credential.salt, b.credential.salt);
  assert.notEqual(a.credential.derivedKey, b.credential.derivedKey);
  assert.equal(a.credential.algorithm, 'PBKDF2');
  assert.equal(a.credential.hash, 'SHA-256');
  assert.ok(a.credential.iterations >= 100000);
  assert.equal(a.credential.version, 1);
  assert.match(a.credential.salt, /^[a-f0-9]{32}$/);
  assert.match(a.credential.derivedKey, /^[a-f0-9]{64}$/);
  assert.equal(storage.getItem(ACCOUNT_KEY).includes(' 12 '), false);
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(' 12 '), 'PBKDF2', false, ['deriveBits']);
  const bits = await webcrypto.subtle.deriveBits({ name: 'PBKDF2', hash: a.credential.hash, salt: Buffer.from(a.credential.salt, 'hex'), iterations: a.credential.iterations }, key, 256);
  assert.equal(Buffer.from(bits).toString('hex'), a.credential.derivedKey);
  await assert.rejects(manager.login('空格密码', '12'), chineseError);
  await manager.login('空格密码', ' 12 ');
});

test('认证失败和切换失败保留旧身份；退出与新窗口均不恢复身份', async () => {
  const env = environment();
  const { manager, storage } = setup(env);
  const a = await manager.register('账号甲', 'aaaa');
  await manager.register('账号乙', 'bbbb');
  await manager.login('账号甲', 'aaaa');
  const before = storage.getItem(ACCOUNT_KEY);
  await assert.rejects(manager.switchAccount('账号乙', 'wrong'), chineseError);
  assert.equal(manager.currentAccountId, a.accountId);
  assert.equal(manager.getCurrentProfile().username, '账号甲');
  await assert.rejects(manager.login('不存在', 'aaaa'), chineseError);
  assert.equal(manager.currentAccountId, a.accountId);
  assert.equal(storage.getItem(ACCOUNT_KEY), before);
  const refreshed = setup(env).manager;
  assert.equal(refreshed.currentAccountId, null);
  assert.equal(refreshed.getCurrentProfile(), null);
  manager.logout();
  assert.equal(manager.currentAccountId, null);
  assert.equal(storage.getItem(ACCOUNT_KEY), before);
});

test('偏好按账号隔离，拒绝非法patch，返回值不能篡改持久化', async () => {
  const { manager, storage } = setup();
  await assert.rejects(manager.saveSettings({ bgmVolume: 20 }), chineseError);
  await manager.register('账号甲', 'aaaa');
  await manager.register('账号乙', 'bbbb');
  await manager.login('账号甲', 'aaaa');
  await manager.saveSettings({ bgmVolume: 0, sfxVolume: 100, bgmMuted: true, autoMusic: false, singleLoop: true, cameraAutoFollow: false });
  const a = manager.getCurrentProfile();
  a.settings.bgmVolume = 99;
  a.stats.wins = 99;
  a.unlockedCharacterIds.push('CH-13');
  assert.equal(manager.getCurrentProfile().settings.bgmVolume, 0);
  assert.equal(manager.getCurrentProfile().stats.wins, 0);
  assert.equal(manager.getCurrentProfile().unlockedCharacterIds.includes('CH-13'), false);
  const before = storage.getItem(ACCOUNT_KEY);
  for (const patch of [null, [], { bgmVolume: -1 }, { bgmVolume: 101 }, { sfxVolume: NaN }, { bgmMuted: 'true' }, { transientProgress: 0 }, JSON.parse('{"__proto__":{"polluted":true}}')]) {
    await assert.rejects(manager.saveSettings(patch), chineseError);
  }
  assert.equal(storage.getItem(ACCOUNT_KEY), before);
  await manager.switchAccount('账号乙', 'bbbb');
  assert.equal(manager.getCurrentProfile().settings.bgmVolume, 70);
  assert.equal(manager.getCurrentProfile().settings.sfxVolume, 80);
  assert.equal(manager.getCurrentProfile().settings.cameraAutoFollow, true);
  await manager.saveSettings({ sfxMuted: true });
  await manager.switchAccount('账号甲', 'aaaa');
  assert.equal(manager.getCurrentProfile().settings.bgmVolume, 0);
  assert.equal(manager.getCurrentProfile().settings.sfxMuted, false);
});

test('注册和设置写失败不污染账号、身份或可重试数据', async () => {
  const { manager, storage } = setup();
  await manager.register('原账号', 'aaaa');
  await manager.login('原账号', 'aaaa');
  const before = storage.getItem(ACCOUNT_KEY);
  const owner = manager.currentAccountId;
  storage.writeError = true;
  await assert.rejects(manager.register('新账号', 'bbbb'), chineseError);
  await assert.rejects(manager.saveSettings({ bgmVolume: 1 }), chineseError);
  assert.equal(manager.currentAccountId, owner);
  assert.equal(manager.getCurrentProfile().settings.bgmVolume, 70);
  storage.writeError = false;
  assert.equal(storage.getItem(ACCOUNT_KEY), before);
  await manager.saveSettings({ bgmVolume: 1 });
  assert.equal(manager.getCurrentProfile().settings.bgmVolume, 1);
});

test('独立窗口通知只刷新当前账号档案，绝不替窗口切换身份', async () => {
  const env = environment();
  const a = setup(env).manager;
  const b = setup(env).manager;
  await a.register('账号甲', 'aaaa');
  await a.register('账号乙', 'bbbb');
  await a.login('账号甲', 'aaaa');
  await b.login('账号甲', 'aaaa');
  const owner = a.currentAccountId;
  const changes = [];
  const unsubscribe = a.observeChanges((event) => changes.push(event));
  await b.saveSettings({ bgmVolume: 23 });
  env.eventTarget.changed(env.storage);
  assert.equal(a.getCurrentProfile().settings.bgmVolume, 23);
  assert.equal(changes.at(-1).profile.settings.bgmVolume, 23);
  assert.equal(changes.at(-1).error, null);
  assert.equal('credential' in changes.at(-1).profile, false);
  await b.switchAccount('账号乙', 'bbbb');
  env.eventTarget.changed(env.storage);
  assert.equal(a.currentAccountId, owner);
  assert.equal(a.getCurrentProfile().username, '账号甲');
  const count = changes.length;
  unsubscribe();
  env.eventTarget.changed(env.storage);
  assert.equal(changes.length, count);
  a.dispose();
  b.dispose();
});

test('损坏和读取失败会通知错误，保留身份并禁止自动覆盖', async () => {
  const { manager, storage, eventTarget } = setup();
  await manager.register('账号甲', 'aaaa');
  await manager.login('账号甲', 'aaaa');
  const owner = manager.currentAccountId;
  const changes = [];
  manager.observeChanges((change) => changes.push(change));
  storage.setItem(ACCOUNT_KEY, '{broken');
  const writes = storage.writeCount;
  eventTarget.changed(storage);
  assert.equal(manager.currentAccountId, owner);
  assert.equal(changes.at(-1).profile, null);
  assert.ok(chineseError(changes.at(-1).error));
  assert.throws(() => manager.getCurrentProfile(), chineseError);
  await assert.rejects(manager.register('账号乙', 'bbbb'), chineseError);
  assert.equal(storage.writeCount, writes);
  storage.readError = true;
  assert.throws(() => manager.getCurrentProfile(), chineseError);
  await assert.rejects(manager.login('账号甲', 'aaaa'), chineseError);
  assert.equal(manager.currentAccountId, owner);
});

test('缺少WebCrypto能力时不伪报注册成功', async () => {
  const { manager, storage } = setup(environment(), {});
  await assert.rejects(manager.register('账号甲', 'aaaa'), chineseError);
  assert.equal(storage.getItem(ACCOUNT_KEY), null);
  assert.equal(manager.currentAccountId, null);
});

test('并发注册唯一用户名只成功一次，其他账号和设置更新都不被覆盖', async () => {
  const env = environment();
  const a = setup(env).manager;
  const b = setup(env).manager;
  const duplicate = await Promise.allSettled([a.register('同名账号', 'aaaa'), b.register('同名账号', 'bbbb')]);
  assert.equal(duplicate.filter((result) => result.status === 'fulfilled').length, 1);
  await Promise.all([a.register('账号甲', 'aaaa'), b.register('账号乙', 'bbbb')]);
  await a.login('账号甲', 'aaaa');
  await b.login('账号乙', 'bbbb');
  await Promise.all([a.saveSettings({ bgmVolume: 11 }), b.saveSettings({ sfxVolume: 22 })]);
  const accounts = Object.values(storedEnvelope(env.storage).accounts);
  assert.equal(accounts.length, 3);
  assert.equal(accounts.find((account) => account.username === '账号甲').settings.bgmVolume, 11);
  assert.equal(accounts.find((account) => account.username === '账号乙').settings.sfxVolume, 22);
});

test('口令验证期间退出，稍后的验证结果不能重新登录', async () => {
  const env = environment();
  await setup(env).manager.register('账号甲', 'aaaa');
  let release;
  let started;
  const gate = new Promise((resolve) => { release = resolve; });
  const deriving = new Promise((resolve) => { started = resolve; });
  const cryptoProvider = {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    subtle: {
      importKey: webcrypto.subtle.importKey.bind(webcrypto.subtle),
      deriveBits: async (...args) => {
        started();
        await gate;
        return webcrypto.subtle.deriveBits(...args);
      },
    },
  };
  const { manager } = setup(env, cryptoProvider);
  const login = manager.login('账号甲', 'aaaa');
  await deriving;
  manager.logout();
  release();
  await assert.rejects(login, chineseError);
  assert.equal(manager.currentAccountId, null);
  assert.equal(manager.getCurrentProfile(), null);
});

test('通知订阅者抛错不改变已保存结果，其他订阅者仍拿到独立副本', async () => {
  const { manager } = setup();
  await manager.register('账号甲', 'aaaa');
  await manager.login('账号甲', 'aaaa');
  manager.observeChanges(({ profile }) => {
    profile.settings.bgmVolume = 99;
    throw new Error('视图错误');
  });
  const changes = [];
  manager.observeChanges((change) => changes.push(change));
  await manager.saveSettings({ bgmVolume: 12 });
  assert.equal(manager.getCurrentProfile().settings.bgmVolume, 12);
  assert.equal(changes.at(-1).profile.settings.bgmVolume, 12);
  assert.equal(changes.at(-1).error, null);
});
