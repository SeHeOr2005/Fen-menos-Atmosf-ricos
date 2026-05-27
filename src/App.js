import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LocalScene } from "./scenes/LocalScene.js";
import { GlobalScene } from "./scenes/GlobalScene.js";

export class App {
  constructor(container) {
    this.container = container;

    // Configuración Core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Controles de Cámara (Mouse interactivo)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Inicializar Capas Escénicas
    this.localScene = new LocalScene();
    this.globalScene = new GlobalScene();

    this.scene.add(this.localScene);
    this.scene.add(this.globalScene);

    // Reloj para las animaciones y Shaders
    this.clock = new THREE.Clock();

    // Eventos
    window.addEventListener("resize", this.onResize.bind(this));

    // Vista por defecto
    this.setLocalView();

    // Arrancar render loop
    this.animate();
  }

  setLocalView() {
    this.localScene.visible = true;
    this.globalScene.visible = false;

    // Lógica visual del entorno (Niebla local por ej.)
    this.scene.background = this.localScene.fogColor;
    this.scene.fog = new THREE.FogExp2(
      this.localScene.fogColor.getHex(),
      0.018,
    );

    // Cámara más baja para reforzar sensación de estar en el suelo.
    this.camera.position.set(0, -0.9, 10.8);
    this.controls.target.set(0, 11.2, 0);

    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minDistance = 13.2;
    this.controls.maxDistance = 19.0;
    this.controls.minPolarAngle = 2.08;
    this.controls.maxPolarAngle = 3.0;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
  }

  setGlobalView() {
    this.localScene.visible = false;
    this.globalScene.visible = true;

    // Entorno espacial sin niebla
    this.scene.background = this.globalScene.backgroundColor;
    this.scene.fog = null;

    // Posicionar cámara en la órbita de la Tierra
    this.camera.position.set(4, 5, 12);
    this.controls.target.set(0, 0, 0);

    // Evitar que la cámara entre dentro de la Tierra (Radio 3)
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 50;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI; // Libre movimiento completo
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
  }

  setWindSpeed(multiplier) {
    if (this.globalScene) {
      this.globalScene.windSpeedMultiplier = multiplier;
    }
  }

  highlightGlobalEquation(equationType) {
    if (this.globalScene) {
      this.globalScene.setHighlight(equationType);
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const elapsedTime = this.clock.getElapsedTime();

    // Actualizar Shaders y lógica de la escena activa
    if (this.localScene.visible) this.localScene.update(elapsedTime);
    if (this.globalScene.visible) this.globalScene.update(elapsedTime);

    this.controls.update(); // Necesario por el "damping" (suavizado del mouse)

    this.renderer.render(this.scene, this.camera);
  }
}
