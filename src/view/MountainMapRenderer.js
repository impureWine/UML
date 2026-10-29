import { CharacterTokenRenderer } from './CharacterTokenRenderer.js';
import { BackgroundTransition } from './BackgroundTransition.js';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Canvas-only perspective scene. Coordinates and anchors are presentation data. */
export class MountainMapRenderer {
  constructor(container, { onSelect = () => {}, onViewChange = () => {}, onError = () => {} } = {}) {
    Object.assign(this, { container, onSelect, onViewChange, onError, focusMode: 'overview', selected: 0, zoom: 1, desiredZoom: 1, center: 20, desiredCenter: 20, autoFollow: true });
    this.background = new BackgroundTransition();
    this.backgroundImages = [];
    // Preload all regions so crossing a boundary never waits for a new download.
    this.backgroundReady = Promise.all(['base.png', 'dragonspine.jpg', 'sky.png'].map(name => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = `${import.meta.env.BASE_URL}images/mountain/${name}`;
    }))).then(images => { if (!this.disposed) this.backgroundImages = images; });
    this.events = new AbortController();
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'mountain-canvas';
    this.canvas.setAttribute('aria-label', '笔直向上的四十阶天空天梯；可使用阶号按钮或方向键浏览');
    this.canvas.tabIndex = 0;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('浏览器无法创建 Canvas 2D 画布');
    this.atmosphere = document.createElement('div');
    this.atmosphere.className = 'map-atmosphere';
    this.atmosphere.setAttribute('aria-hidden', 'true');
    this.atmosphere.innerHTML = '<div class="parallax-cloud cloud-far"></div><div class="parallax-rays"></div><div class="parallax-cloud cloud-near"></div>';
    container.prepend(this.atmosphere, this.canvas);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'canvas-step-labels';
    this.labels = Array.from({ length: 41 }, (_, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = String(i).padStart(2, '0');
      b.setAttribute('aria-label', `第${i}阶`); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => this.selectStep(i), { signal: this.events.signal });
      this.labelLayer.append(b); return b;
    });
    container.append(this.labelLayer);
    this.tokenLayer = document.createElement('div'); this.tokenLayer.className='map-token-layer'; container.append(this.tokenLayer);
    this.tokens = Object.fromEntries(['P1','P2'].map((seat,i)=>{const el=document.createElement('div'); el.className='map-character-anchor'; this.tokenLayer.append(el);return [seat,new CharacterTokenRenderer(el,{seat,characterId:i?'CH-02':'CH-01'})];}));
    this.bind();
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(container); this.resize();
    this.frame = requestAnimationFrame(t => this.draw(t));
  }
  resize() {
    this.width = this.container.clientWidth; this.height = this.container.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = this.width * dpr; this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  bind() {
    const opts = { signal: this.events.signal };
    this.canvas.addEventListener('pointerdown', e => { this.drag = { y: e.clientY, start: e.clientY, center: this.desiredCenter }; this.canvas.setPointerCapture(e.pointerId); }, opts);
    this.canvas.addEventListener('pointermove', e => {
      if (!this.drag) return;
      this.desiredCenter = clamp(this.drag.center + (e.clientY - this.drag.y) / (this.height * .017 * this.zoom), 0, 40);
      if (Math.abs(e.clientY - this.drag.start) > 5) { this.focusMode = 'manual'; this.report(); }
    }, opts);
    this.canvas.addEventListener('pointerup', e => {
      if (this.drag && Math.abs(e.clientY - this.drag.start) <= 5) {
        const r = this.canvas.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const hit = this.hitAreas?.slice().reverse().find(a => x >= a.left && x <= a.right && y >= a.top && y <= a.bottom);
        if (hit) this.selectStep(hit.index);
      }
      this.drag = null;
    }, opts);
    this.canvas.addEventListener('pointercancel', () => { this.drag = null; }, opts);
    this.canvas.addEventListener('wheel', e => { e.preventDefault(); this.zoomBy(Math.exp(-e.deltaY * .001)); }, { ...opts, passive: false });
    this.canvas.addEventListener('keydown', e => {
      const next = { ArrowUp: this.selected + 1, ArrowDown: this.selected - 1, Home: 0, End: 40 }[e.key];
      if (next == null) return; e.preventDefault(); this.selectStep(clamp(next, 0, 40)); this.focusStep(this.selected);
    }, opts);
  }
  report() { this.onViewChange({ mode: this.focusMode, zoom: this.desiredZoom }); }
  focusTarget(mode) {
    if (!['base', 'summit', 'P1', 'P2', 'overview'].includes(mode)) return;
    this.focusMode = mode;
    this.desiredCenter = mode === 'overview' ? 20 : mode === 'base' ? 0 : mode === 'summit' ? 40 : (this.publicView?.positions[mode] ?? 0);
    this.desiredZoom = mode === 'overview' ? 1 : 2.8; this.report();
  }
  focusStep(i) { this.desiredCenter = clamp(i, 0, 40); this.desiredZoom = 2.8; this.focusMode = 'manual'; this.report(); }
  zoomBy(factor) { if (!Number.isFinite(factor) || factor <= 0) return; this.desiredZoom = clamp(this.desiredZoom * factor, .75, 5); this.report(); }
  setAutoFollow(value) { this.autoFollow = Boolean(value); }
  applyAuthorizedView(view) {
    const changed = this.publicView && ['P1', 'P2'].some(s => view.positions[s] !== this.publicView.positions[s]);
    this.background.setStep(view.positions[view.activeSeat]);
    this.publicView = view; if (changed && this.autoFollow) this.focusTarget(view.activeSeat);
  }
  previewMotion(seat, state, target) {
    if (!this.tokens[seat] || !Number.isInteger(target) || target<0 || target>40) return;
    this.motion ??= {};
    this.motion[seat]={from:this.publicView.positions[seat],to:target,started:performance.now(),state};
    this.tokens[seat].play(state);
    this.applyAuthorizedView({...this.publicView,positions:{...this.publicView.positions,[seat]:target},activeSeat:seat});
    if (this.autoFollow && (state === 'Climb' || state === 'Hit')) {
      this.desiredZoom = 4.38;
      this.report();
    }
  }
  async playBombChain(events) {
    const generation=this.chainGeneration=(this.chainGeneration||0)+1;
    for(const event of events){
      if(this.disposed || generation!==this.chainGeneration)return;
      this.applyAuthorizedView({...this.publicView,positions:{...this.publicView.positions,[event.seat]:event.stepIndex}});
      this.blast={step:event.stepIndex,started:performance.now()};
      this.previewMotion(event.seat,'Hit',event.to);
      await new Promise(resolve=>setTimeout(resolve,720));
    }
  }
  visualStep(seat,time) {
    const m=this.motion?.[seat]; if(!m)return this.publicView?.positions[seat]??0;
    const duration=m.state==='Hit'?700:900; const p=this.reducedMotion?1:Math.min(1,(time-m.started)/duration);
    if(p>=1){delete this.motion[seat];return m.to;}
    return m.from+(m.to-m.from)*p;
  }
  selectStep(i, notify = true) {
    if (!Number.isInteger(i) || i < 0 || i > 40) return;
    this.selected = i; this.labels.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
    if (notify) this.onSelect(i);
  }
  // A single vanishing point and collinear world anchors keep the ascent straight.
  project(x, step, elevation = 0) {
    const perspective = 1 / (1 + step * .022);
    const unit = this.height * .0194 * this.zoom;
    return { x: this.width * .5 + x * this.width * .032 * perspective * this.zoom,
      y: this.height * .54 - (step - this.center) * unit * perspective - elevation * unit * .64,
      scale: perspective * this.zoom };
  }
  poly(points, fill, stroke = null, lineWidth = 1) {
    const c = this.ctx; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
  }
  line(a, b, color, width = 1) { const c = this.ctx; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
  column(x, step, height, depth) {
    const c = this.ctx, p = this.project(x, step), w = 10 * p.scale * depth, h = height * p.scale * depth;
    const g = c.createLinearGradient(p.x - w, 0, p.x + w, 0); g.addColorStop(0, '#8ba7ac'); g.addColorStop(.35, '#fffde9'); g.addColorStop(.65, '#eaf1e9'); g.addColorStop(1, '#839a9e');
    c.fillStyle = g; c.fillRect(p.x - w, p.y - h, w * 2, h);
    for (let i = -2; i <= 2; i++) this.line({ x: p.x + w * i / 3, y: p.y - h + 4 }, { x: p.x + w * i / 3, y: p.y - 3 }, '#7b969636');
    c.fillStyle = '#d0b77a'; c.fillRect(p.x - w * 1.1, p.y - h * .3, w * 2.2, 3 * p.scale);
    c.fillRect(p.x - w * 1.1, p.y - h * .86, w * 2.2, 2 * p.scale);
    c.fillStyle = '#e9eddd'; c.fillRect(p.x - w * 1.5, p.y - h, w * 3, 7 * p.scale); c.fillRect(p.x - w * 1.6, p.y - 4, w * 3.2, 7 * p.scale);
    return { x: p.x, y: p.y - h, w };
  }
  scenery(t) {
    const c = this.ctx, w = this.width, h = this.height;
    const available = this.backgroundImages.map((image, i) => image ? this.background.weights[i] : 0);
    const total = available.reduce((sum, weight) => sum + weight, 0);
    if (total > 0) {
      // Add premultiplied image colors onto black: weights sum to one, avoiding
      // the brightness dip caused by stacking two partly transparent DOM images.
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter';
      this.backgroundImages.forEach((image, i) => {
        if (!image || !available[i]) return;
        const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
        const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
        c.globalAlpha = available[i] / total;
        c.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih);
      });
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    } else {
      // Keep a usable scene while images load, or if a resource is unavailable.
      const fallback = this.backgroundImages.find(Boolean);
      if (fallback) {
        const scale = Math.max(w / fallback.naturalWidth, h / fallback.naturalHeight);
        c.drawImage(fallback, (w - fallback.naturalWidth * scale) / 2, (h - fallback.naturalHeight * scale) / 2, fallback.naturalWidth * scale, fallback.naturalHeight * scale);
      } else { c.fillStyle = '#9ec5d6'; c.fillRect(0, 0, w, h); }
    }
    // Keep the distant mountains, clouds and lighting; omit floating roadside props.
  }
  step(i, t) {
    const c = this.ctx, wide = i === 0 || i === 40 ? 6.6 : 5.2;
    const a = this.project(-wide, i + .72), b = this.project(wide, i + .72), d = this.project(-wide, i - .18), e = this.project(wide, i - .18);
    const thickness = Math.max(2, 7 * a.scale), down = p => ({ x: p.x + 3 * a.scale, y: p.y + thickness });
    const snow = i >= 16 && i <= 30, sky = i > 30, gold = i % 10 === 0;
    this.poly([d, e, down(e), down(d)], snow ? '#83aab866' : sky ? '#a3b9c066' : '#738e8066', '#c7b781');
    this.poly([b, e, down(e), down(b)], '#57798977', '#b6b79a');
    const g = c.createLinearGradient(a.x, a.y, e.x, e.y); g.addColorStop(0, snow ? '#f8ffff88' : sky ? '#fffdea88' : '#d4dec288'); g.addColorStop(1, snow ? '#c4e2e966' : sky ? '#dbe8e566' : '#a3b79f66');
    this.poly([a, b, e, d], g, this.selected === i ? '#fff5a1' : gold ? '#edce83' : '#c2b887', this.selected === i ? 2.5 : 1);
    for (let j = 1; j < 4; j++) {
      const x = -wide + j * wide / 2;
      this.line(this.project(x, i + .72), this.project(x + .15, i - .18), '#728e8c50', .7);
    }
    this.line(this.project(-wide, i + .22), this.project(wide, i + .22), '#f9fff399', .7);
    if (gold || this.selected === i) {
      c.save(); c.shadowColor = '#ffe4a1'; c.shadowBlur = 14; this.poly([a, b, e, d], this.selected === i ? '#fff3b52e' : null, '#f9df9f', 1.8); c.restore();
      const p = this.project(0, i + .2); c.fillStyle = '#a48a4f'; c.font = `${Math.max(10, 14 * a.scale)}px Georgia`; c.textAlign = 'center'; c.fillText(i === 0 ? '✧' : i === 40 ? '✦  CELESTIA  ✦' : '◇  ✦  ◇', p.x, p.y + 2);
    }
    const slot = this.project(2.9, i + .2); c.strokeStyle = '#6b929d99'; c.lineWidth = 1; c.beginPath(); c.ellipse(slot.x, slot.y, 4 * a.scale, 2 * a.scale, 0, 0, Math.PI * 2); c.stroke();
    const anchor = this.project(-2.9, i + .2); this.poly([{ x: anchor.x, y: anchor.y - 3 }, { x: anchor.x + 4, y: anchor.y }, { x: anchor.x, y: anchor.y + 3 }, { x: anchor.x - 4, y: anchor.y }], '#ffffff88');
    this.hitAreas.push({ index: i, left: a.x, right: b.x, top: a.y, bottom: e.y });
    const label = this.labels[i], lp = this.project(-wide * (i % 2 ? .38 : .72), i + .27);
    label.style.transform = `translate(${lp.x}px, ${lp.y}px)`;
    label.style.height = `${Math.max(2, Math.min(18, Math.abs(d.y-a.y)))}px`;
    label.style.fontSize = `${Math.max(8, Math.min(12, 9 * a.scale))}px`; label.hidden = lp.y < 0 || lp.y > this.height;
    if (snow && i % 3 === 0) { const p = this.project(wide, i); this.poly([{ x: p.x - 5, y: p.y }, { x: p.x, y: p.y - 15 * a.scale }, { x: p.x + 6, y: p.y }], '#d9ffffdd', '#efffff'); }
  }
  gate(t) {
    const c = this.ctx, p = this.project(0, 40), s = p.scale;
    const halo = c.createRadialGradient(p.x, p.y - 55 * s, 0, p.x, p.y - 55 * s, 100 * s); halo.addColorStop(0, '#fff9cbaa'); halo.addColorStop(1, '#fff8ca00'); c.fillStyle = halo; c.fillRect(p.x - 100 * s, p.y - 155 * s, 200 * s, 200 * s);
    this.column(-3.6, 40, 104, 1); this.column(3.6, 40, 104, 1);
    c.fillStyle = '#fff6d4'; c.shadowColor = '#fff4ac'; c.shadowBlur = 18; c.fillRect(p.x - 23 * s, p.y - 94 * s, 46 * s, 90 * s); c.shadowBlur = 0;
    // Pediment, lintel, and central throne.
    this.poly([{ x: p.x - 70 * s, y: p.y - 103 * s }, { x: p.x, y: p.y - 128 * s }, { x: p.x + 70 * s, y: p.y - 103 * s }], '#fbf5df', '#c1a264', 2);
    c.fillStyle = '#cdb57b'; c.fillRect(p.x - 65 * s, p.y - 104 * s, 130 * s, 6 * s);
    c.fillStyle = '#a58e59'; c.fillRect(p.x - 9 * s, p.y - 32 * s, 18 * s, 28 * s); c.fillStyle = '#fffbe5'; c.fillRect(p.x - 6 * s, p.y - 29 * s, 12 * s, 20 * s);
    c.fillStyle = '#fffbe8'; c.font = `${18 * s}px Georgia`; c.textAlign = 'center'; c.fillText('✦', p.x, p.y - 109 * s);
  }
  draw(time) {
    if (this.disposed) return;
    const dt = Math.min(64, this.lastTime ? time - this.lastTime : 16); this.lastTime = time;
    const blend = this.reducedMotion ? 1 : 1 - Math.exp(-dt / 120);
    this.center += (this.desiredCenter - this.center) * blend; this.zoom += (this.desiredZoom - this.zoom) * blend;
    const t = this.reducedMotion ? 0 : time / 1000;
    this.atmosphere.style.setProperty('--camera-offset', `${(this.center - 20) * 2}px`);
    this.background.advance(dt, this.reducedMotion); this.scenery(t); this.hitAreas = [];
    for (let i = 40; i >= 0; i--) this.step(i, t);
    this.gate(t);
    for(const bomb of this.ownBombMarkers || []) {
      const p=this.project(2.9,bomb.stepIndex+.2); const c=this.ctx;
      c.save();c.fillStyle='#ffda72';c.shadowColor='#ffb52e';c.shadowBlur=16;c.font='bold 18px sans-serif';c.textAlign='center';c.fillText('✹',p.x,p.y);c.shadowBlur=0;c.font='bold 13px sans-serif';c.textAlign='left';c.lineWidth=3;c.strokeStyle='#263c47';c.strokeText(`第${bomb.stepIndex}阶`,p.x+14,p.y);c.fillText(`第${bomb.stepIndex}阶`,p.x+14,p.y);c.restore();
    }
    if(this.blast && time-this.blast.started<700){
      const p=this.project(0,this.blast.step),q=(time-this.blast.started)/700,c=this.ctx;
      c.save();c.globalAlpha=1-q;c.strokeStyle='#ffb349';c.lineWidth=5*(1-q);c.beginPath();c.ellipse(p.x,p.y,15+q*100,5+q*32,0,0,Math.PI*2);c.stroke();c.restore();
    }
    const c = this.ctx;
    const anchors = ['P1','P2'].map(seat => this.project(0, this.visualStep(seat,time), .7));
    // 500% is the reference size; scale the entire plaque with the map camera.
    const cardWidth = 210;
    const tokenScale = this.zoom / 5;
    const visibleWidth = cardWidth * tokenScale;
    ['P1','P2'].forEach((seat,i)=>{
      const token=this.tokens[seat], el=token.root, p=anchors[i];
      token.setStep(this.publicView?.positions[seat] ?? 0);
      let x=p.x+(i?1:-1)*(cardWidth/2+7)*tokenScale;
      x=clamp(x,visibleWidth/2+4,this.width-visibleWidth/2-4);
      el.style.transformOrigin='bottom center';
      el.style.transform=`translate(-50%,-100%) scale(${tokenScale})`;
      el.style.width=`${cardWidth}px`; el.style.left=`${x}px`; el.style.top=`${p.y-20*tokenScale}px`;
      el.style.visibility=p.y < -80 || p.y > this.height+130 ? 'hidden':'visible';
      token.update(this.reducedMotion?0:time);
    });
    for (let i = 0; i < 28; i++) {
      const x = (i * 137.3 + Math.sin(t * .15 + i) * 12) % this.width, y = (i * 87.7 - t * 5 + this.height * 100) % this.height;
      c.globalAlpha = .3 + .35 * Math.sin(t + i) ** 2; c.fillStyle = '#fff9cd'; c.font = `${i % 3 + 7}px Georgia`; c.fillText('✦', x, y);
    }
    c.globalAlpha = 1;
    this.frame = requestAnimationFrame(t2 => this.draw(t2));
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; cancelAnimationFrame(this.frame); this.events.abort(); this.observer.disconnect();
    Object.values(this.tokens).forEach(t=>t.dispose()); this.tokenLayer.remove();
    this.canvas.remove(); this.atmosphere.remove(); this.labelLayer.remove();
  }
}






