import { AccountProfile } from '../model/AccountProfile.js';

export const ACCOUNT_STORAGE_KEY = 'climb40.accounts.v1';
export const ACCOUNT_WRITE_LOCK = 'climb40.accounts.v1.write';

function failure(message, cause) {
  return new Error(message, { cause });
}

export class LocalStorageStore {
  #storage;
  #locks;
  #eventTarget;
  #accessError = null;
  #listeners = new Set();

  constructor(options = {}) {
    try {
      this.#storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage;
      this.#locks = Object.hasOwn(options, 'locks') ? options.locks : globalThis.navigator?.locks;
      this.#eventTarget = Object.hasOwn(options, 'eventTarget') ? options.eventTarget : globalThis.window;
    } catch (cause) {
      this.#accessError = cause;
    }
  }

  validateEnvelope(envelope) {
    const fields = ['schemaVersion', 'revision', 'accounts'];
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(envelope))
      || Object.keys(envelope).length !== fields.length
      || fields.some((key) => !Object.hasOwn(envelope, key))
      || envelope.schemaVersion !== 1 || !Number.isSafeInteger(envelope.revision) || envelope.revision < 0
      || !envelope.accounts || typeof envelope.accounts !== 'object' || Array.isArray(envelope.accounts)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(envelope.accounts))) {
      throw failure('本地账号数据格式损坏或版本不受支持，请保留原数据。');
    }
    const usernames = new Set();
    for (const [id, profile] of Object.entries(envelope.accounts)) {
      AccountProfile.validate(profile, id);
      if (usernames.has(profile.username)) throw failure('本地账号存在重复用户名，请保留原数据。');
      usernames.add(profile.username);
    }
    return true;
  }

  readEnvelope() {
    let raw;
    try {
      if (this.#accessError || typeof this.#storage?.getItem !== 'function') throw this.#accessError ?? new Error('LocalStorage unavailable');
      raw = this.#storage.getItem(ACCOUNT_STORAGE_KEY);
    } catch (cause) {
      throw failure('无法读取本地账号，请检查浏览器存储权限后重试。', cause);
    }
    if (raw === null) return { schemaVersion: 1, revision: 0, accounts: {} };
    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch (cause) {
      throw failure('本地账号数据损坏，已保留原始内容，请勿覆盖后重试。', cause);
    }
    this.validateEnvelope(envelope);
    return structuredClone(envelope);
  }

  async withWriteLock(mutator) {
    if (typeof this.#locks?.request !== 'function') {
      throw failure('当前环境不支持Web Locks，无法安全保存多窗口账号，请使用现代浏览器和本机可信地址。');
    }
    if (typeof mutator !== 'function') throw failure('账号保存操作无效。');
    try {
      return await this.#locks.request(ACCOUNT_WRITE_LOCK, { mode: 'exclusive' }, async () => {
        // The only read used for a write happens after acquiring the shared lock.
        const draft = this.readEnvelope();
        const priorRevision = draft.revision;
        const result = await mutator(draft);
        const resultCopy = result === undefined ? undefined : structuredClone(result);
        draft.revision = priorRevision + 1;
        this.validateEnvelope(draft);
        let serialized;
        try {
          serialized = JSON.stringify(draft);
          if (typeof this.#storage?.setItem !== 'function') throw new Error('LocalStorage unavailable');
          this.#storage.setItem(ACCOUNT_STORAGE_KEY, serialized);
        } catch (cause) {
          throw failure('本地账号保存失败，原有档案未更新，请检查存储权限或可用空间后重试。', cause);
        }
        this.#notify();
        return resultCopy;
      });
    } catch (cause) {
      if (cause instanceof Error && /[\u3400-\u9fff]/u.test(cause.message)) throw cause;
      throw failure('账号保存事务失败，请重试。', cause);
    }
  }

  #notify() {
    for (const listener of this.#listeners) {
      try { listener(); } catch { /* A view listener cannot turn a committed write into failure. */ }
    }
  }

  observeChanges(callback) {
    if (typeof callback !== 'function') throw failure('账号变更监听器无效。');
    this.#listeners.add(callback);
    const listener = (event) => {
      if ((event.key === ACCOUNT_STORAGE_KEY || event.key === null)
        && (!event.storageArea || event.storageArea === this.#storage)) callback();
    };
    this.#eventTarget?.addEventListener?.('storage', listener);
    return () => {
      this.#listeners.delete(callback);
      this.#eventTarget?.removeEventListener?.('storage', listener);
    };
  }
}
