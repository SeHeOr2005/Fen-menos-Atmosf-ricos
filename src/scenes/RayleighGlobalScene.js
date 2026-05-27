import * as THREE from "three";
import { createRayleighSpectralMaterial } from "../shaders/OndasShader.js";

export class RayleighGlobalScene extends THREE.Group {
  constructor() {
    super();
    this.timeOfDay = 12;
    this.initEarth();
    this.initSpace();
    this.initLighting();
    this.initRayleighParticles();
    this.initSolarRays();
    this.backgroundColor = new THREE.Color(0x000000);
    this.setTimeOfDay(this.timeOfDay);
  }

  initEarth() {
    const textureLoader = new THREE.TextureLoader();

    const earthMap = textureLoader.load(
      "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_atmos_2048.jpg",
    );
    const normalMap = textureLoader.load(
      "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_normal_2048.jpg",
    );

    const earthGeo = new THREE.SphereGeometry(3, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      normalMap: normalMap,
      shininess: 10,
    });

    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.add(this.earth);

    this.sunDirection = new THREE.Vector3(1, 0, 0).normalize();
    const atmGeo = new THREE.SphereGeometry(3.35, 64, 64);

    this.atmosphereMaterial = createRayleighSpectralMaterial({
      sunDirection: this.sunDirection,
      sunIntensity: 10.0,
      rayleighStrength: 1.1,
      mieStrength: 0.0016,
      densityFalloff: 1.15,
      planetRadius: 3.0,
      atmosphereRadius: 3.8,
      alpha: 0.7,
      exposure: 1.2,
      blueBoost: 1.2,
      redBoost: 1.3,
      side: THREE.BackSide,
    });

    this.atmosphere = new THREE.Mesh(atmGeo, this.atmosphereMaterial);
    this.add(this.atmosphere);
  }

  initSpace() {
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(3000 * 3);

    for (let i = 0; i < 3000; i++) {
      const r = 60 + Math.random() * 40;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      starsPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starsPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starsPos[i * 3 + 2] = r * Math.cos(phi);
    }

    starsGeo.setAttribute("position", new THREE.BufferAttribute(starsPos, 3));
    const stars = new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
      }),
    );

    this.add(stars);
  }

  initLighting() {
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(25, 0, 0);
    this.add(sunLight);

    this.add(new THREE.AmbientLight(0x222222));
  }

  initRayleighParticles() {
    this.particleCount = 3500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    this.particleRadii = new Float32Array(this.particleCount);
    this.particleVel = new Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();

      const r = THREE.MathUtils.lerp(3.15, 3.75, Math.random());
      this.particleRadii[i] = r;

      positions[i * 3] = dir.x * r;
      positions[i * 3 + 1] = dir.y * r;
      positions[i * 3 + 2] = dir.z * r;

      const axis = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();

      const vel = new THREE.Vector3().crossVectors(dir, axis).normalize();
      vel.multiplyScalar(0.002 + Math.random() * 0.003);
      this.particleVel[i] = vel;

      const color = this.getScatterColor(dir);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.rayleighParticles = new THREE.Points(geometry, material);
    this.add(this.rayleighParticles);
  }

  initSolarRays() {
    this.solarRays = new THREE.Group();

    const colors = [
      0xff0000,
      0xff7f00,
      0xffff00,
      0x00ff00,
      0x007fff,
      0x4b00ff,
      0x8f00ff,
    ];

    const rayLength = 20;
    const rayStart = 8;
    const spread = 1.2;

    colors.forEach((c, i) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -rayLength),
      ]);

      const material = new THREE.LineBasicMaterial({
        color: c,
        transparent: true,
        opacity: 0.8,
      });

      const line = new THREE.Line(geometry, material);

      line.position.set(
        (i - 3) * spread,
        (i % 2 === 0 ? 0.6 : -0.6),
        rayStart,
      );

      this.solarRays.add(line);
    });

    this.add(this.solarRays);
  }

  getScatterColor(dir) {
    const sunDot = dir.dot(this.sunDirection);
    const horizon = 1.0 - Math.abs(dir.y);
    const sunset = THREE.MathUtils.smoothstep(-0.2, 0.3, -sunDot);

    const blue = new THREE.Color(0x6fb3ff);
    const warm = new THREE.Color(0xffa15c);
    const tint = blue.clone().lerp(warm, sunset);
    tint.lerp(new THREE.Color(0xffffff), horizon * 0.15);

    return tint;
  }

  setTimeOfDay(hour) {
    this.timeOfDay = hour;

    const t = hour / 24;
    const angle = t * Math.PI * 2;
    const elevation = Math.sin(angle - Math.PI / 2);
    const azimuth = angle + Math.PI * 0.25;

    this.sunDirection
      .set(Math.cos(azimuth), Math.max(elevation, -0.2), Math.sin(azimuth))
      .normalize();

    if (this.atmosphereMaterial?.uniforms) {
      this.atmosphereMaterial.uniforms.uSunDirection.value.copy(
        this.sunDirection,
      );
    }

    if (this.solarRays) {
      const look = this.sunDirection.clone().multiplyScalar(-1);
      this.solarRays.position.copy(this.sunDirection.clone().multiplyScalar(10));
      this.solarRays.lookAt(look);
    }
  }

  update(elapsedTime) {
    if (this.earth) {
      this.earth.rotation.y = elapsedTime * 0.05;
    }

    if (this.atmosphere && this.earth) {
      this.atmosphere.rotation.y = this.earth.rotation.y;
    }

    if (this.rayleighParticles) {
      const positions =
        this.rayleighParticles.geometry.attributes.position.array;
      const colors = this.rayleighParticles.geometry.attributes.color.array;

      for (let i = 0; i < this.particleCount; i++) {
        let x = positions[i * 3];
        let y = positions[i * 3 + 1];
        let z = positions[i * 3 + 2];

        x += this.particleVel[i].x;
        y += this.particleVel[i].y;
        z += this.particleVel[i].z;

        const dir = new THREE.Vector3(x, y, z).normalize();
        const r = this.particleRadii[i];
        positions[i * 3] = dir.x * r;
        positions[i * 3 + 1] = dir.y * r;
        positions[i * 3 + 2] = dir.z * r;

        const c = this.getScatterColor(dir);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      this.rayleighParticles.geometry.attributes.position.needsUpdate = true;
      this.rayleighParticles.geometry.attributes.color.needsUpdate = true;
    }
  }
}