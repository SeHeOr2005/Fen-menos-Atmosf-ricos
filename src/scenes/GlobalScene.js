import * as THREE from "three";
import { auroraMaterial } from "../shaders/AuroraShader.js";

export class GlobalScene extends THREE.Group {
  constructor() {
    super();
    this.windSpeedMultiplier = 1.0;
    this.initEarth();
    this.initMagneticField(); // Simulación visual de los campos magnéticos
    this.initSolarWind(); // Simulación de partículas solares
    this.initAuroras();
    this.initSpace();
    this.initLighting();

    // Cielo espacial general (se usa sin Fog)
    this.backgroundColor = new THREE.Color(0x000000);
  }

  initEarth() {
    // Cargador de texturas apuntando a CDN reales y estables de texturas de la tierra (ejemplos públicos de Three.js)
    const textureLoader = new THREE.TextureLoader();

    const earthMap = textureLoader.load(
      "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_atmos_2048.jpg",
    );
    const specularMap = textureLoader.load(
      "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_specular_2048.jpg",
    );
    const normalMap = textureLoader.load(
      "https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_normal_2048.jpg",
    );

    const earthGeo = new THREE.SphereGeometry(3, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      specularMap: specularMap,
      normalMap: normalMap,
      shininess: 15,
    });

    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.add(this.earth);

    // Atmósfera sutil rodeando el planeta
    const atmGeo = new THREE.SphereGeometry(3.06, 64, 64);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x4fa6ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    this.add(atmosphere);
  }

  initAuroras() {
    this.auroraMaterialGlobal = auroraMaterial.clone();
    this.auroraMaterialGlobal.uniforms = { uTime: { value: 0 } };

    this.globalAurorasGroup = new THREE.Group();

    // Crearemos múltiples cilindros huecos muy pegados pero rotando a distintas velocidades
    // para dar un efecto de cortinas superpuestas dinámicas
    for (let i = 0; i < 3; i++) {
      // Un cilindro curvo sin tapas
      const globalAuroraGeo = new THREE.CylinderGeometry(
        2.0 + i * 0.2,
        2.5 + i * 0.3,
        0.8 + i * 0.2,
        90,
        1,
        true,
      );

      // Polo Norte Individual
      const northBand = new THREE.Mesh(
        globalAuroraGeo,
        this.auroraMaterialGlobal,
      );
      northBand.position.y = 2.6 - i * 0.1;
      northBand.userData.rotationSpeed = 0.15 + Math.random() * 0.2; // Más rápida y caótica

      // Polo Sur Individual
      const southBand = new THREE.Mesh(
        globalAuroraGeo,
        this.auroraMaterialGlobal,
      );
      southBand.position.y = -2.6 + i * 0.1;
      southBand.rotation.x = Math.PI;
      southBand.userData.rotationSpeed = 0.15 + Math.random() * 0.2;

      this.globalAurorasGroup.add(northBand);
      this.globalAurorasGroup.add(southBand);
    }

    this.add(this.globalAurorasGroup);
  }

  initMagneticField() {
    this.magneticGroup = new THREE.Group();
    // Usaremos un MeshBasicMaterial con TubeGeometry en vez de un Line, para que rinda
    // y se vea con volumen (como filamentos láser), ya que WebGL no deja cambiar el grosor de las líneas
    const magMat = new THREE.MeshBasicMaterial({
      color: 0x3388ff,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const linesCount = 24; // Más denso
    for (let j = 0; j < linesCount; j++) {
      const angle = (j / linesCount) * Math.PI * 2;

      // La fuerza solar viene de X, comprimimos el lado del sol
      const isDaySide = Math.cos(angle) > 0;
      const stretch = isDaySide ? 5.5 : 16;
      const height = isDaySide ? 4 : 5.5;

      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 2.9, 0), // Polo Norte
        new THREE.Vector3(
          Math.cos(angle) * stretch,
          height,
          Math.sin(angle) * stretch,
        ),
        new THREE.Vector3(
          Math.cos(angle) * stretch,
          -height,
          Math.sin(angle) * stretch,
        ),
        new THREE.Vector3(0, -2.9, 0), // Polo Sur
      );

      // Usando TubeGeometry para que las líneas se vean potentes y engrosadas (no simples pixeles)
      const tubeGeo = new THREE.TubeGeometry(curve, 45, 0.02, 5, false);
      const tube = new THREE.Mesh(tubeGeo, magMat);

      this.magneticGroup.add(tube);
    }

    this.add(this.magneticGroup);
  }

  initSolarWind() {
    this.windCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.windCount * 3);
    const colors = new Float32Array(this.windCount * 3);

    this.windVelocities = [];
    this.windStates = []; // 0=Libre(Sol), 1=Desviado, 2=Atrapado(Norte), 3=Atrapado(Sur)

    for (let i = 0; i < this.windCount; i++) {
      this.resetWindParticle(i, positions, colors);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.18, // Partículas más grandes y notorias para que sus colores se vean
      transparent: true,
      opacity: 0.9,
      vertexColors: true, // Color según su estado
      blending: THREE.AdditiveBlending,
    });

    this.solarWind = new THREE.Points(geometry, material);
    this.add(this.solarWind);
  }

  resetWindParticle(i, positions, colors) {
    // Generadas desde la posición del Sol aproximada (+X)
    positions[i * 3] = 25 + Math.random() * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    // Velocidad constante hacia la Tierra (-X)
    this.windVelocities[i] = {
      x: -0.15 - Math.random() * 0.1,
      y: 0,
      z: 0,
    };

    this.windStates[i] = 0;

    // Color inicial del plasma solar (Dorado/Naranja)
    if (colors) {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.6;
      colors[i * 3 + 2] = 0.1;
    }
  }

  initSpace() {
    const globalStarsGeo = new THREE.BufferGeometry();
    const globalStarsPos = new Float32Array(3000 * 3);

    // Estrellas en una esfera enorme rodeando el planeta
    for (let i = 0; i < 3000; i++) {
      const r = 60 + Math.random() * 40;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      globalStarsPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      globalStarsPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      globalStarsPos[i * 3 + 2] = r * Math.cos(phi);
    }

    globalStarsGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(globalStarsPos, 3),
    );
    const globalStars = new THREE.Points(
      globalStarsGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.add(globalStars);
  }

  initLighting() {
    // Sol marcando fuerte el día y la noche, alineado con el viento solar (+X)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(25, 0, 0);
    this.add(sunLight);

    // Muy baja luz ambiental para que el lado oscuro sea oscuro
    this.add(new THREE.AmbientLight(0x222222));
  }

  update(elapsedTime) {
    // Rotación natural del planeta y las auroras
    if (this.earth) {
      this.earth.rotation.y = elapsedTime * 0.05; // Planeta girando algo más fluido
    }

    // Las auroras globales ahora son independientes y fluyen más lento
    if (this.auroraMaterialGlobal && this.auroraMaterialGlobal.uniforms) {
      this.auroraMaterialGlobal.uniforms.uTime.value = elapsedTime * 0.5;
    }

    // Movimiento asíncrono para las bandas
    if (this.globalAurorasGroup) {
      this.globalAurorasGroup.children.forEach((band) => {
        band.rotation.y -= band.userData.rotationSpeed * 0.03;
      });
    }

    // Rotar sutilmente la jaula magnética
    if (this.magneticGroup) {
      // Orientado siempre al sol de forma estática, pero podemos mover sus líneas internamente si quisieramos
    }

    // -- EXPLICACIÓN FÍSICA: Animación del viento solar chocando contra la tierra --
    if (this.solarWind) {
      const positions = this.solarWind.geometry.attributes.position.array;
      const colors = this.solarWind.geometry.attributes.color.array;

      for (let i = 0; i < this.windCount; i++) {
        let px = positions[i * 3];
        let py = positions[i * 3 + 1];
        let pz = positions[i * 3 + 2];
        let v = this.windVelocities[i];
        let state = this.windStates[i];

        // 1. Mover partícula según su velocidad actual y el control de velocidad global
        px += v.x * this.windSpeedMultiplier;
        py += v.y * this.windSpeedMultiplier;
        pz += v.z * this.windSpeedMultiplier;

        const distFromEarth = Math.sqrt(px * px + py * py + pz * pz);

        // 2. Comprobar Choque Magnético (Bow Shock)
        // La Tierra y su escudo miden aprox radio 5.0 desde el lado del sol
        if (state === 0 && px < 7.0 && px > 0 && distFromEarth < 7.0) {
          // Evaluar si es canalizada a los polos o desviada al espacio exterior
          // Las más directas (py y pz cercanos a 0) se atrapan.
          const isDirectHit = Math.sqrt(py * py + pz * pz) < 3.0;

          if (isDirectHit && Math.random() > 0.2) {
            // Canalizada hacia los polos magnéticos (Atrapada)
            this.windStates[i] = py > 0 ? 2 : 3;

            // Al ser recién atrapadas por el polo, toman un color verde esmeralda claro
            colors[i * 3] = 0.0;
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 0.2;
          } else {
            // Desviada por el escudo magnético
            this.windStates[i] = 1;

            // Bajan su intensidad (azul oscuro espacial)
            colors[i * 3] = 0.2;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 1.0;
          }
        }

        // 3. Aplicar fuerzas según el estado de la partícula
        if (state === 1) {
          // Desviación: Las empujamos hacia afuera de los ejes Y y Z (abriendo su trayectoria)
          v.y += (py > 0 ? 0.005 : -0.005) * this.windSpeedMultiplier;
          v.z += (pz > 0 ? 0.005 : -0.005) * this.windSpeedMultiplier;
        } else if (state === 2 || state === 3) {
          // Atrapada (Norte=2 o Sur=3): Succionada hacia los polos
          const targetY = state === 2 ? 2.5 : -2.5;
          v.x += (0 - px) * 0.008 * this.windSpeedMultiplier;
          v.y += (targetY - py) * 0.008 * this.windSpeedMultiplier;
          v.z += (0 - pz) * 0.008 * this.windSpeedMultiplier;

          // Al acercarse a la atmósfera baja, reducen su velocidad (frenado atmosférico)
          if (distFromEarth < 4.5) {
            v.x *= 0.9;
            v.y *= 0.9;
            v.z *= 0.9;
          }

          // Antes de chocar, cambian violentamente su color a ROJO intenso (oxígeno a alta altitud)
          if (distFromEarth < 3.8) {
            colors[i * 3] = 1.0; // Red
            colors[i * 3 + 1] = 0.05; // Green
            colors[i * 3 + 2] = 0.1; // Blue
          }

          // Colisión Atmosférica: Choca con el oxígeno/nitrógeno (distFromEarth < 3.1 aprox)
          if (distFromEarth < 3.1) {
            // Simular liberación de luz final y reciclar la partícula al sol
            this.resetWindParticle(i, positions, colors);
            continue; // Ya la reiniciamos, no necesitamos guardar las posiciones viejas
          }
        }

        // 4. Si la partícula se fue muy lejos del mapa, la reciclamos enviándola de vuelta al sol
        if (px < -30 || px > 30 || Math.abs(py) > 20 || Math.abs(pz) > 20) {
          this.resetWindParticle(i, positions, colors);
          continue;
        }

        // Guardar posiciones
        positions[i * 3] = px;
        positions[i * 3 + 1] = py;
        positions[i * 3 + 2] = pz;
      }

      // Indicar a WebGL que actualice la memoria este fotograma
      this.solarWind.geometry.attributes.position.needsUpdate = true;
      this.solarWind.geometry.attributes.color.needsUpdate = true;
    }
  }
}
