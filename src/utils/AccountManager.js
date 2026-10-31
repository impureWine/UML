import { AccountProfile } from '../model/AccountProfile.js';
import { Settings } from '../model/Settings.js';
import { LocalStorageStore } from './LocalStorageStore.js';

export class AccountManager {
  #store;
  #cryptoProvider;
  #currentAccountId = null;
  #authenticationRevision = 0;
  #listeners = new Set();
  #unsubscribe;

  constructor({ store = new LocalStorageStore(), cryptoProvider = globalThis.crypto } = {}) {
    this.#store = store;
    this.#cryptoProvider = cryptoProvider;
    this.#unsubscribe = store.observeChanges(() => this.#notify());
  }

  get currentAccountId() {
    return this.#currentAccountId;
  }

  getCurrentProfile() {
    if (this.#currentAccountId === null) return null;
    const profile = this.#store.readEnvelope().accounts[this.#currentAccountId];
    if (!profile) throw new Error('当前账号档案已不可用，请检查本地数据或重新登录。');
    return AccountProfile.publicSnapshot(profile);
  }

  async register(username, password) {
    AccountProfile.validateUsername(username);
    AccountProfile.validatePassword(password);
    const profile = await AccountProfile.create({ username, password, cryptoProvider: this.#cryptoProvider });
    await this.#store.withWriteLock((draft) => {
      if (Object.values(draft.accounts).some((account) => account.username === username)) {
        throw new Error('该用户名已存在，请更换用户名或直接登录。');
      }
      if (Object.hasOwn(draft.accounts, profile.accountId)) throw new Error('账号标识生成冲突，请重试注册。');
      draft.accounts[profile.accountId] = profile;
    });
    return { accountId: profile.accountId, username: profile.username };
  }

  async login(username, password) {
    const authenticationRevision = ++this.#authenticationRevision;
    AccountProfile.validateUsername(username);
    AccountProfile.validatePassword(password);
    const profile = Object.values(this.#store.readEnvelope().accounts).find((account) => account.username === username);
    if (!profile || !await AccountProfile.verifyCredential(profile, password, this.#cryptoProvider)) {
      throw new Error('用户名或密码不正确，请重新输入。');
    }
    if (authenticationRevision !== this.#authenticationRevision) {
      throw new Error('本次登录已取消或被新的账号操作替代。');
    }
    // Derivation is asynchronous; only adopt a still-existing, unchanged identity.
    const latest = this.#store.readEnvelope().accounts[profile.accountId];
    if (!latest || latest.username !== username || JSON.stringify(latest.credential) !== JSON.stringify(profile.credential)) {
      throw new Error('账号资料在验证期间发生变化，请重试登录。');
    }
    this.#currentAccountId = latest.accountId;
    const safeProfile = AccountProfile.publicSnapshot(latest);
    this.#notify();
    return safeProfile;
  }

  async switchAccount(username, password) {
    return this.login(username, password);
  }

  logout() {
    this.#authenticationRevision += 1;
    this.#currentAccountId = null;
    this.#notify();
  }

  async saveSettings(patch) {
    const ownerId = this.#currentAccountId;
    if (!ownerId) throw new Error('请先登录后再保存偏好设置。');
    Settings.validate(patch, { partial: true });
    return this.#store.withWriteLock((draft) => {
      const profile = draft.accounts[ownerId];
      if (!profile) throw new Error('当前账号档案已不可用，无法保存设置。');
      AccountProfile.applySettings(profile, patch);
      return AccountProfile.publicSnapshot(profile);
    });
  }

  async setFusionTestUnlock(value) {
    if(typeof value!=='boolean' || !this.#currentAccountId) throw new Error('请先登录，解锁开关必须为布尔值');
    const ownerId=this.#currentAccountId;
    return this.#store.withWriteLock(draft=>{
      const profile=draft.accounts[ownerId];
      if(!profile) throw new Error('账号不可用');
      profile.unlockedCharacterIds=profile.unlockedCharacterIds.filter(id=>id!=='CH-13');
      if(value) profile.unlockedCharacterIds.push('CH-13');
      profile.revision++; AccountProfile.validate(profile);
      return AccountProfile.publicSnapshot(profile);
    });
  }

  async commitCompletedMatch(ownerId, record) {
    if(ownerId!==this.#currentAccountId)throw new Error('对局账号已改变，不能保存');
    AccountProfile.validateMatchRecord(record);
    return this.#store.withWriteLock(draft=>{
      const p=draft.accounts[ownerId];if(!p)throw new Error('账号不存在');
      if(!p.matchHistory.some(r=>r.matchId===record.matchId)){
        p.matchHistory.push(structuredClone(record));p.stats.total++;p.stats[{win:'wins',loss:'losses',draw:'draws'}[record.result]]++;p.revision++;AccountProfile.validate(p);
      }
      return AccountProfile.publicSnapshot(p);
    });
  }

  observeChanges(callback) {
    if (typeof callback !== 'function') throw new Error('账号变更监听器无效。');
    this.#listeners.add(callback);
    return () => this.#listeners.delete(callback);
  }

  #notify() {
    let profile = null;
    let error = null;
    try { profile = this.getCurrentProfile(); } catch (cause) { error = cause; }
    for (const listener of this.#listeners) {
      try {
        listener({ profile: profile === null ? null : structuredClone(profile), error });
      } catch { /* Observers cannot change authentication or persistence outcomes. */ }
    }
  }

  dispose() {
    this.#authenticationRevision += 1;
    this.#unsubscribe?.();
    this.#listeners.clear();
  }
}
