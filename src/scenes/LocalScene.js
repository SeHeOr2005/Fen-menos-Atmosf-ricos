import * as THREE from "three";
import { auroraMaterial } from "../shaders/AuroraShader.js";

export class LocalScene extends THREE.Group {
  constructor() {
    super();
    this.trees = [];
    this.auroraBands = [];
    this.auroraCurtains = [];

    this.initSkyDome();
    this.initTerrain();
    this.initForest();
    this.initAurora();
    this.initAtmosphericParticles();
    this.initLighting();

    // Niebla azul noche para ocultar el horizonte espacial.
    this.fogColor = new THREE.Color(0x050b17);
  }

  initSkyDome() {
    const domeGeo = new THREE.SphereGeometry(220, 32, 24);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x030812, // Un poco más oscuro para que resalte la aurora y las estrellas
      side: THREE.BackSide,
    });

    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 18;
    this.add(dome);

    // Añadir miles de estrellas al cielo nocturno
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 2500;
    const posArray = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      // Distribución esférica aleatoria
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 180 + Math.random() * 20; // Radio cerca del domo

      posArray[i] = r * Math.sin(phi) * Math.cos(theta); // x
      posArray[i + 1] = r * Math.sin(phi) * Math.sin(theta); // y
      posArray[i + 2] = r * Math.cos(phi); // z

      // Que no queden por debajo del horizonte dramáticamente
      if (posArray[i + 1] < -10) posArray[i + 1] = Math.abs(posArray[i + 1]);
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    const starPoints = new THREE.Points(starsGeo, starsMat);
    this.add(starPoints);
  }

  initTerrain() {
    // Terreno local con nieve tenue y relieve suave.
    const groundGeo = new THREE.PlaneGeometry(300, 300, 128, 128);
    const pos = groundGeo.attributes.position;

    // Desplazamiento procedural de vértices para simular nieve y montañas de hielo
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);

      let z = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 2.8;
      z += Math.sin(x * 0.17) * Math.cos(y * 0.11) * 1.2;

      // Aplanar el centro (donde se sitúa el espectador)
      const dist = Math.sqrt(x * x + y * y);
      if (dist < 14) {
        z *= dist / 14;
      }
      pos.setZ(i, z);
    }

    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x6f7f8d,
      roughness: 0.95,
      metalness: 0.1,
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    this.add(ground);
  }

  initForest() {
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 2.2, 8);
    const leavesGeo = new THREE.ConeGeometry(0.9, 2.8, 12);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a20,
      roughness: 0.95,
    });
    const leavesMat = new THREE.MeshStandardMaterial({
      color: 0x1c2e25,
      roughness: 0.9,
    });
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xdfe8ee,
      roughness: 0.98,
    });

    for (let i = 0; i < 170; i++) {
      const tree = new THREE.Group();
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.pow(Math.random(), 1.35) * 96;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = -0.9;

      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = 1.4;

      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.7, 12),
        snowCapMat,
      );
      snowCap.position.y = 2.45;

      tree.add(trunk);
      tree.add(leaves);
      tree.add(snowCap);

      const scale = 0.8 + Math.random() * 1.35;
      tree.scale.setScalar(scale);
      tree.position.set(x, -1.4, z);
      tree.rotation.y = Math.random() * Math.PI;

      this.trees.push(tree);
      this.add(tree);
    }
  }

  initAurora() {
    this.secondaryAuroraMaterial = auroraMaterial.clone();
    this.secondaryAuroraMaterial.transparent = true;
    this.secondaryAuroraMaterial.opacity = 0.55; // Un poco más presente

    // Aumentamos drásticamente el número de bandas para llenar el cielo
    const bandCount = 14;
    for (let i = 0; i < bandCount; i++) {
      const length = 320; // Más largas para abarcar todo el horizonte visible
      const height = 45;
      const segmentsX = 140;
      const bandGeo = new THREE.PlaneGeometry(length, height, segmentsX, 1);

      const pos = bandGeo.attributes.position;
      // Ondulación procedural compartida (todas llevan EXACTAMENTE la misma onda para verse paralelas)
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j);
        // Doblar en el eje Z (profundidad) en función de X, SIN usar 'i' para desfasar la forma principal
        const z = Math.sin(x * 0.02) * 25 + Math.cos(x * 0.01) * 35;
        pos.setZ(j, z);

        // Arco en el cielo (más bajo en los extremos, más alto en el centro de visión)
        const y = pos.getY(j);
        const arc = Math.cos(x * 0.015) * 8;
        pos.setY(j, y + arc);
      }
      bandGeo.computeVertexNormals();

      // Intercalamos el material fuerte y uno más suave para dar sensación de volumen pero ordenado
      const material =
        i % 2 === 0 ? auroraMaterial : this.secondaryAuroraMaterial;
      const band = new THREE.Mesh(bandGeo, material);

      // Situación estrictamente simétrica/ordenada: algunas inician DETRÁS de nosotros, extendiéndose hacia el horizonte lejano
      band.position.y = 38;
      // i determina qué tan atrás se ubica cada banda, comenzando desde +15 (detrás)
      band.userData.baseZ = 15 - i * 14;
      band.userData.baseX = 0;

      band.position.z = band.userData.baseZ;
      band.position.x = band.userData.baseX;

      // Inclinación unificada: caen hacia nosotros como si siguieran las líneas de campo
      band.rotation.x = -Math.PI * 0.15;
      band.rotation.y = 0; // Cero rotación caótica
      band.rotation.z = 0;

      this.auroraBands.push(band);
      this.add(band);
    }
  }

  initAtmosphericParticles() {
    this.particleCount = 800; // Suficientes para poblar el cielo local
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    this.particleVelocities = [];

    for (let i = 0; i < this.particleCount; i++) {
      this.resetLocalParticle(i, positions, colors);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false, // Importante para que no tapen las texturas del bosque ni auroras detrás de ellas
    });

    this.atmosphericParticles = new THREE.Points(geometry, material);
    this.add(this.atmosphericParticles);
  }

  resetLocalParticle(i, positions, colors) {
    // Caen desde muy alto (la ionósfera invisible a simple vista)
    positions[i * 3] = (Math.random() - 0.5) * 350; // X amplio (cielo completo)
    positions[i * 3 + 1] = 75 + Math.random() * 40; // Y muy alto
    positions[i * 3 + 2] = -120 + Math.random() * 200; // Z amplio (hacia el horizonte y sobre nosotros)

    // Velocidad de caída diagonal simulando canalización magnética hacia el polo
    this.particleVelocities[i] = {
      x: (Math.random() - 0.5) * 0.04,
      y: -0.15 - Math.random() * 0.15,
      z: 0.05 + Math.random() * 0.08,
    };

    // Al inicio en el espacio (antes del choque fuerte) son casi invisibles
    if (colors) {
      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.0;
      colors[i * 3 + 2] = 0.0;
    }
  }

  initLighting() {
    // Iluminación ambiental base con un tono azul oscuro rojizo
    this.add(new THREE.AmbientLight(0x271a25, 0.62));

    // La luz de la "luna" aportando algo de claridad
    const moonLight = new THREE.DirectionalLight(0x9ab8df, 0.5);
    moonLight.position.set(-20, 28, 12);
    this.add(moonLight);

    // Luz auroral reflectante predominante con tonos verde-rojos combinados (carmesí / rosa intenso)
    const auroraLight = new THREE.DirectionalLight(0xff5566, 1.2);
    auroraLight.position.set(0, 34, 0);
    this.add(auroraLight);

    // Un toque sutil de luz verde en ángulo contrapuesto
    const auroraGreenLight = new THREE.DirectionalLight(0x2dffc2, 0.6);
    auroraGreenLight.position.set(15, 20, -15);
    this.add(auroraGreenLight);
  }

  update(elapsedTime) {
    if (this.auroraBands.length > 0 && this.auroraBands[0].material.uniforms) {
      this.auroraBands[0].material.uniforms.uTime.value = elapsedTime;
    }

    if (this.secondaryAuroraMaterial?.uniforms) {
      this.secondaryAuroraMaterial.uniforms.uTime.value = elapsedTime * 0.9;
    }

    for (let i = 0; i < this.auroraBands.length; i++) {
      const band = this.auroraBands[i];
      // Movimiento coreografiado y absoluto, no sumativo, para evitar que se desfasen
      band.position.x =
        band.userData.baseX + Math.sin(elapsedTime * 0.1 + i * 0.5) * 6;
      band.position.z =
        band.userData.baseZ + Math.cos(elapsedTime * 0.08 + i * 0.5) * 4;
    }

    for (let i = 0; i < this.auroraCurtains.length; i++) {
      const curtain = this.auroraCurtains[i];
      curtain.position.x += Math.sin(elapsedTime * 0.1 + i) * 0.01;
      curtain.position.y += Math.sin(elapsedTime * 0.6 + i) * 0.0018;
    }

    for (let i = 0; i < this.trees.length; i++) {
      const tree = this.trees[i];
      tree.rotation.z = Math.sin(elapsedTime * 0.25 + i) * 0.002;
    }

    // --- Simulación de Partículas (Colisión Atmosférica Local) ---
    if (this.atmosphericParticles) {
      const positions =
        this.atmosphericParticles.geometry.attributes.position.array;
      const colors = this.atmosphericParticles.geometry.attributes.color.array;

      for (let i = 0; i < this.particleCount; i++) {
        // Moverlas hacia abajo y diagonalmente
        positions[i * 3] += this.particleVelocities[i].x;
        positions[i * 3 + 1] += this.particleVelocities[i].y;
        positions[i * 3 + 2] += this.particleVelocities[i].z;

        const py = positions[i * 3 + 1];

        // Lógica visual: se encienden al chocar con las capas de gases en el cielo
        // Zona Alta (52 a 65): Oxígeno a gran altitud -> Rojo
        if (py < 65 && py > 52) {
          colors[i * 3] = 1.0; // R
          colors[i * 3 + 1] = 0.1; // G
          colors[i * 3 + 2] = 0.2; // B
        }
        // Zona Media/Baja (32 a 52): Oxígeno denso -> Verde Esmeralda
        else if (py <= 52 && py > 32) {
          // Destello puro esmeralda
          colors[i * 3] = 0.0;
          colors[i * 3 + 1] = 1.0;
          colors[i * 3 + 2] = 0.4;

          // Frenado (simulando entrar a la atmósfera más densa)
          this.particleVelocities[i].y *= 0.99;
        }
        // Desaparecen / se consumen por debajo de la altura de la banda auroral
        else if (py <= 32) {
          this.resetLocalParticle(i, positions, colors);
        }
      }

      this.atmosphericParticles.geometry.attributes.position.needsUpdate = true;
      this.atmosphericParticles.geometry.attributes.color.needsUpdate = true;
    }
  }
}
