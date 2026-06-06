import * as THREE from "three";
import { createRayleighSpectralMaterial } from "../shaders/OndasShader.js";

/**
 * SunsetGlobalScene — Escala Global del Atardecer
 *
 * Representación científica que muestra:
 *   • El recorrido de la luz solar por la atmósfera
 *   • Cómo las longitudes de onda cortas (azul) se dispersan más (Ley de Rayleigh: ~λ⁻⁴)
 *   • Por qué predominan los rojos y naranjas cuando el Sol está cerca del horizonte
 *   • La comparación VISUAL entre el recorrido al mediodía vs. al atardecer
 *
 * CAUSA (Escala Global) ←→ EFECTO (Escala Local)
 * Ambas escenas comparten la variable timeOfDay de App.js
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

    // Capa de atmósfera visible — usa el mismo shader de los demás fenómenos
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

  // ─── SOL ──────────────────────────────────────────────────────────────────

  _initSun() {
    // Esfera del Sol
    const sunGeo = new THREE.SphereGeometry(0.9, 32, 32);
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    this.sunMesh = new THREE.Mesh(sunGeo, this.sunMat);
    this.add(this.sunMesh);

    // Corona / halo solar
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

  // ─── OBSERVADOR ───────────────────────────────────────────────────────────

  _initObserver() {
    this.observerGroup = new THREE.Group();

    // Base de la casita (cuerpo)
    const bodyGeo = new THREE.BoxGeometry(0.2, 0.18, 0.16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.09;
    this.observerGroup.add(body);

    // Techo
    const roofGeo = new THREE.ConeGeometry(0.15, 0.12, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xa0522d });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.24;
    roof.rotation.y = Math.PI / 4;
    this.observerGroup.add(roof);

    // Anillo indicador luminoso
    const ringGeo = new THREE.TorusGeometry(0.22, 0.02, 8, 32);
    this.observerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, this.observerRingMat);
    ring.rotation.y = Math.PI / 2;
    this.observerGroup.add(ring);

    // Posicionar en la superficie terrestre en (3,0,0)
    this.observerGroup.position.copy(this.OBSERVER_POS);
    this.observerGroup.lookAt(0, 0, 0); // que mire al centro de la Tierra
    this.observerGroup.rotateY(Math.PI); // corrección de orientación
    this.add(this.observerGroup);
  }

  // ─── RAYOS DE LONGITUD DE ONDA ────────────────────────────────────────────

  /**
   * Tres haces de luz representando diferentes longitudes de onda:
   *   🔵 Azul  (450 nm) — Alta dispersión (Rayleigh λ⁻⁴)
   *   🟢 Verde (550 nm) — Dispersión intermedia
   *   🔴 Rojo  (700 nm) — Baja dispersión — llega al observador
   */
  _initWavelengthRays() {
    this.raysGroup = new THREE.Group();
    this.add(this.raysGroup);

    // Rayos exteriores (Sol → atmósfera)
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

    // Rayos interiores (atmósfera → observador)
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

    // El rojo tiene alta opacidad (llega al observador), azul muy baja (se dispersa)
    this.blueIntRay = makeInteriorRay(0x4477ff, 0.15);
    this.greenIntRay = makeInteriorRay(0x22cc66, 0.40);
    this.redIntRay = makeInteriorRay(0xff5500, 0.95);
    this.raysGroup.add(this.blueIntRay, this.greenIntRay, this.redIntRay);

    // Etiquetas de longitud de onda (sprites de color)
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
    // Partículas que representan la dispersión azul y verde en la atmósfera
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

    // Azul: muchas partículas, muy dispersas
    this.blueScatter = makeScatter(0x4488ff, 180);
    // Verde: algunas partículas
    this.greenScatter = makeScatter(0x33cc66, 90);

    this.scatterGroup.add(this.blueScatter, this.greenScatter);
  }

  // ─── INDICADOR DE RECORRIDO ATMOSFÉRICO ───────────────────────────────────

  /**
   * Muestra visualmente CUÁNTA atmósfera recorre la luz según la hora.
   * Mediodía: arco muy corto | Atardecer: arco muy largo (casi tangencial)
   * Este es el elemento educativo central de la escena.
   */
  _initPathIndicator() {
    // Arco sobre la atmósfera que indica el recorrido de la luz
    const segCount = 80;
    const arcGeo = new THREE.BufferGeometry();
    const arcPos = new Float32Array(segCount * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
    arcGeo.setDrawRange(0, 0); // Inicia sin dibujar nada

    this.pathArcMat = new THREE.LineBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.85,
      linewidth: 2,
    });
    this.pathArc = new THREE.Line(arcGeo, this.pathArcMat);
    this.add(this.pathArc);

    // Indicador de longitud del recorrido (barra visual)
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

  /**
   * Punto de entrada principal.
   * Recalcula toda la escena para la hora indicada.
   * Llamado por App.js cuando el usuario mueve el slider.
   */
  setTimeOfDay(hour) {
    this.timeOfDay = hour;

    const t = Math.max(0, Math.min(1, (hour - 6) / 12));
    const elevation = Math.sin(t * Math.PI); // 0..1..0
    this._currentElevation = elevation;

    const sunPos = this._getSunPosition(hour);
    this.sunMesh.position.copy(sunPos);
    this.sunCorona.position.copy(sunPos);

    // Color del Sol según elevación (blanco al mediodía → naranja/rojo al atardecer)
    const sunColor = this._getSunColor(elevation);
    this.sunMat.color.set(sunColor);
    this.coronaMat.color.set(this._getSunHaloColor(elevation));

    // Dirección del Sol hacia la Tierra (para el shader de atmósfera)
    this.sunDirection.copy(sunPos).normalize();
    if (this.atmosphereMaterial?.uniforms) {
      this.atmosphereMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);
      this.atmosphereMaterial.uniforms.uBlueBoost.value = 0.7 + elevation * 1.0;
      this.atmosphereMaterial.uniforms.uRedBoost.value = 2.0 - elevation * 0.7;
    }

    // Luz solar
    this.sunLight.position.copy(sunPos).multiplyScalar(0.5);
    this.sunLight.color.set(sunColor);
    this.sunLight.intensity = Math.max(0.05, elevation) * 1.8 + 0.2;

    // Actualizar rayos de longitudes de onda
    this._updateWavelengthRays(sunPos, elevation);

    // Actualizar indicador de recorrido
    this._updatePathIndicator(sunPos);

    // Actualizar partículas de dispersión
    this._resetScatterParticles(elevation);

    // Rotar Tierra para que el punto iluminado corresponda a la hora
    if (this.earth) {
      this.earth.rotation.y = (hour - 12) * (Math.PI / 12) * 0.3;
      this.atmosphere.rotation.y = this.earth.rotation.y;
    }
  }

  // ─── POSICIÓN DEL SOL ─────────────────────────────────────────────────────

  /**
   * El Sol orbita en el plano XZ.
   * Mediodía (12h): directamente sobre el observador en (14, 0, 0)
   * Atardecer (18h): en el horizonte oeste (3, 0, 13)
   * Amanecer  ( 6h): en el horizonte este (3, 0, -13)
   */
  _getSunPosition(hour) {
    // Ángulo: 0 al mediodía, ±PI/2 al amanecer/atardecer
    const sunAngle = ((hour - 6) / 12) * Math.PI; // 0..PI
    const x = Math.sin(sunAngle) * 14.0;
    const z = -Math.cos(sunAngle) * 12.0;
    return new THREE.Vector3(x, 0, z);
  }

  // ─── COLORES ──────────────────────────────────────────────────────────────

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

  // ─── RAYOS DE LONGITUD DE ONDA (actualización) ────────────────────────────

  _updateWavelengthRays(sunPos, elevation) {
    const obsPos = this.OBSERVER_POS;
    const atmR = this.ATM_RADIUS;

    // Punto de entrada de la luz a la atmósfera (donde el rayo solar toca la esfera)
    const entryPoint = this._getAtmosphereEntry(sunPos, obsPos, atmR);

    if (!entryPoint) return;

    // Punto medio del recorrido atmosférico (para scatter verde)
    const midAtm = entryPoint.clone().lerp(obsPos, 0.5);

    // ── Rayos exteriores: Sol → entrada atmósfera ──
    this._setLinePoints(this.blueExtRay, sunPos, entryPoint);
    this._setLinePoints(this.greenExtRay, sunPos, entryPoint);
    this._setLinePoints(this.redExtRay, sunPos, entryPoint);

    // ── Rayos interiores: entrada → observador (con intensidad variable) ──

    // Azul: muy débil (alta dispersión — casi todo se scatter antes de llegar)
    this._setLinePoints(this.blueIntRay, entryPoint, midAtm);
    const blueReach = entryPoint.clone().lerp(obsPos, 0.15);
    this._setLinePoints(this.blueIntRay, entryPoint, blueReach);

    // Verde: moderado
    const greenReach = entryPoint.clone().lerp(obsPos, 0.5 + elevation * 0.3);
    this._setLinePoints(this.greenIntRay, entryPoint, greenReach);

    // Rojo: completo (llega siempre al observador)
    this._setLinePoints(this.redIntRay, entryPoint, obsPos);

    // Opacidad del rayo rojo: máxima al atardecer (más atmósfera = más rojo relativo)
    const redStrength = 0.55 + (1 - elevation) * 0.45;
    this.redIntRay.material.opacity = redStrength;
    this.blueIntRay.material.opacity = 0.08 + elevation * 0.15;
    this.greenIntRay.material.opacity = 0.15 + elevation * 0.3;

    // ── Posición de etiquetas (puntos de referencia) ──
    const blueEnd = entryPoint.clone().lerp(obsPos, 0.15);
    this.blueDot.position.copy(blueEnd);
    this.greenDot.position.copy(greenReach);
    this.redDot.position.copy(obsPos);

    // ── Actualizar partículas de dispersión en el punto de entrada ──
    this._updateScatterPositions(entryPoint, elevation);
  }

  _getAtmosphereEntry(sunPos, obsPos, atmRadius) {
    // Intersección rayo–esfera para encontrar dónde la luz entra a la atmósfera
    const rayDir = obsPos.clone().sub(sunPos).normalize();

    const a = 1;
    const b = 2 * sunPos.dot(rayDir);
    const c = sunPos.dot(sunPos) - atmRadius * atmRadius;
    const disc = b * b - 4 * a * c;

    if (disc < 0) {
      // Sin intersección (ángulo extremo) → aproximación geométrica
      return obsPos.clone().add(this.sunDirection.clone().multiplyScalar(atmRadius - 3));
    }

    const sq = Math.sqrt(disc);
    // t1 es la intersección más lejana desde el Sol (entrada a la atmósfera)
    const t1 = (-b - sq) / 2;
    return sunPos.clone().add(rayDir.clone().multiplyScalar(t1));
  }

  _setLinePoints(line, p1, p2) {
    const pts = [p1.clone(), p2.clone()];
    line.geometry.setFromPoints(pts);
    line.geometry.attributes.position.needsUpdate = true;
  }

  // ─── PARTÍCULAS DE DISPERSIÓN ─────────────────────────────────────────────

  _updateScatterPositions(entryPoint, elevation) {
    // Las partículas azules se dispersan ampliamente desde el punto de entrada
    // A menor elevación solar (atardecer), más dispersión visible
    const spreadBlue = 0.8 + (1 - elevation) * 1.2;
    const spreadGreen = 0.4 + (1 - elevation) * 0.6;

    const updateCloud = (pts, entry, spread) => {
      const pos = pts.geometry.attributes.position.array;
      const count = pts.userData.count;
      for (let i = 0; i < count; i++) {
        const vel = pts.userData.velocities[i];
        pos[i * 3] = entry.x + vel.x * spread * 60;
        pos[i * 3 + 1] = entry.y + vel.y * spread * 60;
        pos[i * 3 + 2] = entry.z + vel.z * spread * 60;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    };

    updateCloud(this.blueScatter, entryPoint, spreadBlue);
    updateCloud(this.greenScatter, entryPoint, spreadGreen);
  }

  _resetScatterParticles(elevation) {
    // Opacidad: las partículas son más visibles al atardecer
    const blueOp = 0.4 + (1 - elevation) * 0.5;
    const greenOp = 0.25 + (1 - elevation) * 0.3;
    this.blueScatter.material.opacity = blueOp;
    this.greenScatter.material.opacity = greenOp;
  }

  // ─── INDICADOR DE RECORRIDO ATMOSFÉRICO ───────────────────────────────────

  /**
   * Actualiza el arco sobre la atmósfera que muestra cuánta distancia
   * recorre la luz a través de la capa atmosférica.
   *
   * Mediodía → arco corto (luz casi perpendicular, recorrido mínimo)
   * Atardecer → arco largo (luz casi tangente, recorrido máximo)
   *
   * Este contraste es la clave pedagógica del fenómeno.
   */
  _updatePathIndicator(sunPos) {
    const obsDir = this.OBSERVER_POS.clone().normalize(); // zenith del observador
    const sunDir = sunPos.clone().normalize(); // dirección del Sol
    const atmR = this.ATM_RADIUS;

    // Ángulo entre el cenit del observador y la dirección del Sol
    const angleBetween = obsDir.angleTo(sunDir);
    // Ángulo real de elevación solar sobre el horizonte del observador
    const elevAngle = Math.PI / 2 - angleBetween;
    // Normalizado: 0 = horizonte, 1 = cenit
    const elevNorm = Math.max(0, Math.sin(elevAngle));

    // Recorrido atmosférico proporcional (para el arco visual)
    // A elevación 1 (cenit): camino muy corto ~ 0.42 unidades
    // A elevación 0 (horizonte): camino muy largo ~ varias unidades
    const pathLength = elevNorm > 0.01
      ? atmR / Math.max(elevNorm, 0.05)
      : atmR * 18; // límite razonable para la visualización

    // ── Dibujar arco sobre la atmósfera ──
    const segCount = 80;
    const pos = this.pathArc.geometry.attributes.position.array;

    // Dirección "cenit del observador" en la atmósfera
    const atmObsPoint = obsDir.clone().multiplyScalar(atmR);
    // Dirección de entrada actual de la luz en la atmósfera
    const entryPoint = this._getAtmosphereEntry(sunPos, this.OBSERVER_POS, atmR);
    const entryDir = entryPoint.clone().normalize();

    // Interpolar arco en la esfera atmosférica desde el cenit hasta el punto de entrada
    const maxSegs = Math.min(segCount, Math.max(4, Math.round(segCount * (1 - elevNorm * 0.8))));

    for (let i = 0; i < segCount; i++) {
      if (i < maxSegs) {
        const tt = i / (maxSegs - 1);
        const pt = obsDir.clone().lerp(entryDir, tt).normalize().multiplyScalar(atmR);
        pos[i * 3] = pt.x;
        pos[i * 3 + 1] = pt.y;
        pos[i * 3 + 2] = pt.z;
      } else {
        // Puntos sobrantes: colapsar al último punto válido
        const lastIdx = maxSegs - 1;
        pos[i * 3] = pos[lastIdx * 3];
        pos[i * 3 + 1] = pos[lastIdx * 3 + 1];
        pos[i * 3 + 2] = pos[lastIdx * 3 + 2];
      }
    }

    this.pathArc.geometry.setDrawRange(0, maxSegs);
    this.pathArc.geometry.attributes.position.needsUpdate = true;

    // Color del arco: cálido al atardecer, frío al mediodía
    const arcColor = new THREE.Color(0x88bbff).lerp(
      new THREE.Color(0xff8833),
      1 - elevNorm
    );
    this.pathArcMat.color.set(arcColor);
    this.pathArcMat.opacity = 0.5 + (1 - elevNorm) * 0.45;

    // ── Barra de recorrido atmosférico (para comparación visual) ──
    const barStart = this.OBSERVER_POS.clone().add(new THREE.Vector3(0, 0.5, 0));
    const pathVis = Math.min(pathLength * 0.5, 6.5); // escala visual
    const entryNorm = entryPoint.clone().sub(this.OBSERVER_POS).normalize();
    const barEnd = barStart.clone().add(entryNorm.multiplyScalar(pathVis));

    this._setLinePoints(this.pathBar, barStart, barEnd);
    const barColor = new THREE.Color(0xaaddff).lerp(new THREE.Color(0xff6622), 1 - elevNorm);
    this.pathBarMat.color.set(barColor);
    this.pathBarMat.opacity = 0.55 + (1 - elevNorm) * 0.35;
  }

  // ─── ANIMACIÓN ─────────────────────────────────────────────────────────────

  update(elapsedTime) {
    // Rotación lenta de la Tierra
    if (this.earth) {
      this.earth.rotation.y += 0.0005;
      this.atmosphere.rotation.y = this.earth.rotation.y;
    }

    // Pulso del anillo del observador
    if (this.observerRingMat) {
      this.observerRingMat.opacity = 0.6 + Math.sin(elapsedTime * 2.2) * 0.25;
    }

    // Animación de partículas de dispersión
    if (this.blueScatter && this.blueScatter.visible) {
      const elevation = this._currentElevation ?? 0.5;
      const spread = 0.8 + (1 - elevation) * 1.2;

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
    }

    // Pulso corona solar
    if (this.coronaMat) {
      this.coronaMat.opacity = 0.12 + Math.sin(elapsedTime * 1.5) * 0.06;
    }
  }

  // ─── OVERRIDE DE SCATTER (guarda punto base para animación) ───────────────

  _updateScatterPositions(entryPoint, elevation) {
    this.blueScatter.userData.baseEntry = entryPoint.clone();
    this.greenScatter.userData.baseEntry = entryPoint.clone();

    const spread = 0.8 + (1 - elevation) * 1.2;
    const spreadG = 0.4 + (1 - elevation) * 0.6;

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
  }
}