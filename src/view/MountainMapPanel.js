import { CHARACTERS } from '../resources/characters.js';
import { InformationProjector } from '../utils/InformationProjector.js';

const ZONES = {
  forest: { title: '蒙德 · 苍翠山林', caption: '风穿过林梢，石阶向云端延伸。', material: '苔石 · 草木 · 山风', symbol: '❧' },
  snow: { title: '龙脊 · 雪山云海', caption: '越过覆雪的山脊，听见云海的回声。', material: '覆雪石阶 · 冰晶 · 薄雾', symbol: '❄' },
  sky: { title: '天空岛 · 星穹天梯', caption: '踏上浮空玉阶，群星指引最后的登临。', material: '白玉 · 星辉 · 浮空遗迹', symbol: '✧' },
};

export class MountainMapPanel {
  constructor(root, { title, autoFollow = true, onAutoFollow = async () => {}, view = InformationProjector.mapPreview() }) {
    this.root = root;
    this.view = view;
    this.autoFollow = autoFollow;
    this.onAutoFollow = onAutoFollow;
    this.selected = 0;
    this.events = new AbortController();
    root.className = 'main-content mountain-main';
    root.innerHTML = `
      <header class="mountain-heading"><div><span class="section-eyebrow">✦ JOURNEY TO CELESTIA</span><h1 tabindex="-1"><span data-map-title></span><i> / </i>云上登临</h1></div><div class="mountain-heading-actions"><span class="map-preview-badge">地图预览 · 对局尚未开始</span><button type="button" class="text-button" data-action="home">← 返回首页</button></div></header>
      <div class="mountain-layout">
        <aside class="mountain-itinerary" aria-label="登山路线"><span class="map-section-label">THE ASCENT / 登临之路</span><div class="itinerary-intro"><strong>四十阶，<br>直到群星之间。</strong><p>从风起之地，至天空之座。</p></div>
          <nav class="region-navigation" aria-label="地貌分区">
            <button type="button" data-region-step="40"><span class="region-symbol">♜</span><span><small>SUMMIT · 40</small><strong>天空岛神座</strong><em>终点 · 云上之冠</em></span></button>
            <button type="button" data-region-step="35"><span class="region-symbol">✧</span><span><small>ACT III · 31—39</small><strong>星穹天梯</strong><em>浮空玉阶与古老遗迹</em></span></button>
            <button type="button" data-region-step="23"><span class="region-symbol">❄</span><span><small>ACT II · 16—30</small><strong>龙脊雪山</strong><em>冰晶、雪峰与流动云海</em></span></button>
            <button type="button" data-region-step="8"><span class="region-symbol">❧</span><span><small>ACT I · 01—15</small><strong>蒙德山林</strong><em>苍翠林间的风之石阶</em></span></button>
            <button type="button" data-region-step="0"><span class="region-symbol">⌂</span><span><small>DEPARTURE · 00</small><strong>山脚营地</strong><em>旅程，自此启程</em></span></button>
          </nav><p class="itinerary-footnote">沿同一条天梯向上<br>穿越山林、雪境与星穹</p>
        </aside>
        <section class="mountain-stage" aria-label="0至40阶立体登山地图">
          <div class="mountain-viewport" aria-label="可拖拽及滚轮缩放的地图画布">
            <div class="map-scene-title" data-map-overlay><span>✦</span><div><strong>通往天空的阶梯</strong><small>MONDSTADT → DRAGONSPINE → CELESTIA</small></div></div>
            <span class="map-compass" aria-hidden="true">N<i>✥</i></span>
            <div class="map-loading" role="status">正在唤醒云端之境…</div>
            <div class="map-error" hidden data-map-overlay role="alert"><strong>地图暂时无法显示</strong><p></p><button type="button" data-reload-map>重新载入地图</button></div>
            <div class="map-zoom-controls" data-map-overlay aria-label="缩放地图"><button type="button" data-zoom="1.25" aria-label="放大地图">＋</button><output data-zoom-value>100%</output><button type="button" data-zoom="0.8" aria-label="缩小地图">−</button></div>
            <div class="map-focus-controls" data-map-overlay role="group" aria-label="地图视角"><button type="button" data-focus="base" aria-pressed="false">⌂ <span>山脚</span></button><button type="button" data-focus="summit" aria-pressed="false">♜ <span>山顶</span></button><button type="button" data-focus="P1" aria-pressed="false"><b class="p1-dot"></b>P1</button><button type="button" data-focus="P2" aria-pressed="false"><b class="p2-dot"></b>P2</button><button type="button" data-focus="overview" aria-pressed="true">⛶ <span>全局</span></button></div>
          </div>
          <div class="map-statusbar"><span><i></i><span data-view-status>全局视角</span></span><span>拖拽平移 <b>·</b> 滚轮缩放 <b>·</b> 点击选阶</span><span>00 — 40</span></div>
        </section>
        <aside class="mountain-inspector" aria-label="台阶详情">
          <section class="step-detail" aria-live="polite" aria-atomic="true"><div class="detail-heading"><span class="map-section-label">WAYPOINT / 阶位档案</span><span data-zone-symbol>❧</span></div><div class="detail-number"><strong data-step-number>00</strong><span>阶<small>OF 40</small></span></div><span class="step-kind" data-step-kind>起点</span><h2 data-step-name>山脚营地</h2><p data-step-caption></p><div class="detail-rule">✦</div><dl><div><dt>所在区域</dt><dd data-step-zone></dd></div><div><dt>地貌材质</dt><dd data-step-material></dd></div><div><dt>席位标识</dt><dd data-step-occupants></dd></div></dl><div class="slot-description"><span data-slot-icon>⊘</span><div><strong data-slot-title></strong><p data-slot-description></p></div></div></section>
          <div class="step-browse"><button type="button" data-step-delta="-1" aria-label="查看上一阶">←</button><label>前往 <input type="number" min="0" max="40" step="1" value="0" aria-label="选择阶号"> 阶</label><button type="button" data-step-delta="1" aria-label="查看下一阶">→</button></div><button type="button" class="map-locate-step" data-locate-step>定位所选台阶 <span>↗</span></button>
          <div class="map-legend"><span><i class="legend-milestone"></i>起点 / 里程碑 / 终点</span><span><i class="legend-slot"></i>布雷槽位 · 不表示雷状态</span><span><b class="p1-dot"></b><b class="p2-dot"></b>P1 / P2 席位位置标识</span></div>
        </aside>
      </div>
      <div class="mountain-bottom"><label class="map-follow-toggle"><input type="checkbox" data-auto-follow><span></span>镜头自动跟随</label><p data-follow-status role="status">跟随偏好保存在当前账号；手动查看不改变席位位置。</p><span class="map-keyboard-hint">选阶键盘：方向键 · Home / End</span></div>`;
    root.querySelector('[data-map-title]').textContent = title;
    this.viewport = root.querySelector('.mountain-viewport');
    this.followInput = root.querySelector('[data-auto-follow]');
    this.followInput.checked = autoFollow;
    const test = document.createElement('section'); test.className='token-mount-test';
    test.innerHTML=`<h2>角色信标挂载测试</h2><p>纯视觉预览 · 不选角、不出牌、不记战绩</p>${['P1','P2'].map((seat,i)=>`<fieldset><legend>${seat}</legend><label>角色 <select data-token-character="${seat}">${CHARACTERS.map((c,n)=>`<option value="${c.id}" ${n===i?'selected':''}>${c.name}</option>`).join('')}</select></label><label>阶位 <input data-token-step="${seat}" type="number" min="0" max="40" step="1" value="${this.view.positions[seat]}"></label></fieldset>`).join('')}<button type="button" data-mount-tokens>应用预览站位</button><div> P1 动画演示 <button type="button" data-map-motion="Climb">攀爬1阶</button><button type="button" data-map-motion="Hit">受击退10阶</button><button type="button" data-map-motion="Skill">元素光效</button></div><output data-mount-status role="status"></output>`;
    root.querySelector('.mountain-inspector').append(test);
    this.bindEvents();
    this.selectStep(0);
    this.ready = this.loadRenderer();
  }

  async loadRenderer() {
    this.renderer?.dispose();
    this.renderer = null;
    const generation = this.generation = (this.generation || 0) + 1;
    this.root.querySelector('.map-error').hidden = true;
    this.root.querySelector('.map-loading').hidden = false;
    this.setControlsDisabled(true);
    try {
      const { MountainMapRenderer } = await import('./MountainMapRenderer.js');
      if (this.disposed || this.generation !== generation) return;
      this.renderer = new MountainMapRenderer(this.viewport, {
        onSelect: (index) => this.selectStep(index),
        onViewChange: (view) => this.updateViewStatus(view),
        onError: (message) => this.showError(message),
      });
      this.renderer.applyAuthorizedView(this.view);
      this.renderer.setAutoFollow(this.autoFollow);
      this.renderer.selectStep(this.selected, false);
      this.updateViewStatus({ mode: 'overview', zoom: 1 });
      this.setControlsDisabled(false);
    } catch (error) {
      if (!this.disposed && this.generation === generation) this.showError(`需要支持 HTML5 Canvas 2D 的浏览器。${error.message || '场景载入失败。'}`);
    } finally {
      if (!this.disposed && this.generation === generation) this.root.querySelector('.map-loading').hidden = true;
    }
  }

  setControlsDisabled(disabled) {
    for (const control of this.root.querySelectorAll('[data-focus], [data-zoom], [data-locate-step]')) control.disabled = disabled;
  }

  showError(message) {
    this.root.querySelector('.map-error p').textContent = message;
    this.root.querySelector('.map-error').hidden = false;
    this.setControlsDisabled(true);
  }

  bindEvents() {
    const options = { signal: this.events.signal };
    this.root.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.mapMotion && this.renderer) {
        const state=button.dataset.mapMotion;
        const target=Math.max(0,Math.min(40,this.view.positions.P1+(state==='Climb'?1:state==='Hit'?-10:0)));
        this.renderer.previewMotion('P1',state,target);
        this.view=this.renderer.publicView;this.selectStep(target);
        this.root.querySelector('[data-token-step="P1"]').value=target;
      }
      if (button.hasAttribute('data-mount-tokens') && this.renderer) {
        const get=seat=>this.root.querySelector(`[data-token-step="${seat}"]`).valueAsNumber;
        const p1Step=get('P1'),p2Step=get('P2');
        if (![p1Step,p2Step].every(n=>Number.isInteger(n)&&n>=0&&n<=40)) {this.root.querySelector('[data-mount-status]').textContent='请输入0～40的整数阶位。'; return;}
        for (const seat of ['P1','P2']) this.renderer.tokens[seat].setCharacter(this.root.querySelector(`[data-token-character="${seat}"]`).value,seat);
        this.applyAuthorizedView(InformationProjector.mapPreview({p1Step,p2Step}));
        this.renderer.focusTarget('P1');
        this.root.querySelector('[data-mount-status]').textContent=`预览已更新：P1 ${p1Step}阶 / P2 ${p2Step}阶`;
      }
      if (button.dataset.focus) this.renderer?.focusTarget(button.dataset.focus);
      if (button.dataset.zoom) this.renderer?.zoomBy(Number(button.dataset.zoom));
      if (button.hasAttribute('data-step-delta')) this.selectStep(Math.max(0, Math.min(40, this.selected + Number(button.dataset.stepDelta))));
      if (button.hasAttribute('data-region-step')) {
        this.selectStep(Number(button.dataset.regionStep));
        this.renderer?.focusStep(this.selected);
      }
      if (button.hasAttribute('data-locate-step')) this.renderer?.focusStep(this.selected);
      if (button.hasAttribute('data-reload-map')) this.ready = this.loadRenderer();
    }, options);
    this.root.querySelector('.step-browse input').addEventListener('change', (event) => {
      const index = event.target.valueAsNumber;
      if (Number.isInteger(index) && index >= 0 && index <= 40) {
        this.selectStep(index);
        this.renderer?.focusStep(index);
      } else event.target.value = String(this.selected);
    }, options);
    this.followInput.addEventListener('change', async () => {
      const next = this.followInput.checked;
      this.followInput.disabled = true;
      const status = this.root.querySelector('[data-follow-status]');
      status.textContent = '正在保存镜头偏好…';
      try {
        await this.onAutoFollow(next);
        if (this.disposed) return;
        this.autoFollow = next;
        this.renderer?.setAutoFollow(next);
        if (next) this.renderer?.focusTarget(this.view.activeSeat);
        status.textContent = `已保存：镜头自动跟随${next ? '开启' : '关闭'}。`;
      } catch (error) {
        if (this.disposed) return;
        this.followInput.checked = this.autoFollow;
        status.textContent = `未能保存：${error.message}`;
      } finally {
        if (!this.disposed) this.followInput.disabled = false;
      }
    }, options);
  }

  setAutoFollow(value) {
    this.autoFollow = value;
    this.followInput.checked = value;
    this.renderer?.setAutoFollow(value);
  }

  applyAuthorizedView(view) {
    this.renderer?.applyAuthorizedView(view);
    this.view = view;
    this.selectStep(this.selected);
  }

  selectStep(index) {
    const step = this.view.steps[index];
    if (!step) return;
    this.selected = index;
    const zone = ZONES[step.zone];
    const text = (selector, value) => { this.root.querySelector(selector).textContent = value; };
    text('[data-step-number]', String(index).padStart(2, '0'));
    text('[data-zone-symbol]', index === 40 ? '♜' : zone.symbol);
    text('[data-step-kind]', index === 0 ? '旅程起点' : index === 40 ? '最终神座' : step.milestone ? '十阶里程碑' : '沿途阶位');
    text('[data-step-name]', index === 0 || index === 40 ? step.name : step.zone === 'forest' ? '苍翠山林石阶' : step.zone === 'snow' ? '云海覆雪石阶' : '星穹浮空玉阶');
    text('[data-step-caption]', index === 0 ? '风已启程，两位旅人在此相逢。' : index === 40 ? '穿过终点之门，抵达云海之上的神座。' : zone.caption);
    text('[data-step-zone]', zone.title);
    text('[data-step-material]', zone.material);
    const seats = ['P1', 'P2'].filter((seat) => this.view.positions[seat] === index);
    text('[data-step-occupants]', seats.length ? `${seats.join(' / ')} · 位置预览` : '暂无席位标识');
    text('[data-slot-icon]', step.canPlaceBomb ? '◇' : '⊘');
    text('[data-slot-title]', step.canPlaceBomb ? '可布雷阶位' : '不可布雷');
    text('[data-slot-description]', step.canPlaceBomb ? '槽位仅标示可布置位置，未显示炸弹状态。' : index === 0 ? '山脚营地为起点保留区。' : '天空岛神座为终点保留区。');
    this.root.querySelector('.step-browse input').value = String(index);
    this.root.querySelector('[data-step-delta="-1"]').disabled = index === 0;
    this.root.querySelector('[data-step-delta="1"]').disabled = index === 40;
    for (const button of this.root.querySelectorAll('[data-region-step]')) {
      const target = Number(button.dataset.regionStep);
      const active = index === 0 ? target === 0 : index === 40 ? target === 40 : index < 16 ? target === 8 : index < 31 ? target === 23 : target === 35;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'step' : 'false');
    }
    this.renderer?.selectStep(index, false);
  }

  updateViewStatus({ mode, zoom }) {
    const names = { overview: '全局视角', base: '山脚营地', summit: '天空岛神座', P1: '聚焦 P1', P2: '聚焦 P2', manual: '自由视角' };
    this.root.querySelector('[data-view-status]').textContent = names[mode];
    this.root.querySelector('[data-zoom-value]').textContent = `${Math.round(zoom * 100)}%`;
    for (const button of this.root.querySelectorAll('[data-focus]')) button.setAttribute('aria-pressed', String(button.dataset.focus === mode));
  }

  dispose() {
    this.disposed = true;
    this.events.abort();
    this.renderer?.dispose();
    this.renderer = null;
  }
}

