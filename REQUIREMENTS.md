# Requerimientos del Proyecto

Este simulador de Fenómenos Atmosféricos (Auroras Boreales y Viento Solar) es una aplicación web renderizada en tiempo real.

## Requisitos de Hardware

- **Procesador (CPU):** Cualquier procesador moderno (Intel Core i3/i5/i7/i9 de 4ta gen en adelante, AMD Ryzen, Apple Silicon M1/M2/M3) es suficiente.
- **Memoria RAM:** Mínimo 4 GB (Se recomiendan 8 GB para una experiencia de navegación fluida general).
- **Tarjeta Gráfica (GPU):** **No se requiere una tarjeta gráfica dedicada** (como NVIDIA RTX o AMD Radeon). Funciona perfectamente con **gráficos integrados** (Intel HD Graphics, Intel Iris Xe, AMD Radeon Vega).
- **Almacenamiento:** Menos de 50 MB de espacio en disco duro o SSD.

## Requisitos de Software

- **Sistema Operativo:** Windows, macOS, Linux, o sistemas operativos móviles compatibles con WebGL.
- **Navegador Web:** Un navegador moderno con soporte completo para **WebGL 2.0**. (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
- **Entorno de Desarrollo (Para ejecutar el código fuente):**
  - **Node.js**: Versión 16.0 o superior instalada en el sistema.
  - **NPM o Yarn**: Gestor de paquetes que viene con Node.js.

## Dependencias del Proyecto (Librerías)

Estas se instalan automáticamente al correr `npm install`:

- **Three.js (`^0.160.0`)**: Motor de renderizado 3D principal.
- **Vite**: Empaquetador web (bundler) ultrarrápido utilizado para el entorno de desarrollo y la construcción del proyecto final.
