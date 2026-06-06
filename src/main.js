import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/app.css";
import { App } from "./App.js";

const app = new App(document.getElementById("app"));

// ─── REFERENCIAS UI ───────────────────────────────────────────────────────────
const btnAurora   = document.getElementById("btn-aurora");
const btnRayleigh = document.getElementById("btn-rayleigh");
const btnSunset   = document.getElementById("btn-sunset");
const btnLocal    = document.getElementById("btn-local");
const btnEarth    = document.getElementById("btn-earth");

const infoLegend    = document.getElementById("info-legend");
const rayleighLegend = document.getElementById("rayleigh-legend");
const sunsetLegend  = document.getElementById("sunset-legend");
const globalControls  = document.getElementById("global-controls");
const rayleighControls = document.getElementById("rayleigh-controls");
const btnSpeed = document.getElementById("btn-speed");

const timeSlider = document.getElementById("time-slider");
const timeLabel  = document.getElementById("time-label");

// ─── ESTADO ───────────────────────────────────────────────────────────────────
let currentModule = "aurora"; // "aurora" | "rayleigh" | "sunset"
let currentScale  = "local";  // "local"  | "global"

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function setActiveModule(module) {
  currentModule = module;
  btnAurora.classList.toggle("is-active",   module === "aurora");
  btnRayleigh.classList.toggle("is-active", module === "rayleigh");
  btnSunset.classList.toggle("is-active",   module === "sunset");
}

function setActiveScale(scale) {
  currentScale = scale;
  btnLocal.classList.toggle("is-active",  scale === "local");
  btnEarth.classList.toggle("is-active",  scale === "global");
}

function formatHour(value) {
  const hours   = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function applyView() {
  app.setModule(currentModule);

  if (currentScale === "local") {
    app.setLocalView();
  } else {
    app.setGlobalView();
  }

  const isAurora   = currentModule === "aurora";
  const isRayleigh = currentModule === "rayleigh";
  const isSunset   = currentModule === "sunset";
  const isGlobal   = currentScale  === "global";

  // ── Leyendas ──
  infoLegend.classList.toggle("d-none",     !(isAurora && isGlobal));
  rayleighLegend.classList.toggle("d-none",  !isRayleigh);
  sunsetLegend.classList.toggle("d-none",    !isSunset);

  // ── Controles ──
  // Panel de viento solar: solo aurora en global
  globalControls.classList.toggle("d-none",  !(isAurora && isGlobal));
  // Slider de hora: visible para rayleigh Y sunset (ambos usan timeOfDay)
  rayleighControls.classList.toggle("d-none", isAurora);
}

// ─── SLIDER DE HORA ───────────────────────────────────────────────────────────
timeSlider.addEventListener("input", (e) => {
  const hour = Number(e.target.value);
  timeLabel.textContent = formatHour(hour);
  app.setTimeOfDay(hour);
});

// ─── VELOCIDAD DEL VIENTO (Aurora) ────────────────────────────────────────────
let currentSpeed = 1;
const speedLabels      = ["Velocidad: Lenta", "Velocidad: Normal", "Velocidad: Rápida"];
const speedMultipliers = [0.2, 1.0, 3.5];

btnSpeed.addEventListener("click", () => {
  currentSpeed = (currentSpeed + 1) % 3;
  btnSpeed.textContent = speedLabels[currentSpeed];
  app.setWindSpeed(speedMultipliers[currentSpeed]);
});

// ─── BOTONES DE MÓDULO ────────────────────────────────────────────────────────
btnAurora.addEventListener("click", () => {
  setActiveModule("aurora");
  applyView();
});

btnRayleigh.addEventListener("click", () => {
  setActiveModule("rayleigh");
  applyView();
});

btnSunset.addEventListener("click", () => {
  setActiveModule("sunset");
  applyView();
});

// ─── BOTONES DE ESCALA ────────────────────────────────────────────────────────
btnLocal.addEventListener("click", () => {
  setActiveScale("local");
  applyView();
});

btnEarth.addEventListener("click", () => {
  setActiveScale("global");
  applyView();
});

// ─── FÍSICA INTERACTIVA (acordeón Aurora) ─────────────────────────────────────
import "bootstrap/dist/js/bootstrap.bundle.min.js";

document.querySelectorAll(".accordion-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const isExpanded  = btn.getAttribute("aria-expanded") === "true";
    const equationType = btn.getAttribute("data-equation");
    app.highlightGlobalEquation(isExpanded ? equationType : null);
  });
});

// ─── ESTADO INICIAL ───────────────────────────────────────────────────────────
setActiveModule("aurora");
setActiveScale("local");
applyView();

timeLabel.textContent = formatHour(Number(timeSlider.value));
app.setTimeOfDay(Number(timeSlider.value));