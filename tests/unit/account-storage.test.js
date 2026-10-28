import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountManager } from '../../src/utils/AccountManager.js';
import { LocalStorageStore } from '../../src/utils/LocalStorageStore.js';
import { ACCOUNT_KEY, environment, storedEnvelope } from '../fixtures/account-environment.js';
import { accountHistoryFixture } from '../fixtures/account-history.js';

const chineseError = (error) => error instanceof Error && /[\u3400-\u9fff]/u.test(error.message);

async function seeded() {
  const env = environment();
  const store = new LocalStorageStore(env);
  const manager = new AccountManager({ store });
  await manager.register('账号甲', 'aaaa');
  return { ...env, store, manager };
}

test('空存储读取不写入默认值，返回副本不会改写后续读取', async () => {
  const env = environment();
  const store = new LocalStorageStore(env);
  assert.deepEqual(store.readEnvelope(), { schemaVersion: 1, revision: 0, accounts: {} });
  assert.equal(env.storage.writeCount, 0);
  const { store: populated, storage } = await seeded();
  const read = populated.readEnvelope();
  Object.values(read.accounts)[0].username = '被篡改';
  assert.equal(Object.values(populated.readEnvelope().accounts)[0].username, '账号甲');
  assert.equal(storage.writeCount, 1);
});

test('无Web Locks明确拒绝写入，保留原始数据', async () => {
  const env = environment();
  const store = new LocalStorageStore({ ...env, locks: null });
  await assert.rejects(store.withWriteLock((draft) => { draft.revision = 4; }), chineseError);
  assert.equal(env.storage.getItem(ACCOUNT_KEY), null);
});

test('命名排他锁内重新读取，单次写入，保留另一窗口提交', async () => {
  const { storage, locks, eventTarget, store } = await seeded();
  const other = new LocalStorageStore({ storage, locks, eventTarget });
  store.readEnvelope();
  const first = store.withWriteLock(async (draft) => {
    Object.values(draft.accounts)[0].settings.bgmVolume = 10;
    await Promise.resolve();
  });
  const second = other.withWriteLock((draft) => {
    assert.equal(Object.values(draft.accounts)[0].settings.bgmVolume, 10);
    Object.values(draft.accounts)[0].settings.sfxVolume = 20;
  });
  await Promise.all([first, second]);
  const envelope = storedEnvelope(storage);
  const profile = Object.values(envelope.accounts)[0];
  assert.equal(profile.settings.bgmVolume, 10);
  assert.equal(profile.settings.sfxVolume, 20);
  assert.equal(envelope.revision, 3);
  assert.equal(storage.writeCount, 3);
  assert.equal(new Set(locks.names).size, 1);
  assert.match(locks.names[0], /climb40.*accounts/i);
});

test('mutator抛错或产生非法数据时完全不落盘', async () => {
  const { storage, store } = await seeded();
  const before = storage.getItem(ACCOUNT_KEY);
  await assert.rejects(store.withWriteLock((draft) => {
    Object.values(draft.accounts)[0].settings.bgmVolume = 30;
    throw new Error('事务取消');
  }), chineseError);
  await assert.rejects(store.withWriteLock((draft) => { draft.accounts.bad = {}; }), chineseError);
  assert.equal(storage.getItem(ACCOUNT_KEY), before);
  assert.equal(storage.writeCount, 1);
});

test('损坏JSON、版本与根结构均拒绝，不自动清空或覆盖', async () => {
  for (const raw of ['{broken', 'null', '[]', '{}', '{"schemaVersion":2,"revision":0,"accounts":{}}', '{"schemaVersion":1,"revision":-1,"accounts":{}}', '{"schemaVersion":1,"revision":0,"accounts":[]}', '{"schemaVersion":1,"revision":0,"accounts":{},"currentAccountId":"injected"}', '{"schemaVersion":1,"revision":0,"accounts":{"__proto__":{}}}']) {
    const env = environment(raw);
    const store = new LocalStorageStore(env);
    assert.throws(() => store.readEnvelope(), chineseError, raw);
    await assert.rejects(store.withWriteLock(() => {}), chineseError);
    assert.equal(env.storage.getItem(ACCOUNT_KEY), raw);
    assert.equal(env.storage.writeCount, 0);
  }
});

test('档案恶意格式、重名、凭据与统计/解锁/设置不变式都校验', async () => {
  const { storage } = await seeded();
  const original = storedEnvelope(storage);
  const mutations = [
    (root, profile) => { profile.accountId = 'another-id'; },
    (root, profile) => { profile.username = '<script>'; },
    (root, profile) => { profile.credential.iterations = 1e12; },
    (root, profile) => { profile.credential.algorithm = 'plaintext'; },
    (root, profile) => { profile.credential.salt = '00'; },
    (root, profile) => { profile.credential.derivedKey = 'oops'; },
    (root, profile) => { profile.credential.password = 'aaaa'; },
    (root, profile) => { profile.stats.total = 1; },
    (root, profile) => { profile.stats.wins = -1; },
    (root, profile) => { profile.unlockedCharacterIds = ['CH-13']; },
    (root, profile) => { profile.unlockedCharacterIds.push('CH-99'); },
    (root, profile) => { profile.unlockedCharacterIds.push('CH-01'); },
    (root, profile) => { profile.settings.bgmMuted = 'false'; },
    (root, profile) => { profile.settings.bgmVolume = 101; },
    (root, profile) => { profile.matchHistory = {}; },
    (root, profile) => { profile.matchHistory = [{ matchId: 'fake' }]; },
    (root, profile) => { profile.revision = -1; },
    (root, profile) => { profile.gameSnapshot = {}; },
    (root, profile) => {
      const id = '11111111-1111-4111-8111-111111111111';
      root.accounts[id] = { ...profile, accountId: id };
    },
  ];
  for (const mutate of mutations) {
    const root = structuredClone(original);
    mutate(root, Object.values(root.accounts)[0]);
    const raw = JSON.stringify(root);
    const env = environment(raw);
    const store = new LocalStorageStore(env);
    assert.throws(() => store.readEnvelope(), chineseError);
    await assert.rejects(store.withWriteLock(() => {}), chineseError);
    assert.equal(env.storage.getItem(ACCOUNT_KEY), raw);
    assert.equal(env.storage.writeCount, 0);
  }
});

test('读写异常均为可理解错误且写失败不会污染先前读取', async () => {
  const { store, storage } = await seeded();
  const before = store.readEnvelope();
  storage.writeError = true;
  await assert.rejects(store.withWriteLock((draft) => {
    Object.values(draft.accounts)[0].settings.sfxVolume = 0;
  }), chineseError);
  assert.deepEqual(store.readEnvelope(), before);
  storage.readError = true;
  assert.throws(() => store.readEnvelope(), chineseError);
  await assert.rejects(store.withWriteLock(() => {}), chineseError);
});

test('storage只接收本键与本存储区，也处理clear；退订释放监听', async () => {
  const { store, storage, eventTarget } = await seeded();
  let updates = 0;
  const unsubscribe = store.observeChanges(() => { updates += 1; });
  eventTarget.changed(storage, 'other-key');
  eventTarget.changed(environment().storage);
  assert.equal(updates, 0);
  eventTarget.changed(storage);
  assert.equal(updates, 1);
  eventTarget.changed(storage, null);
  assert.equal(updates, 2);
  unsubscribe();
  eventTarget.changed(storage);
  assert.equal(updates, 2);
});

test('事务返回值不能复制时，在落盘前报错，不能写成功却返回失败', async () => {
  const { store, storage } = await seeded();
  const before = storage.getItem(ACCOUNT_KEY);
  await assert.rejects(store.withWriteLock((draft) => {
    Object.values(draft.accounts)[0].settings.bgmVolume = 14;
    return () => {};
  }), chineseError);
  assert.equal(storage.getItem(ACCOUNT_KEY), before);
  assert.equal(storage.writeCount, 1);
});

test('合法已有战绩可读取与登录，按时间降序展示，读取不改写原始档案', async () => {
  const { storage } = await seeded();
  const root = storedEnvelope(storage);
  Object.assign(Object.values(root.accounts)[0], structuredClone(accountHistoryFixture));
  const raw = JSON.stringify(root);
  const env = environment(raw);
  const store = new LocalStorageStore(env);
  const manager = new AccountManager({ store });
  assert.equal(Object.values(store.readEnvelope().accounts)[0].matchHistory.length, 3);
  const profile = await manager.login('账号甲', 'aaaa');
  assert.deepEqual(profile.stats, { total: 3, wins: 1, losses: 1, draws: 1 });
  assert.deepEqual(profile.matchHistory.map((record) => record.matchId), ['match-online-003', 'match-ai-002', 'match-local-001']);
  assert.deepEqual(profile.matchHistory[2], accountHistoryFixture.matchHistory[0]);
  assert.equal(profile.matchHistory[0].ownerSeat, 'P2');
  assert.equal(profile.matchHistory[0].result, 'loss');
  profile.matchHistory[0].p1FinalStep = 0;
  assert.equal(manager.getCurrentProfile().matchHistory[0].p1FinalStep, 39);
  assert.equal(env.storage.getItem(ACCOUNT_KEY), raw);
  assert.equal(env.storage.writeCount, 0);
});

test('历史读取拒绝重复matchId、非法字段和不一致统计，保留原始数据', async () => {
  const { storage } = await seeded();
  const original = storedEnvelope(storage);
  Object.assign(Object.values(original.accounts)[0], structuredClone(accountHistoryFixture));
  const mutations = [
    (profile) => { profile.matchHistory[1].matchId = profile.matchHistory[0].matchId; },
    (profile) => { profile.matchHistory[0].matchId = ''; },
    (profile) => { profile.matchHistory[0].mode = 'unknown'; },
    (profile) => { profile.matchHistory[0].ownerSeat = 'P2'; },
    (profile) => { profile.matchHistory[0].result = 'pending'; },
    (profile) => { profile.matchHistory[0].p1CharacterId = 'CH-99'; },
    (profile) => { profile.matchHistory[0].p1FinalStep = -1; },
    (profile) => { profile.matchHistory[0].p2FinalStep = 41; },
    (profile) => { profile.matchHistory[0].p1FinalStep = 2.5; },
    (profile) => { profile.matchHistory[0].endedAt = 'not-a-date'; },
    (profile) => { profile.matchHistory[0].endedAt = '2026-02-30T10:00:00.000Z'; },
    (profile) => { profile.matchHistory[0].endReason = ''; },
    (profile) => { profile.matchHistory[0].gameSnapshot = { secrets: [] }; },
    (profile) => { profile.stats = { total: 3, wins: 2, losses: 0, draws: 1 }; },
    (profile) => { profile.stats = { total: 4, wins: 2, losses: 1, draws: 1 }; },
  ];
  for (const mutate of mutations) {
    const root = structuredClone(original);
    mutate(Object.values(root.accounts)[0]);
    const raw = JSON.stringify(root);
    const env = environment(raw);
    const store = new LocalStorageStore(env);
    assert.throws(() => store.readEnvelope(), chineseError);
    await assert.rejects(store.withWriteLock(() => {}), chineseError);
    assert.equal(env.storage.getItem(ACCOUNT_KEY), raw);
    assert.equal(env.storage.writeCount, 0);
  }
});

test('联机选角前结束可明确记录未选择，不虚构角色或改变解锁', async () => {
  const { storage } = await seeded();
  const root = storedEnvelope(storage);
  const profile = Object.values(root.accounts)[0];
  profile.stats = { total: 1, wins: 1, losses: 0, draws: 0 };
  profile.matchHistory = [{
    matchId: 'room-left-before-selection', mode: 'online', ownerSeat: 'P2', result: 'win',
    p1CharacterId: '未选择', p2CharacterId: '未选择', p1FinalStep: 0, p2FinalStep: 0,
    endedAt: '2026-10-28T11:00:00.000Z', endReason: 'opponent-left',
  }];
  const env = environment(JSON.stringify(root));
  const manager = new AccountManager({ store: new LocalStorageStore(env) });
  const read = await manager.login('账号甲', 'aaaa');
  assert.equal(read.matchHistory[0].p1CharacterId, '未选择');
  assert.equal(read.matchHistory[0].p2CharacterId, '未选择');
  assert.equal(read.unlockedCharacterIds.includes('CH-13'), false);
  assert.equal(env.storage.writeCount, 0);
});
