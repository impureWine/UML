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
tools.style.cssText = 'position:fixed;bottom:2px;left:8px;z-index:15;background:#fff9ea;padding:6px;font:11px sans-serif';
tools.innerHTML = '<button data-sample="same">同阶20</button> <button data-sample="split">分阶12/28</button> <button data-sample="base">复位</button> <button data-check>检查Canvas与镜头</button> <output>待检查</output>';
const backgroundControls = document.createElement('span');
backgroundControls.innerHTML = ' 背景预览(P1)：' + [0,15,16,30,31,39,40].map(step => `<button data-player-step="${step}">${step}阶</button>`).join(' ');
tools.append(backgroundControls);
document.body.append(tools);
tools.addEventListener('click', async e => {
 const playerStep = e.target.dataset.playerStep;
 if (playerStep !== undefined) {
   view.mapPanel.applyAuthorizedView(InformationProjector.mapPreview({ p1Step: Number(playerStep) }));
   tools.querySelector('output').textContent = `P1当前第${playerStep}阶`;
 }
 const sample = e.target.dataset.sample;
 if (sample) { view.mapPanel.applyAuthorizedView(InformationProjector.mapPreview(sample === 'same' ? {p1Step:20,p2Step:20} : sample === 'split' ? {p1Step:12,p2Step:28} : {})); view.mapPanel.renderer.focusTarget('overview'); }
 if (!e.target.hasAttribute('data-check')) return;
 const output = tools.querySelector('output');
 try {
  await view.mapPanel.ready;
  const r = view.mapPanel.renderer, checks = [];
  const check = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  check(r.canvas.getContext('2d') && r.labels.length === 41, 'Canvas2D和41编号');
  check(Array.from({length:41}, (_,i)=>r.project(0,i).x).every(x=>x===r.width/2), '笔直中心轴');
  for (const mode of ['base','summit','P1','P2','overview']) { r.focusTarget(mode); check(r.focusMode===mode, mode); }
  r.zoomBy(1e8); check(r.desiredZoom===5, '最大缩放'); r.zoomBy(1e-12); check(r.desiredZoom===.75, '最小缩放');
  r.selectStep(30); check(view.mapPanel.selected===30 && r.labels[30].getAttribute('aria-pressed')==='true','选阶同步');
  r.setAutoFollow(false); r.focusTarget('summit'); view.mapPanel.applyAuthorizedView(InformationProjector.mapPreview({p1Step:12,p2Step:28})); check(r.focusMode==='summit','手动焦点保留');
  r.setAutoFollow(true); view.mapPanel.applyAuthorizedView(InformationProjector.mapPreview({p1Step:13,p2Step:28})); check(r.focusMode==='P1','跟随公开位置');
  game.returnHome(); check(r.disposed && !r.canvas.isConnected,'释放场景'); game.navigate('local'); await view.mapPanel.ready;
  output.textContent = `${checks.length}项通过`;
 } catch(error) { output.textContent = `失败：${error.message}`; }
});


