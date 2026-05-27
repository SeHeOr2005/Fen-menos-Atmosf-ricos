import * as THREE from "three";
import { createRayleighSpectralMaterial } from "../shaders/OndasShader.js";

export class RayleighLocalScene extends THREE.Group {
  constructor() {
    super();
    this.sunDirection = new THREE.Vector3(1, 0.25, 0.1).normalize();
    this.fogColor = new THREE.Color(0x87b8ff);
    this.fogDensity = 0.012;
    this.timeOfDay = 12;

    this.initSkyDome();
    this.initGround();
    this.initLighting();
    this.initRayleighParticles();
    this.initSolarRays();
    this.setTimeOfDay(this.timeOfDay);
  }

  initSkyDome() {
    const domeGeo = new THREE.SphereGeometry(220, 64, 32);

    this.skyMaterial = createRayleighSpectralMaterial({
      sunDirection: this.sunDirection,
      sunIntensity: 10.0,
      rayleighStrength: 1.2,
      mieStrength: 0.002,
      densityFalloff: 1.1,
      planetRadius: 180.0,
      atmosphereRadius: 220.0,
      alpha: 0.9,
      exposure: 1.1,
      blueBoost: 1.2,
      redBoost: 1.3,
      side: THREE.BackSide,
    });

    const dome = new THREE.Mesh(domeGeo, this.skyMaterial);
    dome.position.y = 18;
    this.add(dome);
  }

  initGround() {
    const groundGeo = new THREE.PlaneGeometry(300, 300, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xc9d2d9,
      roughness: 1.0,
      metalness: 0.0,
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.2;
    this.add(ground);
  }

  initLighting() {
    this.add(new THREE.AmbientLight(0xffffff, 0.55));

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(30, 20, 10);
    this.add(sunLight);
  }

  initRayleighParticles() {
    this.particleCount = 2000;
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

      const r = THREE.MathUtils.lerp(140, 215, Math.random());
      this.particleRadii[i] = r;

      positions[i * 3] = dir.x * r;
      positions[i * 3 + 1] = dir.y * r + 18;
      positions[i * 3 + 2] = dir.z * r;

      const axis = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();

      const vel = new THREE.Vector3().crossVectors(dir, axis).normalize();
      vel.multiplyScalar(0.01 + Math.random() * 0.01);
      this.particleVel[i] = vel;

      const color = this.getScatterColor(dir);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.6,
      transparent: true,
      opacity: 0.7,
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

    const rayLength = 60;
    const rayStart = 40;
    const spread = 2.4;

    colors.forEach((c, i) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -rayLength),
      ]);

      const material = new THREE.LineBasicMaterial({
        color: c,
        transparent: true,
        opacity: 0.75,
      });

      const line = new THREE.Line(geometry, material);

      line.position.set(
        (i - 3) * spread,
        (i % 2 === 0 ? 1.2 : -1.2),
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
    const warm = new THREE.Color(0xff9a3c); // más naranja
    const tint = blue.clone().lerp(warm, sunset);
    tint.lerp(new THREE.Color(0xffffff), horizon * 0.2);

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

    if (this.skyMaterial?.uniforms) {
      this.skyMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);
    }

    if (this.solarRays) {
      const look = this.sunDirection.clone().multiplyScalar(-1);
      this.solarRays.position
        .copy(this.sunDirection.clone().multiplyScalar(120))
        .add(new THREE.Vector3(0, 18, 0));
      this.solarRays.lookAt(look);
    }
  }

  update() {
    if (this.rayleighParticles) {
      const positions =
        this.rayleighParticles.geometry.attributes.position.array;
      const colors = this.rayleighParticles.geometry.attributes.color.array;

      for (let i = 0; i < this.particleCount; i++) {
        let x = positions[i * 3];
        let y = positions[i * 3 + 1] - 18;
        let z = positions[i * 3 + 2];

        x += this.particleVel[i].x;
        y += this.particleVel[i].y;
        z += this.particleVel[i].z;

        const dir = new THREE.Vector3(x, y, z).normalize();
        const r = this.particleRadii[i];

        positions[i * 3] = dir.x * r;
        positions[i * 3 + 1] = dir.y * r + 18;
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