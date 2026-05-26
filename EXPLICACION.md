# Arquitectura y Funcionamiento del Simulador

Este documento explica los fundamentos técnicos, las herramientas seleccionadas y el razonamiento arquitectónico detrás de la simulación de las auroras boreales.

## 1. ¿Qué estamos usando?

- **HTML, CSS y JavaScript (Vanilla ES6+):** Los lenguajes estándar de la web para la estructura UI, los estilos y la lógica sin necesidad de frameworks pesados de frontend (como React o Angular) para mantener todo ligero.
- **Three.js:** Una biblioteca de 3D para JavaScript.
- **Vite:** Una herramienta de construcción y servidor de desarrollo.
- **GLSL (OpenGL Shading Language):** Un lenguaje de programación parecido a C que se ejecuta directamente en la tarjeta de video (o chip gráfico integrado) para calcular cómo se dibuja cada píxel de las auroras.

## 2. ¿Cómo lo estamos usando?

Hemos adoptado una **arquitectura orientada a objetos (POO) y modular**:

- **`App.js`**: Actúa como el orquestador principal. Mantiene el bucle de renderizado (`requestAnimationFrame`) que dibuja la escena 60 veces por segundo, y maneja el cambio entre las dos escalas (Local y Global).
- **`GlobalScene.js` y `LocalScene.js`**: Son clases separadas que heredan o construyen sobre la escena estándar de Three.js. Cada una contiene de forma encapsulada sus modelos, partículas, luces y reglas físicas (ej. colisiones de escala humana vs campo magnético de la Tierra).
- **Shaders Personalizados (`AuroraShader.js`)**: En lugar de usar texturas planas de imágenes descargadas, usamos programas matemáticos (Shaders) para pintar luces que se mueven procedimentalmente usando algoritmos algorítmicos.

## 3. ¿Cómo funciona?

1.  **Inicialización:** Cuando abres la web, Vite carga todo y `App.js` crea un `WebGLRenderer` y lo inyecta en el HTML.
2.  **Generación de Escenas:** Construimos la topología (un plano con "ruido" para simular montañas en `LocalScene` o una esfera para la Tierra en `GlobalScene`).
3.  **Animación (El Bucle de Render):** Existe una función que se ejecuta 60 veces por segundo. En cada vuelta de este ciclo:
    - Se calcula el tiempo transcurrido (Delta Time).
    - Se actualizan las matemáticas: Se mueven las partículas de viento solar hacia adelante, se cambia la altura de las ondas senoidales en de las auroras, y cambian los colores de las colisiones.
    - La cámara captura la escena y el `renderer` pinta la imagen resultante en nuestro `<canvas>`.

## 4. ¿Por qué lo estamos usando?

- **Accesibilidad y Distribución Web:** Three.js nos permite renderizar 3D acelerado por hardware directamente en un navegador, lo que significa que cualquier persona que abra tu link podrá verlo sin instalar simuladores ni programas externos.
- **Flexibilidad Educativa:** Al poder programar las reglas (como el choque de las partículas solares contra los polos magnéticos), podemos crear una abstracción educacional dinámica de fenómenos altamente complejos. Las partículas son controlables numéricamente (por cantidad, color y frenado) gracias a la libertad que aporta JavaScript.

## 5. ¿Por qué funciona todo esto de manera tan fluida SIN una tarjeta gráfica (GPU) dedicada?

Es fácil suponer que el entorno 3D, millones de operaciones de luz (auroras) y miles de partículas ("viento solar") fundirían la computadora de un usuario convencional. Sin embargo, nuestra simulación es capaz de correr maravillosamente bien en gráficos integrados (un procesador normal) por cuatro grandes razones:

1.  **WebGL y Aceleración Base:** Aunque no tengas una GPU gigante (NVIDIA/AMD), los procesadores modernos tienen una "GPU integrada" pequeña (Intel HD, Iris Xe, etc.). WebGL se comunica directamente con ese chip, permitiendo aceleración por hardware en el navegador web.
2.  **`THREE.Points` (Optimización de Partículas):** Las estrellas, el viento solar y las colisiones atmosféricas no son esferas 3D con cálculos pesados de geometría polígonal. Son lo que en renderizado se conoce como `gl.POINTS`. Básicamente, el programa procesa un solo vértice por partícula en el espacio, y le aplica un color. Esto permite tener 5,000 partículas en pantalla costando casi el mismo procesamiento que un solo árbol 3D.
3.  **Matemáticas puras en lugar de mallas complejas (Shaders):** Las auroras boreales son en realidad geometría ultraligera (meros rectángulos, 14 planos simples). El movimiento onduloso, la niebla difuminada, la separación por franjas (Rojo, Verde, Azul) **lo hace todo nuestra tarjeta de video/chip en el "Fragment Shader"** usando funciones matemáticas como el Seno (`Math.sin`), no el propio procesador de la PC (CPU). La GPU procesa los píxeles en paralelo, lo que es infinitamente más rápido.
4.  **Limpieza de Ciclos (Garbage Collection & Reuse):** Cuando las partículas de viento solar cruzan la Tierra o se consumen en las auroras, no las estamos destruyendo de la memoria para crear nuevas (lo cual causaría cuelgues o _mem leaks_). Simplemente restablecemos matemáticamente sus parámetros (su posición `X/Y/Z` y color original). Esto hace el bucle computacionalmente "ecológico" e infinito; nunca gastamos más memoria de la inicial.
