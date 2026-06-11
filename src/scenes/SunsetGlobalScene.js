import * as THREE from "three";
import { createRayleighSpectralMaterial } from "../shaders/OndasShader.js";

/**
 * SunsetGlobalScene — Escala Global del Atardecer
 */
export class SunsetGlobalScene extends THREE.Group {
  constructor() {
    super();

    this.timeOfDay = 12;
    this.sunDirection = new THREE.Vector3(1, 0, 0).normalize();
    this.backgroundColor = new THREE.Color(0x00000a);

    // Posición fija del observador en la superficie terrestre (ecuador, lado derecho)
    this.OBSERVER_POS = new THREE.Vector3(3.0, 0.0, 0.0);
    this.EARTH_RADIUS = 3.0;
    this.ATM_RADIUS = 3.42;

    this._initEarth();
    this._initSpace();
    this._initLighting();
    this._initSun();
    this._initObserver();
    this._initWavelengthRays();
    this._initScatterParticles();
    this._initPathIndicator();

    this.setTimeOfDay(this.timeOfDay);
  }

  // ─── TIERRA Y ATMÓSFERA ────────────────────────────────────────────────────

  _initEarth() {
    const loader = new THREE.TextureLoader();

    const earthMap = loader.load(
      "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_atmos_2048.jpg"
    );
    const normalMap = loader.load(
      "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_normal_2048.jpg"
    );

    const earthGeo = new THREE.SphereGeometry(this.EARTH_RADIUS, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      normalMap: normalMap,
      shininess: 10,
    });

    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.add(this.earth);

    // Capa de atmósfera visible
    const atmGeo = new THREE.SphereGeometry(this.ATM_RADIUS, 64, 64);
    this.atmosphereMaterial = createRayleighSpectralMaterial({
      sunDirection: this.sunDirection,
      sunIntensity: 11.0,
      rayleighStrength: 1.15,
      mieStrength: 0.0018,
      densityFalloff: 1.18,
      planetRadius: this.EARTH_RADIUS,
      atmosphereRadius: this.ATM_RADIUS + 0.4,
      alpha: 0.72,
      exposure: 1.25,
      blueBoost: 1.3,
      redBoost: 1.4,
      side: THREE.BackSide,
    });

    this.atmosphere = new THREE.Mesh(atmGeo, this.atmosphereMaterial);
    this.add(this.atmosphere);
  }

  _initSpace() {
    const starsGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const r = 60 + Math.random() * 40;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.add(
      new THREE.Points(
        starsGeo,
        new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.1,
          transparent: true,
          opacity: 0.85,
        })
      )
    );
  }

  _initLighting() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sunLight.position.set(15, 0, 0);
    this.add(this.sunLight);

    this.add(new THREE.AmbientLight(0x111820, 1.0));
  }

  _initSun() {
    const sunGeo = new THREE.SphereGeometry(0.9, 32, 32);
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    this.sunMesh = new THREE.Mesh(sunGeo, this.sunMat);
    this.add(this.sunMesh);

    const coronaGeo = new THREE.SphereGeometry(1.5, 32, 32);
    this.coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sunCorona = new THREE.Mesh(coronaGeo, this.coronaMat);
    this.add(this.sunCorona);
  }

  _initObserver() {
    this.observerGroup = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(0.2, 0.18, 0.16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.09;
    this.observerGroup.add(body);

    const roofGeo = new THREE.ConeGeometry(0.15, 0.12, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xa0522d });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.24;
    roof.rotation.y = Math.PI / 4;
    this.observerGroup.add(roof);

    const ringGeo = new THREE.TorusGeometry(0.22, 0.02, 8, 32);
    this.observerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, this.observerRingMat);
    ring.rotation.y = Math.PI / 2;
    this.observerGroup.add(ring);

    this.observerGroup.position.copy(this.OBSERVER_POS);
    this.observerGroup.lookAt(0, 0, 0);
    this.observerGroup.rotateY(Math.PI);
    this.add(this.observerGroup);
  }

  _initWavelengthRays() {
    this.raysGroup = new THREE.Group();
    this.add(this.raysGroup);

    const makeExteriorRay = (color) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        linewidth: 1,
      });
      return new THREE.Line(geo, mat);
    };

    this.blueExtRay = makeExteriorRay(0x6699ff);
    this.greenExtRay = makeExteriorRay(0x44ee88);
    this.redExtRay = makeExteriorRay(0xff6644);
    this.raysGroup.add(this.blueExtRay, this.greenExtRay, this.redExtRay);

    const makeInteriorRay = (color, opacity) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        linewidth: 2,
      });
      return new THREE.Line(geo, mat);
    };

    this.blueIntRay = makeInteriorRay(0x4477ff, 0.15);
    this.greenIntRay = makeInteriorRay(0x22cc66, 0.40);
    this.redIntRay = makeInteriorRay(0xff5500, 0.95);
    this.raysGroup.add(this.blueIntRay, this.greenIntRay, this.redIntRay);

    this.blueDot = this._makeWavelengthLabel(0x5588ff);
    this.greenDot = this._makeWavelengthLabel(0x33dd77);
    this.redDot = this._makeWavelengthLabel(0xff4422);
    this.raysGroup.add(this.blueDot, this.greenDot, this.redDot);
  }

  _makeWavelengthLabel(color) {
    const geo = new THREE.SphereGeometry(0.07, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color });
    return new THREE.Mesh(geo, mat);
  }

  // ─── PARTÍCULAS DE DISPERSIÓN ─────────────────────────────────────────────

  _initScatterParticles() {
    this.scatterGroup = new THREE.Group();
    this.add(this.scatterGroup);

    const makeScatter = (color, count) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

      const mat = new THREE.PointsMaterial({
        color,
        size: 0.07,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const pts = new THREE.Points(geo, mat);
      pts.userData.velocities = new Array(count)
        .fill(null)
        .map(() =>
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.015,
            (Math.random() - 0.5) * 0.015,
            (Math.random() - 0.5) * 0.015
          )
        );
      pts.userData.count = count;
      return pts;
    };

    this.blueScatter = makeScatter(0x4488ff, 180);
    this.greenScatter = makeScatter(0x33cc66, 90);
    // NUEVO: Añadir partículas rojas que simularán ingresar a la Tierra en el atardecer
    this.redScatter = makeScatter(0xff3311, 140);

    this.scatterGroup.add(this.blueScatter, this.greenScatter, this.redScatter);
  }

  _initPathIndicator() {
    const segCount = 80;
    const arcGeo = new THREE.BufferGeometry();
    const arcPos = new Float32Array(segCount * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
    arcGeo.setDrawRange(0, 0);

    this.pathArcMat = new THREE.LineBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.85,
      linewidth: 2,
    });
    this.pathArc = new THREE.Line(arcGeo, this.pathArcMat);
    this.add(this.pathArc);

    const barGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    this.pathBarMat = new THREE.LineBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.7,
    });
    this.pathBar = new THREE.Line(barGeo, this.pathBarMat);
    this.add(this.pathBar);
  }

  // ─── CONTROL DE HORA ──────────────────────────────────────────────────────

  setTimeOfDay(hour) {
    this.timeOfDay = hour;

    const t = Math.max(0, Math.min(1, (hour - 6) / 12));
    const elevation = Math.sin(t * Math.PI);
    this._currentElevation = elevation;

    const sunPos = this._getSunPosition(hour);
    this.sunMesh.position.copy(sunPos);
    this.sunCorona.position.copy(sunPos);

    const sunColor = this._getSunColor(elevation);
    this.sunMat.color.set(sunColor);
    this.coronaMat.color.set(this._getSunHaloColor(elevation));

    this.sunDirection.copy(sunPos).normalize();
    if (this.atmosphereMaterial?.uniforms) {
      this.atmosphereMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);
      this.atmosphereMaterial.uniforms.uBlueBoost.value = 0.7 + elevation * 1.0;
      this.atmosphereMaterial.uniforms.uRedBoost.value = 2.0 - elevation * 0.7;
    }

    this.sunLight.position.copy(sunPos).multiplyScalar(0.5);
    this.sunLight.color.set(sunColor);
    this.sunLight.intensity = Math.max(0.05, elevation) * 1.8 + 0.2;

    this._updateWavelengthRays(sunPos, elevation);
    this._updatePathIndicator(sunPos);
    this._resetScatterParticles(elevation);

    if (this.earth) {
      this.earth.rotation.y = (hour - 12) * (Math.PI / 12) * 0.3;
      this.atmosphere.rotation.y = this.earth.rotation.y;
    }
  }

  _getSunPosition(hour) {
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const x = Math.sin(sunAngle) * 14.0;
    const z = -Math.cos(sunAngle) * 12.0;
    return new THREE.Vector3(x, 0, z);
  }

  _getSunColor(e) {
    if (e > 0.75) return 0xfff5c0;
    if (e > 0.45) return 0xffdd80;
    if (e > 0.2) return 0xffaa44;
    if (e > 0.05) return 0xff7722;
    return 0xff4411;
  }

  _getSunHaloColor(e) {
    if (e > 0.5) return 0xffcc44;
    if (e > 0.2) return 0xff8833;
    return 0xff5511;
  }

  _updateWavelengthRays(sunPos, elevation) {
    const obsPos = this.OBSERVER_POS;
    const atmR = this.ATM_RADIUS;

    const entryPoint = this._getAtmosphereEntry(sunPos, obsPos, atmR);
    if (!entryPoint) return;

    const midAtm = entryPoint.clone().lerp(obsPos, 0.5);

    this._setLinePoints(this.blueExtRay, sunPos, entryPoint);
    this._setLinePoints(this.greenExtRay, sunPos, entryPoint);
    this._setLinePoints(this.redExtRay, sunPos, entryPoint);

    this._setLinePoints(this.blueIntRay, entryPoint, midAtm);
    const blueReach = entryPoint.clone().lerp(obsPos, 0.15);
    this._setLinePoints(this.blueIntRay, entryPoint, blueReach);

    const greenReach = entryPoint.clone().lerp(obsPos, 0.5 + elevation * 0.3);
    this._setLinePoints(this.greenIntRay, entryPoint, greenReach);

    this._setLinePoints(this.redIntRay, entryPoint, obsPos);

    const redStrength = 0.55 + (1 - elevation) * 0.45;
    this.redIntRay.material.opacity = redStrength;
    this.blueIntRay.material.opacity = 0.08 + elevation * 0.15;
    this.greenIntRay.material.opacity = 0.15 + elevation * 0.3;

    const blueEnd = entryPoint.clone().lerp(obsPos, 0.15);
    this.blueDot.position.copy(blueEnd);
    this.greenDot.position.copy(greenReach);
    this.redDot.position.copy(obsPos);

    this._updateScatterPositions(entryPoint, elevation);
  }

  _getAtmosphereEntry(sunPos, obsPos, atmRadius) {
    const rayDir = obsPos.clone().sub(sunPos).normalize();
    const a = 1;
    const b = 2 * sunPos.dot(rayDir);
    const c = sunPos.dot(sunPos) - atmRadius * atmRadius;
    const disc = b * b - 4 * a * c;

    if (disc < 0) {
      return obsPos.clone().add(this.sunDirection.clone().multiplyScalar(atmRadius - 3));
    }
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / 2;
    return sunPos.clone().add(rayDir.clone().multiplyScalar(t1));
  }

  _setLinePoints(line, p1, p2) {
    const pts = [p1.clone(), p2.clone()];
    line.geometry.setFromPoints(pts);
    line.geometry.attributes.position.needsUpdate = true;
  }

  _resetScatterParticles(elevation) {
    const blueOp = 0.4 + (1 - elevation) * 0.5;
    const greenOp = 0.25 + (1 - elevation) * 0.3;
    // Las partículas rojas se vuelven sumamente visibles e intensas durante el atardecer
    const redOp = 0.1 + (1 - elevation) * 0.8;
    
    if (this.blueScatter) this.blueScatter.material.opacity = blueOp;
    if (this.greenScatter) this.greenScatter.material.opacity = greenOp;
    if (this.redScatter) this.redScatter.material.opacity = redOp;
  }

  _updatePathIndicator(sunPos) {
    const obsDir = this.OBSERVER_POS.clone().normalize();
    const sunDir = sunPos.clone().normalize();
    const atmR = this.ATM_RADIUS;

    const angleBetween = obsDir.angleTo(sunDir);
    const elevAngle = Math.PI / 2 - angleBetween;
    const elevNorm = Math.max(0, Math.sin(elevAngle));

    const pathLength = elevNorm > 0.01 ? atmR / Math.max(elevNorm, 0.05) : atmR * 18;

    const segCount = 80;
    const pos = this.pathArc.geometry.attributes.position.array;

    const entryPoint = this._getAtmosphereEntry(sunPos, this.OBSERVER_POS, atmR);
    const entryDir = entryPoint.clone().normalize();

    const maxSegs = Math.min(segCount, Math.max(4, Math.round(segCount * (1 - elevNorm * 0.8))));

    for (let i = 0; i < segCount; i++) {
      if (i < maxSegs) {
        const tt = i / (maxSegs - 1);
        const pt = obsDir.clone().lerp(entryDir, tt).normalize().multiplyScalar(atmR);
        pos[i * 3] = pt.x;
        pos[i * 3 + 1] = pt.y;
        pos[i * 3 + 2] = pt.z;
      } else {
        const lastIdx = maxSegs - 1;
        pos[i * 3] = pos[lastIdx * 3];
        pos[i * 3 + 1] = pos[lastIdx * 3 + 1];
        pos[i * 3 + 2] = pos[lastIdx * 3 + 2];
      }
    }

    this.pathArc.geometry.setDrawRange(0, maxSegs);
    this.pathArc.geometry.attributes.position.needsUpdate = true;

    const arcColor = new THREE.Color(0x88bbff).lerp(new THREE.Color(0xff8833), 1 - elevNorm);
    this.pathArcMat.color.set(arcColor);
    this.pathArcMat.opacity = 0.5 + (1 - elevNorm) * 0.45;

    const barStart = this.OBSERVER_POS.clone().add(new THREE.Vector3(0, 0.5, 0));
    const pathVis = Math.min(pathLength * 0.5, 6.5);
    const entryNorm = entryPoint.clone().sub(this.OBSERVER_POS).normalize();
    const barEnd = barStart.clone().add(entryNorm.multiplyScalar(pathVis));

    this._setLinePoints(this.pathBar, barStart, barEnd);
    const barColor = new THREE.Color(0xaaddff).lerp(new THREE.Color(0xff6622), 1 - elevNorm);
    this.pathBarMat.color.set(barColor);
    this.pathBarMat.opacity = 0.55 + (1 - elevNorm) * 0.35;
  }

  // ─── ANIMACIÓN DINÁMICA ─────────────────────────────────────────────────────

  update(elapsedTime) {
    if (this.earth) {
      this.earth.rotation.y += 0.0005;
      this.atmosphere.rotation.y = this.earth.rotation.y;
    }

    if (this.observerRingMat) {
      this.observerRingMat.opacity = 0.6 + Math.sin(elapsedTime * 2.2) * 0.25;
    }

    if (this.blueScatter && this.blueScatter.visible) {
      const elevation = this._currentElevation ?? 0.5;
      const spread = 0.8 + (1 - elevation) * 1.2;

      // Animación básica de nubes de dispersión para Azul y Verde
      const animateCloud = (pts, speed) => {
        const pos = pts.geometry.attributes.position.array;
        const count = pts.userData.count;
        const base = pts.userData.baseEntry;
        if (!base) return;

        for (let i = 0; i < count; i++) {
          const vel = pts.userData.velocities[i];
          const t = (elapsedTime * speed + i * 0.07) % 1;
          pos[i * 3] = base.x + vel.x * spread * 60 * t;
          pos[i * 3 + 1] = base.y + vel.y * spread * 60 * t;
          pos[i * 3 + 2] = base.z + vel.z * spread * 60 * t;
        }
        pts.geometry.attributes.position.needsUpdate = true;
      };

      animateCloud(this.blueScatter, 0.3);
      animateCloud(this.greenScatter, 0.2);

      // NUEVO: Animación Especial de las Partículas Rojas
      if (this.redScatter) {
        const pos = this.redScatter.geometry.attributes.position.array;
        const count = this.redScatter.userData.count;
        const base = this.redScatter.userData.baseEntry;

        if (base) {
          // Evaluar si es hora de amanecer/atardecer (elevación baja = factor alto)
          const sunsetFactor = Math.max(0.0, 1.0 - elevation * 2.0); 
          // Vector dinámico directo al Observador/Tierra
          const toObserver = this.OBSERVER_POS.clone().sub(base);

          for (let i = 0; i < count; i++) {
            const vel = this.redScatter.userData.velocities[i];
            const t = (elapsedTime * 0.25 + i * 0.007) % 1;

            // 1. Comportamiento Regular (Dispersión estática local en la entrada)
            const normalX = vel.x * spread * 55 * t;
            const normalY = vel.y * spread * 55 * t;
            const normalZ = vel.z * spread * 55 * t;

            // 2. Comportamiento de Atardecer (Avanzan en línea recta cruzando hacia la tierra)
            const entryX = toObserver.x * t;
            const entryY = toObserver.y * t;
            const entryZ = toObserver.z * t;

            // Interpolación suave según la hora del día
            pos[i * 3] = base.x + ((1.0 - sunsetFactor) * normalX + sunsetFactor * entryX);
            pos[i * 3 + 1] = base.y + ((1.0 - sunsetFactor) * normalY + sunsetFactor * entryY);
            pos[i * 3 + 2] = base.z + ((1.0 - sunsetFactor) * normalZ + sunsetFactor * entryZ);
          }
          this.redScatter.geometry.attributes.position.needsUpdate = true;
        }
      }
    }

    if (this.coronaMat) {
      this.coronaMat.opacity = 0.12 + Math.sin(elapsedTime * 1.5) * 0.06;
    }
  }

  // ─── SINCRONIZADOR DE POSICIONES BASE ───────────────────────────────────────

  _updateScatterPositions(entryPoint, elevation) {
    this.blueScatter.userData.baseEntry = entryPoint.clone();
    this.greenScatter.userData.baseEntry = entryPoint.clone();
    this.redScatter.userData.baseEntry = entryPoint.clone();

    const spread = 0.8 + (1 - elevation) * 1.2;
    const spreadG = 0.4 + (1 - elevation) * 0.6;
    const spreadR = 0.3 + (1 - elevation) * 0.4;

    const initCloud = (pts, entry, sp) => {
      const pos = pts.geometry.attributes.position.array;
      const count = pts.userData.count;
      for (let i = 0; i < count; i++) {
        const vel = pts.userData.velocities[i];
        pos[i * 3] = entry.x + vel.x * sp * 55;
        pos[i * 3 + 1] = entry.y + vel.y * sp * 55;
        pos[i * 3 + 2] = entry.z + vel.z * sp * 55;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    };

    initCloud(this.blueScatter, entryPoint, spread);
    initCloud(this.greenScatter, entryPoint, spreadG);
    initCloud(this.redScatter, entryPoint, spreadR);
  }
}