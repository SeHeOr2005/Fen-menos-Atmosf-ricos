import * as THREE from "three";
 
// Vectores reutilizables para optimización de memoria
const _tmpVec = new THREE.Vector3();
const _UP     = new THREE.Vector3(0, 1, 0);
 
export class RayleighGlobalScene extends THREE.Group {
  constructor() {
    super();
 
    // ── Estado general ──────────────────────────────────────────────────
    this.backgroundColor = new THREE.Color(0x000000);
 
    // Partículas de la atmósfera
    this.particleCount = 18000;
    this.atmosphereRadius = 3.8;   
    this.atmosphereInner  = 3.15;  
 
    // Configuración del Sol (Mockup superior derecho)
    this.sunPos = new THREE.Vector3(12.0, 4.5, 0.0);
    this.waveSpeed = 4.5; // Velocidad de propagación de las líneas
 
    // Timings base de dispersión (escalables)
    this.BASE_scatterDelay    = 0.018;
    this.BASE_fadeDuration    = 0.22;
    this.BASE_blueHitInterval = 0.018;
    this.BASE_rayDuration     = 0.50;
    this.BASE_waveLingerDuration = 1.2;
 
    this.scatterDelay        = this.BASE_scatterDelay;
    this.fadeDuration        = this.BASE_fadeDuration;
    this.blueHitInterval     = this.BASE_blueHitInterval;
    this.rayDuration         = this.BASE_rayDuration;
    this.waveLingerDuration  = this.BASE_waveLingerDuration;
 
    this.scatterRadius = 0.55;   
 
    // Estado del ciclo
    this.cycleStart      = 0;
    this.initialHitDone  = false;
    this.hitTime         = -1;
    this.scatterQueue    = [];   
 
    // Modo manual / Scrubbing
    this.manualMode     = false;
    this.manualProgress = 0;
    this.manualTime     = 0;
    this.manualDuration = 12;   
    this.manualStep     = 0.05;
 
    this.activated       = new Array(this.particleCount).fill(false);
    this.activationTime  = new Array(this.particleCount).fill(0);
    this.activatedIndices = [];
 
    // Colores del sistema
    this.brownColor  = new THREE.Color(0x8B5E3C);   // Partícula inactiva (Café)
    this.blueColor  = new THREE.Color(0x0a2a6e);   // Partícula activa (Azul profundo)
 
    // Inicializaciones
    this.initSpace();
    this.initEarth();
    this.initSunVisual(); 
    this.initAtmosphereParticles();
    this.initWavyLines(); // Configuración de salida simultánea y escape recto
    this.initTransmissionRayPool();
    this.initImpactFlash();
    this.initLighting();
    this._buildSpatialGrid(); 
  }
 
  // ── Escenario ─────────────────────────────────────────────────────────
 
  initSpace() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const r     = 60 + Math.random() * 40;
      const theta = 2 * Math.PI * Math.random();
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.12, transparent: true, opacity: 0.75,
    })));
  }
 
  initEarth() {
    const loader = new THREE.TextureLoader();
    const earthGeo = new THREE.SphereGeometry(3, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map:         loader.load("https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_atmos_2048.jpg"),
      specularMap: loader.load("https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_specular_2048.jpg"),
      normalMap:   loader.load("https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_normal_2048.jpg"),
      shininess: 15,
    });
    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.add(this.earth);
 
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x4fa6ff, transparent: true, opacity: 0.12,
      side: THREE.BackSide, blending: THREE.AdditiveBlending,
    });
    this.add(new THREE.Mesh(new THREE.SphereGeometry(3.1, 64, 64), atmMat));
  }
 
  initSunVisual() {
    const sunGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.copy(this.sunPos);
    this.add(this.sunMesh);
  }
 
  initLighting() {
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.copy(this.sunPos);
    this.add(sunLight);
    this.add(new THREE.AmbientLight(0x333333));
  }
 
  // ── Partículas atmosféricas ───────────────────────────────────────────
 
  initAtmosphereParticles() {
    const geo      = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors    = new Float32Array(this.particleCount * 3);
 
    for (let i = 0; i < this.particleCount; i++) {
      const { x, y, z } = this._randomShellPoint();
      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
 
      colors[i * 3]     = this.brownColor.r;
      colors[i * 3 + 1] = this.brownColor.g;
      colors[i * 3 + 2] = this.brownColor.b;
    }
 
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
 
    const mat = new THREE.PointsMaterial({
      size: 0.055,
      transparent: true,
      opacity: 0.88,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
 
    this.particleGeo      = geo;
    this.particleColors   = colors;
    this.particlePositions = positions;
    this.particlePoints   = new THREE.Points(geo, mat);
    this.add(this.particlePoints);
  }
 
  _randomShellPoint() {
    const rMin3 = Math.pow(this.atmosphereInner,  3);
    const rMax3 = Math.pow(this.atmosphereRadius, 3);
    const r     = Math.pow(rMin3 + Math.random() * (rMax3 - rMin3), 1 / 3);
    const theta = 2 * Math.PI * Math.random();
    const phi   = Math.acos(2 * Math.random() - 1);
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
    };
  }
 
  // ── Ondas Sinuosas Modificadas (Salida Realista y Simultánea) ──────────
 
  initWavyLines() {
    // Coordenadas clave de la atmósfera para definir las líneas visuales
    const blueAtmospherePoint  = new THREE.Vector3(2.2, 2.3, 0);
    const greenAtmospherePoint = new THREE.Vector3(2.9, 1.1, 0);
    const redAtmospherePoint   = new THREE.Vector3(3.1, -0.4, 0);
 
    // Direcciones desde el Sol
    const dirBlue  = new THREE.Vector3().subVectors(blueAtmospherePoint, this.sunPos).normalize();
    const dirGreen = new THREE.Vector3().subVectors(greenAtmospherePoint, this.sunPos).normalize();
    const dirRed   = new THREE.Vector3().subVectors(redAtmospherePoint, this.sunPos).normalize();
 
    // Distancia lejana para salir completamente del viewport de la pantalla
    const screenExitDistance = 34.0;
    const greenFarTarget = new THREE.Vector3().copy(this.sunPos).addScaledVector(dirGreen, screenExitDistance);
    const redFarTarget   = new THREE.Vector3().copy(this.sunPos).addScaledVector(dirRed, screenExitDistance);
 
    // Configuración estructural de las ondas: ¡TODAS SALEN JUNTAS (delay: 0)!
    this.waves = [
      { 
        type: "blue",  
        delay: 0.0, 
        color: 0x00aaff, 
        opacity: 0.90, 
        origin: this.sunPos.clone(),
        target: blueAtmospherePoint, 
        dir: dirBlue,
        totalDist: this.sunPos.distanceTo(blueAtmospherePoint),
        passStraightThrough: false
      },
      { 
        type: "green", 
        delay: 0.0, 
        color: 0x44ff88, 
        opacity: 0.70, 
        origin: this.sunPos.clone(),
        target: greenFarTarget, 
        dir: dirGreen,
        totalDist: screenExitDistance,
        passStraightThrough: true
      },
      { 
        type: "red",   
        delay: 0.0, 
        color: 0xff5555, 
        opacity: 0.70, 
        origin: this.sunPos.clone(),
        target: redFarTarget, 
        dir: dirRed,
        totalDist: screenExitDistance,
        passStraightThrough: true
      }
    ];
 
    const POINTS_PER_LINE = 100;
 
    for (const w of this.waves) {
      const geo = new THREE.BufferGeometry();
      const pArray = new Float32Array(POINTS_PER_LINE * 3);
      geo.setAttribute("position", new THREE.BufferAttribute(pArray, 3));
      
      const mat = new THREE.LineBasicMaterial({
        color: w.color,
        transparent: true,
        opacity: w.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
 
      w.line = new THREE.Line(geo, mat);
      w.line.visible = false;
      this.add(w.line);
      w.pArray = pArray;
 
      const arrowGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
      arrowGeo.rotateZ(-Math.PI / 2); 
      const arrowMat = new THREE.MeshBasicMaterial({ color: w.color, transparent: true, opacity: w.opacity });
      w.arrow = new THREE.Mesh(arrowGeo, arrowMat);
      w.arrow.visible = false;
      this.add(w.arrow);
    }
  }
 
  // ── Rayos de transmisión (pool) ───────────────────────────────────────
 
  initTransmissionRayPool() {
    this.rayPool = [];
    const POOL_SIZE = 400;
    const TUBE_RADIUS = 0.022;
 
    for (let i = 0; i < POOL_SIZE; i++) {
      const geo = new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, 1, 5, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
 
      const pivot = new THREE.Object3D();
      const mesh  = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.5; 
      pivot.add(mesh);
      pivot.visible = false;
      this.add(pivot);
 
      this.rayPool.push({
        pivot, mesh,
        active: false,
        startTime: 0,
        ox: 0, oy: 0, oz: 0,
        tx: 0, ty: 0, tz: 0,
      });
    }
    this._poolCursor = 0;
  }
 
  initImpactFlash() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
 
    const mat = new THREE.PointsMaterial({
      color: 0x55ccff,
      size: 0.8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
 
    this._flash = new THREE.Points(geo, mat);
    this._flashPos = pos;
    this._flashActive = false;
    this._flashStart  = 0;
    this._flashDur    = 0.55;
    this.add(this._flash);
  }
 
  // ── Lógica de dispersión Rayleigh ─────────────────────────────────────
 
  _spawnFlash(x, y, z, t) {
    this._flashPos[0] = x; this._flashPos[1] = y; this._flashPos[2] = z;
    this._flash.geometry.attributes.position.needsUpdate = true;
    this._flashActive = true;
    this._flashStart  = t;
    this._flash.material.opacity = 1.0;
    this._flash.material.size    = 0.9;
  }
 
  _updateFlash(t) {
    if (!this._flashActive) return;
    const age = t - this._flashStart;
    if (age >= this._flashDur) {
      this._flashActive = false;
      this._flash.material.opacity = 0;
      return;
    }
    const p = age / this._flashDur;
    this._flash.material.size    = THREE.MathUtils.lerp(0.9, 0.1, p);
    this._flash.material.opacity = p < 0.15 ? 1.0 : (1 - (p - 0.15) / 0.85);
  }
 
  _spawnRay(originIdx, targetIdx, t) {
    const pool = this.rayPool;
    const size = pool.length;
    let slot = null;
 
    for (let attempt = 0; attempt < size; attempt++) {
      const c = pool[this._poolCursor];
      this._poolCursor = (this._poolCursor + 1) % size;
      if (!c.active) { slot = c; break; }
    }
    if (!slot) {
      let oldest = pool[0];
      for (let k = 1; k < size; k++) {
        if (pool[k].startTime < oldest.startTime) oldest = pool[k];
      }
      slot = oldest;
    }
 
    const oi = originIdx * 3;
    const ti = targetIdx * 3;
 
    slot.active    = true;
    slot.startTime = t;
    slot.ox = this.particlePositions[oi];
    slot.oy = this.particlePositions[oi + 1];
    slot.oz = this.particlePositions[oi + 2];
    slot.tx = this.particlePositions[ti];
    slot.ty = this.particlePositions[ti + 1];
    slot.tz = this.particlePositions[ti + 2];
 
    slot.pivot.position.set(slot.ox, slot.oy, slot.oz);
    slot.mesh.scale.y = 0.001; 
    slot.pivot.visible = true;
    slot.mesh.material.opacity = 0.9;
 
    _tmpVec.set(slot.tx - slot.ox, slot.ty - slot.oy, slot.tz - slot.oz);
    slot._totalDist = _tmpVec.length();
    _tmpVec.normalize();
    slot.pivot.quaternion.setFromUnitVectors(_UP, _tmpVec);
  }
 
  _updateRays(t) {
    for (const ray of this.rayPool) {
      if (!ray.active) continue;
      const age = t - ray.startTime;
      if (age >= this.rayDuration) {
        ray.active = false;
        ray.pivot.visible = false;
        ray.mesh.material.opacity = 0;
        continue;
      }
      const p = age / this.rayDuration;
      const tipT = Math.min(p / 0.7, 1);
      ray.mesh.scale.y = Math.max(tipT * ray._totalDist, 0.001);
 
      ray.mesh.material.opacity = p < 0.15
        ? (p / 0.15) * 0.9
        : p > 0.6
          ? (1 - (p - 0.6) / 0.4) * 0.9
          : 0.9;
    }
  }
 
  _activateParticle(index, t) {
    if (this.activated[index]) return;
    this.activated[index]      = true;
    this.activationTime[index] = t;
    this.activatedIndices.push(index);
    this.scatterQueue.push({ time: t + this.scatterDelay, originIndex: index });
  }
 
  _buildSpatialGrid() {
    const cs = this.scatterRadius * 2.0; 
    this._gridCellSize = cs;
    this._grid = new Map();
 
    for (let i = 0; i < this.particleCount; i++) {
      const key = this._gridKey(
        this.particlePositions[i * 3],
        this.particlePositions[i * 3 + 1],
        this.particlePositions[i * 3 + 2],
      );
      if (!this._grid.has(key)) this._grid.set(key, []);
      this._grid.get(key).push(i);
    }
  }
 
  _gridKey(x, y, z) {
    const cs = this._gridCellSize;
    const ix = Math.floor(x / cs);
    const iy = Math.floor(y / cs);
    const iz = Math.floor(z / cs);
    return `${ix},${iy},${iz}`;
  }
 
  _pickNextParticle(originIndex) {
    const oi = originIndex * 3;
    const ox = this.particlePositions[oi];
    const oy = this.particlePositions[oi + 1];
    const oz = this.particlePositions[oi + 2];
    const cs = this._gridCellSize;
    const r  = this.scatterRadius;
 
    const cx = Math.floor(ox / cs);
    const cy = Math.floor(oy / cs);
    const cz = Math.floor(oz / cs);
 
    let bestIdx  = -1;
    let bestDist = Infinity;
 
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this._grid.get(key);
          if (!cell) continue;
          for (const i of cell) {
            if (this.activated[i]) continue;
            const ddx = this.particlePositions[i * 3]     - ox;
            const ddy = this.particlePositions[i * 3 + 1] - oy;
            const ddz = this.particlePositions[i * 3 + 2] - oz;
            const d2  = ddx * ddx + ddy * ddy + ddz * ddz;
            if (d2 <= r * r && d2 < bestDist) {
              bestDist = d2;
              bestIdx  = i;
            }
          }
        }
      }
    }
 
    if (bestIdx === -1) {
      let nearDist = Infinity;
      for (let i = 0; i < this.particleCount; i++) {
        if (this.activated[i]) continue;
        const ddx = this.particlePositions[i * 3]     - ox;
        const ddy = this.particlePositions[i * 3 + 1] - oy;
        const ddz = this.particlePositions[i * 3 + 2] - oz;
        const d2  = ddx * ddx + ddy * ddy + ddz * ddz;
        if (d2 < nearDist) { nearDist = d2; bestIdx = i; }
      }
    }
    return bestIdx;
  }
 
  _processScatterQueue(t) {
    let changed = false;
    for (let i = 0; i < this.scatterQueue.length; i++) {
      const event = this.scatterQueue[i];
      if (t < event.time) continue;
 
      this.scatterQueue.splice(i, 1);
      i--;
 
      const nextIdx = this._pickNextParticle(event.originIndex);
      if (nextIdx === -1) continue;
 
      this._spawnRay(event.originIndex, nextIdx, t);
      this._activateParticle(nextIdx, t); 
      changed = true;
    }
    return changed;
  }
 
  _triggerAtmosphereHit(targetPos, t) {
    let bestIdx  = -1;
    let bestDist = Infinity;
 
    for (let i = 0; i < this.particleCount; i++) {
      const px = this.particlePositions[i * 3];
      const py = this.particlePositions[i * 3 + 1];
      const pz = this.particlePositions[i * 3 + 2];
      const dx = px - targetPos.x;
      const dy = py - targetPos.y;
      const dz = pz - targetPos.z;
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < bestDist) {
        bestDist = d2;
        bestIdx = i;
      }
    }
 
    if (bestIdx !== -1) {
      this._activateParticle(bestIdx, t);
      this.initialHitDone = true;
      this.hitTime = t;
 
      const bi = bestIdx * 3;
      this._spawnFlash(
        this.particlePositions[bi],
        this.particlePositions[bi + 1],
        this.particlePositions[bi + 2],
        t,
      );
    }
  }
 
  _updateParticleColors(t) {
    if (!this.activatedIndices.length) return false;
    let changed = false;
 
    for (const idx of this.activatedIndices) {
      const i = idx * 3;
      const progress = Math.min((t - this.activationTime[idx]) / this.fadeDuration, 1);
 
      this.particleColors[i]     = THREE.MathUtils.lerp(this.brownColor.r, this.blueColor.r, progress);
      this.particleColors[i + 1] = THREE.MathUtils.lerp(this.brownColor.g, this.blueColor.g, progress);
      this.particleColors[i + 2] = THREE.MathUtils.lerp(this.brownColor.b, this.blueColor.b, progress);
      changed = true;
    }
    return changed;
  }
 
  // ── Métodos públicos obligatorios de API ────────────────────────────────
 
  setPlaybackSpeed(speed) {
    this.scatterDelay       = this.BASE_scatterDelay       / speed;
    this.fadeDuration       = this.BASE_fadeDuration       / speed;
    this.rayDuration        = this.BASE_rayDuration        / speed;
    this.waveLingerDuration = this.BASE_waveLingerDuration / speed;
  }
 
  setTimeOfDay(_hour) { }
 
  setManualMode(isManual) {
    this.manualMode = isManual;
    this.resetCycle();
    this.manualProgress = 0;
    this.manualTime     = 0;
  }
 
  setManualProgress(value) {
    this.manualProgress = THREE.MathUtils.clamp(value, 0, 1);
  }
 
  jumpToEnd() {
    this.activatedIndices.length = 0;
    for (let i = 0; i < this.particleCount; i++) {
      this.activated[i]      = true;
      this.activationTime[i] = 0;
      this.activatedIndices.push(i);
      const idx = i * 3;
      this.particleColors[idx]     = this.blueColor.r;
      this.particleColors[idx + 1] = this.blueColor.g;
      this.particleColors[idx + 2] = this.blueColor.b;
    }
    this.particleGeo.attributes.color.needsUpdate = true;
 
    for (const w of this.waves) {
      w.line.visible = false;
      w.arrow.visible = false;
    }
    for (const ray of this.rayPool) {
      ray.active = false;
      ray.pivot.visible = false;
      ray.mesh.material.opacity = 0;
    }
    this._flashActive = false;
    if (this._flash) this._flash.material.opacity = 0;
 
    this.manualMode     = true;
    this.manualProgress = 1;
    this.initialHitDone = true;
    this.scatterQueue   = [];
  }
 
  resetCycle() {
    this.cycleStart     = 0;
    this.initialHitDone = false;
    this.hitTime        = -1;
    this.scatterQueue   = [];
    this.manualTime     = 0;
 
    this.activated.fill(false);
    this.activationTime.fill(0);
    this.activatedIndices.length = 0;
 
    this._flashActive = false;
    if (this._flash) this._flash.material.opacity = 0;
 
    for (const ray of this.rayPool) {
      ray.active = false;
      ray.pivot.visible = false;
      ray.mesh.material.opacity = 0;
    }
 
    for (const w of this.waves) {
      w.line.visible = false;
      w.arrow.visible = false;
    }
 
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      this.particleColors[idx]     = this.brownColor.r;
      this.particleColors[idx + 1] = this.brownColor.g;
      this.particleColors[idx + 2] = this.brownColor.b;
    }
    this.particleGeo.attributes.color.needsUpdate = true;
  }
 
  /** Loop de simulación principal con lógica física realista */
  stepSimulation(localTime) {
    let colorsChanged = false;
    const POINTS_PER_LINE = 100;
 
    for (const w of this.waves) {
      const wt = localTime - w.delay;
      if (wt < 0) {
        w.line.visible = false;
        w.arrow.visible = false;
        continue;
      }
 
      const currentDist = this.waveSpeed * wt;
 
      // Validación de fin de ciclo para Verde y Roja (Desaparecen al salir de pantalla)
      if (w.passStraightThrough && currentDist >= w.totalDist) {
        w.line.visible = false;
        w.arrow.visible = false;
        continue;
      }
 
      // Validación de fin de ciclo para Azul (Impacto en atmósfera)
      if (!w.passStraightThrough && currentDist >= w.totalDist) {
        if (!this.initialHitDone) {
          this._triggerAtmosphereHit(w.target, localTime);
        }
      }
 
      let pHead = currentDist / w.totalDist;
      if (pHead > 1.0) pHead = 1.0;
 
      // Efecto lingering (desvanecimiento) para la línea azul después de chocar
      if (w.type === "blue" && this.initialHitDone) {
        const since = localTime - this.hitTime;
        if (since >= this.waveLingerDuration) {
          w.line.visible = false;
          w.arrow.visible = false;
          continue;
        }
        const fadeStart = this.waveLingerDuration * 0.7;
        const alpha = since > fadeStart
          ? THREE.MathUtils.lerp(w.opacity, 0, (since - fadeStart) / (this.waveLingerDuration * 0.3))
          : w.opacity;
        w.line.material.opacity = alpha;
        w.arrow.material.opacity = alpha;
        pHead = 1.0; 
      } else {
        w.line.material.opacity = w.opacity;
        w.arrow.material.opacity = w.opacity;
      }
 
      w.line.visible = true;
      w.arrow.visible = true;
 
      // Vector ortogonal plano para distorsionar la línea senoidal en dirección correcta
      const perp = new THREE.Vector3(-w.dir.y, w.dir.x, 0).normalize();
 
      let headX = w.origin.x;
      let headY = w.origin.y;
      let headZ = w.origin.z;
 
      // Regeneración dinámica del Buffer de posiciones
      for (let i = 0; i < POINTS_PER_LINE; i++) {
        const ratio = i / (POINTS_PER_LINE - 1);
        const tLine = ratio * pHead; 
 
        const pos = new THREE.Vector3().lerpVectors(w.origin, w.target, tLine);
 
        // Efecto senoidal que simula la longitud de onda
        const frequency = w.passStraightThrough ? 2.2 : 4.0;
        const amplitude = 0.35;
        const waveOffset = Math.sin(tLine * w.totalDist * frequency - localTime * 9.0) * amplitude;
        pos.addScaledVector(perp, waveOffset);
 
        w.pArray[i * 3]     = pos.x;
        w.pArray[i * 3 + 1] = pos.y;
        w.pArray[i * 3 + 2] = pos.z;
 
        if (i === POINTS_PER_LINE - 1) {
          headX = pos.x; headY = pos.y; headZ = pos.z;
        }
      }
      w.line.geometry.attributes.position.needsUpdate = true;
      w.line.geometry.computeBoundingSphere();
 
      // Posicionamiento de la punta de flecha del mockup
      w.arrow.position.set(headX, headY, headZ);
      w.arrow.lookAt(w.target);
    }
 
    colorsChanged = this._processScatterQueue(localTime) || colorsChanged;
    colorsChanged = this._updateParticleColors(localTime) || colorsChanged;
 
    this._updateRays(localTime);
    this._updateFlash(localTime);
 
    if (colorsChanged) this.particleGeo.attributes.color.needsUpdate = true;
  }
 
  // ── Loop principal ────────────────────────────────────────────────────
 
  update(elapsedTime) {
    if (this.earth) this.earth.rotation.y = elapsedTime * 0.05;
 
    if (this.manualMode) {
      const targetTime = this.manualProgress * this.manualDuration;
      if (targetTime < this.manualTime) {
        this.resetCycle();
      }
      while (this.manualTime + this.manualStep <= targetTime) {
        this.manualTime += this.manualStep;
        this.stepSimulation(this.manualTime);
      }
      if (targetTime > this.manualTime) {
        this.manualTime = targetTime;
        this.stepSimulation(this.manualTime);
      }
      return;
    }
 
    if (this.cycleStart === 0) this.cycleStart = elapsedTime;
    const t = elapsedTime - this.cycleStart;
    this.stepSimulation(t);
  }
}