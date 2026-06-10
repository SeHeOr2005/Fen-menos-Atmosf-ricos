import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LocalScene } from "./scenes/LocalScene.js";
import { GlobalScene } from "./scenes/GlobalScene.js";
import { RayleighLocalScene } from "./scenes/RayleighLocalScene.js";
import { RayleighGlobalScene } from "./scenes/RayleighGlobalScene.js";
 
export class App {
  constructor(container) {
    this.container = container;
 
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
 
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
 
    this.auroraLocalScene = new LocalScene();
    this.auroraGlobalScene = new GlobalScene();
    this.rayleighLocalScene = new RayleighLocalScene();
    this.rayleighGlobalScene = new RayleighGlobalScene();
 
    this.scene.add(this.auroraLocalScene);
    this.scene.add(this.auroraGlobalScene);
    this.scene.add(this.rayleighLocalScene);
    this.scene.add(this.rayleighGlobalScene);
 
    this.currentModule = "aurora";
    this.currentScale = "local";
    this.timeOfDay = 12;
 
    // Playback state
    this.isPaused = false;
    this.playbackSpeed = 1.0;
    this.simulationProgress = 0; // 0..1, used for scrubbing
    this.lastElapsed = 0;
    this.accumulatedTime = 0;
    this.onProgressCallback = null;
 
    this.clock = new THREE.Clock();
 
    window.addEventListener("resize", this.onResize.bind(this));
 
    this.applyView();
    this.setTimeOfDay(this.timeOfDay);
    this.animate();
  }
 
  // --- Playback Controls ---
 
  pause() {
    this.isPaused = true;
    this._enterManualModeIfRayleigh();
  }
 
  play() {
    this.isPaused = false;
    if (this.currentModule === "rayleigh") {
      if (this.currentScale === "local")  this.rayleighLocalScene.setManualMode(false);
      if (this.currentScale === "global") this.rayleighGlobalScene.setManualMode(false);
    }
    this.clock.getDelta();
  }
 
  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
    if (this.rayleighLocalScene?.setPlaybackSpeed)  this.rayleighLocalScene.setPlaybackSpeed(speed);
    if (this.rayleighGlobalScene?.setPlaybackSpeed) this.rayleighGlobalScene.setPlaybackSpeed(speed);
  }
 
  jumpToEnd() {
    if (this.currentModule !== "rayleigh") return;
    const scene = this.currentScale === "local" ? this.rayleighLocalScene : this.rayleighGlobalScene;
    if (scene?.jumpToEnd) {
      scene.jumpToEnd();
      this.simulationProgress = 1;
      if (this.onProgressCallback) this.onProgressCallback(1);
    }
  }
 
  seekTo(progress) {
    this.simulationProgress = Math.max(0, Math.min(1, progress));
    if (this.currentModule === "rayleigh") {
      this._enterManualModeIfRayleigh();
      if (this.currentScale === "local") {
        this.rayleighLocalScene.setManualProgress(this.simulationProgress);
      } else {
        this.rayleighGlobalScene.setManualProgress(this.simulationProgress);
      }
    } else if (this.currentModule === "aurora") {
      const elapsed = this.clock.getElapsedTime();
      const targetOffset = this.simulationProgress * 30;
      if (this.currentScale === "local") this.auroraLocalScene.cycleStart  = elapsed - targetOffset;
      else                               this.auroraGlobalScene.cycleStart = elapsed - targetOffset;
    }
  }
 
  stepForward()  { this._adjustProgress(+0.05); }
  stepBackward() { this._adjustProgress(-0.05); }
 
  _adjustProgress(delta) {
    if (this.currentModule !== "rayleigh") return;
    this._enterManualModeIfRayleigh();
    const next = Math.max(0, Math.min(1, this.simulationProgress + delta));
    this.simulationProgress = next;
    if (this.currentScale === "local")  this.rayleighLocalScene.setManualProgress(next);
    else                                this.rayleighGlobalScene.setManualProgress(next);
    if (this.onProgressCallback) this.onProgressCallback(next);
  }
 
  _enterManualModeIfRayleigh() {
    if (this.currentModule !== "rayleigh") return;
    if (this.currentScale === "local" && !this.rayleighLocalScene.manualMode) {
      this.rayleighLocalScene.setManualMode(true);
      this.rayleighLocalScene.setManualProgress(this.simulationProgress);
    }
    if (this.currentScale === "global" && !this.rayleighGlobalScene.manualMode) {
      this.rayleighGlobalScene.setManualMode(true);
      this.rayleighGlobalScene.setManualProgress(this.simulationProgress);
    }
  }
 
  onProgress(callback) {
    this.onProgressCallback = callback;
  }
 
  // --- Existing methods ---
 
  setModule(module) {
    this.currentModule = module;
    this.applyView();
  }
 
  setLocalView() {
    this.currentScale = "local";
    this.applyView();
  }
 
  setGlobalView() {
    this.currentScale = "global";
    this.applyView();
  }
 
  applyView() {
    const isAurora = this.currentModule === "aurora";
    const isLocal = this.currentScale === "local";
 
    this.auroraLocalScene.visible = isAurora && isLocal;
    this.auroraGlobalScene.visible = isAurora && !isLocal;
    this.rayleighLocalScene.visible = !isAurora && isLocal;
    this.rayleighGlobalScene.visible = !isAurora && !isLocal;
 
    if (isLocal) {
      const activeLocal = isAurora
        ? this.auroraLocalScene
        : this.rayleighLocalScene;
 
      const fogColor = activeLocal.fogColor || new THREE.Color(0x87b8ff);
      const fogDensity = activeLocal.fogDensity ?? 0.018;
 
      this.scene.background = fogColor;
      this.scene.fog = new THREE.FogExp2(fogColor.getHex(), fogDensity);
 
      this.camera.position.set(0, -0.9, 10.8);
      this.controls.target.set(0, 11.2, 0);
      this.controls.enablePan = false;
      this.controls.enableZoom = true;
      this.controls.minDistance = 13.2;
      this.controls.maxDistance = 19.0;
      this.controls.minPolarAngle = 2.08;
      this.controls.maxPolarAngle = 3.0;
    } else {
      const activeGlobal = isAurora
        ? this.auroraGlobalScene
        : this.rayleighGlobalScene;
 
      this.scene.background =
        activeGlobal.backgroundColor || new THREE.Color(0x000000);
      this.scene.fog = null;
 
      this.camera.position.set(4, 5, 12);
      this.controls.target.set(0, 0, 0);
      this.controls.enablePan = false;
      this.controls.enableZoom = true;
      this.controls.minDistance = 3.5;
      this.controls.maxDistance = 50;
      this.controls.minPolarAngle = 0;
      this.controls.maxPolarAngle = Math.PI;
    }
  }
 
  setTimeOfDay(hour) {
    this.timeOfDay = hour;
 
    if (this.rayleighLocalScene?.setTimeOfDay) {
      this.rayleighLocalScene.setTimeOfDay(hour);
    }
    if (this.rayleighGlobalScene?.setTimeOfDay) {
      this.rayleighGlobalScene.setTimeOfDay(hour);
    }
  }
 
  setWindSpeed(multiplier) {
    if (this.currentModule === "aurora" && this.auroraGlobalScene) {
      this.auroraGlobalScene.windSpeedMultiplier = multiplier;
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
 
    const rawDelta = this.clock.getDelta();
    const delta = this.isPaused ? 0 : rawDelta * this.playbackSpeed;
    this.accumulatedTime += delta;
    const elapsedTime = this.accumulatedTime;
 
    // Update progress for Rayleigh local (auto mode)
    if (
      this.currentModule === "rayleigh" &&
      this.currentScale === "local" &&
      !this.rayleighLocalScene.manualMode &&
      !this.isPaused
    ) {
      const manualDur = this.rayleighLocalScene.manualDuration || 5;
      const localTime = this.rayleighLocalScene.cycleStart === 0
        ? 0
        : elapsedTime - this.rayleighLocalScene.cycleStart;
      const prog = Math.min(localTime / manualDur, 1);
      this.simulationProgress = prog;
      if (this.onProgressCallback) this.onProgressCallback(prog);
    }
 
    if (this.auroraLocalScene.visible) this.auroraLocalScene.update(elapsedTime);
    if (this.auroraGlobalScene.visible) this.auroraGlobalScene.update(elapsedTime);
    if (this.rayleighLocalScene.visible) this.rayleighLocalScene.update(elapsedTime);
    if (this.rayleighGlobalScene.visible) this.rayleighGlobalScene.update(elapsedTime);
 
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}