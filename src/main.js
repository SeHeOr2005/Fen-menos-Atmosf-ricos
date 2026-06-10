import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./styles/app.css";
import { App } from "./App.js";
 
const app = new App(document.getElementById("app"));
 
// --- Module / Scale buttons ---
const btnAurora   = document.getElementById("btn-aurora");
const btnRayleigh = document.getElementById("btn-rayleigh");
const btnLocal    = document.getElementById("btn-local");
const btnEarth    = document.getElementById("btn-earth");
 
const infoLegend     = document.getElementById("info-legend");
const rayleighLegend = document.getElementById("rayleigh-legend");
const globalControls  = document.getElementById("global-controls");
const rayleighControls = document.getElementById("rayleigh-controls");
const btnSpeed        = document.getElementById("btn-speed");
 
const timeSlider = document.getElementById("time-slider");
const timeLabel  = document.getElementById("time-label");
 
// --- Playback bar elements ---
const btnPlayPause   = document.getElementById("btn-play-pause");
const btnStepBack    = document.getElementById("btn-step-back");
const btnStepForward = document.getElementById("btn-step-forward");
const btnRestart     = document.getElementById("btn-restart");
const btnJumpEnd     = document.getElementById("btn-jump-end");
const scrubBar       = document.getElementById("scrub-bar");
const speedSelect    = document.getElementById("playback-speed");
const playbackBar    = document.getElementById("playback-bar");
 
// --- State ---
let currentModule = "aurora";
let currentScale  = "local";
let isPlaying = true;
 
function setActiveButton(active, inactive) {
  active.classList.add("is-active");
  inactive.classList.remove("is-active");
}
 
function applyView() {
  app.setModule(currentModule);
  currentScale === "local" ? app.setLocalView() : app.setGlobalView();
 
  const isAurora = currentModule === "aurora";
  const isGlobal = currentScale === "global";
 
  infoLegend.classList.toggle("d-none", !(isAurora && isGlobal));
  rayleighLegend.classList.toggle("d-none", isAurora);
  globalControls.classList.toggle("d-none", !(isAurora && isGlobal));
  rayleighControls.classList.toggle("d-none", isAurora);
 
  // Show playback bar for any Rayleigh view
  const showPlayback = !isAurora;
  playbackBar.classList.toggle("d-none", !showPlayback);
}
 
// --- Solar wind speed ---
let currentSpeed = 1;
const speedLabels      = ["Velocidad: Lenta", "Velocidad: Normal", "Velocidad: Rápida"];
const speedMultipliers = [0.2, 1.0, 3.5];
 
btnSpeed.addEventListener("click", () => {
  currentSpeed = (currentSpeed + 1) % 3;
  btnSpeed.textContent = speedLabels[currentSpeed];
  app.setWindSpeed(speedMultipliers[currentSpeed]);
});
 
// --- Time of day slider ---
function formatHour(value) {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
 
timeSlider.addEventListener("input", (e) => {
  const hour = Number(e.target.value);
  timeLabel.textContent = formatHour(hour);
  app.setTimeOfDay(hour);
});
 
// --- Playback bar logic ---
 
function updatePlayIcon() {
  const icon = btnPlayPause.querySelector("i");
  if (icon) {
    icon.className = isPlaying ? "ti ti-player-pause" : "ti ti-player-play";
  }
  btnPlayPause.setAttribute("aria-label", isPlaying ? "Pausar" : "Reproducir");
}
 
btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  isPlaying ? app.play() : app.pause();
  updatePlayIcon();
});
 
btnStepBack.addEventListener("click", () => {
  if (isPlaying) {
    isPlaying = false;
    app.pause();
    updatePlayIcon();
  }
  app.stepBackward();
  scrubBar.value = String(Math.round(app.simulationProgress * 1000));
});
 
btnStepForward.addEventListener("click", () => {
  if (isPlaying) {
    isPlaying = false;
    app.pause();
    updatePlayIcon();
  }
  app.stepForward();
  scrubBar.value = String(Math.round(app.simulationProgress * 1000));
});
 
btnRestart.addEventListener("click", () => {
  app.simulationProgress = 0;
  scrubBar.value = "0";
  // Resetear la escena Rayleigh activa
  if (app.rayleighLocalScene)  { app.rayleighLocalScene.setManualMode(false);  app.rayleighLocalScene.resetCycle(); }
  if (app.rayleighGlobalScene) { app.rayleighGlobalScene.setManualMode(false); app.rayleighGlobalScene.resetCycle(); }
  if (!isPlaying) {
    isPlaying = true;
    app.play();
    updatePlayIcon();
  }
});
 
btnJumpEnd.addEventListener("click", () => {
  // Pausar reproducción y saltar al estado final
  isPlaying = false;
  app.pause();
  updatePlayIcon();
  app.jumpToEnd();
  scrubBar.value = "1000";
});
 
// Scrub: dragging pauses automatically
let isScrubbing = false;
 
scrubBar.addEventListener("mousedown", () => {
  isScrubbing = true;
  if (isPlaying) {
    app.pause();
  }
});
 
scrubBar.addEventListener("input", () => {
  const progress = Number(scrubBar.value) / 1000;
  app.seekTo(progress);
});
 
scrubBar.addEventListener("mouseup", () => {
  isScrubbing = false;
  if (isPlaying) {
    app.play();
  }
});
 
scrubBar.addEventListener("touchstart", () => { isScrubbing = true; if (isPlaying) app.pause(); }, { passive: true });
scrubBar.addEventListener("touchend",   () => { isScrubbing = false; if (isPlaying) app.play(); });
 
speedSelect.addEventListener("change", () => {
  app.setPlaybackSpeed(Number(speedSelect.value));
});
 
// Sync scrub bar from app progress
app.onProgress((progress) => {
  if (!isScrubbing) {
    scrubBar.value = String(Math.round(progress * 1000));
  }
});
 
// --- Module / scale buttons ---
setActiveButton(btnAurora, btnRayleigh);
setActiveButton(btnLocal, btnEarth);
applyView();
 
timeLabel.textContent = formatHour(Number(timeSlider.value));
app.setTimeOfDay(Number(timeSlider.value));
 
btnAurora.addEventListener("click", () => {
  currentModule = "aurora";
  setActiveButton(btnAurora, btnRayleigh);
  applyView();
});
 
btnRayleigh.addEventListener("click", () => {
  currentModule = "rayleigh";
  setActiveButton(btnRayleigh, btnAurora);
  applyView();
});
 
btnLocal.addEventListener("click", () => {
  currentScale = "local";
  setActiveButton(btnLocal, btnEarth);
  applyView();
});
 
btnEarth.addEventListener("click", () => {
  currentScale = "global";
  setActiveButton(btnEarth, btnLocal);
  applyView();
});
 
// --- Physics accordion ---
const physicsButtons = document.querySelectorAll(".accordion-button");
physicsButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const isExpanded = btn.getAttribute("aria-expanded") === "true";
    app.highlightGlobalEquation(isExpanded ? btn.getAttribute("data-equation") : null);
  });
});