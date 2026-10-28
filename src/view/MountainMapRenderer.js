import * as THREE from 'three';
import { buildMountainScenery } from './MountainScenery.js';

const COLORS = { forest: 0xa6b8a0, snow: 0xc7dfe7, sky: 0xe4e3cf };
const GOLD = 0xc4a66a;
const OFFSET = new THREE.Vector3(12, 28, 66);
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 5;

/** Visual coordinates only. These never alter a player's logical step. */
export function stepAnchor(index, seat) {
  if (!Number.isInteger(index) || index < 0 || index > 40) throw new RangeError('阶号必须为0～40的整数。');
  return new THREE.Vector3(seat === 'P1' ? -1.7 : seat === 'P2' ? 1.7 : 0, index * 1.15, -index * 1.8);
}

/** Owns only public map presentation; it has no access to Game or account storage. */
export class MountainMapRenderer {
  constructor(container, { onSelect = () => {}, onViewChange = () => {}, onError = () => {} } = {}) {
    this.container = container;
    this.container.tabIndex = -1;
    this.onSelect = onSelect;
    this.onViewChange = onViewChange;
    this.onError = onError;
    this.events = new AbortController();
    this.resources = new Set();
    this.steps = [];
    this.labels = [];
    this.labelAnchors = [];
    this.seatLabelOffset = new THREE.Vector3(0, 3.4, 0);
    this.labelPosition = new THREE.Vector3();
    this.highlights = new Set();
    this.selected = 0;
    this.hovered = null;
    this.autoFollow = true;
    this.focusMode = 'overview';
    this.target = stepAnchor(20);
    this.desiredTarget = this.target.clone();
    this.desiredZoom = 1;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.projected = new THREE.Vector3();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      this.initializeScene();
      this.bindInteractions();
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(container);
      this.resize();
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame((time) => this.updateFrame(time));
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  own(resource) { this.resources.add(resource); return resource; }

  initializeScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xdbe9e8, 0.0028);
    this.camera = new THREE.OrthographicCamera(-60, 60, 49, -49, 0.1, 500);
    this.camera.position.copy(this.target).add(OFFSET);
    this.camera.lookAt(this.target);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = 'mountain-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.container.append(this.renderer.domElement);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'mountain-labels';
    this.container.append(this.labelLayer);
    this.scene.add(new THREE.HemisphereLight(0xfff9e8, 0x6a8690, 2.5));
    const sun = new THREE.DirectionalLight(0xfff0cc, 3.1);
    sun.position.set(-30, 85, 35);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc8e8ff, 1.1);
    fill.position.set(40, 30, -60);
    this.scene.add(fill);
    this.scenery = buildMountainScenery(this.scene);
    this.buildPath();
    this.buildSeatMarkers();
  }

  buildPath() {
    const stone = this.own(new THREE.BoxGeometry(8, 0.8, 1.85));
    const platform = this.own(new THREE.BoxGeometry(12, 1.1, 5.5));
    const trimGeometry = this.own(new THREE.BoxGeometry(8.05, 0.08, 0.09));
    const trim = this.own(new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.3, roughness: 0.6 }));
    const slotGeometry = this.own(new THREE.TorusGeometry(0.29, 0.065, 6, 16));
    const slotMaterial = this.own(new THREE.MeshStandardMaterial({ color: 0x586f77, roughness: 0.7 }));
    for (let i = 0; i <= 40; i++) {
      const zone = i <= 15 ? 'forest' : i <= 30 ? 'snow' : 'sky';
      const milestone = i % 10 === 0;
      const material = this.own(new THREE.MeshStandardMaterial({ color: milestone ? 0xe0cf9c : COLORS[zone], roughness: 0.75, metalness: zone === 'sky' ? 0.15 : 0, emissive: 0x000000 }));
      const mesh = new THREE.Mesh(i === 0 || i === 40 ? platform : stone, material);
      mesh.position.copy(stepAnchor(i));
      mesh.userData.index = i;
      this.scene.add(mesh);
      this.steps.push(mesh);
      const edge = new THREE.Mesh(trimGeometry, trim);
      edge.position.copy(mesh.position).add(new THREE.Vector3(0, 0.43, 0.91));
      if (i === 0 || i === 40) { edge.scale.x = 1.49; edge.position.z = mesh.position.z + 2.76; edge.position.y += 0.16; }
      this.scene.add(edge);
      // Every eligible step has exactly the same generic socket. No bomb state is read.
      if (i > 0 && i < 40) {
        const socket = new THREE.Mesh(slotGeometry, slotMaterial);
        socket.rotation.x = -Math.PI / 2;
        socket.position.copy(mesh.position).add(new THREE.Vector3(2.9, 0.46, 0));
        this.scene.add(socket);
      }
      const label = document.createElement('button');
      label.type = 'button';
      label.className = `step-label${milestone ? ' is-milestone' : ''}`;
      label.dataset.step = String(i);
      label.textContent = String(i).padStart(2, '0');
      label.setAttribute('aria-label', `第${i}阶${i === 0 ? ' 山脚营地' : i === 40 ? ' 天空岛神座' : ''}`);
      label.setAttribute('aria-pressed', 'false');
      label.tabIndex = i === 0 ? 0 : -1;
      this.labelLayer.append(label);
      this.labels.push(label);
      this.labelAnchors.push(stepAnchor(i).add(new THREE.Vector3(0, 0.5, 0)));
    }
  }

  buildSeatMarkers() {
    this.seats = {};
    for (const [seat, color] of [['P1', 0x397f88], ['P2', 0xc78d6e]]) {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(this.own(new THREE.TorusGeometry(0.56, 0.08, 7, 20)), this.own(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 })));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.65;
      const beacon = new THREE.Mesh(this.own(new THREE.OctahedronGeometry(0.43)), ring.material);
      beacon.position.y = 1.7;
      group.add(ring, beacon);
      group.position.copy(stepAnchor(0, seat));
      this.scene.add(group);
      const label = document.createElement('span');
      label.className = `seat-label ${seat.toLowerCase()}`;
      label.textContent = seat;
      this.labelLayer.append(label);
      this.seats[seat] = { group, label };
    }
  }

  applyAuthorizedView(view) {
    const positions = { P1: view.positions?.P1, P2: view.positions?.P2 };
    for (const step of Object.values(positions)) stepAnchor(step);
    if (!['P1', 'P2'].includes(view.activeSeat)) throw new Error('地图席位无效。');
    const previous = this.publicView;
    this.publicView = { positions, activeSeat: view.activeSeat };
    for (const seat of ['P1', 'P2']) this.seats[seat].group.position.copy(stepAnchor(positions[seat], seat));
    if (previous && this.autoFollow && (previous.positions[view.activeSeat] !== positions[view.activeSeat] || previous.activeSeat !== view.activeSeat)) this.focusTarget(view.activeSeat);
    this.selectStep(this.selected, false);
  }

  bindInteractions() {
    const options = { signal: this.events.signal };
    this.container.addEventListener('pointerdown', (event) => {
      this.pendingKeyboardFocus = null;
      if (event.button !== 0 || event.target.closest('[data-map-overlay]')) return;
      this.cancelGesture();
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, target: this.desiredTarget.clone(), label: event.target.closest('[data-step]')?.dataset.step };
      this.container.setPointerCapture(event.pointerId);
    }, options);
    this.container.addEventListener('pointermove', (event) => {
      if (this.drag?.id === event.pointerId) {
        const dx = event.clientX - this.drag.x;
        const dy = event.clientY - this.drag.y;
        if (Math.hypot(dx, dy) > 5) this.drag.moved = true;
        if (!this.drag.moved) return;
        const scale = 98 / this.camera.zoom / this.height;
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        this.desiredTarget.copy(this.drag.target).addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
        this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -32, 32);
        this.desiredTarget.y = THREE.MathUtils.clamp(this.desiredTarget.y, -10, 65);
        this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -94, 20);
        this.container.classList.add('is-dragging');
        this.setFocusMode('manual');
      } else {
        const label = event.target.closest('[data-step]');
        this.setHovered(label ? Number(label.dataset.step) : this.pickStep(event));
      }
    }, options);
    this.container.addEventListener('pointerup', (event) => {
      if (this.drag?.id !== event.pointerId) return;
      const { moved, label } = this.drag;
      if (!moved) {
        const index = label !== undefined ? Number(label) : this.pickStep(event);
        if (index !== null) this.selectStep(index);
      }
      this.cancelGesture();
    }, options);
    this.container.addEventListener('pointercancel', () => this.cancelGesture(), options);
    this.container.addEventListener('lostpointercapture', () => { this.drag = null; this.container.classList.remove('is-dragging'); }, options);
    this.container.addEventListener('pointerleave', () => this.setHovered(null), options);
    window.addEventListener('blur', () => this.cancelGesture(), options);
    this.container.addEventListener('wheel', (event) => {
      if (event.target.closest('[data-map-overlay]')) return;
      event.preventDefault();
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.height : 1;
      this.zoomBy(Math.exp(-THREE.MathUtils.clamp(event.deltaY * units, -300, 300) * 0.0015));
    }, { ...options, passive: false });
    this.labelLayer.addEventListener('click', (event) => {
      if (event.detail !== 0) return; // Pointer selection is resolved once, after the drag threshold.
      const label = event.target.closest('[data-step]');
      if (label) this.selectStep(Number(label.dataset.step));
    }, options);
    this.container.addEventListener('keydown', (event) => {
      const label = event.target.closest('[data-step]');
      if (!label && event.target !== this.container) return;
      const delta = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
      let index = label ? Number(label.dataset.step) : this.selected;
      if (delta !== undefined) index = THREE.MathUtils.clamp(index + delta, 0, 40);
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = 40;
      else return;
      event.preventDefault();
      this.selectStep(index);
      this.focusStep(index);
      // The destination can be off-screen until the camera arrives. Keep keyboard
      // input on the viewport meanwhile, then restore the roving label focus.
      this.pendingKeyboardFocus = index;
      this.container.focus({ preventScroll: true });
    }, options);
    this.container.addEventListener('focusout', (event) => {
      if (!this.container.contains(event.relatedTarget)) this.pendingKeyboardFocus = null;
    }, options);
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.contextLost = true;
      cancelAnimationFrame(this.frame);
      this.onError('3D绘图上下文已中断。请点击“重新载入地图”恢复场景。');
    }, options);
  }

  cancelGesture() {
    if (this.drag && this.container.hasPointerCapture?.(this.drag.id)) this.container.releasePointerCapture(this.drag.id);
    this.drag = null;
    this.container.classList.remove('is-dragging');
  }

  pickStep(event) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.steps, false)[0]?.object.userData.index ?? null;
  }

  setHovered(index) {
    if (this.hovered === index) return;
    this.hovered = index;
    this.updateHighlights();
  }

  selectStep(index, notify = true) {
    stepAnchor(index);
    this.selected = index;
    this.updateHighlights();
    if (notify) this.onSelect(index);
  }

  highlightSteps(indices) {
    for (const index of indices) stepAnchor(index);
    this.highlights = new Set(indices);
    this.updateHighlights();
  }

  updateHighlights() {
    this.steps.forEach((mesh, index) => {
      const selected = index === this.selected;
      const active = selected || index === this.hovered || this.highlights.has(index);
      mesh.material.emissive.setHex(active ? 0x7b602d : 0x000000);
      mesh.material.emissiveIntensity = selected ? 0.65 : 0.3;
      const label = this.labels[index];
      label.classList.toggle('is-selected', selected);
      label.classList.toggle('is-hovered', index === this.hovered);
      label.setAttribute('aria-pressed', String(selected));
      label.tabIndex = selected ? 0 : -1;
    });
  }

  setFocusMode(mode) {
    if (this.focusMode === mode) return;
    this.focusMode = mode;
    this.onViewChange({ mode, zoom: this.desiredZoom });
  }

  focusTarget(mode) {
    const targets = { base: 0, summit: 40, P1: this.publicView?.positions.P1 ?? 0, P2: this.publicView?.positions.P2 ?? 0, overview: 20 };
    if (!Object.hasOwn(targets, mode)) throw new Error('不支持的镜头焦点。');
    this.cancelGesture();
    this.pendingKeyboardFocus = null;
    this.desiredTarget.copy(stepAnchor(targets[mode]));
    if (mode === 'summit') this.desiredTarget.y += 3;
    this.desiredZoom = mode === 'overview' ? 1 : 2.8;
    this.focusMode = mode;
    this.onViewChange({ mode, zoom: this.desiredZoom });
  }

  focusStep(index) {
    this.desiredTarget.copy(stepAnchor(index));
    this.desiredZoom = Math.max(this.desiredZoom, 2.2);
    this.focusMode = 'manual';
    this.onViewChange({ mode: this.focusMode, zoom: this.desiredZoom });
  }

  setAutoFollow(value) {
    if (typeof value !== 'boolean') throw new TypeError('镜头跟随需要开关值。');
    this.autoFollow = value;
  }

  zoomBy(factor) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.desiredZoom = THREE.MathUtils.clamp(this.desiredZoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.onViewChange({ mode: this.focusMode, zoom: this.desiredZoom });
  }

  resize() {
    if (this.disposed) return;
    this.width = Math.max(1, this.container.clientWidth);
    this.height = Math.max(1, this.container.clientHeight);
    const aspect = this.width / this.height;
    this.camera.left = -49 * aspect;
    this.camera.right = 49 * aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }

  positionLabel(element, position, offsetX = 0) {
    this.projected.copy(position).project(this.camera);
    const x = (this.projected.x + 1) / 2 * this.width + offsetX;
    const y = (1 - this.projected.y) / 2 * this.height;
    const visible = this.projected.z >= -1 && this.projected.z <= 1 && x >= 12 && x <= this.width - 12 && y >= 8 && y <= this.height - 8;
    element.hidden = !visible;
    if (visible) element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
  }

  updateFrame(time) {
    if (this.disposed || this.contextLost) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    const blend = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 10);
    this.target.lerp(this.desiredTarget, blend);
    this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, this.desiredZoom, blend);
    this.camera.position.copy(this.target).add(OFFSET);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.scenery.update(this.reducedMotion ? 0 : time / 1000);
    this.renderer.render(this.scene, this.camera);
    for (let i = 0; i <= 40; i++) {
      // Two columns keep every number readable when the entire ascent is in view.
      const nearX = i === 0 || i === 40 ? -7 : -5.6;
      const x = this.camera.zoom <= 2.5 && i % 2 ? -13.5 : nearX;
      this.labelPosition.copy(this.labelAnchors[i]);
      this.labelPosition.x = x;
      this.positionLabel(this.labels[i], this.labelPosition);
    }
    // Keep same-step seat labels at least 35px apart without a layout read per frame.
    const seatGap = 3.4 * this.camera.matrixWorld.elements[0] * this.width / (this.camera.right - this.camera.left) * this.camera.zoom;
    const seatShift = this.publicView?.positions.P1 === this.publicView?.positions.P2 ? Math.max(0, (35 - seatGap) / 2) : 0;
    for (const [seat, { group, label }] of Object.entries(this.seats)) {
      this.positionLabel(label, this.labelPosition.copy(group.position).add(this.seatLabelOffset), seat === 'P1' ? -seatShift : seatShift);
    }
    if (this.pendingKeyboardFocus != null && !this.labels[this.pendingKeyboardFocus].hidden) {
      this.labels[this.pendingKeyboardFocus].focus({ preventScroll: true });
      this.pendingKeyboardFocus = null;
    }
    this.container.classList.toggle('is-close-view', this.camera.zoom > 1.6);
    this.frame = requestAnimationFrame((next) => this.updateFrame(next));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.events.abort();
    this.observer?.disconnect();
    this.cancelGesture();
    this.scenery?.dispose();
    for (const resource of this.resources) resource.dispose();
    this.resources.clear();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer?.domElement.remove();
    this.labelLayer?.remove();
  }
}
