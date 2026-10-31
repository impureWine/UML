import { GenshinAudioManager } from '../audio/GenshinAudioManager.js';
import { MusicPlayer } from './MusicPlayer.js';
import { OpeningPanel } from './OpeningPanel.js';
import { CharacterGuide } from './CharacterGuide.js';
import { MountainMapPanel } from './MountainMapPanel.js';

const ROUTES = {
  local: { title: '本地双人对战', eyebrow: '同席相逢', description: '本地双人对战尚未开放。' },
  ai: { title: 'AI对战', eyebrow: '与智交锋', description: 'AI对战尚未开放。' },
  online: { title: '联机对战', eyebrow: '远方来客', description: '联机对战尚未开放。' },
  guide: { title: '角色与规则图鉴', eyebrow: '群星之书', description: '角色与规则图鉴尚未开放。' },
  settings: { title: '设置', eyebrow: '旅途偏好', description: '设置尚未开放。' },
};

const CHARACTER_NAMES = {
  'CH-01': '巴巴托斯', 'CH-02': '摩拉克斯', 'CH-03': '巴尔泽布',
  'CH-04': '布耶尔', 'CH-05': '芙卡洛斯', 'CH-06': '赫布里穆',
  'CH-07': '瓦沙嘉', 'CH-08': '伊斯塔露', 'CH-09': '阿斯莫代',
  'CH-10': '若娜瓦', 'CH-11': '纳贝里士', 'CH-12': '莱茵多特',
  'CH-13': '莱茵多特/纳贝里士',
};

const PATHS = {
  star: '<path d="m12 1 2.8 8.2L23 12l-8.2 2.8L12 23l-2.8-8.2L1 12l8.2-2.8Z"/><path d="M12 6v12M6 12h12"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>',
  ai: '<path d="M8 4h8l5 8-5 8H8l-5-8Z"/><path d="m12 7 4 5-4 5-4-5Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',
  book: '<path d="M12 6c-3-3-7-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2Zm0 0v15M5 8h3m-3 4h3m8-4h3m-3 4h3"/>',
  settings: '<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2m-3 9v3"/>',
  swap: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
  exit: '<path d="M10 3H4v18h6m4-14 5 5-5 5m-5-5h10"/>',
  music: '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="5.5" cy="18.5" rx="3.5" ry="2.5"/><ellipse cx="16.5" cy="16.5" rx="3.5" ry="2.5"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  next: '<path d="m5 5 10 7L5 19Zm14 0v14"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5ZM12 0v3m0 18v3M0 12h3m18 0h3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18M10 5a12 12 0 0 1 12 7 18 18 0 0 1-4 5M6 6a19 19 0 0 0-4 6s4 7 10 7a12 12 0 0 0 4-1M10 10a3 3 0 0 0 4 4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
  shield: '<path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5Zm-4 9 3 3 5-6"/>',
  refresh: '<path d="M20 8a9 9 0 0 0-15-3L2 8m0-6v6h6m-4 8a9 9 0 0 0 15 3l3-3m0 6v-6h-6"/>',
};

function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name] || PATHS.star}</svg>`;
}

const SKY_ART = `<svg class="sky-art" viewBox="0 0 880 620" fill="none" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="island-stone" x1="410" y1="285" x2="480" y2="530" gradientUnits="userSpaceOnUse"><stop stop-color="#f7f7ed"/><stop offset=".44" stop-color="#c0dbd6"/><stop offset="1" stop-color="#74a9ad" stop-opacity=".12"/></linearGradient>
    <linearGradient id="temple-light" x1="400" y1="100" x2="570" y2="390" gradientUnits="userSpaceOnUse"><stop stop-color="#fffef3"/><stop offset="1" stop-color="#e3eee3"/></linearGradient>
    <linearGradient id="cloud-light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffef5" stop-opacity=".88"/><stop offset="1" stop-color="#f3fcf7" stop-opacity="0"/></linearGradient>
    <radialGradient id="sun-glow"><stop stop-color="#fff9dd" stop-opacity=".9"/><stop offset="1" stop-color="#fff9dd" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="490" cy="226" r="218" fill="url(#sun-glow)"/>
  <g class="celestial-orbit" stroke="#c5b688" stroke-opacity=".44">
    <circle cx="490" cy="241" r="178"/><circle cx="490" cy="241" r="187" stroke-dasharray="1 11"/>
    <ellipse cx="490" cy="241" rx="304" ry="113" transform="rotate(-28 490 241)"/>
    <path d="M298 241h-18m402 0h18M490 49V31m0 420v-18"/>
  </g>
  <g fill="#d0bd83"><path d="m731 93 3 11 11 3-11 3-3 11-3-11-11-3 11-3Z"/><path d="m280 146 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/><path d="m715 364 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/><circle cx="388" cy="68" r="2"/><circle cx="764" cy="239" r="2.5"/><circle cx="246" cy="300" r="2"/></g>
  <g class="far-island" opacity=".43"><path d="m152 255 59-12 39 13-51 20Z" fill="#d2e5da"/><path d="m152 255 20 30 15 4 12 30 16-35 35-28-51 20Z" fill="#a6c9c3"/><path d="M189 249v-30h5v-8h16v8h5v30" fill="#f7f8eb"/><path d="m180 214 22-13 23 13Z" fill="#f8f7e8" stroke="#c5c8a7"/></g>
  <g class="main-island">
    <path d="m338 349 60-28 137-3 110 25 14 20-107 37-146-7-76-24Z" fill="#dce9d9" stroke="#a9bcb0" stroke-width="1.1"/>
    <path d="m330 369 28 43 18-4 21 43 26-9 34 79 24-25 24 44 24-67 20 7 25-56 23 7 25-38 37-30-107 37-146-7Z" fill="url(#island-stone)"/>
    <path d="m406 393 11 35 15-8 25 101m95-121-8 50-15 23m76-91-24 30-7 12m-204-47 13 22 25-6" stroke="#9abbb5" stroke-opacity=".48"/>
    <path d="m350 353 54-23 128-3 97 22-78 27-146 2Z" fill="#eff3df"/>
    <path d="m374 348 63-20 122 9 42 12-67 24-127-5Z" fill="#faf8e8" stroke="#cfccac"/>
    <path d="m415 343 78-28 80 27-79 27Z" fill="#fffbed" stroke="#c7c6a8"/>
    <path d="M416 343v9l78 27 79-28v-9l-79 27Z" fill="#d4dfcd"/>
    <path d="M446 329V202h17v133m62-1V202h17v125" fill="url(#temple-light)" stroke="#c9cbb0"/>
    <path d="M451 207v120m7-120v122m72-122v123m7-123v121" stroke="#d6d6b9"/>
    <path d="M437 202h34v-9h-34Zm81 0h33v-9h-33ZM438 335h32v-9h-32Zm80 0h32v-9h-32Z" fill="#f8f6e5" stroke="#bdc5a8"/>
    <path d="M460 317V217c0-51 68-51 68 0v100" fill="#d6e9e0" fill-opacity=".32"/>
    <path d="M464 315V217a30 30 0 0 1 60 0v98" stroke="#cabf91" stroke-width="2"/>
    <path d="M475 314v-94a19 19 0 0 1 38 0v94" stroke="#fffdf0" stroke-width="3"/>
    <path d="m421 193 73-46 73 46Z" fill="#f9f7e7" stroke="#bbc7aa" stroke-width="1.4"/>
    <path d="m439 185 55-34 54 34Z" fill="#e9ecd6" stroke="#c8c6a2"/>
    <path d="M421 193h146v9H421Z" fill="#fffced" stroke="#c7c8a9"/>
    <path d="m494 164 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#bba46a"/>
    <path d="M493 148v-20m-9 10 9-10 10 10" stroke="#b8b58e"/>
    <path d="m494 253 5 14 14 5-14 5-5 14-5-14-14-5 14-5Z" fill="#fcf7d9" stroke="#c9b879"/>
    <path d="m494 233 1 8 8 1-8 2-1 8-2-8-8-2 8-1Z" fill="#fffdf3"/>
    <g stroke="#a9bda7" fill="#eaf0dc"><path d="M385 343v-42h11v42m194-1v-41h11v41"/><path d="M382 301h17v-5h-17Zm205 0h17v-5h-17Z"/><path d="M390 296v-12m206 12v-12"/></g>
    <path d="m360 351 16-9 13 7-16 9Z" fill="#bed1b7"/><path d="m606 351 14-9 17 7-17 8Z" fill="#b8cfb5"/>
    <path d="M402 359h15m169-2h14m-78 26 11 5" stroke="#a6bba2" stroke-width="2"/>
  </g>
  <g fill="url(#cloud-light)"><path d="M63 446c22-28 52-23 69-7 7-38 66-54 91-18 29-9 53-6 68 17 40-20 81-2 89 26H63Z"/><path d="M546 469c17-28 48-34 73-18 7-30 38-43 68-21 32-41 93-17 99 17 20-4 43 4 55 22Z"/><path d="M280 545c20-27 63-29 84-12 15-32 60-44 88-14 36-18 73-6 82 22 28-8 64-4 77 18H277Z"/></g>
  <g stroke="#e9f6ed" stroke-width="2" stroke-linecap="round" opacity=".72"><path d="M82 361h115m-86 12h49M628 534h97m-77 11h41M696 155h81m-39 10h63"/></g>
</svg>`;

function number(value) {
  return Number.isSafeInteger(value) && value >= 0 ? String(value) : '0';
}

export class GameView {
  constructor(root, game) {
    if (!(root instanceof HTMLElement)) throw new TypeError('GameView 需要有效的页面根节点。');
    this.root = root;
    this.game = game;
    this.snapshot = null;
    this.pageKey = null;
    this.modalOpen = false;
    this.lastFocus = null;
    this.passwordVisible = false;
    this.disposed = false;
    this.events = new AbortController();
    this.buildShell();
    this.audio = new GenshinAudioManager(() => this.musicPlayer?.update());
    this.game.audio = this.audio;
    this.root.addEventListener('click', e => { if(e.target.closest('button:not(:disabled)') && !e.target.closest('.music-player')) this.audio.playSfx('button'); }, {signal:this.events.signal});
    this.musicPlayer = new MusicPlayer(this.root.querySelector('.music-player'), this.audio, game);
    document.addEventListener('pointerdown', () => this.audio.resumeFromGesture(), { signal: this.events.signal });
    document.addEventListener('keydown', () => this.audio.resumeFromGesture(), { signal: this.events.signal });
    this.bindEvents();
    this.unsubscribe = game.subscribe((snapshot) => this.applyView(snapshot));
  }

  buildShell() {
    this.root.classList.add('game-app');
    this.root.innerHTML = `
      <div class="sky-background" aria-hidden="true"><span class="sky-halo"></span><span class="sky-cloud cloud-one"></span><span class="sky-cloud cloud-two"></span><span class="sky-star star-one">✧</span><span class="sky-star star-two">✧</span><span class="sky-star star-three">✧</span></div>
      <div class="app-surface">
        <a class="skip-link" href="#main-content">跳到主要内容</a>
        <header class="site-header">
          <div class="brand" aria-label="40阶登山博弈"><span class="brand-emblem">${icon('star')}</span><span class="brand-wordmark">云上之约<small>CLIMB TO THE SKY</small></span></div>
          <section class="account-bar" aria-label="当前账号与战绩">
            <span class="account-avatar">${icon('user')}</span>
            <div class="account-identity"><small>当前旅人</small><strong data-username>尚未登录</strong></div>
            <div class="header-stats" aria-label="对局统计"><span><b data-stat="total">0</b><small>总场</small></span><span><b data-stat="wins">0</b><small>胜</small></span><span><b data-stat="losses">0</b><small>负</small></span><span><b data-stat="draws">0</b><small>平</small></span></div>
            <span class="fusion-status" data-fusion>${icon('lock')}<span>隐藏融合 · 锁定</span></span>
            <div class="account-actions"><button type="button" class="text-button" data-action="switch" aria-label="切换账号">${icon('swap')}<span>切号</span></button><button type="button" class="text-button" data-action="logout" aria-label="退出登录">${icon('exit')}<span>退出</span></button></div>
          </section>
          <section class="music-player" aria-label="旋曜玉帛播放器，尚未开放"><span class="record-disc">${icon('music')}</span><span class="music-description"><strong>旋曜玉帛</strong><small>音乐尚未开放</small></span><button type="button" disabled aria-label="播放，尚未开放">${icon('play')}</button><button type="button" disabled aria-label="下一首，尚未开放">${icon('next')}</button></section>
        </header>
        <aside class="storage-banner" hidden aria-label="存储异常"><span>${icon('shield')}<span data-storage-message></span></span><button type="button" class="text-button" data-action="retry">${icon('refresh')}重试</button></aside>
        <main id="main-content" class="main-content" tabindex="-1"></main>
        <footer class="site-footer"><span>${icon('star')}<span>云海藏锋，方寸定局。</span></span><span class="local-storage-note">${icon('shield')}本地账号 · 资料保存在当前浏览器</span><span class="footer-coordinate">CELESTIAL ARCHIVE <i></i> 040</span></footer>
      </div>
      <dialog class="auth-dialog" aria-labelledby="auth-title" aria-describedby="auth-description">
        <div class="auth-visual" aria-hidden="true"><span class="auth-constellation">${icon('star')}</span><div class="auth-visual-orbit orbit-outer"></div><div class="auth-visual-orbit orbit-inner"></div><span class="auth-visual-spark spark-a">✦</span><span class="auth-visual-spark spark-b">✧</span><div class="auth-monument"><span></span><span></span><span></span><i>✦</i></div><div class="auth-visual-copy"><small>A JOURNEY ABOVE THE CLOUDS</small><p>每一次相逢<br>皆是新的登临</p><span>40阶登山博弈</span></div></div>
        <div class="auth-content"><button type="button" class="dialog-close icon-button" data-action="close-auth" aria-label="取消切换账号" hidden>${icon('close')}</button>
          <div class="auth-heading"><span class="section-eyebrow">${icon('star')}<span>旅人档案</span></span><h2 id="auth-title">欢迎归来</h2><p id="auth-description">登录你的本地账号，开启云上旅程。</p></div>
          <div class="auth-tabs" role="group" aria-label="账号操作"><button type="button" data-auth-mode="login" aria-pressed="true">登录</button><button type="button" data-auth-mode="register" aria-pressed="false">注册新账号</button></div>
          <form class="auth-form" novalidate>
            <div class="form-field"><label for="auth-username">用户名</label><div class="input-wrap">${icon('user')}<input id="auth-username" name="username" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" required aria-describedby="username-hint" placeholder="请输入用户名"><span class="field-corner" aria-hidden="true"></span></div><small id="username-hint">2–16位字母、数字或中文，区分大小写</small></div>
            <div class="form-field"><label for="auth-password">密码</label><div class="input-wrap">${icon('lock')}<input id="auth-password" name="password" type="password" autocomplete="current-password" required aria-describedby="password-hint" placeholder="请输入密码"><button class="password-toggle icon-button" type="button" aria-label="显示密码" aria-pressed="false">${icon('eye')}</button></div><small id="password-hint">至少4个字符，请妥善保管</small></div>
            <div class="auth-feedback"><p class="auth-error" role="alert" aria-live="assertive" aria-atomic="true"></p><p class="auth-notice" role="status" aria-live="polite" aria-atomic="true"></p></div>
            <div class="auth-storage-error" hidden><span data-auth-storage-message></span><button type="button" class="text-button" data-action="retry">重试存储</button></div>
            <button class="auth-submit primary-button" type="submit"><span class="submit-text">登录</span><span class="submit-symbol">${icon('arrow')}</span></button>
          </form>
          <p class="auth-local-note">${icon('shield')}<span>账号与资料仅保存于当前浏览器<br>注册成功后，请显式登录。</span></p>
        </div>
      </dialog>`;
    this.surface = this.root.querySelector('.app-surface');
    this.main = this.root.querySelector('main');
    this.dialog = this.root.querySelector('dialog');
    this.form = this.dialog.querySelector('form');
    this.username = this.form.elements.username;
    this.password = this.form.elements.password;
    this.submit = this.form.querySelector('[type="submit"]');
    this.authError = this.dialog.querySelector('.auth-error');
    this.authNotice = this.dialog.querySelector('.auth-notice');
  }

  bindEvents() {
    const options = { signal: this.events.signal };
    this.root.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || !this.root.contains(button) || button.disabled) return;
      if (button.dataset.route) this.game.navigate(button.dataset.route);
      if (button.dataset.action === 'start-setup') this.game.startSetup();
      if (button.dataset.authMode) this.game.changeAuthMode(button.dataset.authMode);
      const actions = {
        home: () => this.game.returnHome(),
        switch: () => this.game.openSwitchAccount(),
        logout: () => this.game.logout(),
        'close-auth': () => this.game.closeAuth(),
        retry: () => this.game.retryStorage(),
      };
      if (actions[button.dataset.action]) actions[button.dataset.action]();
      if (button.classList.contains('password-toggle')) {
        this.passwordVisible = !this.passwordVisible;
        this.password.type = this.passwordVisible ? 'text' : 'password';
        button.setAttribute('aria-label', this.passwordVisible ? '隐藏密码' : '显示密码');
        button.setAttribute('aria-pressed', String(this.passwordVisible));
        button.innerHTML = icon(this.passwordVisible ? 'eyeOff' : 'eye');
      }
    }, options);
    this.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (this.snapshot?.auth?.busy) return;
      try {
        await this.game.submitAuth({ username: this.username.value, password: this.password.value });
      } catch {
        if (!this.disposed) this.authError.textContent = '操作未完成，请稍后重试。';
      }
    }, options);
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (this.snapshot?.profile && !this.snapshot?.auth?.busy) this.game.closeAuth();
    }, options);
    this.dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const focusable = [...this.dialog.querySelectorAll('button, input, [tabindex="0"]')]
        .filter((element) => !element.disabled && !element.hidden && element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !this.dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !this.dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }, options);
  }

  applyView(snapshot) {
    if (this.disposed) return;
    if (snapshot.profile) this.audio.applySettings(snapshot.profile.settings);
    this.audio.handleScene(snapshot);
    const previous = this.snapshot;
    this.snapshot = snapshot;
    const profile = snapshot.profile;
    const authenticated = snapshot.phase === 'HOME' && Boolean(profile);
    this.root.classList.toggle('is-auth', !authenticated);
    this.root.querySelector('[data-username]').textContent = profile?.username || '尚未登录';
    for (const stat of this.root.querySelectorAll('[data-stat]')) {
      stat.textContent = number(profile?.stats?.[stat.dataset.stat]);
    }
    const fusionUnlocked = profile?.unlockedCharacterIds?.includes('CH-13') === true;
    const fusion = this.root.querySelector('[data-fusion]');
    fusion.classList.toggle('is-unlocked', fusionUnlocked);
    fusion.innerHTML = `${icon(fusionUnlocked ? 'unlock' : 'lock')}<span>${fusionUnlocked ? '隐藏融合 · 已解锁' : '隐藏融合 · 锁定'}</span>`;
    for (const button of this.root.querySelectorAll('.account-actions button')) button.disabled = !authenticated || Boolean(snapshot.setup);

    const storageError = snapshot.storageError || '';
    this.root.querySelector('.storage-banner').hidden = !storageError;
    this.root.querySelector('[data-storage-message]').textContent = storageError;
    this.dialog.querySelector('.auth-storage-error').hidden = !storageError;
    this.dialog.querySelector('[data-auth-storage-message]').textContent = storageError;

    const page = authenticated && ROUTES[snapshot.page] ? snapshot.page : 'home';
    const key = `${page}:${authenticated ? profile.accountId : 'auth'}:${snapshot.setup ? 'opening' : 'preview'}`;
    if (this.pageKey !== key) {
      this.opening?.dispose(); this.opening = null;
      this.guide?.dispose();
      this.guide = null;
      this.mapPanel?.dispose();
      this.mapPanel = null;
      this.pageKey = key;
      if (snapshot.setup) this.opening = new OpeningPanel(this.main, this.game);
      else if (page === 'home') this.renderHome();
      else if (['local', 'ai', 'online'].includes(page)) {
        this.mapPanel = new MountainMapPanel(this.main, {
          title: ROUTES[page].title,
          autoFollow: profile.settings.cameraAutoFollow,
          onAutoFollow: (value) => this.game.setCameraAutoFollow(value),
        });
      }
      else if (page === 'guide') this.guide = new CharacterGuide(this.main, profile);
      else this.renderPlaceholder(page);
      if (authenticated && previous && previous.page !== snapshot.page && !snapshot.auth?.open) {
        this.main.querySelector('h1')?.focus({ preventScroll: true });
      }
    }
    if (this.opening) this.opening.update(snapshot);
    if (this.mapPanel && ['local','ai'].includes(page) && !this.main.querySelector('[data-action="start-setup"]')) {
      const start = document.createElement('button'); start.dataset.action = 'start-setup'; start.className = 'opening-start'; start.textContent = '开始本轮对局 · 选择角色'; this.main.prepend(start);
    }
    if (this.mapPanel) this.mapPanel.setAutoFollow(profile.settings.cameraAutoFollow);
    if (page === 'home') this.updateHome(profile, fusionUnlocked);
    this.updateAuth(snapshot);
  }

  renderHome() {
    this.main.className = 'main-content home-main';
    this.main.innerHTML = `
      <div class="home-art">${SKY_ART}<span class="art-caption"><i></i>云海之上，群星之间<i></i></span></div>
      <section class="home-story" aria-labelledby="home-title"><span class="section-eyebrow">${icon('star')}<span>云海之上 · 向巅而行</span></span><h1 id="home-title" class="hero-title" tabindex="-1"><span class="title-first"><em>40</em>阶</span><span class="title-second">登山博弈</span></h1><p class="hero-description">以方寸间的抉择，赴云端上的交锋。</p><div class="hero-divider" aria-hidden="true"><span></span>✦<span></span></div>
        <nav class="mode-navigation" aria-label="开始旅程">
          <button class="mode-button mode-primary" type="button" data-route="local" aria-label="本地双人对战"><span class="mode-icon">${icon('people')}</span><span class="mode-copy"><strong>本地双人对战</strong><small>同屏对坐，共赴云巅</small></span><span class="mode-number">01</span>${icon('arrow', 'mode-arrow')}</button>
          <button class="mode-button" type="button" data-route="ai" aria-label="AI对战"><span class="mode-icon">${icon('ai')}</span><span class="mode-copy"><strong>AI对战</strong><small>独自启程，试炼心智</small></span><span class="mode-number">02</span>${icon('arrow', 'mode-arrow')}</button>
          <button class="mode-button" type="button" data-route="online" aria-label="联机对战"><span class="mode-icon">${icon('globe')}</span><span class="mode-copy"><strong>联机对战</strong><small>与远方旅人，相约此间</small></span><span class="mode-number">03</span>${icon('arrow', 'mode-arrow')}</button>
        </nav>
        <nav class="utility-navigation" aria-label="更多内容"><button type="button" data-route="guide">${icon('book')}<span>角色与规则图鉴</span>${icon('arrow')}</button><button type="button" data-route="settings">${icon('settings')}<span>设置</span>${icon('arrow')}</button></nav>
      </section>
      <aside class="journey-overview" aria-label="旅程档案"><div class="overview-heading"><span class="section-eyebrow">${icon('star')}<span>旅程档案</span></span><span class="overview-rule"></span><span class="small-caps">YOUR JOURNEY</span></div><div class="overview-cards">
        <section class="unlock-card" aria-labelledby="unlock-heading"><div class="card-heading"><h2 id="unlock-heading">群星集结</h2>${icon('star')}</div><div class="unlock-count"><strong data-unlock-count>12</strong><span>/ 13</span></div><p>已解锁角色</p><div class="unlock-progress" aria-hidden="true"><span></span></div><div class="unlock-footnote">${icon('lock')}<span data-unlock-label>隐藏融合待解锁</span></div><p class="fusion-character-name">莱茵多特/纳贝里士</p><details class="unlocked-details"><summary>查看已解锁角色</summary><ul class="unlocked-character-list" aria-label="已解锁角色名单" tabindex="0"></ul></details></section>
        <section class="history-card" aria-labelledby="history-heading"><div class="card-heading"><h2 id="history-heading">最近对局</h2><span data-history-count>暂无记录</span></div><div class="history-content"></div></section>
      </div></aside>`;
  }

  updateHome(profile, fusionUnlocked) {
    const unlockedIds = Array.isArray(profile?.unlockedCharacterIds) ? profile.unlockedCharacterIds : [];
    const count = profile ? new Set(unlockedIds.filter((id) => /^CH-(0[1-9]|1[0-3])$/.test(id))).size : 12;
    this.main.querySelector('[data-unlock-count]').textContent = String(count);
    this.main.querySelector('[data-unlock-label]').textContent = fusionUnlocked ? '隐藏融合已解锁' : '隐藏融合待解锁';
    const footnote = this.main.querySelector('.unlock-footnote');
    footnote.classList.toggle('is-unlocked', fusionUnlocked);
    footnote.querySelector('svg').outerHTML = icon(fusionUnlocked ? 'unlock' : 'lock');
    this.main.querySelector('.unlock-progress span').style.width = `${Math.min(100, count / 13 * 100)}%`;
    const characterList = this.main.querySelector('.unlocked-character-list');
    const unlockedKey = JSON.stringify(unlockedIds);
    if (characterList.dataset.ids !== unlockedKey) {
      characterList.dataset.ids = unlockedKey;
      characterList.replaceChildren();
      for (const id of [...new Set(unlockedIds)].filter((id) => CHARACTER_NAMES[id]).sort()) {
        const character = document.createElement('li');
        character.textContent = CHARACTER_NAMES[id];
        characterList.append(character);
      }
      if (!characterList.childElementCount) {
        const empty = document.createElement('li');
        empty.textContent = '登录后查看当前账号的角色名单';
        characterList.append(empty);
      }
    }
    const records = Array.isArray(profile?.matchHistory) ? [...profile.matchHistory].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime()) : [];
    const content = this.main.querySelector('.history-content');
    const historyKey = JSON.stringify(records);
    if (this.historyKey === historyKey && content.childNodes.length) return;
    this.historyKey = historyKey;
    this.main.querySelector('[data-history-count]').textContent = records.length ? `共 ${records.length} 场` : '暂无记录';
    content.replaceChildren();
    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.innerHTML = `${icon('compass')}<div><strong>第一段旅程，静候启程</strong><p>完成的对局将留存在当前账号。</p></div>`;
      content.append(empty);
      return;
    }
    const list = document.createElement('ul');
    list.className = 'history-list';
    list.tabIndex = 0;
    list.setAttribute('aria-label', '全部已完成对局，按结束时间从新到旧排列');
    for (const record of records) {
      const item = document.createElement('li');
      const heading = document.createElement('div');
      heading.className = 'history-record-heading';
      const result = document.createElement('span');
      const resultText = { win: '胜利', loss: '败北', draw: '平局', WIN: '胜利', LOSS: '败北', DRAW: '平局' }[record.result] || '已完成';
      result.className = `history-result ${['win', 'loss', 'draw'].includes(String(record.result).toLowerCase()) ? String(record.result).toLowerCase() : ''}`;
      result.textContent = resultText;
      const mode = document.createElement('strong');
      mode.textContent = ROUTES[record.mode]?.title || '对局记录';
      const date = document.createElement('time');
      const endedAt = new Date(record.endedAt);
      if (!Number.isNaN(endedAt.getTime())) {
        date.dateTime = endedAt.toISOString();
        date.textContent = endedAt.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      } else date.textContent = '时间未知';
      const seat = document.createElement('span');
      seat.className = 'history-owner-seat';
      seat.textContent = `本人 ${record.ownerSeat || '未知席位'}`;
      heading.append(result, mode, seat);
      const characters = document.createElement('p');
      characters.className = 'history-characters';
      const p1Name = CHARACTER_NAMES[record.p1CharacterId] || (record.p1CharacterId ? String(record.p1CharacterId) : '未选择');
      const p2Name = CHARACTER_NAMES[record.p2CharacterId] || (record.p2CharacterId ? String(record.p2CharacterId) : '未选择');
      const p1Id = record.p1CharacterId ? ` (${record.p1CharacterId})` : '';
      const p2Id = record.p2CharacterId ? ` (${record.p2CharacterId})` : '';
      characters.textContent = `P1 ${p1Name}${p1Id} · ${number(record.p1FinalStep)}阶 / P2 ${p2Name}${p2Id} · ${number(record.p2FinalStep)}阶`;
      const details = document.createElement('p');
      details.className = 'history-record-details';
      const reason = document.createElement('span');
      const reasons = { summit: '登顶', exhausted: '资源耗尽', 'cards-exhausted': '手牌耗尽', disconnect: '离线结束', opponent_left: '对手离开', normal: '正常结束' };
      reason.textContent = `结束原因：${reasons[record.endReason] || record.endReason || '未注明'}`;
      details.append(reason, date);
      item.append(heading, characters, details);
      list.append(item);
    }
    content.append(list);
  }

  renderPlaceholder(page) {
    const route = ROUTES[page];
    this.main.className = 'main-content placeholder-main';
    this.main.innerHTML = `<div class="placeholder-art">${SKY_ART}</div><div class="page-breadcrumb"><span>首页</span>${icon('arrow')}<span></span></div><section class="placeholder-panel"><div class="placeholder-symbol">${icon('star')}</div><span class="section-eyebrow"></span><h1 tabindex="-1"></h1><span class="placeholder-divider" aria-hidden="true"><i></i>✦<i></i></span><p class="placeholder-label">此页面尚未开放</p><p class="placeholder-description"></p><button type="button" class="primary-button return-home" data-action="home">${icon('back')}返回首页</button></section>`;
    this.main.querySelector('.page-breadcrumb span:last-child').textContent = route.title;
    this.main.querySelector('.section-eyebrow').textContent = route.eyebrow;
    this.main.querySelector('h1').textContent = route.title;
    this.main.querySelector('.placeholder-description').textContent = route.description;
  }

  updateAuth(snapshot) {
    const auth = snapshot.auth || {};
    const open = auth.open === true || snapshot.phase === 'AUTH';
    const registering = auth.mode === 'register';
    const switching = auth.mode === 'switch' || Boolean(snapshot.profile);
    const busy = auth.busy === true;
    this.dialog.querySelector('#auth-title').textContent = registering ? '创建旅人档案' : switching ? '切换旅人档案' : '欢迎归来';
    this.dialog.querySelector('#auth-description').textContent = registering ? '为新的旅程，留下你的名字。' : switching ? '登录另一个本地账号，继续它的旅程。' : '登录你的本地账号，开启云上旅程。';
    for (const button of this.dialog.querySelectorAll('[data-auth-mode]')) {
      button.setAttribute('aria-pressed', String((button.dataset.authMode === 'register') === registering));
      button.disabled = busy;
    }
    this.dialog.querySelector('[data-action="close-auth"]').hidden = !snapshot.profile;
    this.dialog.querySelector('[data-action="close-auth"]').disabled = busy;
    this.submit.disabled = busy;
    this.submit.querySelector('.submit-text').textContent = busy ? '处理中…' : registering ? '创建账号' : switching ? '登录并切换' : '登录';
    this.submit.classList.toggle('is-busy', busy);
    this.form.setAttribute('aria-busy', String(busy));
    this.username.readOnly = busy;
    this.password.readOnly = busy;
    this.password.autocomplete = registering ? 'new-password' : 'current-password';
    this.dialog.querySelector('.password-toggle').disabled = busy;
    if (this.authError.textContent !== (auth.error || '')) this.authError.textContent = auth.error || '';
    if (this.authNotice.textContent !== (auth.notice || '')) this.authNotice.textContent = auth.notice || '';
    this.username.setAttribute('aria-invalid', String(Boolean(auth.error)));
    this.password.setAttribute('aria-invalid', String(Boolean(auth.error)));
    this.username.setAttribute('aria-describedby', auth.error ? 'username-hint auth-error' : 'username-hint');
    this.password.setAttribute('aria-describedby', auth.error ? 'password-hint auth-error' : 'password-hint');
    this.authError.id = 'auth-error';

    if (open && !this.modalOpen) {
      this.lastFocus = document.activeElement;
      this.modalOpen = true;
      this.surface.inert = true;
      if (snapshot.profile) {
        this.username.value = '';
        this.password.value = '';
      }
      if (!this.dialog.open) this.dialog.showModal();
      this.username.focus({ preventScroll: true });
    } else if (!open && this.modalOpen) {
      this.modalOpen = false;
      this.surface.inert = false;
      this.dialog.close();
      this.password.value = '';
      this.passwordVisible = false;
      this.password.type = 'password';
      const toggle = this.dialog.querySelector('.password-toggle');
      toggle.setAttribute('aria-label', '显示密码');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.innerHTML = icon('eye');
      if (this.lastFocus?.isConnected && this.surface.contains(this.lastFocus) && !this.lastFocus.disabled) {
        this.lastFocus.focus({ preventScroll: true });
      } else this.main.querySelector('h1')?.focus({ preventScroll: true });
    }
  }

  dispose() {
    this.opening?.dispose();
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe?.();
    this.guide?.dispose();
      this.guide = null;
      this.mapPanel?.dispose();
    this.musicPlayer?.dispose();
    this.audio?.dispose();
    this.events.abort();
    this.surface.inert = false;
    if (this.dialog.open) this.dialog.close();
  }
}
