import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/app.css";
import { App } from "./App.js";

const app = new App(document.getElementById("app"));

// --- LÓGICA DE BOTONES PARA UI --- //
const btnLocal = document.getElementById("btn-local");
const btnEarth = document.getElementById("btn-earth");
const infoLegend = document.getElementById("info-legend");
const globalControls = document.getElementById("global-controls");
const btnSpeed = document.getElementById("btn-speed");

function setActiveButton(activeButton, inactiveButton) {
  activeButton.classList.add("is-active");
  inactiveButton.classList.remove("is-active");
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

// Estado inicial UI
setActiveButton(btnLocal, btnEarth);

btnLocal.addEventListener("click", () => {
  app.setLocalView();
  setActiveButton(btnLocal, btnEarth);
  infoLegend.classList.add("d-none");
  globalControls.classList.add("d-none"); // Ocultar control en local
});

btnEarth.addEventListener("click", () => {
  app.setGlobalView();
  setActiveButton(btnEarth, btnLocal);
  infoLegend.classList.remove("d-none");
  globalControls.classList.remove("d-none"); // Mostrar control en global
});

// Lógica del Menú Interactivo (Acordeón Bootstrap)
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // Necesario para el colapso del accordion

const physicsButtons = document.querySelectorAll(".accordion-button");

physicsButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // Si se está abriendo el panel (no está collapsed)
    const isExpanded = btn.getAttribute("aria-expanded") === "true";
    const equationType = btn.getAttribute("data-equation");

    if (isExpanded) {
      // Comunicar a la GlobalScene (vía App.js) qué ecuación resaltar
      app.highlightGlobalEquation(equationType);
    } else {
      // Si se cerró, quitar el resaltado (volver a la normalidad)
      app.highlightGlobalEquation(null);
    }

    // Al abrir uno distinto (Bootstrap maneja el cierre de los demás automáticamente)
    // Pero si el usuario cierra manualmente todos, o cambia, enviamos el evento.
  });
});
