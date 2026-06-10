import * as THREE from "three";
 
export class RayleighLocalScene extends THREE.Group {
  constructor() {
    super();
 
    this.particleCount = 20000;
    this.particleField = {
      minX: -24,
      maxX: 24,
      minY: 0,
      maxY: 18,
      minZ: -12,
      maxZ: 12,
    };
 
    this.waveSpeed = 12.5;
    this.waveStartX = -28;
    this.waveEndX = 28;
    this.waveThickness = 1.2;
    this.waveHeight = 16;
    this.waveDepth = 26;
 
    // Base timing values at 1× speed — scaled by playbackSpeed at runtime
    this.BASE_blueHitInterval = 0.015;
    this.BASE_fadeDuration    = 0.16;
    this.BASE_scatterDelay    = 0.01;
 
    this.blueHitInterval = this.BASE_blueHitInterval;
    this.nextBlueHit = 0;
 
    this.fadeDuration = this.BASE_fadeDuration;
    this.scatterDelay = this.BASE_scatterDelay;
    this.scatterRadius = 9.0;
 
    this.playbackSpeed = 1.0;
 
    this.cycleDuration = Number.POSITIVE_INFINITY;
    this.cycleStart = 0;
    this.initialHitDone = false;
 
    this.hitTime = -1;
    this.BASE_waveLingerDuration = 1.4;
    this.waveLingerDuration = this.BASE_waveLingerDuration;
 
    this.manualMode = false;
    this.manualProgress = 0;
    this.manualDuration = 5;
    this.manualTime = 0;
    this.manualStep = 0.3;
 
    this.activated = new Array(this.particleCount).fill(false);
    this.activationTime = new Array(this.particleCount).fill(0);
    this.activatedIndices = [];
    this.pendingScatter = null;
 
    this.blueColor = new THREE.Color(0x69c7ff);
    this.blackColor = new THREE.Color(0x000000);
    this.skyTargetColor = new THREE.Color(0x1d6dff);
    
    // Configuración exacta del degradado del cielo solicitado
    this.skyLightColor = new THREE.Color(0x87CEEB); // Derecha/baja densidad: celeste claro
    this.skyDarkColor  = new THREE.Color(0x000d26); // Izquierda/alta densidad: azul noche profundo
    this.skyBinsX = 36;
 
    this.blueColorLight = new THREE.Color(0x87CEEB); 
    this.blueColorDark  = new THREE.Color(0x0a2a6e); 
 
    this.BASE_rayDuration = 0.45; 
    this.rayDuration = this.BASE_rayDuration;
 
    // Inicializaciones
    this.initBackground();
    this.initSkyDome();
    this.initGround(); // Suelo optimizado y de alta visibilidad
    this.initParticles();
    this.initWaves();
    this.initScatterRayPool();
  }
 
  initBackground() {
    this.fogColor = new THREE.Color(0x000000);
    this.fogDensity = 0.012;
  }
 
  // ── Modificado: Mayor definición y contraste para el plano del suelo ──
  initGround() {
    // Luces dedicadas para realzar el relieve terrestre
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(-15, 25, 10);
    this.add(sunLight);
 
    const ambLight = new THREE.AmbientLight(0x445566, 0.65);
    this.add(ambLight);
 
    // 1. Superficie Base (Un verde más vivo y visible bajo las partículas)
    const groundGeo = new THREE.PlaneGeometry(120, 60);
    const groundMat = new THREE.MeshPhongMaterial({ 
      color: 0x1e3d22, 
      shininess: 25,
      specular: 0x33aa44 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05; 
    this.add(ground);
 
    // 2. Cuadrícula de Horizonte (Aporta la referencia de suelo 3D ideal)
    const grid = new THREE.GridHelper(120, 40, 0x3df066, 0x256e34);
    grid.position.y = -0.04; // Justo una milésima por encima del plano base
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    this.add(grid);
 
    // 3. Horizonte de Bosque Estilizado Low-poly
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 0.9, 5);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x4a2e16 });
    const coneGeo  = new THREE.ConeGeometry(0.5, 1.5, 5);
    const coneMat  = new THREE.MeshPhongMaterial({ color: 0x24572c, shininess: 5 });
 
    const numTrees = 50;
    for (let i = 0; i < numTrees; i++) {
      const tree = new THREE.Group();
      
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.45;
      tree.add(trunk);
      
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 1.3;
      tree.add(cone);
 
      let x, z;
      if (i < 30) {
        // Cortina densa al fondo para tapar el vacío negro
        x = THREE.MathUtils.randFloat(-35, 35);
        z = THREE.MathUtils.randFloat(-16, -11);
      } else {
        // Enmarques en los laterales de la cámara
        x = i % 2 === 0 ? THREE.MathUtils.randFloat(-35, -22) : THREE.MathUtils.randFloat(22, 35);
        z = THREE.MathUtils.randFloat(-11, 16);
      }
      
      tree.position.set(x, -0.05, z);
      const scale = THREE.MathUtils.randFloat(0.8, 1.6);
      tree.scale.set(scale, scale, scale);
      this.add(tree);
    }
  }
 
  initParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
 
    const { minX, maxX, minY, maxY, minZ, maxZ } = this.particleField;
 
    const splitT    = 0.35; 
    const splitX    = THREE.MathUtils.lerp(minX, maxX, splitT);
 
    const leftCount  = Math.floor(this.particleCount * 0.04);  
    const rightCount = this.particleCount - leftCount;
 
    const leftWidth  = splitX - minX;
    const leftHeight = maxY - minY;
    const leftDepth  = maxZ - minZ;
 
    const cellsX = Math.max(1, Math.round(Math.pow(leftCount * (leftWidth  / leftHeight / leftDepth), 1/3)));
    const cellsY = Math.max(1, Math.round(cellsX * (leftHeight / leftWidth)));
    const cellsZ = Math.max(1, Math.round(cellsX * (leftDepth  / leftWidth)));
    const totalCells = cellsX * cellsY * cellsZ;
 
    const cellIndices = Array.from({ length: totalCells }, (_, k) => k);
    for (let k = cellIndices.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [cellIndices[k], cellIndices[j]] = [cellIndices[j], cellIndices[k]];
    }
 
    for (let i = 0; i < leftCount; i++) {
      const idx = i * 3;
      const cell = cellIndices[i % totalCells];
      const cx = cell % cellsX;
      const cy = Math.floor(cell / cellsX) % cellsY;
      const cz = Math.floor(cell / (cellsX * cellsY));
 
      positions[idx]     = minX + (cx + 0.3 + Math.random() * 0.4) * (leftWidth  / cellsX);
      positions[idx + 1] = minY + (cy + 0.3 + Math.random() * 0.4) * (leftHeight / cellsY);
      positions[idx + 2] = minZ + (cz + 0.3 + Math.random() * 0.4) * (leftDepth  / cellsZ);
 
      colors[idx] = colors[idx + 1] = colors[idx + 2] = 0;
    }
 
    for (let i = 0; i < rightCount; i++) {
      const idx = (leftCount + i) * 3;
      const xBias = Math.pow(Math.random(), 0.22);
      positions[idx]     = THREE.MathUtils.lerp(splitX, maxX, xBias);
      positions[idx + 1] = THREE.MathUtils.lerp(minY, maxY, Math.random());
      positions[idx + 2] = THREE.MathUtils.lerp(minZ, maxZ, Math.random());
 
      colors[idx] = colors[idx + 1] = colors[idx + 2] = 0;
    }
 
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 
    const material = new THREE.PointsMaterial({
      size: 0.16,
      transparent: true,
      opacity: 0.95,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
 
    this.particleGeometry = geometry;
    this.particleColors = colors;
    this.particlePositions = positions;
 
    this.particlePoints = new THREE.Points(geometry, material);
    this.add(this.particlePoints);
  }
 
  initSkyDome() {
    const domeGeo = new THREE.SphereGeometry(140, 30, 22);
    const colors = new Float32Array(domeGeo.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = this.blackColor.r;
      colors[i + 1] = this.blackColor.g;
      colors[i + 2] = this.blackColor.b;
    }
    domeGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 
    const domeMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
 
    this.skyGeometry = domeGeo;
    this.skyColors = colors;
    this.skyDome = new THREE.Mesh(domeGeo, domeMat);
    this.skyDome.position.y = 6;
    this.add(this.skyDome);
  }
 
  initWaves() {
    const waveGeometry = new THREE.PlaneGeometry(this.waveDepth, this.waveHeight);
    waveGeometry.rotateY(Math.PI / 2);
 
    const makeWave = (color) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const wave = new THREE.Mesh(waveGeometry, material);
      wave.position.set(this.waveStartX, 8.5, 0);
      return wave;
    };
 
    this.waves = [
      { type: "blue",  delay: 0,   mesh: makeWave(0x00aaff) },
      { type: "green", delay: 3.2, mesh: makeWave(0x4aff88) },
      { type: "red",   delay: 6.1, mesh: makeWave(0xff6666) },
    ];
 
    this.waves.forEach((wave) => this.add(wave.mesh));
  }
 
  initScatterRayPool() {
    this.scatterRayPool = [];
    const POOL_SIZE = 300;
 
    for (let i = 0; i < POOL_SIZE; i++) {
      const geo = new THREE.BufferGeometry();
      const pts = new Float32Array(6); 
      geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
 
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
 
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      this.add(line);
 
      this.scatterRayPool.push({
        line, pts, active: false, startTime: 0,
        ox: 0, oy: 0, oz: 0, tx: 0, ty: 0, tz: 0,
      });
    }
    this._poolCursor = 0;
    this._initImpactFlash();
  }
 
  _initImpactFlash() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
 
    const mat = new THREE.PointsMaterial({
      color: 0x55ccff,
      size: 3.5,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
 
    this._flashPoints = new THREE.Points(geo, mat);
    this._flashPos = pos;
    this._flashActive = false;
    this._flashStartTime = 0;
    this._flashDuration = 0.55;
    this.add(this._flashPoints);
  }
 
  _spawnImpactFlash(x, y, z, elapsedTime) {
    this._flashPos[0] = x; this._flashPos[1] = y; this._flashPos[2] = z;
    this._flashPoints.geometry.attributes.position.needsUpdate = true;
    this._flashActive = true;
    this._flashStartTime = elapsedTime;
    this._flashPoints.material.opacity = 1.0;
    this._flashPoints.material.size = 4.5;
  }
 
  _updateImpactFlash(elapsedTime) {
    if (!this._flashActive) return;
    const age = elapsedTime - this._flashStartTime;
    if (age >= this._flashDuration) {
      this._flashActive = false;
      this._flashPoints.material.opacity = 0;
      return;
    }
    const t = age / this._flashDuration;
    this._flashPoints.material.size = THREE.MathUtils.lerp(4.5, 0.5, t);
    this._flashPoints.material.opacity = t < 0.2 ? 1.0 : (1 - (t - 0.2) / 0.8);
  }
 
  setTimeOfDay(hour) {
    this.timeOfDay = hour;
  }
 
  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
    this.scatterDelay        = this.BASE_scatterDelay        / speed;
    this.blueHitInterval     = this.BASE_blueHitInterval     / speed;
    this.fadeDuration        = this.BASE_fadeDuration        / speed;
    this.waveLingerDuration  = this.BASE_waveLingerDuration  / speed;
    this.rayDuration         = this.BASE_rayDuration         / speed;
  }
 
  resetCycle() {
    this.cycleStart = 0;
    this.nextBlueHit = 0;
    this.initialHitDone = false;
    this.hitTime = -1;
    this.manualTime = 0;
    this.activated.fill(false);
    this.activationTime.fill(0);
    this.activatedIndices.length = 0;
    this.pendingScatter = null;
 
    this._flashActive = false;
    if (this._flashPoints) this._flashPoints.material.opacity = 0;
 
    for (const ray of this.scatterRayPool) {
      ray.active = false;
      ray.line.visible = false;
      ray.line.material.opacity = 0;
    }
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      this.particleColors[idx] = 0; this.particleColors[idx + 1] = 0; this.particleColors[idx + 2] = 0;
    }
    this.particleGeometry.attributes.color.needsUpdate = true;
  }
 
  activateParticle(index, elapsedTime) {
    if (this.activated[index]) return;
    this.activated[index] = true;
    this.activationTime[index] = elapsedTime;
    this.activatedIndices.push(index);
 
    if (!this.pendingScatter) {
      this.pendingScatter = { time: elapsedTime + this.scatterDelay, originIndex: index };
    }
  }
 
  spawnTransmissionRay(originIndex, targetIndex, elapsedTime) {
    const oi = originIndex * 3;
    const ti = targetIndex * 3;
    const pool = this.scatterRayPool;
    const size = pool.length;
    let slot = null;
 
    for (let attempt = 0; attempt < size; attempt++) {
      const candidate = pool[this._poolCursor];
      this._poolCursor = (this._poolCursor + 1) % size;
      if (!candidate.active) { slot = candidate; break; }
    }
    if (!slot) {
      let oldest = pool[0];
      for (let k = 1; k < size; k++) { if (pool[k].startTime < oldest.startTime) oldest = pool[k]; }
      slot = oldest;
    }
 
    slot.active = true;
    slot.startTime = elapsedTime;
    slot.ox = this.particlePositions[oi]; slot.oy = this.particlePositions[oi + 1]; slot.oz = this.particlePositions[oi + 2];
    slot.tx = this.particlePositions[ti]; slot.ty = this.particlePositions[ti + 1]; slot.tz = this.particlePositions[ti + 2];
 
    slot.pts[0] = slot.ox; slot.pts[1] = slot.oy; slot.pts[2] = slot.oz;
    slot.pts[3] = slot.ox; slot.pts[4] = slot.oy; slot.pts[5] = slot.oz;
    slot.line.geometry.attributes.position.needsUpdate = true;
    slot.line.visible = true;
    slot.line.material.opacity = 0.9;
  }
 
  updateScatterRays(elapsedTime) {
    for (const ray of this.scatterRayPool) {
      if (!ray.active) continue;
      const age = elapsedTime - ray.startTime;
      if (age >= this.rayDuration) {
        ray.active = false; ray.line.visible = false; ray.line.material.opacity = 0;
        continue;
      }
      const t = age / this.rayDuration;
      const tipT = Math.min(t / 0.7, 1);
      ray.pts[3] = THREE.MathUtils.lerp(ray.ox, ray.tx, tipT);
      ray.pts[4] = THREE.MathUtils.lerp(ray.oy, ray.ty, tipT);
      ray.pts[5] = THREE.MathUtils.lerp(ray.oz, ray.tz, tipT);
 
      const opacity = t < 0.15 ? (t / 0.15) * 0.9 : t > 0.6 ? (1 - (t - 0.6) / 0.4) * 0.9 : 0.9;
      ray.line.material.opacity = opacity;
      ray.line.geometry.attributes.position.needsUpdate = true;
    }
  }
 
  pickNextParticle(originIndex) {
    const originIdx = originIndex * 3;
    const ox = this.particlePositions[originIdx];
    const oy = this.particlePositions[originIdx + 1];
    const oz = this.particlePositions[originIdx + 2];
 
    let bestIndex = -1; let bestDist = Infinity;
    let nearestIndex = -1; let nearestDist = Infinity;
 
    for (let i = 0; i < this.particleCount; i++) {
      if (this.activated[i]) continue;
      const idx = i * 3;
      const dx = this.particlePositions[idx] - ox;
      const dy = this.particlePositions[idx + 1] - oy;
      const dz = this.particlePositions[idx + 2] - oz;
      const distSq = dx * dx + dy * dy + dz * dz;
 
      if (distSq < nearestDist) { nearestDist = distSq; nearestIndex = i; }
      if (distSq <= this.scatterRadius * this.scatterRadius) {
        if (distSq < bestDist) { bestDist = distSq; bestIndex = i; }
      }
    }
    return bestIndex !== -1 ? bestIndex : nearestIndex;
  }
 
  processScatterEvents(elapsedTime) {
    if (!this.pendingScatter) return false;
    if (elapsedTime < this.pendingScatter.time) return false;
 
    const originIndex = this.pendingScatter.originIndex;
    this.pendingScatter = null;
 
    const nextIndex = this.pickNextParticle(originIndex);
    if (nextIndex === -1) return false;
 
    this.spawnTransmissionRay(originIndex, nextIndex, elapsedTime);
    this.activateParticle(nextIndex, elapsedTime);
    this.pendingScatter = { time: elapsedTime + this.scatterDelay, originIndex: nextIndex };
    return true;
  }
 
  updateParticleColors(elapsedTime) {
    if (!this.activatedIndices.length) return false;
    let changed = false;
 
    for (const index of this.activatedIndices) {
      const idx = index * 3;
      const t = Math.min((elapsedTime - this.activationTime[index]) / this.fadeDuration, 1);
      const px = this.particlePositions[idx];
      const xNorm = (px - this.particleField.minX) / (this.particleField.maxX - this.particleField.minX);
 
      const targetR = THREE.MathUtils.lerp(this.blueColorLight.r, this.blueColorDark.r, xNorm);
      const targetG = THREE.MathUtils.lerp(this.blueColorLight.g, this.blueColorDark.g, xNorm);
      const targetB = THREE.MathUtils.lerp(this.blueColorLight.b, this.blueColorDark.b, xNorm);
 
      this.particleColors[idx]     = THREE.MathUtils.lerp(0, targetR, t);
      this.particleColors[idx + 1] = THREE.MathUtils.lerp(0, targetG, t);
      this.particleColors[idx + 2] = THREE.MathUtils.lerp(0, targetB, t);
      changed = true;
    }
    return changed;
  }
 
  applyBlueWave(elapsedTime, waveX) {
    if (this.initialHitDone) return false;
    if (elapsedTime < this.nextBlueHit) return false;
    this.nextBlueHit = elapsedTime + this.blueHitInterval;
 
    let bestIndex = -1; let bestDist = Infinity;
    for (let i = 0; i < this.particleCount; i++) {
      if (this.activated[i]) continue;
      const idx = i * 3;
      const px = this.particlePositions[idx];
      const dx = Math.abs(px - waveX);
      if (dx > this.waveThickness) continue;
      if (dx < bestDist) { bestDist = dx; bestIndex = i; }
    }
 
    if (bestIndex !== -1) {
      this.activateParticle(bestIndex, elapsedTime);
      this.initialHitDone = true;
      this.hitTime = elapsedTime;
 
      const idx = bestIndex * 3;
      this._spawnImpactFlash(this.particlePositions[idx], this.particlePositions[idx+1], this.particlePositions[idx+2], elapsedTime);
      return true;
    }
    return false;
  }
 
  updateSkyColor() {
    const progress = Math.min(this.activatedIndices.length / this.particleCount, 1);
 
    const baseR = THREE.MathUtils.lerp(this.blackColor.r, this.skyTargetColor.r, progress);
    const baseG = THREE.MathUtils.lerp(this.blackColor.g, this.skyTargetColor.g, progress);
    const baseB = THREE.MathUtils.lerp(this.blackColor.b, this.skyTargetColor.b, progress);
    this.fogColor.setRGB(baseR, baseG, baseB);
 
    const lightR = THREE.MathUtils.lerp(this.blackColor.r, this.skyLightColor.r, progress);
    const lightG = THREE.MathUtils.lerp(this.blackColor.g, this.skyLightColor.g, progress);
    const lightB = THREE.MathUtils.lerp(this.blackColor.b, this.skyLightColor.b, progress);
    const darkR  = THREE.MathUtils.lerp(this.blackColor.r, this.skyDarkColor.r,  progress);
    const darkG  = THREE.MathUtils.lerp(this.blackColor.g, this.skyDarkColor.g,  progress);
    const darkB  = THREE.MathUtils.lerp(this.blackColor.b, this.skyDarkColor.b,  progress);
 
    const bins = new Array(this.skyBinsX).fill(0);
    let maxCount = 1;
 
    for (const index of this.activatedIndices) {
      const idx = index * 3;
      const px = this.particlePositions[idx];
      const t = (px - this.particleField.minX) / (this.particleField.maxX - this.particleField.minX);
      const bin = Math.min(this.skyBinsX - 1, Math.max(0, Math.floor(t * this.skyBinsX)));
      const count = (bins[bin] += 1);
      if (count > maxCount) maxCount = count;
    }
 
    const positions = this.skyGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const vx = positions[i];
      const t = (vx - this.particleField.minX) / (this.particleField.maxX - this.particleField.minX);
      const bin = Math.min(this.skyBinsX - 1, Math.max(0, Math.floor(t * this.skyBinsX)));
      const density = Math.min(bins[bin] / maxCount, 1);
 
      this.skyColors[i]     = THREE.MathUtils.lerp(lightR, darkR, density);
      this.skyColors[i + 1] = THREE.MathUtils.lerp(lightG, darkG, density);
      this.skyColors[i + 2] = THREE.MathUtils.lerp(lightB, darkB, density);
    }
 
    this.skyGeometry.attributes.color.needsUpdate = true;
 
    if (this.parent && this.parent.isScene) {
      this.parent.background = this.fogColor;
      this.parent.fog = new THREE.FogExp2(this.fogColor.getHex(), this.fogDensity);
    }
  }
 
  stepSimulation(localTime) {
    if (localTime > this.cycleDuration) return;
    let colorsChanged = false;
 
    for (const wave of this.waves) {
      const waveTime = localTime - wave.delay;
      if (waveTime < 0) { wave.mesh.visible = false; continue; }
 
      if (wave.type === "blue" && this.initialHitDone) {
        const timeSinceHit = localTime - this.hitTime;
        if (timeSinceHit >= this.waveLingerDuration) { wave.mesh.visible = false; continue; }
        const fadeStart = this.waveLingerDuration * 0.7;
        if (timeSinceHit > fadeStart) {
          const fadeT = (timeSinceHit - fadeStart) / (this.waveLingerDuration * 0.3);
          wave.mesh.material.opacity = THREE.MathUtils.lerp(0.85, 0, fadeT);
        } else {
          wave.mesh.material.opacity = 0.85;
        }
      }
 
      const x = this.waveStartX + this.waveSpeed * waveTime;
      if (x > this.waveEndX) { wave.mesh.visible = false; continue; }
 
      wave.mesh.visible = true;
      wave.mesh.position.x = x;
 
      if (wave.type === "blue") { colorsChanged = this.applyBlueWave(localTime, x) || colorsChanged; }
    }
 
    colorsChanged = this.processScatterEvents(localTime) || colorsChanged;
    colorsChanged = this.updateParticleColors(localTime) || colorsChanged;
 
    this.updateScatterRays(localTime);
    this._updateImpactFlash(localTime);
    this.updateSkyColor();
 
    if (colorsChanged) this.particleGeometry.attributes.color.needsUpdate = true;
  }
 
  setManualMode(isManual) {
    this.manualMode = isManual;
    this.resetCycle();
    if (isManual) this.manualProgress = 0;
  }
 
  setManualProgress(value) {
    this.manualProgress = THREE.MathUtils.clamp(value, 0, 1);
  }
 
  jumpToEnd() {
    this.cycleStart = 0; this.nextBlueHit = 0; this.initialHitDone = true; this.hitTime = -999;
    this.manualTime = this.manualDuration; this.pendingScatter = null;
 
    for (const ray of this.scatterRayPool) { ray.active = false; ray.line.visible = false; ray.line.material.opacity = 0; }
    for (const wave of this.waves) { wave.mesh.visible = false; }
 
    this.activatedIndices.length = 0;
    for (let i = 0; i < this.particleCount; i++) {
      this.activated[i] = true; this.activationTime[i] = 0; this.activatedIndices.push(i);
      const idx = i * 3;
      const px = this.particlePositions[idx];
      const xNorm = (px - this.particleField.minX) / (this.particleField.maxX - this.particleField.minX);
      this.particleColors[idx]     = THREE.MathUtils.lerp(this.blueColorLight.r, this.blueColorDark.r, xNorm);
      this.particleColors[idx + 1] = THREE.MathUtils.lerp(this.blueColorLight.g, this.blueColorDark.g, xNorm);
      this.particleColors[idx + 2] = THREE.MathUtils.lerp(this.blueColorLight.b, this.blueColorDark.b, xNorm);
    }
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.updateSkyColor();
    this.manualMode = true; this.manualProgress = 1;
  }
 
  update(elapsedTime) {
    if (this.manualMode) {
      const targetTime = this.manualProgress * this.manualDuration;
      if (targetTime < this.manualTime) this.resetCycle();
      while (this.manualTime + this.manualStep <= targetTime) {
        this.manualTime += this.manualStep; this.stepSimulation(this.manualTime);
      }
      if (targetTime > this.manualTime) { this.manualTime = targetTime; this.stepSimulation(this.manualTime); }
      return;
    }
    if (this.cycleStart === 0) this.cycleStart = elapsedTime;
    this.stepSimulation(elapsedTime - this.cycleStart);
  }
}