export const ACCOUNT_KEY = 'climb40.accounts.v1';

// LocalStorage and Web Locks are browser boundaries; all account logic stays real.
export class MemoryStorage {
  constructor(raw = null) {
    this.values = new Map(raw === null ? [] : [[ACCOUNT_KEY, raw]]);
    this.writeCount = 0;
    this.readError = false;
    this.writeError = false;
  }

  getItem(key) {
    if (this.readError) throw new Error('storage denied');
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.writeError) throw new Error('quota exceeded');
    this.writeCount += 1;
    this.values.set(key, String(value));
  }
}

export class SerialLocks {
  constructor() {
    this.tail = Promise.resolve();
    this.names = [];
  }

  request(name, options, callback) {
    if (options.mode !== 'exclusive') throw new Error('exclusive lock required');
    this.names.push(name);
    const task = this.tail.then(() => callback({ name, mode: 'exclusive' }));
    this.tail = task.catch(() => {});
    return task;
  }
}

export class StorageEvents extends EventTarget {
  changed(storageArea, key = ACCOUNT_KEY) {
    const event = new Event('storage');
    Object.defineProperties(event, {
      key: { value: key },
      storageArea: { value: storageArea },
    });
    this.dispatchEvent(event);
  }
}

export function environment(raw = null) {
  return { storage: new MemoryStorage(raw), locks: new SerialLocks(), eventTarget: new StorageEvents() };
}

export function storedEnvelope(storage) {
  return JSON.parse(storage.getItem(ACCOUNT_KEY));
}
