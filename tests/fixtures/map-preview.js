import '../../src/styles/theme.css';
import '../../src/styles/layout.css';
import '../../src/styles/mountain.css';
import { Game } from '../../src/controller/Game.js';
import { GameView } from '../../src/view/GameView.js';
import { Settings } from '../../src/model/Settings.js';
import { InformationProjector } from '../../src/utils/InformationProjector.js';

// In-memory test identities only. This fixture never reads/writes browser account data.
const profiles = new Map(['地图验收A', '地图验收B'].map((username) => [username, {
  accountId: username, username, stats: { total: 0, wins: 0, losses: 0, draws: 0 },
  unlockedCharacterIds: Array.from({ length: 12 }, (_, i) => `CH-${String(i + 1).padStart(2, '0')}`),
  matchHistory: [], settings: Settings.defaults(),
}]));
const manager = {
  current: null,
  observeChanges() { return () => {}; },
  async login(name) { this.current = profiles.get(name); if (!this.current) throw new Error('仅支持地图验收A/B'); return structuredClone(this.current); },
  async switchAccount(name) { return this.login(name); },
  async saveSettings(patch) { this.current.settings = Settings.applyPatch(this.current.settings, patch); return structuredClone(this.current); },
  logout() { this.current = null; },
};
const game = new Game(manager);
const view = new GameView(document.querySelector('#app'), game);
await game.submitAuth({ username: '地图验收A', password: 'fixture' });
game.navigate('local');
const tools = document.createElement('div');
tools.style.cssText = 'position:fixed;bottom:2px;left:8px;z-index:15;display:flex;gap:8px;align-items:center;font:9px Microsoft YaHei;color:#45665e;background:#fff9eae8;padding:5px;border:1px solid #b6c1a5;max-width:98vw;flex-wrap:wrap';
tools.innerHTML = '<span>只读夹具 · 内存账号</span><button data-sample="same">同阶20</button><button data-sample="split">分阶12/28</button><button data-sample="base">复位</button><button data-camera-test>运行相机/生命周期检查</button><button data-performance>测量120帧</button><button data-context-loss>模拟绘图中断</button><output data-fixture-result>待检查</output>';
document.body.append(tools);
const output = tools.querySelector('output');
const pauseFrame = () => new Promise(requestAnimationFrame);
const untilSettled = async () => { const end = performance.now() + 900; while (performance.now() < end) await pauseFrame(); };
const labelsDoNotOverlap = (renderer) => {
  const boxes = renderer.labels.map((label) => label.getBoundingClientRect());
  return boxes.every((box, i) => boxes.slice(i + 1).every((other) => box.right <= other.left || box.left >= other.right || box.bottom <= other.top || box.top >= other.bottom));
};
const results = [];
const check = (condition, description) => { if (!condition) throw new Error(description); results.push(description); };
document.addEventListener('click', async (event) => {
  const sample = event.target.dataset.sample;
  if (sample) {
    view.mapPanel.applyAuthorizedView(InformationProjector.mapPreview(sample === 'same' ? { p1Step: 20, p2Step: 20 } : sample === 'split' ? { p1Step: 12, p2Step: 28 } : {}));
    view.mapPanel.renderer.focusTarget('overview');
  }
  if (event.target.hasAttribute('data-camera-test')) {
    event.target.disabled = true;
    results.length = 0;
    try {
      let renderer = view.mapPanel.renderer;
      check(renderer.steps.length === 41 && renderer.labels.length === 41, '41阶几何与编号');
      check(renderer.steps.every((mesh, i) => mesh.position.x === 0 && Math.abs(mesh.position.y - i * 1.15) < 1e-6 && Math.abs(mesh.position.z + i * 1.8) < 1e-6), '笔直有序三维锚点');
      view.mapPanel.applyAuthorizedView(InformationProjector.mapPreview({ p1Step: 20, p2Step: 20 }));
      check(renderer.seats.P1.group.position.x < 0 && renderer.seats.P2.group.position.x > 0, '同阶左右席位分立');
      renderer.focusTarget('overview'); await untilSettled();
      const seatA = renderer.seats.P1.label.getBoundingClientRect();
      const seatB = renderer.seats.P2.label.getBoundingClientRect();
      check(seatA.right < seatB.left && !renderer.seats.P1.label.hidden && !renderer.seats.P2.label.hidden, '同阶远景席位标签不重叠');
      for (const mode of ['base', 'summit', 'P1', 'P2', 'overview']) {
        const before = JSON.stringify(renderer.publicView.positions);
        renderer.focusTarget(mode);
        check(renderer.focusMode === mode && JSON.stringify(renderer.publicView.positions) === before, `聚焦${mode}不改位置`);
      }
      renderer.zoomBy(1e8); check(renderer.desiredZoom === 5, '最大缩放边界');
      renderer.zoomBy(1e-12); check(renderer.desiredZoom === 0.75, '最小缩放边界');
      renderer.selectStep(30); check(view.mapPanel.selected === 30 && renderer.labels[30].getAttribute('aria-pressed') === 'true', '选阶同步详情及高亮');
      renderer.setAutoFollow(false);
      renderer.focusTarget('summit');
      view.mapPanel.applyAuthorizedView(InformationProjector.mapPreview({ p1Step: 12, p2Step: 28 }));
      check(renderer.focusMode === 'summit', '关闭跟随保持手动视角');
      renderer.setAutoFollow(true);
      view.mapPanel.applyAuthorizedView(InformationProjector.mapPreview({ p1Step: 13, p2Step: 28 }));
      check(renderer.focusMode === 'P1', '公开位置更新触发跟随');
      await game.setCameraAutoFollow(false);
      game.openSwitchAccount(); await game.submitAuth({ username: '地图验收B' }); game.navigate('local'); await view.mapPanel.ready;
      check(view.mapPanel.followInput.checked === true, 'B账号独立跟随');
      game.openSwitchAccount(); await game.submitAuth({ username: '地图验收A' }); game.navigate('local'); await view.mapPanel.ready;
      check(view.mapPanel.followInput.checked === false, 'A账号跟随恢复');
      const oldRenderer = view.mapPanel.renderer;
      game.returnHome(); check(oldRenderer.disposed && !oldRenderer.renderer.domElement.isConnected, '返回首页释放旧场景');
      game.navigate('local'); await view.mapPanel.ready;
      check(document.querySelectorAll('.mountain-canvas').length === 1, '重进只有一个画布');
      view.mapPanel.renderer.focusTarget('overview');
      await untilSettled();
      check([...view.mapPanel.renderer.labels].every((label) => !label.hidden), '全局可见41阶编号');
      check(labelsDoNotOverlap(view.mapPanel.renderer), '全局41阶编号互不遮叠');
      view.mapPanel.renderer.zoomBy(0.75); await untilSettled();
      check(labelsDoNotOverlap(view.mapPanel.renderer), '最小75%缩放编号互不遮叠');
      view.mapPanel.renderer.focusTarget('overview');
      output.textContent = `PASS · ${results.length}项 · ${results.join(' / ')}`;
    } catch (error) { output.textContent = `FAIL · ${error.message}`; console.error(error); }
    finally { event.target.disabled = false; }
  }
  if (event.target.hasAttribute('data-context-loss')) {
    const extension = view.mapPanel.renderer?.renderer.getContext().getExtension('WEBGL_lose_context');
    if (extension) { extension.loseContext(); output.textContent = '已模拟绘图中断，请使用地图恢复按钮'; }
    else output.textContent = '当前浏览器未提供中断模拟扩展';
  }
  if (event.target.hasAttribute('data-performance')) {
    event.target.disabled = true;
    output.textContent = '测量中…';
    const frames = [];
    let previous = await pauseFrame();
    for (let i = 0; i < 120; i++) {
      const now = await pauseFrame(); frames.push(now - previous); previous = now;
    }
    const avg = frames.reduce((sum, n) => sum + n, 0) / frames.length;
    const sorted = [...frames].sort((a, b) => a - b);
    const renderer = view.mapPanel.renderer;
    const start = performance.now(); renderer.selectStep(20); const selectionMs = performance.now() - start;
    output.textContent = `FPS ${(1000 / avg).toFixed(1)} · 帧p95 ${sorted[114].toFixed(1)}ms · 选阶同步 ${selectionMs.toFixed(2)}ms · draws ${renderer.renderer.info.render.calls} · ${innerWidth}×${innerHeight} · ${navigator.userAgent}`;
    event.target.disabled = false;
  }
});
