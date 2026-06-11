import * as THREE from "three";
import { createRayleighSpectralMaterial } from "../shaders/OndasShader.js";

/**
 * SunsetLocalScene — Escala Local del Atardecer
 *
 * Lo que una persona observa desde la superficie terrestre.
 * El cielo cambia de color de forma sincronizada con la hora del día.
 * Basado en Dispersión de Rayleigh: la luz solar interactúa con la atmósfera
 * y las longitudes de onda cortas (azul) se dispersan más que las largas (rojo).
 */
export class SunsetLocalScene extends THREE.Group {
  constructor() {
    super();

    this.timeOfDay = 12;
    this.sunDirection = new THREE.Vector3(0, 1, 0).normalize();

    // Propiedades usadas por App.js para niebla/fondo
    this.fogColor = new THREE.Color(0x87b8ff);
    this.fogDensity = 0.012;

    this._initSkyDome();
    this._initGround();
    this._initBuildings();
    this._initSunSphere();
    this._initHorizonGlow();
    this._initLighting();
    this._initAtmosphericParticles();

    this.setTimeOfDay(this.timeOfDay);
  }

  // ─── ESCENA ────────────────────────────────────────────────────────────────

  _initSkyDome() {
    const domeGeo = new THREE.SphereGeometry(220, 64, 32);

    this.skyMaterial = createRayleighSpectralMaterial({
      sunDirection: this.sunDirection,
      sunIntensity: 12.0,
      rayleighStrength: 1.3,
      mieStrength: 0.003,
      densityFalloff: 1.15,
      planetRadius: 180.0,
      atmosphereRadius: 220.0,
      alpha: 0.95,
      exposure: 1.15,
      blueBoost: 1.4,
      redBoost: 1.5,
      isNight: 0.0, // ← NUEVO: controla si es noche
      side: THREE.BackSide,
    });

    const dome = new THREE.Mesh(domeGeo, this.skyMaterial);
    dome.position.y = 18;
    this.add(dome);
  }

  _initGround() {
    const groundGeo = new THREE.PlaneGeometry(400, 400, 1, 1);
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x9b8264,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.2;
    this.add(ground);
  }

  _initBuildings() {
    // Pequeña ciudad en el horizonte — muestra la escala humana
    const configs = [
      { x: -36, z: -45, w: 4.5, h: 8, d: 4 },
      { x: -28, z: -42, w: 3, h: 5.5, d: 3.2 },
      { x: -21, z: -48, w: 5.5, h: 11, d: 5 },
      { x: -13, z: -44, w: 3, h: 7, d: 3.5 },
      { x: -5, z: -52, w: 6, h: 13, d: 5.5 },
      { x: 5, z: -49, w: 4, h: 9.5, d: 4 },
      { x: 14, z: -44, w: 3, h: 6, d: 3 },
      { x: 23, z: -46, w: 5, h: 10, d: 4.5 },
      { x: 32, z: -42, w: 3.5, h: 6, d: 3.5 },
      { x: 42, z: -45, w: 4, h: 8, d: 4 },
      { x: -50, z: -48, w: 5, h: 9, d: 4.5 },
      { x: 50, z: -47, w: 4, h: 7, d: 4 },
    ];

    this.buildings = [];
    this.roofMats = [];
    this.wallMats = [];

    configs.forEach(({ x, z, w, h, d }) => {
      const group = new THREE.Group();

      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xd4b896,
        roughness: 0.85,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.9,
      });

      this.wallMats.push(wallMat);
      this.roofMats.push(roofMat);

      // Cuerpo principal
      const bodyGeo = new THREE.BoxGeometry(w, h, d);
      const body = new THREE.Mesh(bodyGeo, wallMat);
      body.position.y = h / 2;
      group.add(body);

      // Techo
      const roofH = h * 0.35;
      const roofGeo = new THREE.ConeGeometry((Math.max(w, d) / 2) * 1.1, roofH, 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = h + roofH / 2;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);

      // Ventana (decorativa)
      const winGeo = new THREE.PlaneGeometry(w * 0.25, h * 0.2);
      const winMat = new THREE.MeshBasicMaterial({
        color: 0xffdd88,
        transparent: true,
        opacity: 0.6,
      });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(0, h * 0.45, d / 2 + 0.01);
      group.add(win);

      group.position.set(x, -2.2, z);
      this.buildings.push(group);
      this.add(group);
    });
  }

  _initSunSphere() {
    // Esfera del Sol visible en el cielo
    const sunGeo = new THREE.SphereGeometry(4, 32, 32);
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
    this.sunSphere = new THREE.Mesh(sunGeo, this.sunMat);
    this.add(this.sunSphere);

    // Halo interior
    const haloInGeo = new THREE.SphereGeometry(6, 32, 32);
    this.haloInMat = new THREE.MeshBasicMaterial({
      color: 0xffd580,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloInner = new THREE.Mesh(haloInGeo, this.haloInMat);
    this.add(this.haloInner);

    // Halo exterior
    const haloOutGeo = new THREE.SphereGeometry(10, 32, 32);
    this.haloOutMat = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloOuter = new THREE.Mesh(haloOutGeo, this.haloOutMat);
    this.add(this.haloOuter);
  }

  _initHorizonGlow() {
    // Brillo cálido en el horizonte durante el atardecer
    const glowCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(glowCount * 3);
    const colors = new Float32Array(glowCount * 3);

    for (let i = 0; i < glowCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 100 + Math.random() * 100;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = -2 + Math.random() * 15; // cerca del horizonte
      positions[i * 3 + 2] = Math.sin(angle) * r;

      // Inicia transparente
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.3;
      colors[i * 3 + 2] = 0.0;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    this.horizonGlowMat = new THREE.PointsMaterial({
      size: 0.8,
      transparent: true,
      opacity: 0.0,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.horizonGlow = new THREE.Points(geometry, this.horizonGlowMat);
    this.add(this.horizonGlow);
  }

  _initLighting() {
    // Luz ambiental — color cambia con la hora
    this.ambientLight = new THREE.AmbientLight(0xb0c8e8, 0.55);
    this.add(this.ambientLight);

    // Luz solar directa — se mueve con el Sol
    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.5);
    this.sunLight.position.set(30, 50, 10);
    this.add(this.sunLight);

    // Luz hemisférica — cielo vs suelo
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xc8a06a, 0.4);
    this.add(this.hemiLight);
  }

  _initAtmosphericParticles() {
    // Partículas de dispersión en la atmósfera
    this.particleCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    this._particleVel = new Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this._resetParticle(i, positions, colors);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    this.atmosphericParticles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.5,
        transparent: true,
        opacity: 0.65,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.add(this.atmosphericParticles);
  }

  _resetParticle(i, positions, colors) {
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const r = THREE.MathUtils.lerp(140, 210, Math.random());

    positions[i * 3] = dir.x * r;
    positions[i * 3 + 1] = dir.y * r + 18;
    positions[i * 3 + 2] = dir.z * r;

    const axis = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const vel = new THREE.Vector3().crossVectors(dir, axis).normalize();
    vel.multiplyScalar(0.008 + Math.random() * 0.01);
    this._particleVel[i] = vel;

    const c = this._getParticleColor(dir);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  _getParticleColor(dir) {
    const sunDot = dir.dot(this.sunDirection);
    const horizon = 1.0 - Math.abs(dir.y);
    const sunset = THREE.MathUtils.smoothstep(-0.2, 0.3, -sunDot);

    // Elevación solar normalizada (0=horizonte, 1=cenit)
    const elev = this._currentElevation ?? 1.0;
    const sunsetStrength = 1.0 - elev;

    const blue = new THREE.Color(0x6fb3ff);
    const warm = new THREE.Color(0xff7733);
    const tint = blue.clone().lerp(warm, Math.max(sunset, sunsetStrength * 0.8));
    tint.lerp(new THREE.Color(0xffffff), horizon * 0.15);
    return tint;
  }

  // ─── CONTROL DE HORA ───────────────────────────────────────────────────────

  /**
   * Sincroniza toda la escena con la hora recibida desde App.js.
   * Esta es la misma variable timeOfDay compartida con SunsetGlobalScene.
   */
  /**
   * Sincroniza toda la escena con la hora recibida desde App.js.
   * Modificado para ciclo de 24 horas real y transición fluida a la noche.
   */
  setTimeOfDay(hour) {
    this.timeOfDay = hour;

    // Elevación solar: 0 en el horizonte (6h/18h), 1 en el cenit (12h). 0 en la noche.
    let elevation = 0;
    if (hour >= 6 && hour <= 18) {
      const t = (hour - 6) / 12;
      elevation = Math.sin(t * Math.PI); // Rango 0..1..0
    }
    this._currentElevation = elevation;
    
    // ─── CONTROL DE NOCHE PROGRESIVO (Evita cortes abruptos) ───
    let nightProgress = 0.0;
    if (hour >= 18 && hour <= 21) {
      nightProgress = (hour - 18) / 3.0; // De 6 PM a 9 PM se va oscureciendo (0 a 1)
    } else if (hour > 21 || hour < 5) {
      nightProgress = 1.0; // Noche cerrada
    } else if (hour >= 5 && hour < 6) {
      nightProgress = 1.0 - (hour - 5.0); // Amanecer (1 a 0)
    }

    // Dirección del Sol calculada de forma continua para las 24 horas
    const sunAngle = ((hour - 6) / 12) * Math.PI; 
    const sx = Math.cos(sunAngle - Math.PI / 2) * 0.95;
    const sy = Math.sin(sunAngle); // Permite valores negativos bajo el horizonte
    const sz = 0.2;
    this.sunDirection.set(sx, sy, sz).normalize();

    // Actualizar shader del cielo
    if (this.skyMaterial?.uniforms) {
      this.skyMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);

      // Enviamos nuevas variables de control al shader si existen
      if (this.skyMaterial.uniforms.uIsNight) this.skyMaterial.uniforms.uIsNight.value = nightProgress;
      if (this.skyMaterial.uniforms.uElevation) this.skyMaterial.uniforms.uElevation.value = elevation;

      // Atenuar intensidades dinámicamente al entrar la noche
      this.skyMaterial.uniforms.uBlueBoost.value = (0.6 + elevation * 1.2) * (1.0 - nightProgress);
      this.skyMaterial.uniforms.uRedBoost.value = (2.2 - elevation * 0.9) * (1.0 - nightProgress);
      this.skyMaterial.uniforms.uSunIntensity.value = (8.0 + elevation * 5.0) * (1.0 - nightProgress * 0.98);
      this.skyMaterial.uniforms.uMieStrength.value = (0.001 + (1 - elevation) * 0.006) * (1.0 - nightProgress);
    }

    // ── Posición del Sol en el cielo local ──
    const skyDist = 175;
    const sunX = Math.cos(sunAngle - Math.PI / 2) * 90;
    const sunY = sy * skyDist * 0.9 + 18;
    const sunZ = -skyDist * 0.85;

    this.sunSphere.position.set(sunX, sunY, sunZ);
    this.haloInner.position.copy(this.sunSphere.position);
    this.haloOuter.position.copy(this.sunSphere.position);

    // Ocultar astros físicos si el Sol baja del horizonte
    const isAboveHorizon = sy > 0;
    this.sunSphere.visible = isAboveHorizon;
    this.haloInner.visible = isAboveHorizon;
    this.haloOuter.visible = isAboveHorizon;

    // ── Color del Sol según elevación ──
    const sunColor = this._getSunColor(elevation);
    this.sunMat.color.set(sunColor);
    this.haloInMat.color.set(this._getSunHaloColor(elevation));
    this.haloOutMat.color.set(this._getSunOuterGlowColor(elevation));

    // ── Iluminación dinámica afectada por la noche ──
    this.sunLight.color.set(this._getLightColor(elevation));
    this.sunLight.intensity = isAboveHorizon ? (0.1 + elevation * 2.2) : 0.0;
    this.sunLight.position.copy(this.sunSphere.position).multiplyScalar(0.1);

    // Color ambiental: Interpolamos hacia un azul oscuro/negro nocturno
    let ambientColor = new THREE.Color(this._getAmbientColor(elevation));
    const nightAmbient = new THREE.Color(0x020208);
    ambientColor.lerp(nightAmbient, nightProgress);
    this.ambientLight.color.set(ambientColor);
    this.ambientLight.intensity = (0.15 + elevation * 0.5) * (1.0 - nightProgress * 0.7);

    // Luz hemisférica nocturna
    let hemiSky = new THREE.Color(this._getSkyHemiColor(elevation));
    let hemiGround = new THREE.Color(this._getGroundHemiColor(elevation));
    hemiSky.lerp(new THREE.Color(0x050510), nightProgress);
    hemiGround.lerp(new THREE.Color(0x020202), nightProgress);
    this.hemiLight.color.set(hemiSky);
    this.hemiLight.groundColor.set(hemiGround);
    this.hemiLight.intensity = (0.2 + elevation * 0.35) * (1.0 - nightProgress * 0.8);

    // ── Horizonte cálido (se apaga en la noche) ──
    const sunsetGlow = Math.max(0, 1.0 - elevation * 2.5) * (1.0 - nightProgress);
    this.horizonGlowMat.opacity = sunsetGlow * 0.55;

    // ── Color del suelo (se oscurece en la noche) ──
    let groundColor = new THREE.Color(0x9b8264).lerp(
      new THREE.Color(0xc87840),
      sunsetGlow * 0.6
    );
    groundColor.lerp(new THREE.Color(0x0a0907), nightProgress);
    this.groundMat.color.set(groundColor);

    // ── Color de niebla/fondo interpolado a negro noche ──
    let skyBgColor = new THREE.Color(this._getSkyBgColor(elevation));
    const nightSkyBg = new THREE.Color(0x010105); 
    skyBgColor.lerp(nightSkyBg, nightProgress);
    this.fogColor.set(skyBgColor);
    this.fogDensity = 0.008 + (1 - elevation) * 0.006 + nightProgress * 0.004;

    // ── Ventanas de edificios (brillan en la noche) ──
    this.buildings.forEach((building) => {
      building.children.forEach((mesh) => {
        if (mesh.geometry.type === "PlaneGeometry") {
          mesh.material.opacity = 0.1 + nightProgress * 0.8;
        }
      });
    });
  }

  // ─── PALETAS DE COLOR ──────────────────────────────────────────────────────

  _getSunColor(e) {
    if (e > 0.75) return 0xfffaf0;
    if (e > 0.5) return 0xfff2c0;
    if (e > 0.3) return 0xffcc66;
    if (e > 0.12) return 0xff9922;
    if (e > 0.01) return 0xff5500;
    return 0xcc2200;
  }

  _getSunHaloColor(e) {
    if (e > 0.5) return 0xffd580;
    if (e > 0.2) return 0xff9922;
    return 0xff4400;
  }

  _getSunOuterGlowColor(e) {
    if (e > 0.5) return 0xffaa44;
    if (e > 0.2) return 0xff6611;
    return 0xff2200;
  }

  _getLightColor(e) {
    if (e > 0.75) return 0xfff5e0;
    if (e > 0.5) return 0xffe9b0;
    if (e > 0.3) return 0xffcc70;
    if (e > 0.1) return 0xff9933;
    return 0xff5511;
  }

  _getAmbientColor(e) {
    if (e > 0.7) return 0xb0cce8;
    if (e > 0.4) return 0xe8c080;
    if (e > 0.15) return 0xff8844;
    if (e > 0.0) return 0xcc5522;
    return 0x442211;
  }

  _getSkyHemiColor(e) {
    if (e > 0.7) return 0x87ceeb;
    if (e > 0.4) return 0xd4963c;
    if (e > 0.15) return 0xff7722;
    return 0x441108;
  }

  _getGroundHemiColor(e) {
    if (e > 0.5) return 0xc8a56a;
    if (e > 0.2) return 0xb86030;
    return 0x552211;
  }

  _getSkyBgColor(e) {
    if (e > 0.7) return 0x87b8ff; // Azul intenso (mediodía)
    if (e > 0.5) return 0xa8ccdd; // Azul suave (tarde)
    if (e > 0.3) return 0xe8954a; // Naranja (atardecer)
    if (e > 0.1) return 0xff6622; // Naranja intenso
    if (e > 0.0) return 0xcc3311; // Rojo
    return 0x3a1208;             // Rojo oscuro (post-atardecer)
  }

  // ─── ANIMACIÓN ─────────────────────────────────────────────────────────────

  update(elapsedTime) {
    if (!this.atmosphericParticles) return;

    const positions = this.atmosphericParticles.geometry.attributes.position.array;
    const colors = this.atmosphericParticles.geometry.attributes.color.array;

    for (let i = 0; i < this.particleCount; i++) {
      let x = positions[i * 3];
      let y = positions[i * 3 + 1] - 18;
      let z = positions[i * 3 + 2];

      x += this._particleVel[i].x;
      y += this._particleVel[i].y;
      z += this._particleVel[i].z;

      const dir = new THREE.Vector3(x, y, z).normalize();
      const r = 140 + ((i * 37) % 70);

      positions[i * 3] = dir.x * r;
      positions[i * 3 + 1] = dir.y * r + 18;
      positions[i * 3 + 2] = dir.z * r;

      const c = this._getParticleColor(dir);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    this.atmosphericParticles.geometry.attributes.position.needsUpdate = true;
    this.atmosphericParticles.geometry.attributes.color.needsUpdate = true;

    // Pulso suave del halo solar
    if (this.haloInner?.visible) {
      const pulse = 1 + Math.sin(elapsedTime * 1.8) * 0.03;
      this.haloInner.scale.setScalar(pulse);
      this.haloOuter.scale.setScalar(1 + Math.sin(elapsedTime * 1.1) * 0.04);
    }
  }
}