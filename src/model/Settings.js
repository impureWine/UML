const DEFAULT_SETTINGS = Object.freeze({
  effectQuality: 'high',
  bgmVolume: 70,
  sfxVolume: 80,
  bgmMuted: false,
  sfxMuted: false,
  autoMusic: true,
  singleLoop: true,
  cameraAutoFollow: true,
});

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

export class Settings {
  static defaults() {
    return { ...DEFAULT_SETTINGS };
  }

  static validate(value, { partial = false } = {}) {
    if (!isRecord(value)) throw new Error('偏好设置格式无效，请重新设置。');
    const keys = Object.keys(value);
    if (keys.some((key) => !Object.hasOwn(DEFAULT_SETTINGS, key))
      || (!partial && keys.length !== Object.keys(DEFAULT_SETTINGS).length && !(keys.length===Object.keys(DEFAULT_SETTINGS).length-1&&!Object.hasOwn(value,'effectQuality')))) {
      throw new Error('偏好设置包含缺失或不支持的字段。');
    }
    for (const key of keys) {
      if(key==='effectQuality'){if(!['low','medium','high'].includes(value[key]))throw new Error('画质档位无效');}
      else if (key === 'bgmVolume' || key === 'sfxVolume') {
        if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 100) {
          throw new Error('音乐和音效音量必须在0～100之间。');
        }
      } else if (typeof value[key] !== 'boolean') {
        throw new Error('静音、音乐模式和镜头跟随设置必须为开关值。');
      }
    }
    return true;
  }

  static applyPatch(current, patch) {
    Settings.validate(current);
    Settings.validate(patch, { partial: true });
    return { ...current, ...patch };
  }
}
