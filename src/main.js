import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/app.css";
import { App } from "./App.js";

const app = new App(document.getElementById("app"));

// --- LÓGICA DE BOTONES PARA UI --- //
const btnAurora = document.getElementById("btn-aurora");
const btnRayleigh = document.getElementById("btn-rayleigh");
const btnLocal = document.getElementById("btn-local");
const btnEarth = document.getElementById("btn-earth");

const infoLegend = document.getElementById("info-legend");
const rayleighLegend = document.getElementById("rayleigh-legend");
const globalControls = document.getElementById("global-controls");
const rayleighControls = document.getElementById("rayleigh-controls");
const btnSpeed = document.getElementById("btn-speed");

const timeSlider = document.getElementById("time-slider");
const timeLabel = document.getElementById("time-label");

function setActiveButton(activeButton, inactiveButton) {
  activeButton.classList.add("is-active");
  inactiveButton.classList.remove("is-active");
}

let currentModule = "aurora"; // "aurora" | "rayleigh"
let currentScale = "local"; // "local" | "global"

function applyView() {
  app.setModule(currentModule);

  if (currentScale === "local") {
    app.setLocalView();
  } else {
    app.setGlobalView();
  }

  const isAurora = currentModule === "aurora";
  const isGlobal = currentScale === "global";

  // Leyendas
  infoLegend.classList.toggle("d-none", !(isAurora && isGlobal));
  rayleighLegend.classList.toggle("d-none", isAurora);

  // Controles
  globalControls.classList.toggle("d-none", !(isAurora && isGlobal));
  rayleighControls.classList.toggle("d-none", isAurora);
}

/* Control de velocidad del viento solar */
let currentSpeed = 1; // 0 = Lento, 1 = Normal, 2 = Rápido
const speedLabels = [
  "Velocidad: Lenta",
  "Velocidad: Normal",
  "Velocidad: Rápida",
];
const speedMultipliers = [0.2, 1.0, 3.5];

btnSpeed.addEventListener("click", () => {
  currentSpeed = (currentSpeed + 1) % 3;
  btnSpeed.textContent = speedLabels[currentSpeed];
  app.setWindSpeed(speedMultipliers[currentSpeed]);
});

function formatHour(value) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

timeSlider.addEventListener("input", (e) => {
  const hour = Number(e.target.value);
  timeLabel.textContent = formatHour(hour);
  app.setTimeOfDay(hour);
});

// Estado inicial UI
setActiveButton(btnAurora, btnRayleigh);
setActiveButton(btnLocal, btnEarth);
applyView();

// Hora inicial
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