import * as THREE from 'three';

const FOREST_END = 15;
const MOUNTAIN_END = 30;
const STEP_RISE = 1.15;
const STEP_RUN = 1.8;

// A stable seed makes the environment identical after leaving and reopening a map.
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function mountainWidth(step) {
  return 20.5 - Math.max(0, step) * 0.28;
}

function groundHeight(x, step) {
  const shoulder = Math.max(0, Math.abs(x) - 4.6);
  return step * STEP_RISE - 1.55 - shoulder * (0.33 + step * 0.008);
}

/**
 * Build decorative, local-only scenery around the fixed 0–40 stair axis.
 * The caller owns lighting and the render loop; update() receives seconds.
 * No match state, step targets or gameplay data enter this module.
 */
export function buildMountainScenery(scene) {
  if (!scene?.isScene) throw new TypeError('山体环境需要有效的 Three.js 场景。');

  const root = new THREE.Group();
  root.name = 'mountain-scenery';
  root.userData.decorative = true;
  scene.add(root);

  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const random = seededRandom(404031);
  const cloudBanks = [];
  const floatingIslands = [];
  let disposed = false;

  const geometry = (value) => { geometries.add(value); return value; };
  const material = (parameters) => {
    const value = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, ...parameters });
    materials.add(value);
    return value;
  };
  const paleStone = material({ color: 0xc3d2ca, flatShading: true });
  const snow = material({ color: 0xf0f7f3, flatShading: true });
  const ivory = material({ color: 0xf6f1df });
  const gold = material({ color: 0xc5ae71, metalness: 0.25, roughness: 0.6 });
  const green = material({ color: 0x629b85, flatShading: true });
  const lightGreen = material({ color: 0x8db79a, flatShading: true });
  const trunk = material({ color: 0x8d8d74 });
  const jade = material({ color: 0xdbe9d8, roughness: 0.8 });
  const unitBox = geometry(new THREE.BoxGeometry(1, 1, 1));
  const unitRock = geometry(new THREE.IcosahedronGeometry(1, 0));
  const unitPine = geometry(new THREE.ConeGeometry(1, 1, 7));
  const unitTrunk = geometry(new THREE.CylinderGeometry(0.7, 1, 1, 6));
  const unitColumn = geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
  const islandRock = geometry(new THREE.CylinderGeometry(1, 0.25, 1, 7));

  function mesh(shape, surface, position, scale, parent = root) {
    const object = new THREE.Mesh(shape, surface);
    object.position.set(...position);
    object.scale.set(...scale);
    object.userData.decorative = true;
    parent.add(object);
    return object;
  }

  function box(surface, position, scale, parent = root) {
    return mesh(unitBox, surface, position, scale, parent);
  }

  function instanced(shape, surface, entries, name) {
    const object = new THREE.InstancedMesh(shape, surface, entries.length);
    object.name = name;
    object.userData.decorative = true;
    const transform = new THREE.Object3D();
    entries.forEach((entry, index) => {
      transform.position.set(...entry.position);
      transform.scale.set(...entry.scale);
      transform.rotation.set(0, entry.rotation || 0, 0);
      transform.updateMatrix();
      object.setMatrixAt(index, transform.matrix);
    });
    object.instanceMatrix.needsUpdate = true;
    object.computeBoundingSphere();
    root.add(object);
    return object;
  }

  // The top surface always stays below the stair treads, including its centre.
  // Independent face colours retain the faceted landscape without image assets.
  const terrainPositions = [];
  const terrainColors = [];
  const lateral = [-1, -0.7, -0.42, -0.225, 0, 0.225, 0.42, 0.7, 1];
  const forestColor = new THREE.Color(0x9db7a1);
  const rockColor = new THREE.Color(0xa0b9b8);
  const snowColor = new THREE.Color(0xe6efed);
  function terrainPoint(step, fraction) {
    const x = fraction * mountainWidth(step);
    return [x, groundHeight(x, step), -step * STEP_RUN];
  }
  function triangle(a, b, c, tint) {
    terrainPositions.push(...a, ...b, ...c);
    for (let index = 0; index < 3; index += 1) terrainColors.push(tint.r, tint.g, tint.b);
  }
  for (let step = -2; step < MOUNTAIN_END; step += 2) {
    const next = Math.min(MOUNTAIN_END, step + 2);
    for (let column = 0; column < lateral.length - 1; column += 1) {
      const a = terrainPoint(step, lateral[column]);
      const b = terrainPoint(next, lateral[column]);
      const c = terrainPoint(step, lateral[column + 1]);
      const d = terrainPoint(next, lateral[column + 1]);
      const base = step < FOREST_END - 1 ? forestColor : step < 19 ? rockColor : snowColor;
      const tint = base.clone().multiplyScalar(0.93 + random() * 0.11);
      triangle(a, c, b, tint);
      triangle(b, c, d, tint.clone().multiplyScalar(0.975));
    }
    for (const side of [-1, 1]) {
      const a = terrainPoint(step, side);
      const b = terrainPoint(next, side);
      const c = [a[0] * 0.63, -12 + step * 0.43, a[2]];
      const d = [b[0] * 0.63, -12 + next * 0.43, b[2]];
      const tint = rockColor.clone().multiplyScalar(0.68 + random() * 0.13);
      if (side < 0) { triangle(a, b, c, tint); triangle(b, d, c, tint); }
      else { triangle(a, c, b, tint); triangle(b, c, d, tint); }
    }
  }
  // Close both ends so focused views also see a solid mountain silhouette.
  for (const end of [-2, MOUNTAIN_END]) {
    for (let column = 0; column < lateral.length - 1; column += 1) {
      const a = terrainPoint(end, lateral[column]);
      const b = terrainPoint(end, lateral[column + 1]);
      const c = [a[0] * 0.63, -12 + end * 0.43, a[2]];
      const d = [b[0] * 0.63, -12 + end * 0.43, b[2]];
      const tint = rockColor.clone().multiplyScalar(end < 0 ? 0.78 : 0.88);
      if (end < 0) { triangle(a, c, b, tint); triangle(b, c, d, tint); }
      else { triangle(a, b, c, tint); triangle(b, d, c, tint); }
    }
  }
  const terrainGeometry = geometry(new THREE.BufferGeometry());
  terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(terrainPositions, 3));
  terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
  terrainGeometry.computeVertexNormals();
  const terrainMaterial = material({ vertexColors: true, flatShading: true });
  mesh(terrainGeometry, terrainMaterial, [0, 0, 0], [1, 1, 1]).name = 'mountain-ridge';

  const trunks = [];
  const greenCrowns = [];
  const lightCrowns = [];
  for (let index = 0; index < 46; index += 1) {
    const step = -0.7 + random() * 15.2;
    const side = index % 2 ? -1 : 1;
    const x = side * (6.2 + random() * (mountainWidth(step) - 8.6));
    const y = groundHeight(x, step);
    const z = -step * STEP_RUN;
    const height = 2.2 + random() * 2.6;
    const width = 0.75 + random() * 0.65;
    trunks.push({ position: [x, y + height * 0.2, z], scale: [0.16, height * 0.48, 0.16] });
    for (let crown = 0; crown < 3; crown += 1) {
      const entries = index % 3 === 0 ? lightCrowns : greenCrowns;
      entries.push({
        position: [x, y + height * (0.44 + crown * 0.2), z],
        scale: [width * (1 - crown * 0.2), height * 0.55, width * (1 - crown * 0.2)],
        rotation: random() * Math.PI,
      });
    }
  }
  instanced(unitTrunk, trunk, trunks, 'forest-trunks');
  instanced(unitPine, green, greenCrowns, 'forest-pines');
  instanced(unitPine, lightGreen, lightCrowns, 'forest-light-pines');

  const camp = new THREE.Group();
  camp.name = 'foothill-camp';
  camp.position.set(-11.5, groundHeight(-11.5, -0.8), 1.44);
  root.add(camp);
  const fabric = material({ color: 0xe9d9b9, side: THREE.DoubleSide });
  const tentGeometry = geometry(new THREE.BufferGeometry());
  tentGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -2.1, 0, 1.8, 0, 2.5, 1.8, -2.1, 0, -1.8,
    -2.1, 0, -1.8, 0, 2.5, 1.8, 0, 2.5, -1.8,
    0, 2.5, 1.8, 2.1, 0, 1.8, 2.1, 0, -1.8,
    0, 2.5, 1.8, 2.1, 0, -1.8, 0, 2.5, -1.8,
    -2.1, 0, -1.8, 0, 2.5, -1.8, 2.1, 0, -1.8,
    -2.1, 0, 1.8, 0, 2.5, 1.8, -0.65, 0, 1.8,
    0, 2.5, 1.8, 2.1, 0, 1.8, 0.65, 0, 1.8,
  ], 3));
  tentGeometry.computeVertexNormals();
  mesh(tentGeometry, fabric, [0, 0, 0], [1, 1, 1], camp);
  box(trunk, [0, 1.3, 1.7], [0.1, 2.6, 0.1], camp);
  box(trunk, [0, 1.3, -1.7], [0.1, 2.6, 0.1], camp);
  const ropeGeometry = geometry(new THREE.BufferGeometry());
  ropeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 2.5, 1.8, 0, 0, 3.5, 0, 2.5, -1.8, 0, 0, -3.5,
    -2.1, 0.2, 1.8, -3.1, 0, 2.3, 2.1, 0.2, 1.8, 3.1, 0, 2.3,
  ], 3));
  const lineGold = new THREE.LineBasicMaterial({ color: 0xc4b37e, transparent: true, opacity: 0.68 });
  materials.add(lineGold);
  camp.add(new THREE.LineSegments(ropeGeometry, lineGold));

  const rocks = [];
  const snowCaps = [];
  for (let index = 0; index < 32; index += 1) {
    const step = 1 + random() * 28.5;
    const side = index % 2 ? -1 : 1;
    const width = 0.7 + random() * 1.5;
    const x = side * (6.1 + width + random() * 4);
    const y = groundHeight(x, step);
    const height = step < FOREST_END ? 0.6 + random() : 1.4 + random() * 2;
    rocks.push({ position: [x, y + height * 0.32, -step * STEP_RUN], scale: [width, height, width * 0.82], rotation: random() * Math.PI });
    if (step > FOREST_END) snowCaps.push({ position: [x, y + height * 0.88, -step * STEP_RUN], scale: [width * 0.85, height * 0.38, width * 0.7] });
  }
  instanced(unitRock, paleStone, rocks, 'slope-rocks');
  instanced(unitRock, snow, snowCaps, 'snow-caps');

  const crystalGeometry = geometry(new THREE.OctahedronGeometry(1, 0));
  const ice = material({ color: 0xa9d5d4, metalness: 0.08, roughness: 0.28, transparent: true, opacity: 0.86 });
  const crystals = [];
  for (let index = 0; index < 18; index += 1) {
    const step = 17 + random() * 12;
    const x = (index % 2 ? -1 : 1) * (6.5 + random() * 2.3);
    const height = 0.9 + random() * 1.8;
    crystals.push({ position: [x, groundHeight(x, step) + height / 2, -step * STEP_RUN], scale: [0.24 + random() * 0.3, height / 2, 0.32], rotation: random() * Math.PI });
  }
  instanced(crystalGeometry, ice, crystals, 'snow-ice-crystals');

  // Off-axis peaks frame the snowy section; their entire footprint clears x=±4.
  for (const peak of [
    { x: -18, step: 21, width: 6, height: 13 },
    { x: -15, step: 27.4, width: 5, height: 10 },
    { x: 16.5, step: 23.6, width: 5.8, height: 9 },
  ]) {
    const base = groundHeight(peak.x, peak.step) - 4;
    mesh(unitPine, paleStone, [peak.x, base + peak.height / 2, -peak.step * STEP_RUN], [peak.width, peak.height, peak.width * 0.82]);
    mesh(unitPine, snow, [peak.x, base + peak.height * 0.82, -peak.step * STEP_RUN], [peak.width * 0.38, peak.height * 0.38, peak.width * 0.312]);
  }

  for (const side of [-1, 1]) {
    const trackGeometry = geometry(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(side * 4.85, -0.35, 0),
      new THREE.Vector3(side * 4.85, 40 * STEP_RISE - 0.35, -40 * STEP_RUN),
    ]));
    const track = new THREE.Line(trackGeometry, lineGold);
    track.name = 'golden-stair-edge';
    root.add(track);
  }

  const summit = new THREE.Group();
  summit.name = 'summit-temple';
  root.add(summit);
  // The platform begins beyond z=-73.3, behind the final playable stair.
  mesh(islandRock, paleStone, [0, 41, -78.5], [8.2, 8, 6.2], summit);
  box(jade, [0, 45.05, -78.5], [15, 0.6, 10.4], summit);
  box(ivory, [0, 45.45, -79], [12, 0.24, 8.5], summit);
  box(gold, [0, 45.59, -78], [9.4, 0.05, 0.14], summit);
  for (const side of [-1, 1]) {
    const x = side * 4.7;
    box(ivory, [x, 45.95, -79.2], [1.65, 0.8, 1.65], summit);
    mesh(unitColumn, ivory, [x, 49.9, -79.2], [0.57, 7.2, 0.57], summit);
    box(gold, [x, 46.5, -79.2], [1.1, 0.14, 1.1], summit);
    box(gold, [x, 53.4, -79.2], [1.1, 0.14, 1.1], summit);
    box(ivory, [x, 53.7, -79.2], [1.65, 0.5, 1.65], summit);
  }
  box(ivory, [0, 54.25, -79.2], [11.6, 0.65, 1.7], summit);
  box(gold, [0, 54.66, -79.2], [11.9, 0.12, 1.85], summit);
  const roof = geometry(new THREE.ConeGeometry(1, 1, 4));
  const pediment = mesh(roof, ivory, [0, 55.85, -79.2], [8.1, 2.3, 1.8], summit);
  pediment.rotation.y = Math.PI / 4;

  const ringGeometry = geometry(new THREE.TorusGeometry(2.75, 0.035, 6, 56));
  const halo = mesh(ringGeometry, gold, [0, 50.2, -79.55], [1, 1, 1], summit);
  const starGeometry = geometry(new THREE.OctahedronGeometry(1, 0));
  const star = mesh(starGeometry, gold, [0, 50.2, -79.55], [0.55, 0.9, 0.2], summit);
  box(ivory, [0, 46.05, -81.7], [3.2, 0.7, 2.7], summit);
  box(gold, [0, 46.48, -82], [2.4, 0.18, 1.9], summit);
  box(ivory, [0, 47.25, -82.5], [2.1, 2, 0.45], summit);
  for (const side of [-1, 1]) box(gold, [side * 1.1, 46.95, -81.8], [0.2, 1, 1.5], summit);

  // Small distant islands give the cloud section depth without creating paths.
  for (const island of [
    { x: -24, y: 34, z: -65, radius: 5, height: 7 },
    { x: 25, y: 38, z: -75, radius: 4, height: 6 },
    { x: -18, y: 45, z: -98, radius: 3.6, height: 5 },
  ]) {
    const group = new THREE.Group();
    group.name = 'distant-floating-island';
    group.position.set(island.x, island.y, island.z);
    root.add(group);
    mesh(islandRock, paleStone, [0, -island.height / 2, 0], [island.radius, island.height, island.radius * 0.7], group);
    mesh(islandRock, jade, [0, 0.1, 0], [island.radius, 0.35, island.radius * 0.7], group);
    for (const x of [-1.15, 1.15]) {
      box(ivory, [x, 1.75, 0], [0.45, 3.2, 0.45], group);
      box(gold, [x, 3.4, 0], [0.7, 0.12, 0.7], group);
    }
    box(ivory, [0, 3.65, 0], [3.5, 0.38, 0.75], group);
    floatingIslands.push({ group, baseY: island.y, phase: random() * Math.PI * 2 });
  }

  // A small procedural texture needs no network, canvas or DOM resources.
  const textureSize = 64;
  const pixels = new Uint8Array(textureSize * textureSize * 4);
  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const distance = Math.hypot((x + 0.5 - textureSize / 2) / (textureSize / 2), (y + 0.5 - textureSize / 2) / (textureSize / 2));
      const index = (y * textureSize + x) * 4;
      pixels[index] = 255;
      pixels[index + 1] = 255;
      pixels[index + 2] = 255;
      pixels[index + 3] = Math.round(Math.max(0, 1 - distance) ** 2 * 255);
    }
  }
  const cloudTexture = new THREE.DataTexture(pixels, textureSize, textureSize);
  cloudTexture.needsUpdate = true;
  textures.add(cloudTexture);
  const cloudPlane = geometry(new THREE.PlaneGeometry(1, 1));
  // Camera-facing instanced quads keep a world-space cloud size with either
  // an orthographic or perspective camera, using only one draw call per bank.
  const cloudMaterial = new THREE.ShaderMaterial({
    uniforms: { cloudMap: { value: cloudTexture } },
    vertexShader: `
      varying vec2 cloudUv;
      void main() {
        cloudUv = uv;
        vec4 centre = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 extent = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        centre.xy += position.xy * extent;
        gl_Position = projectionMatrix * centre;
      }
    `,
    fragmentShader: `
      uniform sampler2D cloudMap;
      varying vec2 cloudUv;
      void main() {
        float opacity = texture2D(cloudMap, cloudUv).a * 0.42;
        gl_FragColor = vec4(0.94, 0.98, 0.96, opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  materials.add(cloudMaterial);
  for (const bank of [
    { x: -20, y: -4, z: -5 }, { x: 20, y: -3, z: -17 },
    { x: -20, y: 16, z: -40 }, { x: 21, y: 19, z: -48 },
    { x: -17, y: 31, z: -67 }, { x: 19, y: 32, z: -82 },
  ]) {
    const particles = [];
    for (let index = 0; index < 10; index += 1) {
      particles.push({
        position: [(random() - 0.5) * 16, (random() - 0.5) * 1.9, (random() - 0.5) * 13],
        scale: [10 + random() * 7, 4 + random() * 3, 1],
      });
    }
    const points = instanced(cloudPlane, cloudMaterial, particles, 'cloud-bank');
    points.position.set(bank.x, bank.y, bank.z);
    points.renderOrder = 1;
    cloudBanks.push({ points, baseX: bank.x, baseY: bank.y, phase: random() * Math.PI * 2 });
  }

  return {
    update(time = 0) {
      if (disposed || !Number.isFinite(time)) return;
      for (const bank of cloudBanks) {
        bank.points.position.x = bank.baseX + Math.sin(time * 0.045 + bank.phase) * 1.5;
        bank.points.position.y = bank.baseY + Math.sin(time * 0.1 + bank.phase) * 0.25;
      }
      for (const island of floatingIslands) island.group.position.y = island.baseY + Math.sin(time * 0.18 + island.phase) * 0.2;
      halo.rotation.z = Math.sin(time * 0.1) * 0.02;
      star.rotation.y = Math.sin(time * 0.16) * 0.12;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const resource of geometries) resource.dispose();
      for (const resource of materials) resource.dispose();
      for (const resource of textures) resource.dispose();
      geometries.clear();
      materials.clear();
      textures.clear();
      cloudBanks.length = 0;
      floatingIslands.length = 0;
    },
  };
}
