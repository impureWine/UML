import { Settings } from './Settings.js';

export const REGULAR_CHARACTER_IDS = Object.freeze([
  'CH-01', 'CH-02', 'CH-03', 'CH-04', 'CH-05', 'CH-06',
  'CH-07', 'CH-08', 'CH-09', 'CH-10', 'CH-11', 'CH-12',
]);
export const FUSION_CHARACTER_ID = 'CH-13';
export const CREDENTIAL_PARAMETERS = Object.freeze({ version: 1, algorithm: 'PBKDF2', hash: 'SHA-256', iterations: 210000 });

const PROFILE_FIELDS = ['accountId', 'username', 'credential', 'stats', 'unlockedCharacterIds', 'settings', 'matchHistory', 'revision'];
const MATCH_RECORD_FIELDS = ['matchId', 'mode', 'ownerSeat', 'result', 'p1CharacterId', 'p2CharacterId', 'p1FinalStep', 'p2FinalStep', 'endedAt', 'endReason'];
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;

function requireRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Object.keys(value).length !== fields.length
    || fields.some((key) => !Object.hasOwn(value, key))) {
    throw new Error(`账号${label}格式损坏，请保留原数据并检查。`);
  }
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value) {
  return Uint8Array.from(value.match(/../gu), (pair) => Number.parseInt(pair, 16));
}

function requireCrypto(provider) {
  if (!provider?.getRandomValues || !provider?.subtle?.importKey || !provider?.subtle?.deriveBits) {
    throw new Error('当前环境不支持Web Crypto，请使用现代浏览器并通过本机可信地址打开。');
  }
}

async function derive(password, salt, provider) {
  requireCrypto(provider);
  try {
    const key = await provider.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await provider.subtle.deriveBits({
      name: 'PBKDF2', hash: CREDENTIAL_PARAMETERS.hash, salt,
      iterations: CREDENTIAL_PARAMETERS.iterations,
    }, key, 256));
  } catch (cause) {
    throw new Error('口令安全校验失败，请重试或更换支持Web Crypto的浏览器。', { cause });
  }
}

export class AccountProfile {
  static validateUsername(username) {
    if (typeof username !== 'string' || !/^[A-Za-z0-9\p{Script=Han}]{2,16}$/u.test(username)) {
      throw new Error('用户名须为2～16位字母、数字或中文，区分大小写且不能包含空格。');
    }
  }

  static validatePassword(password) {
    if (typeof password !== 'string' || Array.from(password).length < 4) {
      throw new Error('密码至少需要4个字符，输入的前后空格也属于密码。');
    }
  }

  static validateCredential(credential) {
    requireRecord(credential, ['version', 'algorithm', 'hash', 'iterations', 'salt', 'derivedKey'], '凭据');
    if (Object.entries(CREDENTIAL_PARAMETERS).some(([key, value]) => credential[key] !== value)
      || typeof credential.salt !== 'string' || !/^[a-f0-9]{32}$/u.test(credential.salt)
      || typeof credential.derivedKey !== 'string' || !/^[a-f0-9]{64}$/u.test(credential.derivedKey)) {
      throw new Error('账号口令凭据格式或派生版本无效，请保留原数据。');
    }
  }

  // Read contract only; creation and committing confirmed matches arrive in iteration 6.
  static validateMatchRecord(record) {
    requireRecord(record, MATCH_RECORD_FIELDS, '对局记录');
    const characterIsValid = (id) => REGULAR_CHARACTER_IDS.includes(id) || id === FUSION_CHARACTER_ID
      || (id === '未选择' && record.mode === 'online');
    if (typeof record.matchId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/u.test(record.matchId)
      || !['local', 'ai', 'online'].includes(record.mode)
      || !['P1', 'P2'].includes(record.ownerSeat)
      || (record.mode !== 'online' && record.ownerSeat !== 'P1')
      || !['win', 'loss', 'draw'].includes(record.result)
      || !characterIsValid(record.p1CharacterId) || !characterIsValid(record.p2CharacterId)
      || [record.p1FinalStep, record.p2FinalStep].some((step) => !Number.isInteger(step) || step < 0 || step > 40)
      || typeof record.endReason !== 'string' || record.endReason.trim().length === 0 || record.endReason.length > 128) {
      throw new Error('账号对局记录的标识、模式、角色或结果数据无效，请保留原数据。');
    }
    const endedAt = typeof record.endedAt === 'string' ? Date.parse(record.endedAt) : NaN;
    if (!Number.isFinite(endedAt) || new Date(endedAt).toISOString() !== record.endedAt) {
      throw new Error('账号对局结束时间必须为有效的ISO时间戳，请保留原数据。');
    }
  }

  static async create({ username, password, cryptoProvider = globalThis.crypto }) {
    AccountProfile.validateUsername(username);
    AccountProfile.validatePassword(password);
    requireCrypto(cryptoProvider);
    let salt;
    let accountId;
    try {
      salt = cryptoProvider.getRandomValues(new Uint8Array(16));
      const id = cryptoProvider.getRandomValues(new Uint8Array(16));
      id[6] = (id[6] & 0x0f) | 0x40;
      id[8] = (id[8] & 0x3f) | 0x80;
      const hex = toHex(id);
      accountId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch (cause) {
      throw new Error('无法生成安全的账号标识与口令盐，请重试。', { cause });
    }
    const derivedKey = toHex(await derive(password, salt, cryptoProvider));
    return {
      accountId, username,
      credential: { ...CREDENTIAL_PARAMETERS, salt: toHex(salt), derivedKey },
      stats: { total: 0, wins: 0, losses: 0, draws: 0 },
      unlockedCharacterIds: [...REGULAR_CHARACTER_IDS],
      settings: Settings.defaults(), matchHistory: [], revision: 1,
    };
  }

  static validate(profile, expectedId = profile?.accountId) {
    requireRecord(profile, PROFILE_FIELDS, '档案');
    if (typeof profile.accountId !== 'string' || !UUID_PATTERN.test(profile.accountId) || profile.accountId !== expectedId) {
      throw new Error('账号标识格式损坏或与存储索引不一致。');
    }
    AccountProfile.validateUsername(profile.username);
    AccountProfile.validateCredential(profile.credential);
    requireRecord(profile.stats, ['total', 'wins', 'losses', 'draws'], '统计');
    if (Object.values(profile.stats).some((count) => !Number.isSafeInteger(count) || count < 0)
      || profile.stats.total !== profile.stats.wins + profile.stats.losses + profile.stats.draws) {
      throw new Error('账号胜负统计不一致，请保留原数据。');
    }
    const unlocked = profile.unlockedCharacterIds;
    if (!Array.isArray(unlocked) || new Set(unlocked).size !== unlocked.length
      || REGULAR_CHARACTER_IDS.some((id) => !unlocked.includes(id))
      || unlocked.some((id) => !REGULAR_CHARACTER_IDS.includes(id) && id !== FUSION_CHARACTER_ID)) {
      throw new Error('账号角色解锁数据无效，请保留原数据。');
    }
    Settings.validate(profile.settings);
    if (!Array.isArray(profile.matchHistory)) throw new Error('账号对局历史格式无效，请保留原数据。');
    const matchIds = new Set();
    const counts = { win: 0, loss: 0, draw: 0 };
    for (const record of profile.matchHistory) {
      AccountProfile.validateMatchRecord(record);
      if (matchIds.has(record.matchId)) throw new Error('同一账号包含重复对局记录，请保留原数据。');
      matchIds.add(record.matchId);
      counts[record.result] += 1;
    }
    if (profile.stats.total !== profile.matchHistory.length || profile.stats.wins !== counts.win
      || profile.stats.losses !== counts.loss || profile.stats.draws !== counts.draw) {
      throw new Error('账号统计与已保存的对局历史不一致，请保留原数据。');
    }
    if (!Number.isSafeInteger(profile.revision) || profile.revision < 1) {
      throw new Error('账号档案修订号无效。');
    }
    return true;
  }

  static async verifyCredential(profile, password, cryptoProvider = globalThis.crypto) {
    AccountProfile.validatePassword(password);
    AccountProfile.validateCredential(profile.credential);
    const actual = await derive(password, fromHex(profile.credential.salt), cryptoProvider);
    const expected = fromHex(profile.credential.derivedKey);
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  }

  static publicSnapshot(profile) {
    const { credential, ...safeProfile } = profile;
    const snapshot = structuredClone(safeProfile);
    snapshot.matchHistory.sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt));
    return snapshot;
  }

  static applySettings(profile, patch) {
    profile.settings = Settings.applyPatch(profile.settings, patch);
    profile.revision += 1;
    AccountProfile.validate(profile);
  }
}
