const PAGES = new Set(['home', 'local', 'ai', 'online', 'guide', 'settings']);

/** Iteration 1 orchestrator: authentication and navigation only. */
export class Game {
  constructor(accountManager) {
    this.accountManager = accountManager;
    this.listeners = new Set();
    this.state = {
      phase: 'AUTH', page: 'home', profile: null, storageError: '',
      auth: { open: true, mode: 'login', busy: false, error: '', notice: '' },
    };
    this.unsubscribeStorage = accountManager.observeChanges(({ profile, error }) => {
      if (error) {
        this.state.storageError = error.message;
      } else {
        this.state.storageError = '';
        // A different window may refresh values, never our login identity.
        if (profile && profile.accountId === this.state.profile?.accountId) {
          this.state.profile = profile;
        }
      }
      this.emit();
    });
  }

  getSnapshot() { return structuredClone(this.state); }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this.getSnapshot());
  }

  requireHome() {
    if (this.state.phase !== 'HOME' || !this.state.profile) {
      throw new Error('请先登录账号，再进入首页。');
    }
    if (this.state.auth.busy) throw new Error('正在处理账号请求，请稍候。');
  }

  navigate(page) {
    this.requireHome();
    if (this.state.auth.open) throw new Error('请先完成或取消账号切换。');
    if (!PAGES.has(page)) throw new Error('该页面尚未开放。');
    this.state.page = page;
    this.emit();
  }

  returnHome() { this.navigate('home'); }

  changeAuthMode(mode) {
    if (this.state.auth.busy || !['login', 'register'].includes(mode)) return;
    this.state.auth = {
      open: true, mode: mode === 'login' && this.state.profile ? 'switch' : mode,
      busy: false, error: '', notice: '',
    };
    this.emit();
  }

  openSwitchAccount() {
    this.requireHome();
    this.state.page = 'home';
    this.state.auth = { open: true, mode: 'switch', busy: false, error: '', notice: '' };
    this.emit();
  }

  closeAuth() {
    if (!this.state.profile || this.state.auth.busy) return;
    this.state.auth = { open: false, mode: 'login', busy: false, error: '', notice: '' };
    this.emit();
  }

  async submitAuth({ username, password }) {
    if (this.state.auth.busy || !this.state.auth.open) return;
    const mode = this.state.auth.mode;
    this.state.auth.busy = true;
    this.state.auth.error = '';
    this.state.auth.notice = '';
    this.emit();
    try {
      if (mode === 'register') {
        await this.accountManager.register(username, password);
        this.state.auth.mode = this.state.profile ? 'switch' : 'login';
        this.state.auth.notice = '注册成功，请输入密码并登录新账号。';
      } else {
        const profile = mode === 'switch'
          ? await this.accountManager.switchAccount(username, password)
          : await this.accountManager.login(username, password);
        this.state.profile = profile;
        this.state.phase = 'HOME';
        this.state.page = 'home';
        this.state.storageError = '';
        this.state.auth.open = false;
      }
    } catch (error) {
      this.state.auth.error = error.message || '账号操作失败，请重试。';
    } finally {
      this.state.auth.busy = false;
      this.emit();
    }
  }

  logout() {
    this.requireHome();
    this.accountManager.logout();
    this.state = {
      phase: 'AUTH', page: 'home', profile: null, storageError: '',
      auth: { open: true, mode: 'login', busy: false, error: '', notice: '' },
    };
    this.emit();
  }

  retryStorage() {
    try {
      const profile = this.accountManager.getCurrentProfile();
      if (profile?.accountId === this.state.profile?.accountId) this.state.profile = profile;
      this.state.storageError = '';
    } catch (error) {
      this.state.storageError = error.message;
    }
    this.emit();
  }

  dispose() {
    this.unsubscribeStorage?.();
    this.listeners.clear();
  }
}
